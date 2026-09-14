import type { M2OperationalProject } from './m2OperationalProject';
import { getDb } from '../database/localPersistence';
import type { M2OperationalProjectStore } from './m2OperationalPersistence';

function serialise(value: M2OperationalProject): string {
  return JSON.stringify(value);
}

function deserialise(value: unknown): M2OperationalProject {
  if (typeof value !== 'string') throw new Error('Invalid operational projection payload');
  return JSON.parse(value) as M2OperationalProject;
}

export const sqliteM2OperationalProjectStore: M2OperationalProjectStore = {
  async save(value) {
    const db = getDb();
    await db.execute(
      `CREATE TABLE IF NOT EXISTS m2_operational_project_projection (
        project_id TEXT PRIMARY KEY,
        organisation_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    );
    await db.execute(
      `INSERT INTO m2_operational_project_projection (project_id, organisation_id, company_id, payload_json, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(project_id) DO UPDATE SET organisation_id=excluded.organisation_id, company_id=excluded.company_id, payload_json=excluded.payload_json, updated_at=excluded.updated_at`,
      [value.projectId, value.organisationId, value.companyId, serialise(value), new Date().toISOString()],
    );
  },
  async load(projectId, organisationId, companyId) {
    const db = getDb();
    await db.execute(
      `CREATE TABLE IF NOT EXISTS m2_operational_project_projection (
        project_id TEXT PRIMARY KEY,
        organisation_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    );
    const result = await db.execute(
      `SELECT organisation_id as organisationId, company_id as companyId, payload_json as payloadJson
       FROM m2_operational_project_projection WHERE project_id = ?`,
      [projectId],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows.item(0);
    if (row.organisationId !== organisationId || row.companyId !== companyId) throw new Error('M2 operational projection tenant mismatch');
    return deserialise(row.payloadJson);
  },
};
