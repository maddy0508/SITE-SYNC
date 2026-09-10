import type { QrCameraState } from './qrCameraState';

export type CameraPermissionStatus = 'not-determined' | 'authorized' | 'denied' | 'restricted';

export function resolveQrPermissionState(
  status: CameraPermissionStatus,
  canRequestPermission: boolean,
): QrCameraState {
  if (status === 'authorized') return 'ready';
  if (status === 'not-determined' && canRequestPermission) return 'requesting_permission';
  if (status === 'denied' && !canRequestPermission) return 'permission_blocked';
  if (status === 'restricted') return 'permission_blocked';
  return 'permission_denied';
}
