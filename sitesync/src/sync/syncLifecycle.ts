import type { SyncRuntime } from './syncRuntime';

export interface AppStateSource {
  addEventListener(event: 'change', listener: (state: string) => void): { remove(): void };
}

export interface NetworkStateSource {
  subscribe(listener: (online: boolean) => void): () => void;
}

export interface AuthStateSource {
  subscribe(listener: (userId: string | null) => void): () => void;
}

/** Binds platform lifecycle events to the already-serialized SyncRuntime. */
export class SyncLifecycle {
  private appStateSubscription: { remove(): void } | null = null;
  private removeNetworkSubscription: (() => void) | null = null;
  private removeAuthSubscription: (() => void) | null = null;
  private disposed = false;
  private started = false;
  private wasOnline: boolean | null = null;

  constructor(
    private readonly runtime: Pick<SyncRuntime, 'start' | 'stop' | 'requestManualSync' | 'requestNetworkRestoredSync'>,
    private readonly appState: AppStateSource,
    private readonly network?: NetworkStateSource,
    private readonly auth?: AuthStateSource,
  ) {}

  async start(): Promise<void> {
    if (this.disposed || this.started) return;
    await this.runtime.start();
    if (this.disposed || this.started) return;
    this.started = true;

    this.appStateSubscription = this.appState.addEventListener('change', state => {
      if (state === 'active' && !this.disposed) void this.runtime.requestManualSync();
    });

    if (this.network) {
      this.removeNetworkSubscription = this.network.subscribe(online => {
        const restored = this.wasOnline === false && online;
        this.wasOnline = online;
        if (restored && !this.disposed) void this.runtime.requestNetworkRestoredSync();
      });
    }

    if (this.auth) {
      this.removeAuthSubscription = this.auth.subscribe(userId => {
        if (this.disposed) return;
        if (userId) void this.runtime.start();
        else void this.runtime.stop();
      });
    }
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.started = false;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.removeNetworkSubscription?.();
    this.removeNetworkSubscription = null;
    this.removeAuthSubscription?.();
    this.removeAuthSubscription = null;
    await this.runtime.stop();
  }
}
