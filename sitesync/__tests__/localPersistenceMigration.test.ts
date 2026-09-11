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

  test('migrates an existing v1 command ledger to schema v2 without losing rows', async () => {
    const seedDb = await open({ name: MIGRATION_DATABASE_NAME });
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
      attempt_count INTEGER NOT NULL,
      max_attempts INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`);
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
  });
});
