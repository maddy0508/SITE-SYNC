/**
 * SITE-SYNC M1.3 — local persistence contract.
 *
 * Locked semantics:
 *  - Local SQLite is the UI source of truth; the server is authoritative.
 *  - Roster is NEVER authoritative; offline validation is always provisional.
 *  - Timestamps are UTC ISO-8601; workDateUtc is 'YYYY-MM-DD'.
 *  - Events / ledger / conflicts are append-only except documented
 *    metadata (status) transitions.
 *  - Single ProjectContext row per person; purge tenant data on logout.
 */

export const DATABASE_NAME = 'site_sync.db' as const;
export const DATABASE_SCHEMA_VERSION = 1 as const;
export const M1_TIMESHEET_POLICY = 'M1_FIRST_IN_LAST_OUT_UTC' as const;

/** Defines how long a PROCESSING claim may age before startup resets it. */
export const STALE_PROCESSING_THRESHOLD_MS = 5 * 60 * 1000;

// ---------- Locked status vocabularies ----------

export const SYNC_STATUSES = [
  'OFFLINE_CACHED',
  'OFFLINE_PENDING_VERIFICATION',
  'PENDING_SYNC',
  'ONLINE_VERIFIED',
  'FAILED',
  'CONFLICT',
] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const COMMAND_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'RETRYABLE_FAILURE',
  'FAILED',
  'CONFLICT',
] as const;
export type CommandStatus = (typeof COMMAND_STATUSES)[number];

export const CONFLICT_STATUSES = ['OPEN', 'RESOLVED'] as const;
export type ConflictStatus = (typeof CONFLICT_STATUSES)[number];

export const DEVICE_SESSION_STATUSES = ['ACTIVE', 'REVOKED'] as const;
export type DeviceSessionStatus = (typeof DEVICE_SESSION_STATUSES)[number];

export const ATTENDANCE_EVENT_TYPES = [
  'ATTENDANCE_CHECK_IN',
  'ATTENDANCE_CHECK_OUT',
] as const;
export type AttendanceEventType = (typeof ATTENDANCE_EVENT_TYPES)[number];

export const ATTENDANCE_STATE_VALUES = ['CHECKED_IN', 'CHECKED_OUT'] as const;
export type AttendanceStateValue = (typeof ATTENDANCE_STATE_VALUES)[number];

export const TIMESHEET_STATUSES = ['COMPLETE', 'INCOMPLETE'] as const;
export type TimesheetStatus = (typeof TIMESHEET_STATUSES)[number];

export const COMMAND_SOURCES = ['SELF', 'QR_SCAN'] as const;
export type CommandSource = (typeof COMMAND_SOURCES)[number];

// ---------- Status transition guards ----------

const COMMAND_TRANSITIONS: Record<CommandStatus, readonly CommandStatus[]> = {
  PENDING: ['PROCESSING', 'FAILED', 'CONFLICT'],
  PROCESSING: ['SUCCEEDED', 'RETRYABLE_FAILURE', 'FAILED', 'CONFLICT', 'PENDING'],
  RETRYABLE_FAILURE: ['PROCESSING', 'FAILED'],
  SUCCEEDED: [],
  FAILED: [],
  CONFLICT: [],
};

export function isTerminalCommand(s: CommandStatus): boolean {
  return COMMAND_TRANSITIONS[s].length === 0;
}

export function canTransitionCommand(from: CommandStatus, to: CommandStatus): boolean {
  return COMMAND_TRANSITIONS[from].includes(to);
}

/**
 * RETRYABLE_FAILURE transitions to FAILED when attempts are exhausted.
 */
export function isRetryExhausted(attemptCount: number, maxAttempts: number): boolean {
  return attemptCount >= maxAttempts;
}

/** Returns the next status for a command after a failure, considering retry policy. */
export function nextStatusAfterFailure(attemptCount: number, maxAttempts: number): CommandStatus {
  return isRetryExhausted(attemptCount, maxAttempts) ? 'FAILED' : 'RETRYABLE_FAILURE';
}

/**
 * Sync status transitions are event-driven, not connectivity-driven.
 * - ONLINE_VERIFIED → PENDING_SYNC  : only when a new local mutation occurs.
 * - ONLINE_VERIFIED → OFFLINE_PENDING_VERIFICATION : when re-verification is explicitly required.
 * - Going offline does not change status.
 */
const SYNC_TRANSITIONS: Record<SyncStatus, readonly SyncStatus[]> = {
  OFFLINE_CACHED: ['OFFLINE_PENDING_VERIFICATION', 'PENDING_SYNC'],
  OFFLINE_PENDING_VERIFICATION: ['PENDING_SYNC', 'ONLINE_VERIFIED', 'FAILED', 'CONFLICT'],
  PENDING_SYNC: ['ONLINE_VERIFIED', 'FAILED', 'CONFLICT'],
  ONLINE_VERIFIED: ['PENDING_SYNC', 'OFFLINE_PENDING_VERIFICATION'],
  FAILED: [],
  CONFLICT: [],
};

export function canTransitionSync(from: SyncStatus, to: SyncStatus): boolean {
  return SYNC_TRANSITIONS[from].includes(to);
}

// ---------- Records ----------

export interface LocalDeviceSessionRecord {
  userId: string;
  deviceInstallationId: string;
  /** Credential material; secret-at-rest protection is delegated to the device security layer. */
  installationKey: string;
  status: DeviceSessionStatus;
  createdAt: string; // UTC ISO-8601
  lastVerifiedAt: string; // UTC ISO-8601
  revision: number; // optimistic lock / sequence
  updatedAt: string;
}

/**
 * ProjectContextRecord represents the user's currently selected project context.
 * Exactly one row exists per person (personId is the primary key).
 * The DDL must enforce this invariant.
 */
export interface ProjectContextRecord {
  personId: string; // PK
  projectId: string;
  organisationId: string;
  companyId: string;
  companyMembershipId: string;
  projectRole: string; // Opaque string; vocabulary validation is deferred to command layer.
  selectedAt: string;
  updatedAt: string;
}

export interface ProjectRosterRecord {
  projectId: string; // PK part
  personId: string; // PK part
  organisationId: string;
  companyId: string;
  displayName: string;
  projectRole: string; // Opaque string
  assignmentStatus: string; // Opaque string
  membershipStatus: string; // Opaque string
  syncedAt: string; // diagnostic only; roster never authoritative
}

export interface AttendanceEventRecord {
  eventId: string; // PK
  commandId: string; // FK to CommandLedgerRecord.commandId
  projectId: string;
  organisationId: string;
  companyId: string;
  projectAssignmentId: string;
  personId: string;
  eventType: AttendanceEventType;
  clientOccurredAt: string;
  workDateUtc: string; // 'YYYY-MM-DD'
  source: CommandSource;
  syncStatus: SyncStatus;
  createdAt: string;
}

export interface AttendanceStateRecord {
  projectId: string; // PK part
  personId: string; // PK part
  workDateUtc: string; // PK part
  organisationId: string;
  companyId: string;
  projectAssignmentId: string;
  state: AttendanceStateValue;
  lastEventId: string; // FK to AttendanceEventRecord.eventId
  lastCommandId: string; // FK to CommandLedgerRecord.commandId
  lastClientOccurredAt: string;
  currentRevision: number; // source of next command baseRevision
  serverRevision: number | null; // last server-confirmed revision
  syncStatus: SyncStatus;
  updatedAt: string;
}

export interface TimesheetRecord {
  projectId: string; // PK part
  personId: string; // PK part
  workDateUtc: string; // PK part
  organisationId: string;
  companyId: string;
  firstInUtc: string | null;
  lastOutUtc: string | null;
  totalMinutes: number | null; // >= 0 when non-null
  status: TimesheetStatus;
  policy: typeof M1_TIMESHEET_POLICY;
  sourceStateRevision: number; // must match the revision used to derive the timesheet
  syncStatus: SyncStatus;
  serverRevision: number | null;
  updatedAt: string;
}

/**
 * CommandLedgerRecord tracks each command's lifecycle.
 * Fields are designed to support retries, diagnostics, and server round-trip.
 */
export interface CommandLedgerRecord {
  commandId: string; // PK
  projectId: string;
  personId: string;
  organisationId: string;
  companyId: string;
  /** Opaque command type; command-specific validation is handled by the command layer. */
  commandType: string;
  source: CommandSource;
  baseRevision: number; // AttendanceStateRecord.currentRevision at time of command
  status: CommandStatus;
  attemptCount: number; // >= 0
  maxAttempts: number; // > 0
  processingStartedAt: string | null; // UTC ISO-8601; set when status becomes PROCESSING
  /** Server response timestamp for any server round-trip (success or failure). */
  serverRespondedAt: string | null;
  /** Server-confirmed terminal state timestamp. */
  syncedAt: string | null;
  nextRetryAt: string | null; // UTC ISO-8601; schedule for next retry if RETRYABLE_FAILURE
  /** Structured server result payload (e.g., response body) as JSON string. */
  serverResultJson: string | null;
  /** Server error code, if applicable (e.g., HTTP status, business error code). */
  serverErrorCode: string | null;
  /** Sanitised diagnostic information (not raw stack traces) for operational troubleshooting. */
  failureDiagnostics: string | null;
  createdAt: string; // UTC ISO-8601
  updatedAt: string;
}

/**
 * ConflictRecord stores details of detected conflicts.
 * Conflicts are revision-based (optimistic concurrency) in M1.3.
 */
export interface ConflictRecord {
  conflictId: string; // PK
  commandId: string; // FK to CommandLedgerRecord.commandId
  entityType: string; // e.g., 'ATTENDANCE_EVENT', 'ATTENDANCE_STATE', 'TIMESHEET'
  entityId: string; // JSON-serialised composite key
  localRevision: number;
  serverRevision: number; // required for revision-based conflicts
  localPayload: string | null; // JSON of local entity snapshot
  serverPayload: string | null; // JSON of server entity snapshot
  status: ConflictStatus;
  reasonCode: string; // machine-readable conflict reason
  reason: string | null; // human-readable description
  resolvedAt: string | null; // UTC ISO-8601
  resolvedBy: string | null; // userId or system
  resolutionStrategy: string | null; // e.g., 'LOCAL_WINS', 'SERVER_WINS', 'MANUAL'
  createdAt: string;
  updatedAt: string;
}

// ---------- DDL expectations (documentation) ----------
//
// SQLite implementation must enforce:
//   - attendance_state PK: (project_id, person_id, work_date_utc)
//   - project_roster PK: (project_id, person_id)
//   - attendance_event.command_id → command_ledger.command_id (NOT NULL FK)
//   - attendance_state.last_event_id → attendance_event.event_id (FK)
//   - attendance_state.last_command_id → command_ledger.command_id (FK)
//   - event lookup index: (project_id, person_id, work_date_utc)
//   - ledger retry index: (status, next_retry_at)
//   - Appropriate foreign keys for project/person/company/assignment relationships where locally represented
//   - UTC ISO-8601 timestamp validation at the repository boundary
//   - YYYY-MM-DD validation for workDateUtc
//   - Exactly one ProjectContextRecord per person
//   - command_ledger.command_id UNIQUE / PK
//   - maxAttempts > 0, attemptCount >= 0
//   - totalMinutes >= 0 when non-null
//   - timesheet.source_state_revision must match the state revision used to derive it
//   - Logout purge must remove tenant-scoped local records in a transaction
