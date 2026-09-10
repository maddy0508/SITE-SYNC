import type { QrScanController } from './qrScanController';

export interface NativeQrFrame {
  rawValue?: string;
  displayValue?: string;
}

/**
 * Isolates the native barcode callback shape from the QR scan lifecycle.
 * rawValue is authoritative; displayValue is only a fallback for native variants
 * that do not expose a raw string.
 */
export class QrCameraFrameAdapter {
  constructor(private readonly controller: Pick<QrScanController, 'accept'>) {}

  handle(frame: NativeQrFrame): boolean {
    const value = frame.rawValue ?? frame.displayValue;
    return this.controller.accept(value);
  }
}
