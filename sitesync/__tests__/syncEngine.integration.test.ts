import { closeDatabase, getDb, initializeDatabase } from '../src/database/localPersistence';
import { SyncWorker } from '../src/sync/syncWorker';
import type { SyncTransport } from '../src/sync/syncTransport';

const NOW = '2026-09-12T00:00:00.000Z';
const PAYLOAD = JSON.stringify({
  commandId: 'cmd-1', eventId: 'event-1', projectAssignmentId: 'assignment-1', projectId: 'project-1', personId: 'person-1',
  organisationId: 'org-1', companyId: 'company-1', source: 'SELF', eventType: 'ATTENDANCE_CHECK_IN', baseRevision: 0,
  clientOccurredAt: NOW, commandType: 'CHECK_IN', workDateUtc: '2026-09-12',
});

async function seedPendingCommand(overrides: Record<string, unknown> = {}) {
  const values = {
    commandId: 'cmd-1', projectId: 'project-1', personId: 'person-1', organisationId: 'org-1', companyId: 'company-1',
    commandType: 'CHECK_IN', source: 'SELF', baseRevision: 0, status: 'PENDING', attemptCount: 0, maxAttempts: 3,
    processingStartedAt: null, serverRespondedAt: null, syncedAt: null, nextRetryAt: null, serverResultJson: null,
    serverErrorCode: null, failureDiagnostics: null, createdAt: NOW, updatedAt: NOW, commandPayloadJson: PAYLOAD, ...overrides,
  };
  await getDb().execute(`INSERT INTO command_ledger (
    command_id, project_id, person_id, organisation_id, company_id, command_type, source, base_revision, status,
    attempt_count, max_attempts, processing_started_at, server_responded_at, synced_at, next_retry_at,
    server_result_json, server_error_code, failure_diagnostics, created_at, updated_at, command_payload_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, Object.values(values));
}

async function seedAttendanceProjection(commandId: string, eventId: string, revision: number, syncStatus = 'PENDING_SYNC') {
  await getDb().execute(`INSERT INTO attendance_event (
    event_id, command_id, project_id, organisation_id, company_id, project_assignment_id, person_id,
    event_type, client_occurred_at, work_date_utc, source, sync_status, created_at
  ) VALUES (?, ?, 'project-1', 'org-1', 'company-1', 'assignment-1', 'person-1', 'ATTENDANCE_CHECK_IN', ?, '2026-09-12', 'SELF', ?, ?)`,
  [eventId, commandId, NOW, syncStatus, NOW]);
  await getDb().execute(`INSERT INTO attendance_state (
    project_id, person_id, work_date_utc, organisation_id, company_id, project_assignment_id, state,
    last_event_id, last_command_id, last_client_occurred_at, current_revision, server_revision, sync_status, updated_at
  ) VALUES ('project-1', 'person-1', '2026-09-12', 'org-1', 'company-1', 'assignment-1', 'CHECKED_IN', ?, ?, ?, ?, NULL, ?, ?)`,
  [eventId, commandId, NOW, revision, syncStatus, NOW]);
  await getDb().execute(`INSERT INTO timesheet (
    project_id, person_id, work_date_utc, organisation_id, company_id, first_in_utc, last_out_utc, total_minutes,
    status, source_state_revision, sync_status, server_revision, updated_at
  ) VALUES ('project-1', 'person-1', '2026-09-12', 'org-1', 'company-1', ?, NULL, NULL, 'INCOMPLETE', ?, ?, NULL, ?)`,
  [NOW, revision, syncStatus, NOW]);
}

describe('M1.7 controlled sync integration', () => {
  beforeEach(async () => initializeDatabase(`m17-integration-${Date.now()}-${Math.random()}.db`));
  afterEach(async () => closeDatabase());

  it('synchronizes a pending command and preserves command history', async () => {
    await seedPendingCommand();
    const transport: SyncTransport = { submit: async request => ({ kind: 'ACCEPTED', serverRevision: request.command.baseRevision + 1, result: { accepted: true } }) };
    const worker = new SyncWorker(transport);
    const result = await worker.runOnce(NOW);
    expect(result.status).toBe('SUCCEEDED');
    const row = await getDb().execute(`SELECT status, attempt_count as attemptCount, synced_at as syncedAt FROM command_ledger WHERE command_id='cmd-1'`);
    expect(row.rows.item(0)).toMatchObject({ status: 'SUCCEEDED', attemptCount: 1 });
    expect(row.rows.item(0).syncedAt).toBe(NOW);
  });

  it('records a retryable transport failure durably', async () => {
    await seedPendingCommand();
    const transport: SyncTransport = { submit: async () => ({ kind: 'SERVER_ERROR', code: '503', message: 'unavailable', retryable: true }) };
    const worker = new SyncWorker(transport);
    const result = await worker.runOnce(NOW);
    expect(result.status).toBe('RETRY_SCHEDULED');
    const row = await getDb().execute(`SELECT status, next_retry_at as nextRetryAt FROM command_ledger WHERE command_id='cmd-1'`);
    expect(row.rows.item(0).status).toBe('RETRYABLE_FAILURE');
    expect(row.rows.item(0).nextRetryAt).toBeTruthy();
  });

  it('treats duplicate acceptance as successful and idempotent', async () => {
    await seedPendingCommand();
    await seedAttendanceProjection('cmd-1', 'event-1', 1);
    let submissions = 0;
    const transport: SyncTransport = { submit: async request => {
      submissions += 1;
      return { kind: 'DUPLICATE_ACCEPTED', serverRevision: request.command.baseRevision + 1, result: { duplicate: true } };
    } };
    const worker = new SyncWorker(transport);
    expect((await worker.runOnce(NOW)).status).toBe('SUCCEEDED');
    expect((await worker.runOnce(NOW)).status).toBe('IDLE');
    expect(submissions).toBe(1);
    const row = await getDb().execute(`SELECT status, sync_status as syncStatus, server_revision as serverRevision FROM timesheet WHERE project_id='project-1' AND person_id='person-1' AND work_date_utc='2026-09-12'`);
    expect(row.rows.item(0)).toMatchObject({ status: 'INCOMPLETE', syncStatus: 'ONLINE_VERIFIED', serverRevision: 1 });
  });

  it('records revision conflict without promoting the local projection to verified', async () => {
    await seedPendingCommand();
    await seedAttendanceProjection('cmd-1', 'event-1', 1);
    const transport: SyncTransport = { submit: async () => ({
      kind: 'REVISION_CONFLICT', serverRevision: 7, serverPayload: '{"server":"newer"}', reasonCode: 'STALE_REVISION',
    }) };
    const worker = new SyncWorker(transport);
    expect((await worker.runOnce(NOW)).status).toBe('CONFLICT');
    const command = await getDb().execute(`SELECT status, server_error_code as serverErrorCode FROM command_ledger WHERE command_id='cmd-1'`);
    expect(command.rows.item(0)).toMatchObject({ status: 'CONFLICT', serverErrorCode: 'STALE_REVISION' });
    const projection = await getDb().execute(`SELECT sync_status as syncStatus, server_revision as serverRevision FROM timesheet WHERE project_id='project-1' AND person_id='person-1' AND work_date_utc='2026-09-12'`);
    expect(projection.rows.item(0)).toMatchObject({ syncStatus: 'CONFLICT', serverRevision: 7 });
    const conflict = await getDb().execute(`SELECT status, server_payload as serverPayload, server_revision as serverRevision FROM conflict WHERE command_id='cmd-1'`);
    expect(conflict.rows.item(0)).toMatchObject({ status: 'OPEN', serverPayload: '{"server":"newer"}', serverRevision: 7 });
  });

  it('resumes an interrupted processing claim after restart without exceeding the attempt budget', async () => {
    await seedPendingCommand({ status: 'PROCESSING', attemptCount: 1, processingStartedAt: '2026-09-11T23:50:00.000Z' });
    let submissions = 0;
    const transport: SyncTransport = { submit: async request => {
      submissions += 1;
      return { kind: 'ACCEPTED', serverRevision: request.command.baseRevision + 1, result: { resumed: true } };
    } };
    const worker = new SyncWorker(transport);
    expect((await worker.runOnce(NOW)).status).toBe('SUCCEEDED');
    expect(submissions).toBe(1);
    const row = await getDb().execute(`SELECT status, attempt_count as attemptCount FROM command_ledger WHERE command_id='cmd-1'`);
    expect(row.rows.item(0)).toMatchObject({ status: 'SUCCEEDED', attemptCount: 2 });
  });

  it('terminalizes a stale claim at max attempts instead of replaying it', async () => {
    await seedPendingCommand({ status: 'PROCESSING', attemptCount: 3, maxAttempts: 3, processingStartedAt: '2026-09-11T23:50:00.000Z' });
    let submissions = 0;
    const transport: SyncTransport = { submit: async () => {
      submissions += 1;
      return { kind: 'ACCEPTED', serverRevision: 1, result: { unexpected: true } };
    } };
    const worker = new SyncWorker(transport);
    expect((await worker.runOnce(NOW)).status).toBe('IDLE');
    expect(submissions).toBe(0);
    const row = await getDb().execute(`SELECT status, server_error_code as serverErrorCode FROM command_ledger WHERE command_id='cmd-1'`);
    expect(row.rows.item(0)).toMatchObject({ status: 'FAILED', serverErrorCode: 'MAX_ATTEMPTS' });
  });

  it('does not let an older command verify a newer timesheet projection', async () => {
    await seedPendingCommand({ commandId: 'cmd-1' });
    await seedAttendanceProjection('cmd-1', 'event-1', 1);
    await seedPendingCommand({ commandId: 'cmd-2', createdAt: '2026-09-12T00:00:01.000Z', baseRevision: 1, commandPayloadJson: PAYLOAD.replace('cmd-1', 'cmd-2').replace('event-1', 'event-2') });
    await getDb().execute(`INSERT INTO attendance_event (
      event_id, command_id, project_id, organisation_id, company_id, project_assignment_id, person_id,
      event_type, client_occurred_at, work_date_utc, source, sync_status, created_at
    ) VALUES ('event-2', 'cmd-2', 'project-1', 'org-1', 'company-1', 'assignment-1', 'person-1', 'ATTENDANCE_CHECK_OUT', ?, '2026-09-12', 'SELF', 'PENDING_SYNC', ?)`, [NOW, NOW]);
    await getDb().execute(`UPDATE attendance_state SET state='CHECKED_OUT', last_event_id='event-2', last_command_id='cmd-2', current_revision=2, sync_status='PENDING_SYNC' WHERE project_id='project-1' AND person_id='person-1' AND work_date_utc='2026-09-12'`);
    await getDb().execute(`UPDATE timesheet SET last_out_utc=?, total_minutes=480, status='COMPLETE', source_state_revision=2, sync_status='PENDING_SYNC' WHERE project_id='project-1' AND person_id='person-1' AND work_date_utc='2026-09-12'`, [NOW]);
    const transport: SyncTransport = { submit: async request => ({ kind: 'ACCEPTED', serverRevision: 1, result: { commandId: request.command.commandId } }) };
    const worker = new SyncWorker(transport);
    expect((await worker.runOnce(NOW)).status).toBe('SUCCEEDED');
    const projection = await getDb().execute(`SELECT sync_status as syncStatus, server_revision as serverRevision, source_state_revision as sourceRevision FROM timesheet WHERE project_id='project-1' AND person_id='person-1' AND work_date_utc='2026-09-12'`);
    expect(projection.rows.item(0)).toMatchObject({ syncStatus: 'PENDING_SYNC', serverRevision: null, sourceRevision: 2 });
  });
});
