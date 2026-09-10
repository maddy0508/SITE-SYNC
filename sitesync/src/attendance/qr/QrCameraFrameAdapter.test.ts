import { QrCameraFrameAdapter } from './QrCameraFrameAdapter';
import { QrScanController } from '../../qr/qrScanController';

describe('QrCameraFrameAdapter', () => {
  it('passes decoded QR values into the domain scan controller', () => {
    const controller = new QrScanController();
    const accept = jest.spyOn(controller, 'accept');
    const adapter = new QrCameraFrameAdapter(controller);

    const result = adapter.onFrame({ value: ' SITE-SYNC:1|org=org-a ' });

    expect(accept).toHaveBeenCalledWith(' SITE-SYNC:1|org=org-a ');
    expect(result).toBe(true);
  });

  it('rejects empty native values before they enter the processing path', () => {
    const controller = new QrScanController();
    const accept = jest.spyOn(controller, 'accept');
    const adapter = new QrCameraFrameAdapter(controller);

    const result = adapter.onFrame({ value: null });

    expect(accept).toHaveBeenCalledWith('');
    expect(result).toBe(false);
  });

  it('releases the processing claim so a later frame can be admitted', () => {
    const controller = new QrScanController();
    const adapter = new QrCameraFrameAdapter(controller);

    expect(adapter.onFrame({ value: 'SITE-SYNC:1|org=org-a' })).toBe(true);
    expect(adapter.onFrame({ value: 'SITE-SYNC:1|org=org-b' })).toBe(false);

    adapter.release();

    expect(adapter.onFrame({ value: 'SITE-SYNC:1|org=org-b' })).toBe(true);
  });

  it('resets both duplicate suppression and processing state', () => {
    const controller = new QrScanController();
    const adapter = new QrCameraFrameAdapter(controller);

    expect(adapter.onFrame({ value: 'SITE-SYNC:1|org=org-a' })).toBe(true);
    adapter.reset();

    expect(adapter.onFrame({ value: 'SITE-SYNC:1|org=org-a' })).toBe(true);
  });
});
