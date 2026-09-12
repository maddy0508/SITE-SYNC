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
 * A worker is created only after both an authenticated user and an ACTIVE
 * locally registered device have been resolved. The device installation ID
 * therefore cannot originate in UI input or arbitrary caller data.
 */
export class SyncRuntime {
  private worker: SyncRuntimeWorker | null = null;
  private starting: Promise<void> | null = null;
  private lifecycleGeneration = 0;

  constructor(private readonly dependencies: SyncRuntimeDependencies) {}

  async start(): Promise<void> {
    if (this.worker || this.starting) return this.starting ?? Promise.resolve();
    const generation = ++this.lifecycleGeneration;
    this.starting = this.initialize(generation);
    try {
      await this.starting;
    } finally {
      this.starting = null;
    }
  }

  async stop(): Promise<void> {
    ++this.lifecycleGeneration;
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

  private async initialize(generation: number): Promise<void> {
    const userId = await (this.dependencies.getAuthenticatedUserId?.() ?? Promise.resolve(null));
    if (!userId || generation !== this.lifecycleGeneration) return;

    const getDeviceSession = this.dependencies.getDeviceSession ?? defaultGetDeviceSession;
    const deviceSession = await getDeviceSession(userId);
    if (!deviceSession || deviceSession.status !== 'ACTIVE' || !deviceSession.deviceInstallationId || generation !== this.lifecycleGeneration) return;

    const worker = await this.dependencies.createWorker(userId, deviceSession.deviceInstallationId);
    if (generation !== this.lifecycleGeneration) return;
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
