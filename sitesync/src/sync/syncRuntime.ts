import type { AuthService } from '../auth/authService';
import { getLocalDeviceSession, type LocalDeviceSessionRecord } from '../database/localPersistence';
import { SyncCommandRepository } from './syncCommandRepository';
import { SupabaseSyncTransport, type SupabaseRpcClient } from './supabaseSyncTransport';
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

export interface AuthenticatedSyncRuntimeOptions {
  getDeviceSession?: SyncRuntimeDependencies['getDeviceSession'];
  createWorker?: SyncRuntimeDependencies['createWorker'];
}

/** Owns the application-level lifetime of the sync worker. */
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

/** Compose the production runtime from the existing AuthService, local device session, and narrow RPC transport. */
export function createAuthenticatedSyncRuntime(
  authService: AuthService,
  rpcClient: SupabaseRpcClient,
  options: AuthenticatedSyncRuntimeOptions = {},
): SyncRuntime {
  const createWorker = options.createWorker ?? (async (_userId: string, deviceInstallationId: string) => {
    const transport: SyncTransport = new SupabaseSyncTransport(rpcClient);
    const deviceContext: SyncDeviceContext = {
      getDeviceInstallationId: async () => deviceInstallationId,
    };
    return new SyncWorker(transport, new SyncCommandRepository(), deviceContext);
  });

  return new SyncRuntime({
    getAuthenticatedUserId: async () => {
      const session = await authService.getCurrentSession();
      return session?.user.id ?? null;
    },
    getDeviceSession: options.getDeviceSession,
    createWorker,
  });
}

/** Convenience adapter for composing a SyncWorker from an injected transport factory. */
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
