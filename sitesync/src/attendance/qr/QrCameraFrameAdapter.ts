import { QrScanController } from './QrScanController';

/**
 * Thin adapter boundary between a native QR camera callback and the
 * domain-owned scan controller. Native camera libraries should call this
 * adapter; they must not bypass parser/validation or mutate attendance state.
 */
export type NativeQrFrame = {
  value?: string | null;
};

export class QrCameraFrameAdapter {
  public constructor(private readonly controller: QrScanController) {}

  public onFrame(frame: NativeQrFrame): ReturnType<QrScanController['consume']> {
    return this.controller.consume(frame.value ?? '');
  }
}
