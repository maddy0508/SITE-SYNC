import type { SyncRuntime } from './syncRuntime';

export interface AppStateSource {
  addEventListener(event: 'change', listener: (state: string) => void): { remove(): void };
}

export interface NetworkStateSource {
  subscribe(listener: (online: boolean) => void): () => void;
}

/** Binds platform lifecycle events to the already-serialized SyncRuntime. */
export class SyncLifecycle {
  private appStateSubscription: { remove(): void } | null = null;
  private removeNetworkSubscription: (() => void) | null = null;
  private disposed = false;
  private wasOnline: boolean | null = null;

  constructor(
    private readonly runtime: Pick<SyncRuntime, 'start' | 'stop' | 'requestManualSync' | 'requestNetworkRestoredSync'>,
    private readonly appState: AppStateSource,
    private readonly network?: NetworkStateSource,
  ) {}

  async start(): Promise<void> {
    if (this.disposed) return;
    await this.runtime.start();
    if (this.disposed) return;

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
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.removeNetworkSubscription?.();
    this.removeNetworkSubscription = null;
    await this.runtime.stop();
  }
}
