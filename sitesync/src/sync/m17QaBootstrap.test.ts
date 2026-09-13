import { closeDatabase, initializeDatabase } from '../database/localPersistence';
import { prepareM17Database } from './m17QaBootstrap';

jest.mock('../database/localPersistence', () => ({
  closeDatabase: jest.fn(),
  initializeDatabase: jest.fn(),
}));

describe('prepareM17Database', () => {
  it('closes any existing SQLite singleton before opening the M1.7 database', async () => {
    const calls: string[] = [];
    (closeDatabase as jest.Mock).mockImplementation(async () => { calls.push('close'); });
    (initializeDatabase as jest.Mock).mockImplementation(async () => { calls.push('initialize'); });

    await prepareM17Database('m17-real-runtime-device.db');

    expect(calls).toEqual(['close', 'initialize']);
    expect(initializeDatabase).toHaveBeenCalledWith('m17-real-runtime-device.db');
  });
});
