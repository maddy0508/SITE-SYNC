import { AuthService } from '../src/auth/authService';
import { SyncRuntime, createAuthenticatedSyncRuntime } from '../src/sync/syncRuntime';

describe('createAuthenticatedSyncRuntime', () => {
  it('uses the authenticated session as the user identity and local device session as device identity', async () => {
    const auth = new AuthService({
      auth: {
        getSession: jest.fn(async () => ({ data: { session: { user: { id: 'user-1' } } }, error: null })),
      },
    } as never);
    const rpc = { rpc: jest.fn(async () => ({ data: { status: 'ACCEPTED', command_id: 'cmd-1', server_revision: 1, result: {} }, error: null })) };

    const runtime = createAuthenticatedSyncRuntime(auth, rpc, {
      getDeviceSession: jest.fn(async () => ({ status: 'ACTIVE' as const, deviceInstallationId: 'device-1' })),
    });

    expect(runtime).toBeInstanceOf(SyncRuntime);
    await runtime.start();
    await runtime.stop();
  });

  it('does not construct a worker when there is no authenticated session', async () => {
    const auth = new AuthService({
      auth: { getSession: jest.fn(async () => ({ data: { session: null }, error: null })) },
    } as never);
    const rpc = { rpc: jest.fn() };
    const createWorker = jest.fn();
    const runtime = createAuthenticatedSyncRuntime(auth, rpc, { createWorker });

    await runtime.start();
    expect(createWorker).not.toHaveBeenCalled();
  });
});
