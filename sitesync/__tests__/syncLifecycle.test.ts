import { SyncLifecycle } from '../src/sync/syncLifecycle';

function runtime() {
  return {
    start: jest.fn(async () => undefined),
    stop: jest.fn(async () => undefined),
    requestManualSync: jest.fn(async () => ({ status: 'IDLE' as const })),
    requestNetworkRestoredSync: jest.fn(async () => ({ status: 'IDLE' as const })),
  };
}

describe('SyncLifecycle', () => {
  it('starts on mount and stops on dispose', async () => {
    const r = runtime();
    const appState = { addEventListener: jest.fn(() => ({ remove: jest.fn() })) };
    const lifecycle = new SyncLifecycle(r, appState);

    await lifecycle.start();
    await lifecycle.dispose();
    expect(r.start).toHaveBeenCalledTimes(1);
    expect(r.stop).toHaveBeenCalledTimes(1);
  });

  it('triggers a manual sync when the app returns to active', async () => {
    const r = runtime();
    let listener!: (state: string) => void;
    const appState = { addEventListener: jest.fn((_: string, cb: (state: string) => void) => { listener = cb; return { remove: jest.fn() }; }) };
    const lifecycle = new SyncLifecycle(r, appState);

    await lifecycle.start();
    listener('active');
    await Promise.resolve();
    expect(r.requestManualSync).toHaveBeenCalledTimes(1);
  });

  it('triggers network-restored sync only on a false-to-true transition', async () => {
    const r = runtime();
    const network = {
      subscribe: jest.fn((cb: (online: boolean) => void) => {
        cb(false);
        cb(true);
        cb(true);
        return jest.fn();
      }),
    };
    const appState = { addEventListener: jest.fn(() => ({ remove: jest.fn() })) };
    const lifecycle = new SyncLifecycle(r, appState, network);

    await lifecycle.start();
    await Promise.resolve();
    expect(r.requestNetworkRestoredSync).toHaveBeenCalledTimes(1);
  });

  it('stops the runtime when authentication is lost', async () => {
    const r = runtime();
    let authListener!: (userId: string | null) => void;
    const auth = {
      subscribe: jest.fn((cb: (userId: string | null) => void) => { authListener = cb; return jest.fn(); }),
    };
    const appState = { addEventListener: jest.fn(() => ({ remove: jest.fn() })) };
    const lifecycle = new SyncLifecycle(r, appState, undefined, auth);

    await lifecycle.start();
    authListener(null);
    await Promise.resolve();
    expect(r.stop).toHaveBeenCalledTimes(1);
  });
});
