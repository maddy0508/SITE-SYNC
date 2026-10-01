import { ensureM2OperationalSchema } from './m2OperationalSchema';
import { getDb } from '../database/localPersistence';

jest.mock('../database/localPersistence', () => ({ getDb: jest.fn() }));

test('creates the additive operational projection table and tenant index', async () => {
  const execute = jest.fn().mockResolvedValue({ rows: [], rowsAffected: 0 });
  (getDb as jest.Mock).mockReturnValue({ execute });
  await ensureM2OperationalSchema();
  expect(execute).toHaveBeenCalledTimes(2);
  expect(execute.mock.calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS m2_operational_project_projection');
  expect(execute.mock.calls[1][0]).toContain('CREATE INDEX IF NOT EXISTS idx_m2_operational_project_tenant');
});
