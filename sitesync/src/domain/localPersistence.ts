export const DATABASE_NAME = 'site_sync.db' as const;
export const DATABASE_SCHEMA_VERSION = 1 as const;
export const M1_TIMESHEET_POLICY = 'M1_FIRST_IN_LAST_OUT_UTC' as const;

export type SyncStatus =
  | 'OFFLINE_PENDING_VERIFICATION'
  | 'PENDING_SYNC'
  | 'SYNCED'
  | 'FAILED'
  | 'CONFLICT';

export type CommandStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'RETRYABLE_FAILURE'
  | 'FAILED'
  | 'CONFLICT';

export interface ProjectContextRecord {
  projectId: string;
  organisationId: string;
  personId: string;
  projectRole: string;
  selectedAt: string;
  updatedAt: string;
}

export interface ProjectRosterRecord {
  projectId: string;
  personId: string;
  organisationId: string;
  companyId: string;
  displayName: string;
  projectRole: string;
  assignmentStatus: string;
  membershipStatus: string;
  syncedAt: string;
}

export interface AttendanceEventRecord {
  eventId: string;
  projectId: string;
  organisationId: string;
  personId: string;
  eventType: 'CHECK_IN' | 'CHECK_OUT';
  clientOccurredAt: string;
  workDateUtc: string;
  source: 'SELF' | 'QR_SCAN';
  syncStatus: SyncStatus;
  serverRevision: number | null;
  createdAt: string;
}

export interface AttendanceStateRecord {
  projectId: string;
  personId: string;
  organisationId: string;
  state: 'CHECKED_IN' | 'CHECKED_OUT';
  lastEventId: string;
  lastClientOccurredAt: string;
  syncStatus: SyncStatus;
  serverRevision: number | null;
  updatedAt: string;
}

export interface TimesheetRecord {
  projectId: string;
  personId: string;
  workDateUtc: string;
  firstInUtc: string | null;
  lastOutUtc: string | null;
  policy: typeof M1_TIMESHEET_POLICY;
  syncStatus: SyncStatus;
  serverRevision: number | null;
  updatedAt: string;
}

export interface CommandLedgerRecord {
  commandId: string;
  commandType: string;
  aggregateType: string;
  aggregateId: string;
  projectId: string;
  organisationId: string;
  personId: string;
  baseRevision: number;
  payloadJson: string;
  status: CommandStatus;
  attemptCount: number;
  nextAttemptAt: string | null;
  lastAttemptAt: string | null;
  serverStatus: string | null;
  serverResultJson: string | null;
  serverRevision: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictRecord {
  conflictId: string;
  commandId: string | null;
  aggregateType: string;
  aggregateId: string;
  localRevision: number;
  serverRevision: number;
  detailsJson: string;
  createdAt: string;
  resolvedAt: string | null;
}
