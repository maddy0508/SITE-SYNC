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

declare const process: { pid: number };

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

  test('project context round-trips', async () => {
    const context = {
      personId: 'person-1',
      projectId: 'project-1',
      organisationId: 'org-1',
      companyId: 'company-1',
      companyMembershipId: 'membership-1',
      projectRole: 'WORKER' as const,
      selectedAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    };
    await upsertProjectContext(context);
    await expect(getProjectContext()).resolves.toEqual(context);
  });

  test('command ledger lifecycle is persisted', async () => {
    await insertCommandLedger({
      commandId: 'cmd-1',
      organisationId: 'org-1',
      projectId: 'project-1',
      commandType: 'ATTENDANCE_CHECK_IN',
      payloadJson: '{}',
      createdAt: '2026-08-20T00:00:00.000Z',
      status: 'PROCESSING',
      attempts: 1,
      lastAttemptAt: '2026-08-20T00:00:00.000Z',
      processedAt: null,
      lastError: null,
    });
    await updateCommandLedgerStatus('cmd-1', 'PROCESSED', null);
    await expect(getCommandLedger('cmd-1')).resolves.toMatchObject({ status: 'PROCESSED' });
  });

  test('timestamps reject non-UTC input', () => {
    expect(() => validateUtcTimestamp('2026-08-20 00:00:00')).toThrow();
    expect(() => validateWorkDateUtc('2026-08-20')).not.toThrow();
  });

  test('tenant purge does not delete another tenant', async () => {
    await insertLocalDeviceSession({
      id: 'session-1',
      organisationId: 'org-1',
      personId: 'person-1',
      deviceId: 'device-1',
      issuedAt: '2026-08-20T00:00:00.000Z',
      expiresAt: '2026-08-21T00:00:00.000Z',
      revokedAt: null,
      lastSeenAt: '2026-08-20T00:00:00.000Z',
    });
    await insertLocalDeviceSession({
      id: 'session-2',
      organisationId: 'org-2',
      personId: 'person-2',
      deviceId: 'device-2',
      issuedAt: '2026-08-20T00:00:00.000Z',
      expiresAt: '2026-08-21T00:00:00.000Z',
      revokedAt: null,
      lastSeenAt: '2026-08-20T00:00:00.000Z',
    });
    await purgeTenantData('org-1');
    await expect(getLocalDeviceSession('session-2')).resolves.toBeDefined();
    await expect(getLocalDeviceSession('session-1')).resolves.toBeNull();
  });

  test('device session updates are persisted', async () => {
    await insertLocalDeviceSession({
      id: 'session-3',
      organisationId: 'org-1',
      personId: 'person-1',
      deviceId: 'device-3',
      issuedAt: '2026-08-20T00:00:00.000Z',
      expiresAt: '2026-08-21T00:00:00.000Z',
      revokedAt: null,
      lastSeenAt: null,
    });
    await updateLocalDeviceSession('session-3', { revokedAt: '2026-08-20T01:00:00.000Z' });
    await expect(getLocalDeviceSession('session-3')).resolves.toMatchObject({ revokedAt: '2026-08-20T01:00:00.000Z' });
  });

  test('attendance event, state, timesheet, and conflict APIs are available', async () => {
    await insertAttendanceEvent({
      id: 'attendance-1',
      organisationId: 'org-1',
      projectId: 'project-1',
      personId: 'person-1',
      eventType: 'CHECK_IN',
      occurredAt: '2026-08-20T01:00:00.000Z',
      workDateUtc: '2026-08-20',
      source: 'QR',
    });
    await upsertAttendanceState({
      organisationId: 'org-1',
      projectId: 'project-1',
      personId: 'person-1',
      workDateUtc: '2026-08-20',
      status: 'PRESENT',
      firstCheckInAt: '2026-08-20T01:00:00.000Z',
      lastCheckOutAt: null,
      updatedAt: '2026-08-20T01:00:00.000Z',
    });
    await upsertTimesheet({
      id: 'timesheet-1',
      organisationId: 'org-1',
      projectId: 'project-1',
      personId: 'person-1',
      workDateUtc: '2026-08-20',
      totalMinutes: 480,
      status: 'DRAFT',
      updatedAt: '2026-08-20T01:00:00.000Z',
    });
    await insertConflict({
      id: 'conflict-1',
      organisationId: 'org-1',
      projectId: 'project-1',
      entityType: 'ATTENDANCE',
      entityId: 'attendance-1',
      localPayloadJson: '{}',
      serverPayloadJson: '{}',
      createdAt: '2026-08-20T01:00:00.000Z',
      status: 'OPEN',
      resolution: null,
      resolvedAt: null,
    });
    await resolveConflict('conflict-1', 'KEEP_SERVER', '2026-08-20T02:00:00.000Z');
    await expect(getConflict('conflict-1')).resolves.toMatchObject({ status: 'RESOLVED' });
  });

  test('transaction rolls back on error', async () => {
    await expect(
      withTransaction(async (tx) => {
        await tx.executeSql('INSERT INTO organisations (id, name) VALUES (?, ?);', ['org-tx', 'TX']);
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');

    const result = await getDb().execute('SELECT id FROM organisations WHERE id = ?;', ['org-tx']);
    expect(result.rows.length).toBe(0);
  });

  test('database recovery rejects unsupported schema versions', async () => {
    const dbName = `m13-recovery-${Date.now()}.db`;
    const seedDb = await open({ name: dbName });
    await seedDb.execute(`PRAGMA user_version = ${DATABASE_SCHEMA_VERSION + 99};`);
    await close(seedDb);

    await expect(initializeDatabase(dbName)).rejects.toThrow(/Unsupported schema version/);
    const recoveryDb = await open({ name: dbName });
    await recoveryDb.execute('PRAGMA user_version = 0;');
    await close(recoveryDb);
  });
});
