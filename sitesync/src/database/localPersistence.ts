// src/database/localPersistence.ts

import { open, close, SQLiteDatabase, Transaction } from './sqliteAdapter';
import {
  canTransitionCommand,
  LocalDeviceSessionRecord,
  ProjectContextRecord,
  ProjectRosterRecord,
  CommandLedgerRecord,
  AttendanceEventRecord,
  AttendanceStateRecord,
  TimesheetRecord,
  ConflictRecord,
} from '../domain/localPersistence';

export const DATABASE_NAME = 'site_sync.db';
export const DATABASE_SCHEMA_VERSION = 1;

let dbInstance: SQLiteDatabase | null = null;
let dbNameInUse = DATABASE_NAME;
let initPromise: Promise<void> | null = null;

/** Strict UTC ISO-8601 with optional fractional seconds; storage precision is milliseconds. */
export function validateUtcTimestamp(value: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
  if (!regex.test(value)) return false;
  const date = new Date(value);
  const norm = date.toISOString();
  const base = norm.substring(0, 19);
  if (!value.startsWith(base)) return false;
  const fracValue = value.substring(19);
  const fracNorm = norm.substring(19);
  if (fracValue === 'Z' && fracNorm === '.000Z') return true;
  if (fracValue.startsWith('.') && fracNorm.startsWith('.')) {
    const v = fracValue.substring(1).padEnd(3, '0').slice(0, 3);
    const n = fracNorm.substring(1).padEnd(3, '0').slice(0, 3);
    return v === n;
  }
  return false;
}

export function validateWorkDateUtc(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export async function initializeDatabase(databaseName: string = DATABASE_NAME): Promise<void> {
  if (dbInstance) {
    if (dbNameInUse !== databaseName) throw new Error(`Database already initialized with ${dbNameInUse}`);
    return;
  }
  if (initPromise) return initPromise;

  dbNameInUse = databaseName;
  initPromise = (async () => {
    try {
      dbInstance = await open({ name: databaseName });
      await dbInstance.execute('PRAGMA foreign_keys = ON;');
      const fkResult = await dbInstance.execute('PRAGMA foreign_keys;');
      if (fkResult.rows.item(0)?.foreign_keys !== 1) throw new Error('Foreign keys could not be enabled');

      const versionResult = await dbInstance.execute('PRAGMA user_version;');
      const currentVersion = versionResult.rows.item(0)?.user_version ?? 0;
      if (currentVersion === 0) {
        await createSchema(dbInstance);
        await dbInstance.execute(`PRAGMA user_version = ${DATABASE_SCHEMA_VERSION};`);
      } else if (currentVersion !== DATABASE_SCHEMA_VERSION) {
        throw new Error(`Unsupported schema version ${currentVersion}. Expected ${DATABASE_SCHEMA_VERSION}`);
      }
      await verifySchema(dbInstance);
    } catch (e) {
      const failedDb = dbInstance;
      dbInstance = null;
      initPromise = null;
      dbNameInUse = DATABASE_NAME;
      if (failedDb) {
        try { await close(failedDb); } catch { /* preserve original error */ }
      }
      throw e;
    }
  })();
  return initPromise;
}

/** Closes the database and resets singleton state. Exposed for tests and clean-install simulation. */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await close(dbInstance);
    dbInstance = null;
  }
  initPromise = null;
  dbNameInUse = DATABASE_NAME;
}

async function createSchema(db: SQLiteDatabase): Promise<void> {
  await db.transactionAsync(async (tx: Transaction) => {
    await tx.executeSql(`CREATE TABLE local_device_session (
      user_id TEXT PRIMARY KEY,
      device_installation_id TEXT NOT NULL,
      installation_key TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'REVOKED')),
      created_at TEXT NOT NULL,
      last_verified_at TEXT NOT NULL,
      revision INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );`);

    await tx.executeSql(`CREATE TABLE project_context (
      person_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      organisation_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      company_membership_id TEXT NOT NULL,
      project_role TEXT NOT NULL,
      selected_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`);

    await tx.executeSql(`CREATE TABLE project_roster (
      project_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      organisation_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      project_role TEXT NOT NULL,
      assignment_status TEXT NOT NULL,
      membership_status TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      PRIMARY KEY (project_id, person_id)
    );`);

    await tx.executeSql(`CREATE TABLE command_ledger (
      command_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      organisation_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      command_type TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('SELF', 'QR_SCAN')),
      base_revision INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('PENDING','PROCESSING','SUCCEEDED','RETRYABLE_FAILURE','FAILED','CONFLICT')),
      attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
      max_attempts INTEGER NOT NULL CHECK (max_attempts > 0),
      processing_started_at TEXT,
      server_responded_at TEXT,
      synced_at TEXT,
      next_retry_at TEXT,
      server_result_json TEXT,
      server_error_code TEXT,
      failure_diagnostics TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`);

    await tx.executeSql(`CREATE TABLE attendance_event (
      event_id TEXT PRIMARY KEY,
      command_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      organisation_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      project_assignment_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (event_type IN ('ATTENDANCE_CHECK_IN','ATTENDANCE_CHECK_OUT')),
      client_occurred_at TEXT NOT NULL,
      work_date_utc TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('SELF','QR_SCAN')),
      sync_status TEXT NOT NULL CHECK (sync_status IN ('OFFLINE_CACHED','OFFLINE_PENDING_VERIFICATION','PENDING_SYNC','ONLINE_VERIFIED','FAILED','CONFLICT')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (command_id) REFERENCES command_ledger(command_id) ON DELETE RESTRICT
    );`);

    await tx.executeSql(`CREATE TRIGGER prevent_attendance_event_update BEFORE UPDATE ON attendance_event BEGIN
      SELECT RAISE(FAIL, 'Attendance events are append-only and cannot be updated');
    END;`);
    await tx.executeSql(`CREATE TRIGGER prevent_attendance_event_delete BEFORE DELETE ON attendance_event BEGIN
      SELECT RAISE(FAIL, 'Attendance events are append-only and cannot be deleted');
    END;`);

    await tx.executeSql(`CREATE TABLE attendance_state (
      project_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      work_date_utc TEXT NOT NULL,
      organisation_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      project_assignment_id TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('CHECKED_IN','CHECKED_OUT')),
      last_event_id TEXT NOT NULL,
      last_command_id TEXT NOT NULL,
      last_client_occurred_at TEXT NOT NULL,
      current_revision INTEGER NOT NULL,
      server_revision INTEGER,
      sync_status TEXT NOT NULL CHECK (sync_status IN ('OFFLINE_CACHED','OFFLINE_PENDING_VERIFICATION','PENDING_SYNC','ONLINE_VERIFIED','FAILED','CONFLICT')),
      updated_at TEXT NOT NULL,
      PRIMARY KEY (project_id, person_id, work_date_utc),
      FOREIGN KEY (last_event_id) REFERENCES attendance_event(event_id) ON DELETE RESTRICT,
      FOREIGN KEY (last_command_id) REFERENCES command_ledger(command_id) ON DELETE RESTRICT
    );`);

    await tx.executeSql(`CREATE TABLE timesheet (
      project_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      work_date_utc TEXT NOT NULL,
      organisation_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      first_in_utc TEXT,
      last_out_utc TEXT,
      total_minutes INTEGER CHECK (total_minutes IS NULL OR total_minutes >= 0),
      status TEXT NOT NULL CHECK (status IN ('COMPLETE','INCOMPLETE')),
      policy TEXT NOT NULL DEFAULT 'M1_FIRST_IN_LAST_OUT_UTC' CHECK (policy = 'M1_FIRST_IN_LAST_OUT_UTC'),
      source_state_revision INTEGER NOT NULL,
      sync_status TEXT NOT NULL CHECK (sync_status IN ('OFFLINE_CACHED','OFFLINE_PENDING_VERIFICATION','PENDING_SYNC','ONLINE_VERIFIED','FAILED','CONFLICT')),
      server_revision INTEGER,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (project_id, person_id, work_date_utc)
    );`);

    await tx.executeSql(`CREATE TABLE conflict (
      conflict_id TEXT PRIMARY KEY,
      command_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      local_revision INTEGER NOT NULL,
      server_revision INTEGER NOT NULL,
      local_payload TEXT,
      server_payload TEXT,
      status TEXT NOT NULL CHECK (status IN ('OPEN','RESOLVED')),
      reason_code TEXT NOT NULL,
      reason TEXT,
      resolved_at TEXT,
      resolved_by TEXT,
      resolution_strategy TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (command_id) REFERENCES command_ledger(command_id) ON DELETE RESTRICT
    );`);
    await tx.executeSql(`CREATE TRIGGER prevent_conflict_delete BEFORE DELETE ON conflict BEGIN
      SELECT RAISE(FAIL, 'Conflicts are append-only and cannot be deleted');
    END;`);

    await tx.executeSql(`CREATE INDEX idx_event_lookup ON attendance_event (project_id, person_id, work_date_utc);`);
    await tx.executeSql(`CREATE INDEX idx_ledger_retry ON command_ledger (status, next_retry_at);`);
    await tx.executeSql(`CREATE INDEX idx_ledger_processing ON command_ledger (status, processing_started_at);`);
    await tx.executeSql(`CREATE INDEX idx_roster_project ON project_roster (project_id);`);
    await tx.executeSql(`CREATE INDEX idx_conflict_command ON conflict (command_id);`);
  });
}

async function verifySchema(db: SQLiteDatabase): Promise<void> {
  const expectedTables = ['local_device_session','project_context','project_roster','command_ledger','attendance_event','attendance_state','timesheet','conflict'];
  const expectedIndexes = ['idx_event_lookup','idx_ledger_retry','idx_ledger_processing','idx_roster_project','idx_conflict_command'];
  const expectedTriggers = ['prevent_attendance_event_update','prevent_attendance_event_delete','prevent_conflict_delete'];

  for (const table of expectedTables) {
    const result = await db.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}';`);
    if (result.rows.length === 0) throw new Error(`Table ${table} missing`);
  }
  for (const index of expectedIndexes) {
    const result = await db.execute(`SELECT name FROM sqlite_master WHERE type='index' AND name='${index}';`);
    if (result.rows.length === 0) throw new Error(`Index ${index} missing`);
  }
  for (const trigger of expectedTriggers) {
    const result = await db.execute(`SELECT name FROM sqlite_master WHERE type='trigger' AND name='${trigger}';`);
    if (result.rows.length === 0) throw new Error(`Trigger ${trigger} missing`);
  }

  const tableChecks: Record<string, { pk: string[]; fk: string[] }> = {
    local_device_session: { pk: ['user_id'], fk: [] },
    project_context: { pk: ['person_id'], fk: [] },
    project_roster: { pk: ['project_id', 'person_id'], fk: [] },
    command_ledger: { pk: ['command_id'], fk: [] },
    attendance_event: { pk: ['event_id'], fk: ['command_id'] },
    attendance_state: { pk: ['project_id', 'person_id', 'work_date_utc'], fk: ['last_event_id', 'last_command_id'] },
    timesheet: { pk: ['project_id', 'person_id', 'work_date_utc'], fk: [] },
    conflict: { pk: ['conflict_id'], fk: ['command_id'] },
  };
  for (const [table, expected] of Object.entries(tableChecks)) {
    const pkInfo = await db.execute(`PRAGMA table_info(${table});`);
    const pkCols = pkInfo.rows.filter((row: any) => row.pk > 0).map((row: any) => row.name);
    if (pkCols.length !== expected.pk.length || !expected.pk.every(col => pkCols.includes(col))) {
      throw new Error(`Primary key mismatch on ${table}`);
    }
    const fkInfo = await db.execute(`PRAGMA foreign_key_list(${table});`);
    const fkCols = fkInfo.rows.map((row: any) => row.from);
    if (expected.fk.some(col => !fkCols.includes(col))) throw new Error(`Foreign key mismatch on ${table}`);
  }

  const schemaRows = await db.execute(`SELECT name, sql FROM sqlite_master WHERE type IN ('table','index','trigger');`);
  const schemaSql = schemaRows.rows.map((row: any) => String(row.sql ?? '')).join('\n');
  for (const required of [
    'CHECK (attempt_count >= 0)',
    'CHECK (max_attempts > 0)',
    'CHECK (total_minutes IS NULL OR total_minutes >= 0)',
    "CHECK (policy = 'M1_FIRST_IN_LAST_OUT_UTC')",
    'prevent_attendance_event_update',
    'prevent_attendance_event_delete',
    'prevent_conflict_delete',
  ]) {
    if (!schemaSql.includes(required)) throw new Error(`Required schema invariant missing: ${required}`);
  }
}

export function getDb(): SQLiteDatabase {
  if (!dbInstance) throw new Error('Database not initialized');
  return dbInstance;
}

export async function withTransaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
  return getDb().transactionAsync(callback);
}

export type { LocalDeviceSessionRecord, ProjectContextRecord, ProjectRosterRecord, CommandLedgerRecord, AttendanceEventRecord, AttendanceStateRecord, TimesheetRecord, ConflictRecord };

const DEVICE_STATUS_TRANSITIONS: Record<'ACTIVE' | 'REVOKED', readonly ('ACTIVE' | 'REVOKED')[]> = {
  ACTIVE: ['REVOKED'],
  REVOKED: [],
};

export async function insertLocalDeviceSession(record: Omit<LocalDeviceSessionRecord, 'revision'>): Promise<void> {
  const db = getDb();
  if (record.status !== 'ACTIVE') throw new Error('New device sessions must start with ACTIVE status');
  [record.createdAt, record.lastVerifiedAt, record.updatedAt].forEach(value => { if (!validateUtcTimestamp(value)) throw new Error('Invalid UTC timestamp'); });
  await db.execute(`INSERT INTO local_device_session (user_id, device_installation_id, installation_key, status, created_at, last_verified_at, revision, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)`, [record.userId, record.deviceInstallationId, record.installationKey, record.status, record.createdAt, record.lastVerifiedAt, record.updatedAt]);
}

export async function updateLocalDeviceSession(
  userId: string,
  expectedRevision: number,
  updates: Partial<Omit<LocalDeviceSessionRecord, 'userId' | 'createdAt'>> & { updatedAt: string }
): Promise<void> {
  if (!validateUtcTimestamp(updates.updatedAt)) throw new Error('Invalid UTC timestamp');
  await withTransaction(async tx => {
    const currentResult = await tx.executeSql('SELECT status, revision FROM local_device_session WHERE user_id = ?', [userId]);
    if (currentResult.rows.length === 0) throw new Error(`Device session for user ${userId} not found`);
    const currentStatus = currentResult.rows.item(0).status as 'ACTIVE' | 'REVOKED';
    const currentRevision = currentResult.rows.item(0).revision as number;
    if (currentRevision !== expectedRevision) throw new Error(`Revision mismatch: expected ${expectedRevision}, got ${currentRevision}`);
    if (updates.status && !DEVICE_STATUS_TRANSITIONS[currentStatus].includes(updates.status)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${updates.status}`);
    }
    const setClauses = ['revision = revision + 1', 'updated_at = ?'];
    const params: any[] = [updates.updatedAt];
    const fieldMap: Record<string, string> = { deviceInstallationId: 'device_installation_id', installationKey: 'installation_key', status: 'status', lastVerifiedAt: 'last_verified_at' };
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'updatedAt' || !fieldMap[key]) continue;
      if (key === 'lastVerifiedAt' && !validateUtcTimestamp(value as string)) throw new Error('Invalid UTC timestamp for lastVerifiedAt');
      setClauses.push(`${fieldMap[key]} = ?`);
      params.push(value);
    }
    params.push(userId, expectedRevision);
    await tx.executeSql(`UPDATE local_device_session SET ${setClauses.join(', ')} WHERE user_id = ? AND revision = ?`, params);
    const after = await tx.executeSql('SELECT revision FROM local_device_session WHERE user_id = ?', [userId]);
    if (after.rows.length === 0 || after.rows.item(0).revision !== expectedRevision + 1) throw new Error('Optimistic lock failure: revision did not increment');
  });
}

export async function getLocalDeviceSession(userId: string): Promise<LocalDeviceSessionRecord | null> {
  const result = await getDb().execute(`SELECT user_id as userId, device_installation_id as deviceInstallationId, installation_key as installationKey, status, created_at as createdAt, last_verified_at as lastVerifiedAt, revision, updated_at as updatedAt FROM local_device_session WHERE user_id = ?`, [userId]);
  return result.rows.length === 0 ? null : result.rows.item(0) as unknown as LocalDeviceSessionRecord;
}

export async function upsertProjectContext(record: ProjectContextRecord): Promise<void> {
  [record.selectedAt, record.updatedAt].forEach(value => { if (!validateUtcTimestamp(value)) throw new Error('Invalid UTC timestamp'); });
  await getDb().execute(`INSERT INTO project_context (person_id, project_id, organisation_id, company_id, company_membership_id, project_role, selected_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(person_id) DO UPDATE SET project_id=excluded.project_id, organisation_id=excluded.organisation_id, company_id=excluded.company_id, company_membership_id=excluded.company_membership_id, project_role=excluded.project_role, selected_at=excluded.selected_at, updated_at=excluded.updated_at`,
    [record.personId, record.projectId, record.organisationId, record.companyId, record.companyMembershipId, record.projectRole, record.selectedAt, record.updatedAt]);
}

export async function getProjectContext(personId: string): Promise<ProjectContextRecord | null> {
  const result = await getDb().execute(`SELECT person_id as personId, project_id as projectId, organisation_id as organisationId, company_id as companyId, company_membership_id as companyMembershipId, project_role as projectRole, selected_at as selectedAt, updated_at as updatedAt FROM project_context WHERE person_id = ?`, [personId]);
  return result.rows.length === 0 ? null : result.rows.item(0) as unknown as ProjectContextRecord;
}

export async function deleteProjectContext(personId: string): Promise<void> {
  await getDb().execute('DELETE FROM project_context WHERE person_id = ?', [personId]);
}

export async function upsertProjectRoster(record: ProjectRosterRecord): Promise<void> {
  if (!validateUtcTimestamp(record.syncedAt)) throw new Error('Invalid UTC timestamp');
  await getDb().execute(`INSERT INTO project_roster (project_id, person_id, organisation_id, company_id, display_name, project_role, assignment_status, membership_status, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, person_id) DO UPDATE SET organisation_id=excluded.organisation_id, company_id=excluded.company_id, display_name=excluded.display_name, project_role=excluded.project_role, assignment_status=excluded.assignment_status, membership_status=excluded.membership_status, synced_at=excluded.synced_at`,
    [record.projectId, record.personId, record.organisationId, record.companyId, record.displayName, record.projectRole, record.assignmentStatus, record.membershipStatus, record.syncedAt]);
}

export async function getProjectRoster(projectId: string, personId: string): Promise<ProjectRosterRecord | null> {
  const result = await getDb().execute(`SELECT project_id as projectId, person_id as personId, organisation_id as organisationId, company_id as companyId, display_name as displayName, project_role as projectRole, assignment_status as assignmentStatus, membership_status as membershipStatus, synced_at as syncedAt FROM project_roster WHERE project_id = ? AND person_id = ?`, [projectId, personId]);
  return result.rows.length === 0 ? null : result.rows.item(0) as unknown as ProjectRosterRecord;
}

export async function getRosterForProject(projectId: string): Promise<ProjectRosterRecord[]> {
  const result = await getDb().execute(`SELECT project_id as projectId, person_id as personId, organisation_id as organisationId, company_id as companyId, display_name as displayName, project_role as projectRole, assignment_status as assignmentStatus, membership_status as membershipStatus, synced_at as syncedAt FROM project_roster WHERE project_id = ?`, [projectId]);
  return Array.from({ length: result.rows.length }, (_, i) => result.rows.item(i) as unknown as ProjectRosterRecord);
}

export async function insertCommandLedger(record: CommandLedgerRecord): Promise<void> {
  [record.createdAt, record.updatedAt].forEach(value => { if (!validateUtcTimestamp(value)) throw new Error('Invalid UTC timestamp'); });
  [record.processingStartedAt, record.serverRespondedAt, record.syncedAt, record.nextRetryAt].forEach(value => { if (value !== null && !validateUtcTimestamp(value)) throw new Error('Invalid UTC timestamp'); });
  if (!Number.isInteger(record.attemptCount) || record.attemptCount < 0) throw new Error('attemptCount must be >= 0');
  if (!Number.isInteger(record.maxAttempts) || record.maxAttempts < 1) throw new Error('maxAttempts must be > 0');
  await getDb().execute(`INSERT INTO command_ledger (command_id, project_id, person_id, organisation_id, company_id, command_type, source, base_revision, status, attempt_count, max_attempts, processing_started_at, server_responded_at, synced_at, next_retry_at, server_result_json, server_error_code, failure_diagnostics, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [record.commandId, record.projectId, record.personId, record.organisationId, record.companyId, record.commandType, record.source, record.baseRevision, record.status, record.attemptCount, record.maxAttempts, record.processingStartedAt, record.serverRespondedAt, record.syncedAt, record.nextRetryAt, record.serverResultJson, record.serverErrorCode, record.failureDiagnostics, record.createdAt, record.updatedAt]);
}

export async function updateCommandLedgerStatus(commandId: string, newStatus: CommandLedgerRecord['status'], updates: Partial<Omit<CommandLedgerRecord, 'commandId' | 'status' | 'updatedAt'>> & { updatedAt: string }): Promise<void> {
  if (!validateUtcTimestamp(updates.updatedAt)) throw new Error('Invalid UTC timestamp');
  await withTransaction(async tx => {
    const result = await tx.executeSql('SELECT status FROM command_ledger WHERE command_id = ?', [commandId]);
    if (result.rows.length === 0) throw new Error(`Command ${commandId} not found`);
    const currentStatus = result.rows.item(0).status as unknown as CommandLedgerRecord['status'];
    if (!canTransitionCommand(currentStatus, newStatus)) throw new Error(`Invalid transition from ${currentStatus} to ${newStatus}`);
    const setClauses = ['status = ?', 'updated_at = ?'];
    const params: any[] = [newStatus, updates.updatedAt];
    const fieldMap: Record<string,string> = { attemptCount:'attempt_count', processingStartedAt:'processing_started_at', serverRespondedAt:'server_responded_at', syncedAt:'synced_at', nextRetryAt:'next_retry_at', serverResultJson:'server_result_json', serverErrorCode:'server_error_code', failureDiagnostics:'failure_diagnostics' };
    for (const [key,value] of Object.entries(updates)) {
      if (key === 'updatedAt' || !fieldMap[key]) continue;
      if (['processingStartedAt','serverRespondedAt','syncedAt','nextRetryAt'].includes(key) && value !== null && !validateUtcTimestamp(value as string)) throw new Error('Invalid UTC timestamp');
      setClauses.push(`${fieldMap[key]} = ?`); params.push(value);
    }
    params.push(commandId, currentStatus);
    await tx.executeSql(`UPDATE command_ledger SET ${setClauses.join(', ')} WHERE command_id = ? AND status = ?`, params);
    const after = await tx.executeSql('SELECT status FROM command_ledger WHERE command_id = ?', [commandId]);
    if (after.rows.length === 0 || after.rows.item(0).status !== newStatus) throw new Error(`Status update failed: command ${commandId} may have been modified concurrently`);
  });
}

const commandSelect = `command_id as commandId, project_id as projectId, person_id as personId, organisation_id as organisationId, company_id as companyId, command_type as commandType, source, base_revision as baseRevision, status, attempt_count as attemptCount, max_attempts as maxAttempts, processing_started_at as processingStartedAt, server_responded_at as serverRespondedAt, synced_at as syncedAt, next_retry_at as nextRetryAt, server_result_json as serverResultJson, server_error_code as serverErrorCode, failure_diagnostics as failureDiagnostics, created_at as createdAt, updated_at as updatedAt`;

export async function getCommandLedger(commandId: string): Promise<CommandLedgerRecord | null> {
  const result = await getDb().execute(`SELECT ${commandSelect} FROM command_ledger WHERE command_id = ?`, [commandId]);
  return result.rows.length === 0 ? null : result.rows.item(0) as unknown as CommandLedgerRecord;
}

export async function getStaleProcessingCommands(thresholdMs: number): Promise<CommandLedgerRecord[]> {
  const cutoff = new Date(Date.now() - thresholdMs).toISOString();
  const result = await getDb().execute(`SELECT ${commandSelect} FROM command_ledger WHERE status='PROCESSING' AND processing_started_at <= ? ORDER BY processing_started_at ASC`, [cutoff]);
  return Array.from({ length: result.rows.length }, (_, i) => result.rows.item(i) as unknown as CommandLedgerRecord);
}

export async function getPendingRetryCommands(): Promise<CommandLedgerRecord[]> {
  const now = new Date().toISOString();
  const result = await getDb().execute(`SELECT ${commandSelect} FROM command_ledger WHERE status='RETRYABLE_FAILURE' AND next_retry_at <= ? ORDER BY next_retry_at ASC`, [now]);
  return Array.from({ length: result.rows.length }, (_, i) => result.rows.item(i) as unknown as CommandLedgerRecord);
}

export async function findAllCommandsForPerson(personId: string): Promise<CommandLedgerRecord[]> {
  const result = await getDb().execute(`SELECT ${commandSelect} FROM command_ledger WHERE person_id = ?`, [personId]);
  return Array.from({ length: result.rows.length }, (_, i) => result.rows.item(i) as unknown as CommandLedgerRecord);
}

export async function insertAttendanceEvent(record: AttendanceEventRecord): Promise<void> {
  [record.clientOccurredAt, record.createdAt].forEach(value => { if (!validateUtcTimestamp(value)) throw new Error('Invalid UTC timestamp'); });
  if (!validateWorkDateUtc(record.workDateUtc)) throw new Error('Invalid work date');
  await getDb().execute(`INSERT INTO attendance_event (event_id, command_id, project_id, organisation_id, company_id, project_assignment_id, person_id, event_type, client_occurred_at, work_date_utc, source, sync_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [record.eventId, record.commandId, record.projectId, record.organisationId, record.companyId, record.projectAssignmentId, record.personId, record.eventType, record.clientOccurredAt, record.workDateUtc, record.source, record.syncStatus, record.createdAt]);
}

export async function getAttendanceEventsForDay(projectId: string, personId: string, workDateUtc: string): Promise<AttendanceEventRecord[]> {
  if (!validateWorkDateUtc(workDateUtc)) throw new Error('Invalid work date');
  const result = await getDb().execute(`SELECT event_id as eventId, command_id as commandId, project_id as projectId, organisation_id as organisationId, company_id as companyId, project_assignment_id as projectAssignmentId, person_id as personId, event_type as eventType, client_occurred_at as clientOccurredAt, work_date_utc as workDateUtc, source, sync_status as syncStatus, created_at as createdAt FROM attendance_event WHERE project_id = ? AND person_id = ? AND work_date_utc = ? ORDER BY client_occurred_at ASC`, [projectId, personId, workDateUtc]);
  return Array.from({ length: result.rows.length }, (_, i) => result.rows.item(i) as unknown as AttendanceEventRecord);
}

export async function upsertAttendanceState(record: AttendanceStateRecord): Promise<void> {
  [record.lastClientOccurredAt, record.updatedAt].forEach(value => { if (!validateUtcTimestamp(value)) throw new Error('Invalid UTC timestamp'); });
  if (!validateWorkDateUtc(record.workDateUtc)) throw new Error('Invalid work date');
  await getDb().execute(`INSERT INTO attendance_state (project_id, person_id, work_date_utc, organisation_id, company_id, project_assignment_id, state, last_event_id, last_command_id, last_client_occurred_at, current_revision, server_revision, sync_status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, person_id, work_date_utc) DO UPDATE SET organisation_id=excluded.organisation_id, company_id=excluded.company_id, project_assignment_id=excluded.project_assignment_id, state=excluded.state, last_event_id=excluded.last_event_id, last_command_id=excluded.last_command_id, last_client_occurred_at=excluded.last_client_occurred_at, current_revision=excluded.current_revision, server_revision=excluded.server_revision, sync_status=excluded.sync_status, updated_at=excluded.updated_at`,
    [record.projectId, record.personId, record.workDateUtc, record.organisationId, record.companyId, record.projectAssignmentId, record.state, record.lastEventId, record.lastCommandId, record.lastClientOccurredAt, record.currentRevision, record.serverRevision, record.syncStatus, record.updatedAt]);
}

export async function getAttendanceState(projectId: string, personId: string, workDateUtc: string): Promise<AttendanceStateRecord | null> {
  if (!validateWorkDateUtc(workDateUtc)) throw new Error('Invalid work date');
  const result = await getDb().execute(`SELECT project_id as projectId, person_id as personId, work_date_utc as workDateUtc, organisation_id as organisationId, company_id as companyId, project_assignment_id as projectAssignmentId, state, last_event_id as lastEventId, last_command_id as lastCommandId, last_client_occurred_at as lastClientOccurredAt, current_revision as currentRevision, server_revision as serverRevision, sync_status as syncStatus, updated_at as updatedAt FROM attendance_state WHERE project_id = ? AND person_id = ? AND work_date_utc = ?`, [projectId, personId, workDateUtc]);
  return result.rows.length === 0 ? null : result.rows.item(0) as unknown as AttendanceStateRecord;
}

/** Administrative/purge-only state reset; the immutable attendance event log remains untouched. */
export async function deleteAttendanceState(projectId: string, personId: string, workDateUtc: string): Promise<void> {
  if (!validateWorkDateUtc(workDateUtc)) throw new Error('Invalid work date');
  await getDb().execute('DELETE FROM attendance_state WHERE project_id = ? AND person_id = ? AND work_date_utc = ?', [projectId, personId, workDateUtc]);
}

export async function upsertTimesheet(record: TimesheetRecord): Promise<void> {
  await withTransaction(async tx => {
    if (!validateUtcTimestamp(record.updatedAt)) throw new Error('Invalid UTC timestamp');
    if (record.firstInUtc !== null && !validateUtcTimestamp(record.firstInUtc)) throw new Error('Invalid UTC timestamp for firstInUtc');
    if (record.lastOutUtc !== null && !validateUtcTimestamp(record.lastOutUtc)) throw new Error('Invalid UTC timestamp for lastOutUtc');
    if (!validateWorkDateUtc(record.workDateUtc)) throw new Error('Invalid work date');
    if (record.totalMinutes !== null && record.totalMinutes < 0) throw new Error('Total minutes must be >= 0');
    const stateResult = await tx.executeSql('SELECT current_revision FROM attendance_state WHERE project_id = ? AND person_id = ? AND work_date_utc = ?', [record.projectId, record.personId, record.workDateUtc]);
    if (stateResult.rows.length === 0) throw new Error('Cannot create timesheet without an attendance state');
    const currentRevision = stateResult.rows.item(0).current_revision as number;
    if (currentRevision !== record.sourceStateRevision) throw new Error(`sourceStateRevision mismatch: expected ${currentRevision}, got ${record.sourceStateRevision}`);
    await tx.executeSql(`INSERT INTO timesheet (project_id, person_id, work_date_utc, organisation_id, company_id, first_in_utc, last_out_utc, total_minutes, status, policy, source_state_revision, sync_status, server_revision, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, person_id, work_date_utc) DO UPDATE SET organisation_id=excluded.organisation_id, company_id=excluded.company_id, first_in_utc=excluded.first_in_utc, last_out_utc=excluded.last_out_utc, total_minutes=excluded.total_minutes, status=excluded.status, policy=excluded.policy, source_state_revision=excluded.source_state_revision, sync_status=excluded.sync_status, server_revision=excluded.server_revision, updated_at=excluded.updated_at`,
      [record.projectId, record.personId, record.workDateUtc, record.organisationId, record.companyId, record.firstInUtc, record.lastOutUtc, record.totalMinutes, record.status, record.policy, record.sourceStateRevision, record.syncStatus, record.serverRevision, record.updatedAt]);
  });
}

export async function getTimesheet(projectId: string, personId: string, workDateUtc: string): Promise<TimesheetRecord | null> {
  if (!validateWorkDateUtc(workDateUtc)) throw new Error('Invalid work date');
  const result = await getDb().execute(`SELECT project_id as projectId, person_id as personId, work_date_utc as workDateUtc, organisation_id as organisationId, company_id as companyId, first_in_utc as firstInUtc, last_out_utc as lastOutUtc, total_minutes as totalMinutes, status, policy, source_state_revision as sourceStateRevision, sync_status as syncStatus, server_revision as serverRevision, updated_at as updatedAt FROM timesheet WHERE project_id = ? AND person_id = ? AND work_date_utc = ?`, [projectId, personId, workDateUtc]);
  return result.rows.length === 0 ? null : result.rows.item(0) as unknown as TimesheetRecord;
}

/** Administrative/purge-only timesheet reset. */
export async function deleteTimesheet(projectId: string, personId: string, workDateUtc: string): Promise<void> {
  if (!validateWorkDateUtc(workDateUtc)) throw new Error('Invalid work date');
  await getDb().execute('DELETE FROM timesheet WHERE project_id = ? AND person_id = ? AND work_date_utc = ?', [projectId, personId, workDateUtc]);
}

export async function insertConflict(record: ConflictRecord): Promise<void> {
  [record.createdAt, record.updatedAt].forEach(value => { if (!validateUtcTimestamp(value)) throw new Error('Invalid UTC timestamp'); });
  if (record.resolvedAt !== null && !validateUtcTimestamp(record.resolvedAt)) throw new Error('Invalid UTC timestamp for resolvedAt');
  await getDb().execute(`INSERT INTO conflict (conflict_id, command_id, entity_type, entity_id, local_revision, server_revision, local_payload, server_payload, status, reason_code, reason, resolved_at, resolved_by, resolution_strategy, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [record.conflictId, record.commandId, record.entityType, record.entityId, record.localRevision, record.serverRevision, record.localPayload, record.serverPayload, record.status, record.reasonCode, record.reason, record.resolvedAt, record.resolvedBy, record.resolutionStrategy, record.createdAt, record.updatedAt]);
}

export async function resolveConflict(
  conflictId: string,
  resolution: {
    status: 'RESOLVED';
    resolvedAt: string;
    resolvedBy: string;
    resolutionStrategy: string;
    updatedAt: string;
  },
): Promise<void> {
  [resolution.resolvedAt, resolution.updatedAt].forEach(value => {
    if (!validateUtcTimestamp(value)) {
      throw new Error('Invalid UTC timestamp');
    }
  });

  await withTransaction(async tx => {
    const updated = await tx.executeSql(
      `UPDATE conflict
       SET status=?, resolved_at=?, resolved_by=?, resolution_strategy=?, updated_at=?
       WHERE conflict_id=? AND status != 'RESOLVED'`,
      [
        resolution.status,
        resolution.resolvedAt,
        resolution.resolvedBy,
        resolution.resolutionStrategy,
        resolution.updatedAt,
        conflictId,
      ],
    );

    if (updated.rowsAffected === 0) {
      throw new Error('Conflict not found or already resolved');
    }
  });
}

export async function getConflict(conflictId: string): Promise<ConflictRecord | null> {
  const result = await getDb().execute(`SELECT conflict_id as conflictId, command_id as commandId, entity_type as entityType, entity_id as entityId, local_revision as localRevision, server_revision as serverRevision, local_payload as localPayload, server_payload as serverPayload, status, reason_code as reasonCode, reason, resolved_at as resolvedAt, resolved_by as resolvedBy, resolution_strategy as resolutionStrategy, created_at as createdAt, updated_at as updatedAt FROM conflict WHERE conflict_id = ?`, [conflictId]);
  return result.rows.length === 0 ? null : result.rows.item(0) as unknown as ConflictRecord;
}

export async function findAllConflictsForPerson(personId: string): Promise<ConflictRecord[]> {
  const result = await getDb().execute(`SELECT conflict_id as conflictId, command_id as commandId, entity_type as entityType, entity_id as entityId, local_revision as localRevision, server_revision as serverRevision, local_payload as localPayload, server_payload as serverPayload, status, reason_code as reasonCode, reason, resolved_at as resolvedAt, resolved_by as resolvedBy, resolution_strategy as resolutionStrategy, created_at as createdAt, updated_at as updatedAt FROM conflict WHERE command_id IN (SELECT command_id FROM command_ledger WHERE person_id = ?)`, [personId]);
  return Array.from({ length: result.rows.length }, (_, i) => result.rows.item(i) as unknown as ConflictRecord);
}

export async function purgeTenantData(personId: string): Promise<void> {
  await withTransaction(async tx => {
    await tx.executeSql(`DELETE FROM conflict WHERE command_id IN (SELECT command_id FROM command_ledger WHERE person_id = ?)`, [personId]);
    await tx.executeSql('DELETE FROM timesheet WHERE person_id = ?', [personId]);
    await tx.executeSql('DELETE FROM attendance_state WHERE person_id = ?', [personId]);
    await tx.executeSql('DELETE FROM attendance_event WHERE person_id = ?', [personId]);
    await tx.executeSql('DELETE FROM command_ledger WHERE person_id = ?', [personId]);
    await tx.executeSql('DELETE FROM project_roster WHERE person_id = ?', [personId]);
    await tx.executeSql('DELETE FROM project_context WHERE person_id = ?', [personId]);
    await tx.executeSql('DELETE FROM local_device_session WHERE user_id = ?', [personId]);
  });
}
