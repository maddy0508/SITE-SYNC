import { reduceQrCameraState } from '../src/qr/qrCameraState';

describe('reduceQrCameraState', () => {
  it('models the permission lifecycle explicitly', () => {
    let state = reduceQrCameraState('idle', { type: 'REQUEST_PERMISSION' });
    expect(state).toBe('requesting_permission');

    state = reduceQrCameraState(state, { type: 'PERMISSION_GRANTED' });
    expect(state).toBe('ready');

    expect(
      reduceQrCameraState('idle', { type: 'PERMISSION_DENIED' }),
    ).toBe('permission_denied');
    expect(
      reduceQrCameraState('idle', { type: 'PERMISSION_BLOCKED' }),
    ).toBe('permission_blocked');
  });

  it('pauses camera work when the app becomes inactive', () => {
    expect(
      reduceQrCameraState('ready', { type: 'APPROACH_INACTIVE' }),
    ).toBe('paused');
    expect(
      reduceQrCameraState('paused', { type: 'APPROACH_ACTIVE' }),
    ).toBe('ready');
  });

  it('only processes QR detections while ready', () => {
    expect(
      reduceQrCameraState('ready', { type: 'QR_DETECTED' }),
    ).toBe('processing');
    expect(
      reduceQrCameraState('paused', { type: 'QR_DETECTED' }),
    ).toBe('paused');
  });

  it('keeps validation outcomes deterministic', () => {
    expect(
      reduceQrCameraState('processing', { type: 'VALID' }),
    ).toBe('valid');
    expect(
      reduceQrCameraState('processing', { type: 'PROVISIONAL' }),
    ).toBe('provisional');
    expect(
      reduceQrCameraState('processing', { type: 'BLOCKED' }),
    ).toBe('blocked');
  });

  it('resets the scanner lifecycle without retaining a previous outcome', () => {
    expect(
      reduceQrCameraState('valid', { type: 'RESET' }),
    ).toBe('idle');
  });
});
