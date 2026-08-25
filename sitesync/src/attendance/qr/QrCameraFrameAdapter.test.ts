import { QrCameraFrameAdapter } from './QrCameraFrameAdapter';
import { QrScanController } from '../../qr/qrScanController';

describe('QrCameraFrameAdapter', () => {
  it('passes decoded QR values into the domain scan controller', () => {
    const controller = new QrScanController();
    const accept = jest.spyOn(controller, 'accept');
    const onAcceptedValue = jest.fn();
    const adapter = new QrCameraFrameAdapter(controller, onAcceptedValue);

    const result = adapter.onFrame({ value: ' SITE-SYNC:1|org=org-a ' });

    expect(accept).toHaveBeenCalledWith(' SITE-SYNC:1|org=org-a ');
    expect(onAcceptedValue).toHaveBeenCalledWith('SITE-SYNC:1|org=org-a');
    expect(result).toBe(true);
  });

  it('suppresses an empty native value without invoking the callback', () => {
    const controller = new QrScanController();
    const onAcceptedValue = jest.fn();
    const adapter = new QrCameraFrameAdapter(controller, onAcceptedValue);

    const result = adapter.onFrame({ value: null });

    expect(onAcceptedValue).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
