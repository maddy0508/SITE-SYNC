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

export class QrCameraFrameAdapter {
  public constructor(private readonly controller: QrScanController) {}

  public onFrame(frame: NativeQrFrame): boolean {
    return this.controller.accept(frame.value ?? '');
  }
}
