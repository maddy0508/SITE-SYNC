import type { CommandLedgerRecord } from '../domain/localPersistence';
import { STALE_PROCESSING_THRESHOLD_MS, canTransitionCommand } from '../domain/localPersistence';
import { getDb, withTransaction } from '../database/localPersistence';
import type { Transaction } from '../database/sqliteAdapter';

export interface ClaimedSyncCommand extends CommandLedgerRecord { commandPayloadJson: string; }
type SqlFieldValue = string | number | null;

export interface ProjectionCommandOrder {
  commandId: string;
  createdAt: string;
}

/** Returns whether a completed command is still the newest command for a projection. */
export function shouldApplyProjection(current: ProjectionCommandOrder | null, candidate: ProjectionCommandOrder): boolean {
  if (!current) return true;
  return candidate.createdAt > current.createdAt
    || (candidate.createdAt === current.createdAt && candidate.commandId >= current.commandId);
}

function mapCommand(row: Record<string, unknown>): ClaimedSyncCommand {
  return {
    commandId: String(row.commandId), projectId: String(row.projectId), personId: String(row.personId),
    organisationId: String(row.organisationId), companyId: String(row.companyId), commandType: String(row.commandType),
    source: row.source as CommandLedgerRecord['source'], baseRevision: Number(row.baseRevision),
    status: row.status as CommandLedgerRecord['status'], attemptCount: Number(row.attemptCount), maxAttempts: Number(row.maxAttempts),
    processingStartedAt: row.processingStartedAt == null ? null : String(row.processingStartedAt),
    serverRespondedAt: row.serverRespondedAt == null ? null : String(row.serverRespondedAt),
    syncedAt: row.syncedAt == null ? null : String(row.syncedAt), nextRetryAt: row.nextRetryAt == null ? null : String(row.nextRetryAt),
    serverResultJson: row.serverResultJson == null ? null : String(row.serverResultJson),
    serverErrorCode: row.serverErrorCode == null ? null : String(row.serverErrorCode),
    failureDiagnostics: row.failureDiagnostics == null ? null : String(row.failureDiagnostics),
    createdAt: String(row.createdAt), updatedAt: String(row.updatedAt), commandPayloadJson: String(row.commandPayloadJson ?? '{}'),
  };
}

const SELECT = `SELECT command_id as commandId, project_id as projectId, person_id as personId,
organisation_id as organisationId, company_id as companyId, command_type as commandType, source,
base_revision as baseRevision, status, attempt_count as attemptCount, max_attempts as maxAttempts,
processing_started_at as processingStartedAt, server_responded_at as serverRespondedAt,
synced_at as syncedAt, next_retry_at as nextRetryAt, server_result_json as serverResultJson,
server_error_code as serverErrorCode, failure_diagnostics as failureDiagnostics,
created_at as createdAt, updated_at as updatedAt, command_payload_json as commandPayloadJson
FROM command_ledger`;

const NEWER_COMMAND_GUARD = `NOT EXISTS (
  SELECT 1 FROM command_ledger current_command
  WHERE current_command.command_id = attendance_state.last_command_id
    AND (current_command.created_at > (SELECT created_at FROM command_ledger WHERE command_id = ?)
      OR (current_command.created_at = (SELECT created_at FROM command_ledger WHERE command_id = ?)
          AND current_command.command_id > ?))
)`;

export class SyncCommandRepository {
  async releaseStaleClaims(now: string): Promise<number> {
    const cutoff = new Date(Date.parse(now) - STALE_PROCESSING_THRESHOLD_MS).toISOString();
    const result = await getDb().execute(
      `UPDATE command_ledger SET status='PENDING', processing_started_at=NULL, updated_at=?
       WHERE status='PROCESSING' AND processing_started_at IS NOT NULL AND processing_started_at < ? AND attempt_count < max_attempts`,
      [now, cutoff],
    );
    await getDb().execute(
      `UPDATE command_ledger SET status='FAILED', server_error_code='MAX_ATTEMPTS',
         failure_diagnostics='Processing claim became stale after max attempts', updated_at=?, processing_started_at=NULL
       WHERE status='PROCESSING' AND processing_started_at IS NOT NULL AND processing_started_at < ? AND attempt_count >= max_attempts`,
      [now, cutoff],
    );
    return result.rowsAffected;
  }

  async claimNextEligible(now: string): Promise<ClaimedSyncCommand | null> {
    return withTransaction(async (tx) => {
      const result = await tx.executeSql(
        `${SELECT} WHERE (status='PENDING' OR (status='RETRYABLE_FAILURE' AND (next_retry_at IS NULL OR next_retry_at <= ?)))
          AND attempt_count < max_attempts
          AND NOT EXISTS (
            SELECT 1 FROM command_ledger earlier
            WHERE earlier.project_id = command_ledger.project_id AND earlier.person_id = command_ledger.person_id
              AND earlier.status IN ('PENDING','PROCESSING','RETRYABLE_FAILURE')
              AND (earlier.created_at < command_ledger.created_at
                   OR (earlier.created_at = command_ledger.created_at AND earlier.command_id < command_ledger.command_id))
          ) ORDER BY created_at ASC, command_id ASC LIMIT 1`, [now],
      );
      if (result.rows.length === 0) return null;
      const candidate = result.rows.item(0) as unknown as Record<string, unknown>;
      const commandId = String(candidate.commandId);
      const nextAttempt = Number(candidate.attemptCount) + 1;
      const update = await tx.executeSql(
        `UPDATE command_ledger SET status='PROCESSING', attempt_count=?, processing_started_at=?, updated_at=?
         WHERE command_id=? AND status IN ('PENDING','RETRYABLE_FAILURE') AND attempt_count < max_attempts`,
        [nextAttempt, now, now, commandId],
      );
      if (update.rowsAffected !== 1) return null;
      return mapCommand({ ...candidate, status: 'PROCESSING', attemptCount: nextAttempt, processingStartedAt: now, updatedAt: now });
    });
  }

  async markSucceeded(commandId: string, now: string, serverRevision: number, result: unknown): Promise<void> {
    await withTransaction(async (tx) => {
      const current = await this.getCommandInTransaction(tx, commandId);
      await this.transitionInTransaction(tx, current, 'SUCCEEDED', {
        serverRespondedAt: now, syncedAt: now, serverResultJson: JSON.stringify(result), serverErrorCode: null,
        failureDiagnostics: null, nextRetryAt: null, updatedAt: now,
      });
      await tx.executeSql(
        `UPDATE attendance_state SET sync_status='ONLINE_VERIFIED', server_revision=?, updated_at=?
         WHERE last_command_id=? AND ${NEWER_COMMAND_GUARD}`,
        [serverRevision, now, commandId, commandId, commandId, commandId],
      );
      await tx.executeSql(
        `UPDATE timesheet SET sync_status='ONLINE_VERIFIED', server_revision=?, updated_at=?
         WHERE (project_id, person_id, work_date_utc) IN (
           SELECT project_id, person_id, work_date_utc FROM attendance_event WHERE command_id=?
         ) AND source_state_revision=(SELECT base_revision + 1 FROM command_ledger WHERE command_id=?)`,
        [serverRevision, now, commandId, commandId],
      );
    });
  }

  async markRetryableFailure(commandId: string, now: string, nextRetryAt: string, code: string, diagnostics: string): Promise<void> {
    await this.transition(commandId, 'RETRYABLE_FAILURE', {
      serverRespondedAt: now, nextRetryAt, serverErrorCode: code, failureDiagnostics: diagnostics, updatedAt: now,
    });
  }

  async markFailed(commandId: string, now: string, code: string, diagnostics: string): Promise<void> {
    await withTransaction(async (tx) => {
      const current = await this.getCommandInTransaction(tx, commandId);
      await this.transitionInTransaction(tx, current, 'FAILED', {
        serverRespondedAt: now, serverErrorCode: code, failureDiagnostics: diagnostics, updatedAt: now,
      });
      await tx.executeSql(
        `UPDATE attendance_state SET sync_status='FAILED', updated_at=? WHERE last_command_id=? AND ${NEWER_COMMAND_GUARD}`,
        [now, commandId, commandId, commandId, commandId],
      );
      await tx.executeSql(
        `UPDATE timesheet SET sync_status='FAILED', updated_at=? WHERE (project_id, person_id, work_date_utc) IN (
           SELECT project_id, person_id, work_date_utc FROM attendance_event WHERE command_id=?
         ) AND source_state_revision=(SELECT base_revision + 1 FROM command_ledger WHERE command_id=?)`,
        [now, commandId, commandId, commandId],
      );
    });
  }

  async markConflict(commandId: string, now: string, serverRevision: number, serverPayload: string | null, reasonCode: string): Promise<void> {
    await withTransaction(async (tx) => {
      const command = await this.getCommandInTransaction(tx, commandId);
      await this.transitionInTransaction(tx, command, 'CONFLICT', {
        serverRespondedAt: now, serverErrorCode: reasonCode, failureDiagnostics: reasonCode, updatedAt: now,
      });
      const conflictId = `conflict-${commandId}`;
      await tx.executeSql(
        `INSERT INTO conflict (conflict_id, command_id, entity_type, entity_id, local_revision, server_revision,
          local_payload, server_payload, status, reason_code, reason, resolved_at, resolved_by, resolution_strategy, created_at, updated_at)
         SELECT ?, command_id, 'ATTENDANCE_STATE',
          json_object('projectId', project_id, 'personId', person_id,
            'workDateUtc', (SELECT work_date_utc FROM attendance_event WHERE command_id=command_ledger.command_id LIMIT 1)),
          COALESCE((SELECT current_revision FROM attendance_state WHERE last_command_id=command_ledger.command_id), base_revision + 1),
          ?, command_payload_json, ?, 'OPEN', ?, 'Server revision conflict', NULL, NULL, NULL, ?, ?
         FROM command_ledger WHERE command_id=?`,
        [conflictId, serverRevision, serverPayload, reasonCode, now, now, commandId],
      );
      await tx.executeSql(
        `UPDATE attendance_state SET sync_status='CONFLICT', server_revision=?, updated_at=?
         WHERE last_command_id=? AND ${NEWER_COMMAND_GUARD}`,
        [serverRevision, now, commandId, commandId, commandId, commandId],
      );
      await tx.executeSql(
        `UPDATE timesheet SET sync_status='CONFLICT', server_revision=?, updated_at=? WHERE project_id=? AND person_id=?
         AND work_date_utc=(SELECT work_date_utc FROM attendance_event WHERE command_id=? LIMIT 1)
         AND source_state_revision=(SELECT base_revision + 1 FROM command_ledger WHERE command_id=?)`,
        [serverRevision, now, command.projectId, command.personId, commandId, commandId],
      );
    });
  }

  private async getCommandInTransaction(tx: Transaction, commandId: string): Promise<ClaimedSyncCommand> {
    const result = await tx.executeSql(`${SELECT} WHERE command_id=?`, [commandId]);
    if (result.rows.length === 0) throw new Error(`Unknown command ${commandId}`);
    return mapCommand(result.rows.item(0) as unknown as Record<string, unknown>);
  }

  private async transition(commandId: string, to: CommandLedgerRecord['status'], fields: Record<string, SqlFieldValue>): Promise<void> {
    await withTransaction(async (tx) => {
      const current = await this.getCommandInTransaction(tx, commandId);
      await this.transitionInTransaction(tx, current, to, fields);
    });
  }

  private async transitionInTransaction(tx: Transaction, current: ClaimedSyncCommand, to: CommandLedgerRecord['status'], fields: Record<string, SqlFieldValue>): Promise<void> {
    if (!canTransitionCommand(current.status, to)) throw new Error(`Invalid command transition ${current.status} -> ${to}`);
    const entries = Object.entries(fields);
    const setClause = entries.map(([key]) => `${key.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`)}=?`).join(', ');
    await tx.executeSql(`UPDATE command_ledger SET status=?, ${setClause} WHERE command_id=?`,
      [to, ...entries.map(([, value]) => value), current.commandId]);
  }
}
