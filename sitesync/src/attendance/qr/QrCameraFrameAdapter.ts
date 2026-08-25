import { QrScanController } from '../../qr/qrScanController';

/**
 * Thin adapter boundary between a native QR camera callback and the
 * domain-owned duplicate-frame controller. Native camera libraries should
 * call this adapter; they must not bypass parser/validation or mutate
 * attendance state.
 */
export type NativeQrFrame = {
  value?: string | null;
};

export type AcceptedQrValueHandler = (value: string) => void;

export class QrCameraFrameAdapter {
  public constructor(
    private readonly controller: QrScanController,
    private readonly onAcceptedValue?: AcceptedQrValueHandler,
  ) {}

  public onFrame(frame: NativeQrFrame): boolean {
    const value = frame.value ?? '';
    const accepted = this.controller.accept(value);

    if (accepted && value.trim()) {
      this.onAcceptedValue?.(value.trim());
    }

    return accepted;
  }
}
