import { close, open, type SQLiteDatabase } from '../database/sqliteAdapter';

const DATABASE_NAME = 'm17-auth-session.db';
const TABLE_NAME = 'supabase_auth_storage';

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await open({ name: DATABASE_NAME });
      await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`);
      return db;
    })().catch(error => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

export interface M17AuthStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createM17AuthStorage(): M17AuthStorage {
  return {
    async getItem(key) {
      const db = await getDb();
      const result = await db.execute(`SELECT value FROM ${TABLE_NAME} WHERE key = ? LIMIT 1`, [key]);
      return result.rows.length > 0 ? String(result.rows.item(0).value) : null;
    },
    async setItem(key, value) {
      const db = await getDb();
      await db.execute(`INSERT INTO ${TABLE_NAME} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [key, value]);
    },
    async removeItem(key) {
      const db = await getDb();
      await db.execute(`DELETE FROM ${TABLE_NAME} WHERE key = ?`, [key]);
    },
  };
}

/** Test/cleanup seam. The persisted SQLite file is intentionally retained between app processes. */
export async function closeM17AuthStorage(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise.catch(() => null);
  dbPromise = null;
  if (db) await close(db);
}
