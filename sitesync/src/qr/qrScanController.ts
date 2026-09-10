export type Clock = () => number;

/**
 * Guards the native QR callback boundary from repeated frames and concurrent processing.
 * It is intentionally UI/native-library agnostic so the lifecycle can be tested without a camera.
 */
export class QrScanController {
  private lastValue: string | null = null;
  private lastAcceptedAt = 0;
  private processing = false;

  constructor(
    private readonly suppressionWindowMs = 750,
    private readonly now: Clock = () => Date.now(),
  ) {}

  accept(value: string | undefined): boolean {
    const normalized = value?.trim();
    if (!normalized || this.processing) return false;

    const currentTime = this.now();
    if (
      normalized === this.lastValue &&
      currentTime - this.lastAcceptedAt < this.suppressionWindowMs
    ) {
      return false;
    }

    this.lastValue = normalized;
    this.lastAcceptedAt = currentTime;
    this.processing = true;
    return true;
  }

  release(): void {
    this.processing = false;
  }

  reset(): void {
    this.lastValue = null;
    this.lastAcceptedAt = 0;
    this.processing = false;
  }
}
