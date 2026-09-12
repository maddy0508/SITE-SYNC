import type { ApplicationContext } from '../identity/projectContext';
import type { ProjectAssignment } from '../identity/identityService';
import type {
  AttendanceEventRecord,
  AttendanceStateRecord,
  CommandLedgerRecord,
  SyncStatus,
  TimesheetRecord,
} from '../domain/localPersistence';
import { M1_TIMESHEET_POLICY } from '../domain/localPersistence';
import { withTransaction, validateUtcTimestamp, getProjectRoster } from '../database/localPersistence';
import { authorizeAttendance, targetAssignmentMatchesTrustedRoster } from './attendanceAuthorization';
import { buildAttendanceCommand, type AttendanceCommand } from './attendanceCommands';

export type AttendanceAction = 'CHECK_IN' | 'CHECK_OUT';

export type AttendanceErrorCode =
  | 'ALREADY_CHECKED_IN'
  | 'NOT_CHECKED_IN'
  | 'EVENT_TIME_BEFORE_LAST'
  | 'INVALID_CONTEXT'
  | 'PERSISTENCE_FAILURE';

export class AttendanceError extends Error {
  readonly code: AttendanceErrorCode;

  constructor(code: AttendanceErrorCode, message: string) {
    super(message);
    this.name = 'AttendanceError';
    this.code = code;
  }
}

export interface AttendanceMutationRequest {
  context: ApplicationContext;
  projectId: string;
  targetPersonId: string;
  targetAssignment?: ProjectAssignment | null;
  source: 'SELF' | 'QR_SCAN';
  action: AttendanceAction;
  clientOccurredAt: string;
  online: boolean;
  commandId?: string;
  eventId?: string;
  maxAttempts?: number;
}

export interface AttendanceMutationResult {
  command: CommandLedgerRecord;
  event: AttendanceEventRecord;
  state: AttendanceStateRecord;
  timesheet: TimesheetRecord;
}

function uuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function mutationSyncStatus(online: boolean): SyncStatus {
  return online ? 'PENDING_SYNC' : 'OFFLINE_PENDING_VERIFICATION';
}

function deriveTimesheet(
  events: AttendanceEventRecord[],
  state: AttendanceStateRecord,
): TimesheetRecord {
  const ins = events.filter((event) => event.eventType === 'ATTENDANCE_CHECK_IN');
  const outs = events.filter((event) => event.eventType === 'ATTENDANCE_CHECK_OUT');
  const firstInUtc = ins.length > 0 ? ins[0].clientOccurredAt : null;
  const lastOutUtc = outs.length > 0 ? outs[outs.length - 1].clientOccurredAt : null;
  const totalMinutes = firstInUtc && lastOutUtc
    ? Math.max(0, Math.floor((Date.parse(lastOutUtc) - Date.parse(firstInUtc)) / 60000))
    : null;

  return {
    projectId: state.projectId,
    personId: state.personId,
    workDateUtc: state.workDateUtc,
    organisationId: state.organisationId,
    companyId: state.companyId,
    firstInUtc,
    lastOutUtc,
    totalMinutes,
    status: firstInUtc && lastOutUtc ? 'COMPLETE' : 'INCOMPLETE',
    policy: M1_TIMESHEET_POLICY,
    sourceStateRevision: state.currentRevision,
    syncStatus: state.syncStatus,
    serverRevision: state.serverRevision,
    updatedAt: state.updatedAt,
  };
}

function buildCommand(request: AttendanceMutationRequest, command: AttendanceCommand): CommandLedgerRecord {
  const now = command.clientOccurredAt;
  return {
    commandId: command.commandId,
    projectId: command.projectId,
    personId: command.personId,
    organisationId: command.organisationId,
    companyId: command.companyId,
    commandType: command.commandType,
    source: command.source,
    baseRevision: command.baseRevision,
    status: 'PENDING',
    attemptCount: 0,
    maxAttempts: request.maxAttempts ?? 3,
    processingStartedAt: null,
    serverRespondedAt: null,
    syncedAt: null,
    nextRetryAt: null,
    serverResultJson: null,
    serverErrorCode: null,
    failureDiagnostics: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function mutate(request: AttendanceMutationRequest): Promise<AttendanceMutationResult> {
  if (!request.context.hasProjectAccess) {
    throw new AttendanceError('INVALID_CONTEXT', 'Authenticated actor has no active project access');
  }
  if (!validateUtcTimestamp(request.clientOccurredAt)) {
    throw new AttendanceError('INVALID_CONTEXT', 'clientOccurredAt must be a valid UTC timestamp');
  }

  if (request.source === 'QR_SCAN') {
    const trustedRoster = await getProjectRoster(request.projectId, request.targetPersonId);
    if (!request.targetAssignment || !trustedRoster || !targetAssignmentMatchesTrustedRoster(request.targetAssignment, trustedRoster)) {
      throw new AttendanceError('INVALID_CONTEXT', 'Target assignment does not match trusted local project roster');
    }
  }

  const authorization = authorizeAttendance(request);
  if (!authorization.allowed) {
    throw new AttendanceError('INVALID_CONTEXT', authorization.reason);
  }

  const targetAssignment = authorization.targetAssignment;
  const personId = targetAssignment.personId;
  const commandId = request.commandId ?? uuidV4();
  const eventId = request.eventId ?? uuidV4();
  const eventType = request.action === 'CHECK_IN' ? 'ATTENDANCE_CHECK_IN' : 'ATTENDANCE_CHECK_OUT';

  return withTransaction(async (tx) => {
    const existingResult = await tx.executeSql(
      `SELECT project_id as projectId, person_id as personId, work_date_utc as workDateUtc,
        organisation_id as organisationId, company_id as companyId, project_assignment_id as projectAssignmentId,
        state, last_event_id as lastEventId, last_command_id as lastCommandId,
        last_client_occurred_at as lastClientOccurredAt, current_revision as currentRevision,
        server_revision as serverRevision, sync_status as syncStatus, updated_at as updatedAt
       FROM attendance_state WHERE project_id = ? AND person_id = ? AND work_date_utc = ?`,
      [request.projectId, personId, request.clientOccurredAt.substring(0, 10)],
    );
    const existing = existingResult.rows.length > 0
      ? existingResult.rows.item(0) as unknown as AttendanceStateRecord
      : null;

    if (existing && request.clientOccurredAt < existing.lastClientOccurredAt) {
      throw new AttendanceError('EVENT_TIME_BEFORE_LAST', 'Attendance event timestamp precedes the current local attendance state');
    }
    if (request.action === 'CHECK_IN' && existing?.state === 'CHECKED_IN') {
      throw new AttendanceError('ALREADY_CHECKED_IN', 'Worker is already checked in for this work date');
    }
    if (request.action === 'CHECK_OUT' && existing?.state !== 'CHECKED_IN') {
      throw new AttendanceError('NOT_CHECKED_IN', 'Worker cannot check out without an active local check-in');
    }

    const baseRevision = existing?.currentRevision ?? 0;
    const command = buildAttendanceCommand({
      commandId,
      eventId,
      projectAssignmentId: targetAssignment.id,
      projectId: request.projectId,
      personId,
      organisationId: request.context.organisation.id,
      companyId: targetAssignment.companyId,
      source: request.source,
      eventType,
      baseRevision,
      clientOccurredAt: request.clientOccurredAt,
    });
    const commandRecord = buildCommand(request, command);
    const syncStatus = mutationSyncStatus(request.online);
    const nextRevision = baseRevision + 1;
    const nextState: AttendanceStateRecord = {
      projectId: command.projectId,
      personId: command.personId,
      workDateUtc: command.workDateUtc,
      organisationId: command.organisationId,
      companyId: command.companyId,
      projectAssignmentId: command.projectAssignmentId,
      state: request.action === 'CHECK_IN' ? 'CHECKED_IN' : 'CHECKED_OUT',
      lastEventId: command.eventId,
      lastCommandId: command.commandId,
      lastClientOccurredAt: command.clientOccurredAt,
      currentRevision: nextRevision,
      serverRevision: existing?.serverRevision ?? null,
      syncStatus,
      updatedAt: command.clientOccurredAt,
    };
    const event: AttendanceEventRecord = {
      eventId: command.eventId,
      commandId: command.commandId,
      projectId: command.projectId,
      organisationId: command.organisationId,
      companyId: command.companyId,
      projectAssignmentId: command.projectAssignmentId,
      personId: command.personId,
      eventType: command.eventType,
      clientOccurredAt: command.clientOccurredAt,
      workDateUtc: command.workDateUtc,
      source: command.source,
      syncStatus,
      createdAt: command.clientOccurredAt,
    };

    await tx.executeSql(
      `INSERT INTO command_ledger (
        command_id, project_id, person_id, organisation_id, company_id, command_type, source,
        base_revision, status, attempt_count, max_attempts, processing_started_at,
        server_responded_at, synced_at, next_retry_at, server_result_json, server_error_code,
        failure_diagnostics, created_at, updated_at, command_payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        commandRecord.commandId, commandRecord.projectId, commandRecord.personId,
        commandRecord.organisationId, commandRecord.companyId, commandRecord.commandType,
        commandRecord.source, commandRecord.baseRevision, commandRecord.status,
        commandRecord.attemptCount, commandRecord.maxAttempts, commandRecord.processingStartedAt,
        commandRecord.serverRespondedAt, commandRecord.syncedAt, commandRecord.nextRetryAt,
        commandRecord.serverResultJson, commandRecord.serverErrorCode, commandRecord.failureDiagnostics,
        commandRecord.createdAt, commandRecord.updatedAt, JSON.stringify(command),
      ],
    );

    await tx.executeSql(
      `INSERT INTO attendance_event (
        event_id, command_id, project_id, organisation_id, company_id, project_assignment_id,
        person_id, event_type, client_occurred_at, work_date_utc, source, sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.eventId, event.commandId, event.projectId, event.organisationId, event.companyId,
        event.projectAssignmentId, event.personId, event.eventType, event.clientOccurredAt,
        event.workDateUtc, event.source, event.syncStatus, event.createdAt,
      ],
    );

    await tx.executeSql(
      `INSERT INTO attendance_state (
        project_id, person_id, work_date_utc, organisation_id, company_id, project_assignment_id,
        state, last_event_id, last_command_id, last_client_occurred_at, current_revision,
        server_revision, sync_status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, person_id, work_date_utc) DO UPDATE SET
        organisation_id=excluded.organisation_id, company_id=excluded.company_id,
        project_assignment_id=excluded.project_assignment_id, state=excluded.state,
        last_event_id=excluded.last_event_id, last_command_id=excluded.last_command_id,
        last_client_occurred_at=excluded.last_client_occurred_at,
        current_revision=excluded.current_revision, server_revision=excluded.server_revision,
        sync_status=excluded.sync_status, updated_at=excluded.updated_at`,
      [
        nextState.projectId, nextState.personId, nextState.workDateUtc, nextState.organisationId,
        nextState.companyId, nextState.projectAssignmentId, nextState.state, nextState.lastEventId,
        nextState.lastCommandId, nextState.lastClientOccurredAt, nextState.currentRevision,
        nextState.serverRevision, nextState.syncStatus, nextState.updatedAt,
      ],
    );

    const eventsResult = await tx.executeSql(
      `SELECT event_id as eventId, command_id as commandId, project_id as projectId,
        organisation_id as organisationId, company_id as companyId,
        project_assignment_id as projectAssignmentId, person_id as personId,
        event_type as eventType, client_occurred_at as clientOccurredAt,
        work_date_utc as workDateUtc, source, sync_status as syncStatus, created_at as createdAt
       FROM attendance_event WHERE project_id = ? AND person_id = ? AND work_date_utc = ?
       ORDER BY client_occurred_at ASC`,
      [command.projectId, command.personId, command.workDateUtc],
    );
    const events = Array.from({ length: eventsResult.rows.length }, (_, index) =>
      eventsResult.rows.item(index) as unknown as AttendanceEventRecord);
    const timesheet = deriveTimesheet(events, nextState);

    await tx.executeSql(
      `INSERT INTO timesheet (
        project_id, person_id, work_date_utc, organisation_id, company_id, first_in_utc,
        last_out_utc, total_minutes, status, policy, source_state_revision, sync_status,
        server_revision, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, person_id, work_date_utc) DO UPDATE SET
        organisation_id=excluded.organisation_id, company_id=excluded.company_id,
        first_in_utc=excluded.first_in_utc, last_out_utc=excluded.last_out_utc,
        total_minutes=excluded.total_minutes, status=excluded.status, policy=excluded.policy,
        source_state_revision=excluded.source_state_revision, sync_status=excluded.sync_status,
        server_revision=excluded.server_revision, updated_at=excluded.updated_at`,
      [
        timesheet.projectId, timesheet.personId, timesheet.workDateUtc, timesheet.organisationId,
        timesheet.companyId, timesheet.firstInUtc, timesheet.lastOutUtc, timesheet.totalMinutes,
        timesheet.status, timesheet.policy, timesheet.sourceStateRevision, timesheet.syncStatus,
        timesheet.serverRevision, timesheet.updatedAt,
      ],
    );

    return { command: commandRecord, event, state: nextState, timesheet };
  });
}

export const AttendanceService = {
  checkIn: (request: Omit<AttendanceMutationRequest, 'action'>) => mutate({ ...request, action: 'CHECK_IN' }),
  checkOut: (request: Omit<AttendanceMutationRequest, 'action'>) => mutate({ ...request, action: 'CHECK_OUT' }),
};
