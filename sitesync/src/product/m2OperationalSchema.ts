import { getDb } from '../database/localPersistence';

/** Additive M2 schema bootstrap. Kept separate from M1 migration semantics. */
export async function ensureM2OperationalSchema(): Promise<void> {
  const db = getDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS m2_operational_project_projection (
    project_id TEXT PRIMARY KEY,
    organisation_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_m2_operational_project_tenant
    ON m2_operational_project_projection (organisation_id, company_id, project_id);`);
}
