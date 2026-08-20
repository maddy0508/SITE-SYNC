import { QrCameraFrameAdapter } from './QrCameraFrameAdapter';

describe('QrCameraFrameAdapter', () => {
  it('passes decoded QR values into the domain scan controller', () => {
    const consume = jest.fn().mockReturnValue({ kind: 'VALID' });
    const adapter = new QrCameraFrameAdapter({ consume } as never);

    const result = adapter.onFrame({ value: 'SITE-SYNC:QR:v1:worker-0248' });

    expect(consume).toHaveBeenCalledWith('SITE-SYNC:QR:v1:worker-0248');
    expect(result).toEqual({ kind: 'VALID' });
  });

  it('normalizes a missing native value to an empty string', () => {
    const consume = jest.fn().mockReturnValue({ kind: 'BLOCKED' });
    const adapter = new QrCameraFrameAdapter({ consume } as never);

    adapter.onFrame({ value: null });

    expect(consume).toHaveBeenCalledWith('');
  });
});
