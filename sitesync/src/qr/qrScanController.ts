export type Clock = () => number;

/**
 * Guards the native QR callback boundary from repeated frames and empty decoder values.
 * It is intentionally UI/native-library agnostic so the lifecycle can be tested without a camera.
 */
export class QrScanController {
  private lastValue: string | null = null;
  private lastAcceptedAt = 0;

  constructor(
    private readonly suppressionWindowMs = 750,
    private readonly now: Clock = () => Date.now(),
  ) {}

  accept(value: string | undefined): boolean {
    const normalized = value?.trim();
    if (!normalized) return false;

    const currentTime = this.now();
    if (
      normalized === this.lastValue &&
      currentTime - this.lastAcceptedAt < this.suppressionWindowMs
    ) {
      return false;
    }

    this.lastValue = normalized;
    this.lastAcceptedAt = currentTime;
    return true;
  }

  reset(): void {
    this.lastValue = null;
    this.lastAcceptedAt = 0;
  }
}
