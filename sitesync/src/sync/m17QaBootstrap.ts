import { closeDatabase, initializeDatabase } from '../database/localPersistence';

/**
 * M1.7 physical QA uses the same process-wide SQLite singleton as M1.6.
 * Explicitly close any prior QA database before claiming the singleton for M1.7.
 */
export async function prepareM17Database(databaseName: string): Promise<void> {
  await closeDatabase();
  await initializeDatabase(databaseName);
}
