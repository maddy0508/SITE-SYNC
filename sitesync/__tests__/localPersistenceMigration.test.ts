import { close, open } from '../src/database/sqliteAdapter';
import {
  closeDatabase,
  getDb,
  initializeDatabase,
  DATABASE_SCHEMA_VERSION,
} from '../src/database/localPersistence';

declare const process: { pid: number };

const MIGRATION_DATABASE_NAME = `m16-migration-${process.pid}-${Date.now()}.db`;

describe('M1.6 schema migration', () => {
  afterEach(async () => {
    await closeDatabase();
  });

  test('migrates an existing v1 schema to v2 without losing command rows and remains idempotent', async () => {
    const seedDb = await open({ name: MIGRATION_DATABASE_NAME });
    await seedDb.execute(`CREATE TABLE local_device_session (user_id TEXT PRIMARY KEY);`);
    await seedDb.execute(`CREATE TABLE project_context (person_id TEXT PRIMARY KEY);`);
    await seedDb.execute(`CREATE TABLE project_roster (project_id TEXT NOT NULL, person_id TEXT NOT NULL, PRIMARY KEY (project_id, person_id));`);
    await seedDb.execute(`CREATE TABLE command_ledger (
      command_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      organisation_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      command_type TEXT NOT NULL,
      source TEXT NOT NULL,
      base_revision INTEGER NOT NULL,
      status TEXT NOT NULL,
      attempt_count INTEGER NOT NULL CHECK (attempt_count >= 0),
      max_attempts INTEGER NOT NULL CHECK (max_attempts > 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`);
    await seedDb.execute(`CREATE TABLE attendance_event (
      event_id TEXT PRIMARY KEY,
      command_id TEXT NOT NULL,
      FOREIGN KEY (command_id) REFERENCES command_ledger(command_id)
    );`);
    await seedDb.execute(`CREATE TABLE attendance_state (
      project_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      work_date_utc TEXT NOT NULL,
      last_event_id TEXT NOT NULL,
      last_command_id TEXT NOT NULL,
      PRIMARY KEY (project_id, person_id, work_date_utc),
      FOREIGN KEY (last_event_id) REFERENCES attendance_event(event_id),
      FOREIGN KEY (last_command_id) REFERENCES command_ledger(command_id)
    );`);
    await seedDb.execute(`CREATE TABLE timesheet (
      project_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      work_date_utc TEXT NOT NULL,
      total_minutes INTEGER CHECK (total_minutes IS NULL OR total_minutes >= 0),
      policy TEXT NOT NULL CHECK (policy = 'M1_FIRST_IN_LAST_OUT_UTC'),
      PRIMARY KEY (project_id, person_id, work_date_utc)
    );`);
    await seedDb.execute(`CREATE TABLE conflict (
      conflict_id TEXT PRIMARY KEY,
      command_id TEXT NOT NULL,
      FOREIGN KEY (command_id) REFERENCES command_ledger(command_id)
    );`);
    await seedDb.execute(`CREATE INDEX idx_event_lookup ON attendance_event (event_id);`);
    await seedDb.execute(`CREATE INDEX idx_ledger_retry ON command_ledger (status);`);
    await seedDb.execute(`CREATE INDEX idx_ledger_processing ON command_ledger (status);`);
    await seedDb.execute(`CREATE INDEX idx_roster_project ON project_roster (project_id);`);
    await seedDb.execute(`CREATE INDEX idx_conflict_command ON conflict (command_id);`);
    await seedDb.execute(`CREATE TRIGGER prevent_attendance_event_update BEFORE UPDATE ON attendance_event BEGIN SELECT RAISE(FAIL, 'Attendance events are append-only and cannot be updated'); END;`);
    await seedDb.execute(`CREATE TRIGGER prevent_attendance_event_delete BEFORE DELETE ON attendance_event BEGIN SELECT RAISE(FAIL, 'Attendance events are append-only and cannot be deleted'); END;`);
    await seedDb.execute(`CREATE TRIGGER prevent_conflict_delete BEFORE DELETE ON conflict BEGIN SELECT RAISE(FAIL, 'Conflicts are append-only and cannot be deleted'); END;`);
    await seedDb.execute(`INSERT INTO command_ledger (
      command_id, project_id, person_id, organisation_id, company_id, command_type,
      source, base_revision, status, attempt_count, max_attempts, created_at, updated_at
    ) VALUES ('legacy-command', 'project-1', 'person-1', 'org-1', 'company-1', 'CHECK_IN', 'SELF', 0, 'PENDING', 0, 3, '2026-09-11T00:00:00.000Z', '2026-09-11T00:00:00.000Z');`);
    await seedDb.execute('PRAGMA user_version = 1;');
    await close(seedDb);

    await initializeDatabase(MIGRATION_DATABASE_NAME);

    const version = await getDb().execute('PRAGMA user_version;');
    expect(version.rows.item(0)?.user_version).toBe(DATABASE_SCHEMA_VERSION);

    const columns = await getDb().execute('PRAGMA table_info(command_ledger);');
    expect(columns.rows.some((row: any) => row.name === 'command_payload_json')).toBe(true);

    const legacyRow = await getDb().execute('SELECT command_id, command_payload_json FROM command_ledger WHERE command_id = ?', ['legacy-command']);
    expect(legacyRow.rows.length).toBe(1);
    expect(legacyRow.rows.item(0)?.command_payload_json).toBe('{}');

    await closeDatabase();
    await initializeDatabase(MIGRATION_DATABASE_NAME);
    const reopenedVersion = await getDb().execute('PRAGMA user_version;');
    expect(reopenedVersion.rows.item(0)?.user_version).toBe(DATABASE_SCHEMA_VERSION);
  });
});
