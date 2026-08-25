import { QrCameraFrameAdapter } from './QrCameraFrameAdapter';
import { QrScanController } from '../../qr/qrScanController';

describe('QrCameraFrameAdapter', () => {
  it('passes decoded QR values into the domain scan controller', () => {
    const controller = new QrScanController();
    const accept = jest.spyOn(controller, 'accept');
    const adapter = new QrCameraFrameAdapter(controller);

    const result = adapter.onFrame({ value: 'SITE-SYNC:QR:v1:worker-0248' });

    expect(accept).toHaveBeenCalledWith('SITE-SYNC:QR:v1:worker-0248');
    expect(result).toBe(true);
  });

  it('normalizes a missing native value to an empty string', () => {
    const controller = new QrScanController();
    const accept = jest.spyOn(controller, 'accept');
    const adapter = new QrCameraFrameAdapter(controller);

    const result = adapter.onFrame({ value: null });

    expect(accept).toHaveBeenCalledWith('');
    expect(result).toBe(false);
  });
});
