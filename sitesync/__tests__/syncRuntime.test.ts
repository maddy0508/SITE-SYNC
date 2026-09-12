import { SyncRuntime, type SyncRuntimeDependencies, type SyncRuntimeWorker } from '../src/sync/syncRuntime';
import type { SyncRunResult, SyncTriggerReason } from '../src/sync/syncWorker';

type Worker = {
  start: jest.MockedFunction<SyncRuntimeWorker['start']>;
  stop: jest.MockedFunction<SyncRuntimeWorker['stop']>;
  requestSync: jest.MockedFunction<SyncRuntimeWorker['requestSync']>;
};

function worker(): Worker {
  return {
    start: jest.fn(),
    stop: jest.fn(),
    requestSync: jest.fn(async (_reason: SyncTriggerReason): Promise<SyncRunResult> => ({ status: 'IDLE' })),
  };
}

const activeSession = () => ({ status: 'ACTIVE' as const, deviceInstallationId: 'device-1' });
const revokedSession = () => ({ status: 'REVOKED' as const, deviceInstallationId: 'device-1' });

function createWorkerFactory(w: Worker): SyncRuntimeDependencies['createWorker'] {
  return jest.fn(async (_userId: string, _deviceInstallationId: string): Promise<SyncRuntimeWorker> => w);
}

describe('SyncRuntime', () => {
  it('starts exactly once and stops the worker on shutdown', async () => {
    const w = worker();
    const runtime = new SyncRuntime({
      getAuthenticatedUserId: jest.fn(async () => 'user-1'),
      getDeviceSession: jest.fn(async () => activeSession()),
      createWorker: createWorkerFactory(w),
    });

    await runtime.start();
    await runtime.start();
    expect(w.start).toHaveBeenCalledTimes(1);

    await runtime.stop();
    await runtime.stop();
    expect(w.stop).toHaveBeenCalledTimes(1);
  });

  it('does not create a worker when authentication is unavailable', async () => {
    const createWorker = createWorkerFactory(worker());
    const runtime = new SyncRuntime({
      getAuthenticatedUserId: jest.fn(async () => null),
      createWorker,
    });

    await runtime.start();
    expect(createWorker).not.toHaveBeenCalled();
  });

  it('does not create a worker when the local device session is absent or revoked', async () => {
    const createWorker = createWorkerFactory(worker());
    let session: ReturnType<typeof activeSession> | ReturnType<typeof revokedSession> | null = null;
    const getDeviceSession: NonNullable<SyncRuntimeDependencies['getDeviceSession']> = jest.fn(async () => session);
    const runtime = new SyncRuntime({
      getAuthenticatedUserId: jest.fn(async () => 'user-1'),
      getDeviceSession,
      createWorker,
    });

    await runtime.start();
    expect(getDeviceSession).toHaveBeenCalledWith('user-1');
    expect(createWorker).not.toHaveBeenCalled();

    session = revokedSession();
    await runtime.start();
    expect(createWorker).not.toHaveBeenCalled();
  });

  it('sources the worker from the authenticated user and active local device', async () => {
    const w = worker();
    const createWorker = jest.fn(async (userId: string, deviceInstallationId: string): Promise<SyncRuntimeWorker> => {
      expect(userId).toBe('user-1');
      expect(deviceInstallationId).toBe('device-1');
      return w;
    });
    const runtime = new SyncRuntime({
      getAuthenticatedUserId: jest.fn(async () => 'user-1'),
      getDeviceSession: jest.fn(async () => activeSession()),
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
      getDeviceSession: jest.fn(async () => activeSession()),
      createWorker: createWorkerFactory(w),
    });

    expect(await runtime.requestManualSync()).toEqual({ status: 'IDLE' });
    expect(w.requestSync).not.toHaveBeenCalled();

    await runtime.start();
    await runtime.requestManualSync();
    expect(w.requestSync).toHaveBeenCalledWith('MANUAL');
  });

  it('does not start a worker that finishes construction after stop is requested', async () => {
    const w = worker();
    let resolveWorker!: (value: SyncRuntimeWorker) => void;
    const createWorker: SyncRuntimeDependencies['createWorker'] = jest.fn(
      () => new Promise(resolve => { resolveWorker = resolve; }),
    );
    const runtime = new SyncRuntime({
      getAuthenticatedUserId: jest.fn(async () => 'user-1'),
      getDeviceSession: jest.fn(async () => activeSession()),
      createWorker,
    });

    const startPromise = runtime.start();
    const stopPromise = runtime.stop();
    await Promise.resolve();
    await Promise.resolve();
    resolveWorker(w);
    await Promise.all([startPromise, stopPromise]);

    expect(w.start).not.toHaveBeenCalled();
    expect(w.stop).not.toHaveBeenCalled();
  });
});
