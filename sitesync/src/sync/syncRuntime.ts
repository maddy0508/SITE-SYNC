import { getLocalDeviceSession, type LocalDeviceSessionRecord } from '../database/localPersistence';
import { SyncWorker, type SyncRunResult, type SyncDeviceContext } from './syncWorker';
import type { SyncTransport } from './syncTransport';

export interface SyncRuntimeWorker {
  start(): void;
  stop(): void;
  requestSync(reason: 'STARTUP' | 'NETWORK_RESTORED' | 'MANUAL' | 'RETRY'): Promise<SyncRunResult>;
}

export interface SyncRuntimeDependencies {
  getAuthenticatedUserId?: () => Promise<string | null>;
  getDeviceSession?: (userId: string) => Promise<Pick<LocalDeviceSessionRecord, 'status' | 'deviceInstallationId'> | null>;
  createWorker: (userId: string, deviceInstallationId: string) => Promise<SyncRuntimeWorker>;
}

const defaultGetDeviceSession = async (userId: string) => getLocalDeviceSession(userId);

/**
 * Owns the application-level lifetime of the sync worker.
 *
 * The runtime deliberately refuses to construct a worker without both an
 * authenticated user and an ACTIVE locally registered device. The device ID
 * is therefore sourced from local persistence and cannot originate in UI
 * input or arbitrary caller data.
 */
export class SyncRuntime {
  private worker: SyncRuntimeWorker | null = null;
  private starting: Promise<void> | null = null;

  constructor(private readonly dependencies: SyncRuntimeDependencies) {}

  async start(): Promise<void> {
    if (this.worker || this.starting) return this.starting ?? Promise.resolve();
    this.starting = this.initialize();
    try {
      await this.starting;
    } finally {
      this.starting = null;
    }
  }

  async stop(): Promise<void> {
    const pendingStart = this.starting;
    if (pendingStart) await pendingStart;
    const worker = this.worker;
    this.worker = null;
    worker?.stop();
  }

  async requestManualSync(): Promise<SyncRunResult> {
    return this.worker?.requestSync('MANUAL') ?? { status: 'IDLE' };
  }

  async requestNetworkRestoredSync(): Promise<SyncRunResult> {
    return this.worker?.requestSync('NETWORK_RESTORED') ?? { status: 'IDLE' };
  }

  private async initialize(): Promise<void> {
    const userId = await (this.dependencies.getAuthenticatedUserId?.() ?? Promise.resolve(null));
    if (!userId) return;

    const getDeviceSession = this.dependencies.getDeviceSession ?? defaultGetDeviceSession;
    const deviceSession = await getDeviceSession(userId);
    if (!deviceSession || deviceSession.status !== 'ACTIVE' || !deviceSession.deviceInstallationId) return;

    const worker = await this.dependencies.createWorker(userId, deviceSession.deviceInstallationId);
    this.worker = worker;
    worker.start();
  }
}

/** Convenience adapter for composing the existing SyncWorker without hiding its dependencies. */
export function createSyncWorkerFactory(
  createTransport: (userId: string) => Promise<SyncTransport>,
): SyncRuntimeDependencies['createWorker'] {
  return async (userId, deviceInstallationId) => {
    const transport = await createTransport(userId);
    const deviceContext: SyncDeviceContext = {
      getDeviceInstallationId: async () => deviceInstallationId,
    };
    return new SyncWorker(transport, undefined, deviceContext);
  };
}
