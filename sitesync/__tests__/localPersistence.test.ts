import {
  initializeDatabase,
  closeDatabase,
  getDb,
  withTransaction,
  upsertProjectContext,
  getProjectContext,
  insertCommandLedger,
  getCommandLedger,
  updateCommandLedgerStatus,
  getStaleProcessingCommands,
  getPendingRetryCommands,
  purgeTenantData,
  insertLocalDeviceSession,
  updateLocalDeviceSession,
  getLocalDeviceSession,
  insertAttendanceEvent,
  upsertAttendanceState,
  upsertTimesheet,
  insertConflict,
  resolveConflict,
  getConflict,
  validateUtcTimestamp,
  validateWorkDateUtc,
  DATABASE_SCHEMA_VERSION,
} from '../src/database/localPersistence';
import { open, close } from '../src/database/sqliteAdapter';

const TEST_DATABASE_NAME = `m13-jest-${process.pid}-${Date.now()}.db`;

describe('M1.3 SQLite persistence - full verification', () => {
  beforeEach(async () => {
    await closeDatabase();
    await initializeDatabase(TEST_DATABASE_NAME);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  test('schema version and foreign keys are set', async () => {
    const db = getDb();
    expect(db).toBeDefined();
    const versionResult = await db.execute('PRAGMA user_version;');
    expect(versionResult.rows.item(0)?.user_version).toBe(DATABASE_SCHEMA_VERSION);
    const fkResult = await db.execute('PRAGMA foreign_keys;');
    expect(fkResult.rows.item(0)?.foreign_keys).toBe(1);
  });

  test('schema verification covers columns, keys, foreign keys, and constraints', async () => {
    const db = getDb();
    const eventColumns = await db.execute('PRAGMA table_info(attendance_event);');
    expect(eventColumns.rows.item(0)?.name).toBe('event_id');
    expect(eventColumns.rows.item(0)?.type).toBe('TEXT');
    expect(eventColumns.rows.item(0)?.pk).toBe(1);

    const eventFks = await db.execute('PRAGMA foreign_key_list(attendance_event);');
    expect(eventFks.rows.item(0)?.from).toBe('command_id');
    expect(eventFks.rows.item(0)?.table).toBe('command_ledger');
    expect(eventFks.rows.item(0)?.to).toBe('command_id');

    const sql = await db.execute(`SELECT sql FROM sqlite_master WHERE type='table' AND name='timesheet';`);
    expect(String(sql.rows.item(0)?.sql)).toContain("policy = 'M1_FIRST_IN_LAST_OUT_UTC'");
    expect(String(sql.rows.item(0)?.sql)).toContain('total_minutes INTEGER CHECK');
  });

  test('initializeDatabase is idempotent', async () => {
    for (let i = 0; i < 3; i++) await initializeDatabase(TEST_DATABASE_NAME);
    await Promise.all([initializeDatabase(TEST_DATABASE_NAME), initializeDatabase(TEST_DATABASE_NAME), initializeDatabase(TEST_DATABASE_NAME)]);
    const result = await getDb().execute('SELECT 1+1 as sum;');
    expect(result.rows.item(0)?.sum).toBe(2);
  });

  test('failed initialization resets state and allows recovery', async () => {
    await closeDatabase();
    const dbName = `m13-recovery-${Date.now()}.db`;
    const seedDb = await open({ name: dbName });
    await seedDb.execute(`PRAGMA user_version = ${DATABASE_SCHEMA_VERSION + 99};`);
    await close(seedDb);

    await expect(initializeDatabase(dbName)).rejects.toThrow(/Unsupported schema version/);
    const recoveryDb = await open({ name: dbName });
    await recoveryDb.execute('PRAGMA user_version = 0;');
    await close(recoveryDb);

    await initializeDatabase(dbName);
    const version = await getDb().execute('PRAGMA user_version;');
    expect(version.rows.item(0)?.user_version).toBe(DATABASE_SCHEMA_VERSION);
    await closeDatabase();
    await initializeDatabase(TEST_DATABASE_NAME);
  });

  test('transaction rollback works', async () => {
    const personId = 'rollback-test';
    const now = new Date().toISOString();
    await expect(withTransaction(async tx => {
      await tx.executeSql(`INSERT INTO project_context (person_id, project_id, organisation_id, company_id, company_membership_id, project_role, selected_at, updated_at)
        VALUES (?, 'p1', 'o1', 'c1', 'cm1', 'role', ?, ?)`, [personId, now, now]);
      await tx.executeSql(`INSERT INTO project_context (person_id, project_id, organisation_id, company_id, company_membership_id, project_role, selected_at, updated_at)
        VALUES (?, 'p2', 'o2', 'c2', 'cm2', 'role2', ?, ?)`, [personId, now, now]);
    })).rejects.toThrow();
    expect(await getProjectContext(personId)).toBeNull();
  });

  test('persistence across restart', async () => {
    const personId = 'restart-test';
    const now = new Date().toISOString();
    const record = { personId, projectId: 'p', organisationId: 'o', companyId: 'c', companyMembershipId: 'm', projectRole: 'r', selectedAt: now, updatedAt: now };
    await upsertProjectContext(record);
    await closeDatabase();
    await initializeDatabase(TEST_DATABASE_NAME);
    expect(await getProjectContext(personId)).toEqual(record);
  });

  test('clean install creates the complete schema from scratch', async () => {
    await closeDatabase();
    const cleanDbName = `m13-clean-${Date.now()}.db`;
    await initializeDatabase(cleanDbName);
    const db = getDb();

    const tables = await db.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;`);
    expect(tables.rows.map((row: any) => row.name)).toEqual([
      'attendance_event', 'attendance_state', 'command_ledger', 'conflict',
      'local_device_session', 'project_context', 'project_roster', 'timesheet',
    ]);

    const indexes = await db.execute(`SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name;`);
    expect(indexes.rows.map((row: any) => row.name)).toEqual([
      'idx_conflict_command', 'idx_event_lookup', 'idx_ledger_processing',
      'idx_ledger_retry', 'idx_roster_project',
    ]);

    const triggers = await db.execute(`SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name;`);
    expect(triggers.rows.map((row: any) => row.name)).toEqual([
      'prevent_attendance_event_delete', 'prevent_attendance_event_update', 'prevent_conflict_delete',
    ]);

    const version = await db.execute('PRAGMA user_version;');
    expect(version.rows.item(0)?.user_version).toBe(DATABASE_SCHEMA_VERSION);
    await closeDatabase();
    await initializeDatabase(TEST_DATABASE_NAME);
  });

  test('index usage for event lookup', async () => {
    const db = getDb();
    const now = new Date().toISOString();
    const cmdId = 'cmd-index';
    await db.execute(`INSERT INTO command_ledger (command_id, project_id, person_id, organisation_id, company_id, command_type, source, base_revision, status, attempt_count, max_attempts, created_at, updated_at)
      VALUES (?, 'p1', 'person1', 'o1', 'c1', 'CHECK_IN', 'SELF', 1, 'PENDING', 0, 3, ?, ?)`, [cmdId, now, now]);
    await db.execute(`INSERT INTO attendance_event (event_id, command_id, project_id, organisation_id, company_id, project_assignment_id, person_id, event_type, client_occurred_at, work_date_utc, source, sync_status, created_at)
      VALUES (?, ?, 'p1', 'o1', 'c1', 'pa1', 'person1', 'ATTENDANCE_CHECK_IN', ?, '2026-08-16', 'SELF', 'OFFLINE_CACHED', ?)`, ['ev-index', cmdId, now, now]);
    const result = await db.execute(`EXPLAIN QUERY PLAN SELECT * FROM attendance_event WHERE project_id='p1' AND person_id='person1' AND work_date_utc='2026-08-16';`);
    expect(result.rows.item(0)?.detail || '').toMatch(/idx_event_lookup/i);
  });

  test('index usage for ledger retry lookup', async () => {
    const result = await getDb().execute(`EXPLAIN QUERY PLAN SELECT * FROM command_ledger WHERE status='RETRYABLE_FAILURE' AND next_retry_at <= datetime('now');`);
    expect(result.rows.item(0)?.detail || '').toMatch(/idx_ledger_retry/i);
  });

  test('stale processing detection', async () => {
    const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const cmdId = 'stale-cmd';
    await insertCommandLedger({ commandId: cmdId, projectId: 'p', personId: 'person', organisationId: 'o', companyId: 'c', commandType: 'CHECK_IN', source: 'SELF', baseRevision: 1, status: 'PROCESSING', attemptCount: 0, maxAttempts: 3, processingStartedAt: stale, serverRespondedAt: null, syncedAt: null, nextRetryAt: null, serverResultJson: null, serverErrorCode: null, failureDiagnostics: null, createdAt: stale, updatedAt: stale });
    const staleCommands = await getStaleProcessingCommands(5 * 60 * 1000);
    expect(staleCommands.some(c => c.commandId === cmdId)).toBe(true);
  });

  test('retry exhaustion and status transition', async () => {
    const cmdId = 'retry-cmd';
    const now = new Date().toISOString();
    await insertCommandLedger({ commandId: cmdId, projectId: 'p', personId: 'person', organisationId: 'o', companyId: 'c', commandType: 'CHECK_IN', source: 'SELF', baseRevision: 1, status: 'RETRYABLE_FAILURE', attemptCount: 2, maxAttempts: 3, processingStartedAt: null, serverRespondedAt: null, syncedAt: null, nextRetryAt: new Date(Date.now() + 1000).toISOString(), serverResultJson: null, serverErrorCode: null, failureDiagnostics: null, createdAt: now, updatedAt: now });
    await updateCommandLedgerStatus(cmdId, 'PROCESSING', { updatedAt: new Date().toISOString() });
    expect((await getCommandLedger(cmdId))?.status).toBe('PROCESSING');
    await updateCommandLedgerStatus(cmdId, 'FAILED', { attemptCount: 3, updatedAt: new Date().toISOString() });
    expect((await getCommandLedger(cmdId))?.status).toBe('FAILED');
  });

  test('device session optimistic locking and status transition', async () => {
    const userId = 'device-user';
    const now = new Date().toISOString();
    await insertLocalDeviceSession({ userId, deviceInstallationId: 'dev1', installationKey: 'key', status: 'ACTIVE', createdAt: now, lastVerifiedAt: now, updatedAt: now });
    await updateLocalDeviceSession(userId, 1, { lastVerifiedAt: now, status: 'REVOKED', updatedAt: now });
    const session = await getLocalDeviceSession(userId);
    expect(session?.status).toBe('REVOKED');
    expect(session?.revision).toBe(2);
    await expect(updateLocalDeviceSession(userId, 1, { updatedAt: now })).rejects.toThrow('Revision mismatch');
    await expect(updateLocalDeviceSession(userId, 2, { status: 'ACTIVE', updatedAt: now })).rejects.toThrow('Invalid status transition');
  });

  test('attendance events are append-only', async () => {
    const now = new Date().toISOString();
    const cmdId = 'append-cmd';
    await insertCommandLedger({ commandId: cmdId, projectId: 'p', personId: 'person', organisationId: 'o', companyId: 'c', commandType: 'CHECK_IN', source: 'SELF', baseRevision: 1, status: 'PENDING', attemptCount: 0, maxAttempts: 3, processingStartedAt: null, serverRespondedAt: null, syncedAt: null, nextRetryAt: null, serverResultJson: null, serverErrorCode: null, failureDiagnostics: null, createdAt: now, updatedAt: now });
    await insertAttendanceEvent({ eventId: 'append-ev', commandId: cmdId, projectId: 'p', organisationId: 'o', companyId: 'c', projectAssignmentId: 'pa', personId: 'person', eventType: 'ATTENDANCE_CHECK_IN', clientOccurredAt: now, workDateUtc: '2026-08-16', source: 'SELF', syncStatus: 'OFFLINE_CACHED', createdAt: now });
    const db = getDb();
    await expect(db.execute('UPDATE attendance_event SET sync_status = ? WHERE event_id = ?', ['ONLINE_VERIFIED', 'append-ev'])).rejects.toThrow(/append-only/);
    await expect(db.execute('DELETE FROM attendance_event WHERE event_id = ?', ['append-ev'])).rejects.toThrow(/append-only/);
  });

  test('conflicts are append-only and resolution guard works', async () => {
    const now = new Date().toISOString();
    const cmdId = 'conflict-cmd';
    await insertCommandLedger({ commandId: cmdId, projectId: 'p', personId: 'person', organisationId: 'o', companyId: 'c', commandType: 'CHECK_IN', source: 'SELF', baseRevision: 1, status: 'CONFLICT', attemptCount: 0, maxAttempts: 3, processingStartedAt: null, serverRespondedAt: null, syncedAt: null, nextRetryAt: null, serverResultJson: null, serverErrorCode: null, failureDiagnostics: null, createdAt: now, updatedAt: now });
    await insertConflict({ conflictId: 'conflict1', commandId: cmdId, entityType: 'ATTENDANCE_STATE', entityId: '{"projectId":"p","personId":"person","workDateUtc":"2026-08-16"}', localRevision: 1, serverRevision: 2, localPayload: '{}', serverPayload: '{}', status: 'OPEN', reasonCode: 'REVISION_MISMATCH', reason: null, resolvedAt: null, resolvedBy: null, resolutionStrategy: null, createdAt: now, updatedAt: now });
    await resolveConflict('conflict1', { status: 'RESOLVED', resolvedAt: now, resolvedBy: 'user', resolutionStrategy: 'SERVER_WINS', updatedAt: now });
    expect((await getConflict('conflict1'))?.status).toBe('RESOLVED');
    await expect(resolveConflict('conflict1', { status: 'RESOLVED', resolvedAt: now, resolvedBy: 'user2', resolutionStrategy: 'LOCAL_WINS', updatedAt: now })).rejects.toThrow('Conflict not found or already resolved');
    await expect(getDb().execute('DELETE FROM conflict WHERE conflict_id = ?', ['conflict1'])).rejects.toThrow(/append-only/);
  });

  test('source_state_revision consistency enforced atomically', async () => {
    const now = new Date().toISOString();
    await insertCommandLedger({ commandId: 'state-cmd', projectId: 'p', personId: 'person', organisationId: 'o', companyId: 'c', commandType: 'CHECK_IN', source: 'SELF', baseRevision: 1, status: 'PENDING', attemptCount: 0, maxAttempts: 3, processingStartedAt: null, serverRespondedAt: null, syncedAt: null, nextRetryAt: null, serverResultJson: null, serverErrorCode: null, failureDiagnostics: null, createdAt: now, updatedAt: now });
    await insertAttendanceEvent({ eventId: 'state-ev', commandId: 'state-cmd', projectId: 'p', organisationId: 'o', companyId: 'c', projectAssignmentId: 'pa', personId: 'person', eventType: 'ATTENDANCE_CHECK_IN', clientOccurredAt: now, workDateUtc: '2026-08-16', source: 'SELF', syncStatus: 'OFFLINE_CACHED', createdAt: now });
    await upsertAttendanceState({ projectId: 'p', personId: 'person', workDateUtc: '2026-08-16', organisationId: 'o', companyId: 'c', projectAssignmentId: 'pa', state: 'CHECKED_IN', lastEventId: 'state-ev', lastCommandId: 'state-cmd', lastClientOccurredAt: now, currentRevision: 5, serverRevision: null, syncStatus: 'OFFLINE_CACHED', updatedAt: now });
    await expect(upsertTimesheet({ projectId: 'p', personId: 'person', workDateUtc: '2026-08-16', organisationId: 'o', companyId: 'c', firstInUtc: null, lastOutUtc: null, totalMinutes: null, status: 'INCOMPLETE', policy: 'M1_FIRST_IN_LAST_OUT_UTC', sourceStateRevision: 3, syncStatus: 'OFFLINE_CACHED', serverRevision: null, updatedAt: now })).rejects.toThrow(/sourceStateRevision mismatch/);
  });

  test('foreign key enforcement is active', async () => {
    const now = new Date().toISOString();
    await expect(insertAttendanceEvent({ eventId: 'bad', commandId: 'nonexistent', projectId: 'p', organisationId: 'o', companyId: 'c', projectAssignmentId: 'pa', personId: 'p', eventType: 'ATTENDANCE_CHECK_IN', clientOccurredAt: now, workDateUtc: '2026-08-16', source: 'SELF', syncStatus: 'OFFLINE_CACHED', createdAt: now })).rejects.toThrow();
  });

  test('cross-person isolation during purge', async () => {
    const now = new Date().toISOString();
    await upsertProjectContext({ personId: 'p1', projectId: 'p', organisationId: 'o', companyId: 'c', companyMembershipId: 'm1', projectRole: 'r', selectedAt: now, updatedAt: now });
    await upsertProjectContext({ personId: 'p2', projectId: 'p', organisationId: 'o', companyId: 'c', companyMembershipId: 'm2', projectRole: 'r', selectedAt: now, updatedAt: now });
    await insertLocalDeviceSession({ userId: 'p1', deviceInstallationId: 'dev1', installationKey: 'key1', status: 'ACTIVE', createdAt: now, lastVerifiedAt: now, updatedAt: now });
    await insertLocalDeviceSession({ userId: 'p2', deviceInstallationId: 'dev2', installationKey: 'key2', status: 'ACTIVE', createdAt: now, lastVerifiedAt: now, updatedAt: now });
    await purgeTenantData('p1');
    expect(await getProjectContext('p1')).toBeNull();
    expect(await getProjectContext('p2')).not.toBeNull();
    expect(await getLocalDeviceSession('p1')).toBeNull();
    expect(await getLocalDeviceSession('p2')).not.toBeNull();
  });

  test('work date validation rejects invalid dates', () => {
    expect(validateWorkDateUtc('2026-08-16')).toBe(true);
    expect(validateWorkDateUtc('2026-99-99')).toBe(false);
    expect(validateWorkDateUtc('2026-02-30')).toBe(false);
    expect(validateWorkDateUtc('2026-01-01')).toBe(true);
  });

  test('timestamp validation handles fractional seconds', () => {
    expect(validateUtcTimestamp('2026-08-16T12:34:56.789Z')).toBe(true);
    expect(validateUtcTimestamp('2026-08-16T12:34:56.123456Z')).toBe(true);
    expect(validateUtcTimestamp('2026-08-16 12:34:56Z')).toBe(false);
  });

  test('one project context per person', async () => {
    const personId = 'unique-ctx';
    const now = new Date().toISOString();
    await upsertProjectContext({ personId, projectId: 'p1', organisationId: 'o', companyId: 'c', companyMembershipId: 'm1', projectRole: 'r', selectedAt: now, updatedAt: now });
    await upsertProjectContext({ personId, projectId: 'p2', organisationId: 'o', companyId: 'c', companyMembershipId: 'm2', projectRole: 'r2', selectedAt: now, updatedAt: now });
    expect((await getProjectContext(personId))?.projectId).toBe('p2');
    const result = await getDb().execute('SELECT COUNT(*) as count FROM project_context WHERE person_id = ?', [personId]);
    expect(result.rows.item(0)?.count).toBe(1);
  });
});
