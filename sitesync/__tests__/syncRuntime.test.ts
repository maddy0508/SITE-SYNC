import { SyncRuntime } from '../src/sync/syncRuntime';

type Worker = {
  start: jest.Mock<void, []>;
  stop: jest.Mock<void, []>;
  requestSync: jest.Mock<Promise<unknown>, [string]>;
};

function worker(): Worker {
  return { start: jest.fn(), stop: jest.fn(), requestSync: jest.fn(async () => ({ status: 'IDLE' })) };
}

describe('SyncRuntime', () => {
  it('starts exactly once and stops the worker on shutdown', async () => {
    const w = worker();
    const runtime = new SyncRuntime({
      getAuthenticatedUserId: jest.fn(async () => 'user-1'),
      getDeviceSession: jest.fn(async () => ({ status: 'ACTIVE', deviceInstallationId: 'device-1' })),
      createWorker: jest.fn(async () => w),
    });

    await runtime.start();
    await runtime.start();
    expect(w.start).toHaveBeenCalledTimes(1);

    await runtime.stop();
    await runtime.stop();
    expect(w.stop).toHaveBeenCalledTimes(1);
  });

  it('does not create a worker when authentication is unavailable', async () => {
    const createWorker = jest.fn(async () => worker());
    const runtime = new SyncRuntime({
      getAuthenticatedUserId: jest.fn(async () => null),
      createWorker,
    });

    await runtime.start();
    expect(createWorker).not.toHaveBeenCalled();
  });

  it('does not create a worker when the local device session is absent or revoked', async () => {
    const createWorker = jest.fn(async () => worker());
    const getDeviceSession = jest.fn(async () => null);
    const runtime = new SyncRuntime({
      getAuthenticatedUserId: jest.fn(async () => 'user-1'),
      getDeviceSession,
      createWorker,
    });

    await runtime.start();
    expect(getDeviceSession).toHaveBeenCalledWith('user-1');
    expect(createWorker).not.toHaveBeenCalled();

    getDeviceSession.mockResolvedValue({ status: 'REVOKED', deviceInstallationId: 'device-1' });
    await runtime.start();
    expect(createWorker).not.toHaveBeenCalled();
  });

  it('sources the worker from the authenticated user and active local device', async () => {
    const w = worker();
    const createWorker = jest.fn(async (userId: string, deviceInstallationId: string) => {
      expect(userId).toBe('user-1');
      expect(deviceInstallationId).toBe('device-1');
      return w;
    });
    const runtime = new SyncRuntime({
      getAuthenticatedUserId: jest.fn(async () => 'user-1'),
      getDeviceSession: jest.fn(async () => ({ status: 'ACTIVE', deviceInstallationId: 'device-1' })),
      createWorker,
    });

    await runtime.start();
    expect(createWorker).toHaveBeenCalledWith('user-1', 'device-1');
    expect(w.start).toHaveBeenCalledTimes(1);
  });

  it('forwards manual sync requests to the live worker and remains safe before start', async () => {
    const w = worker();
    const runtime = new SyncRuntime({
      getAuthenticatedUserId: jest.fn(async () => 'user-1'),
      getDeviceSession: jest.fn(async () => ({ status: 'ACTIVE', deviceInstallationId: 'device-1' })),
      createWorker: jest.fn(async () => w),
    });

    expect(await runtime.requestManualSync()).toEqual({ status: 'IDLE' });
    expect(w.requestSync).not.toHaveBeenCalled();

    await runtime.start();
    await runtime.requestManualSync();
    expect(w.requestSync).toHaveBeenCalledWith('MANUAL');
  });
});
