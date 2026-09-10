import { resolveQrPermissionState } from '../src/qr/qrCameraPermission';

describe('resolveQrPermissionState', () => {
  it('maps an authorized permission to ready', () => {
    expect(resolveQrPermissionState('authorized', true)).toBe('ready');
  });

  it('maps a denied permission that cannot be requested again to blocked', () => {
    expect(resolveQrPermissionState('denied', false)).toBe('permission_blocked');
  });

  it('maps a requestable denial to permission_denied', () => {
    expect(resolveQrPermissionState('not-determined', true)).toBe('requesting_permission');
  });
});
