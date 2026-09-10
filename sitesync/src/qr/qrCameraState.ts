export type QrCameraState =
  | 'idle'
  | 'requesting_permission'
  | 'permission_denied'
  | 'permission_blocked'
  | 'ready'
  | 'paused'
  | 'processing'
  | 'valid'
  | 'provisional'
  | 'blocked'
  | 'error';

export type QrCameraEvent =
  | { type: 'REQUEST_PERMISSION' }
  | { type: 'PERMISSION_GRANTED' }
  | { type: 'PERMISSION_DENIED' }
  | { type: 'PERMISSION_BLOCKED' }
  | { type: 'APPROACH_ACTIVE' }
  | { type: 'APPROACH_INACTIVE' }
  | { type: 'QR_DETECTED' }
  | { type: 'VALID' }
  | { type: 'PROVISIONAL' }
  | { type: 'BLOCKED' }
  | { type: 'ERROR' }
  | { type: 'RESET' };

/**
 * Pure state machine for the native QR camera boundary.
 * No camera library, permissions API, or UI dependency belongs here.
 */
export function reduceQrCameraState(
  state: QrCameraState,
  event: QrCameraEvent,
): QrCameraState {
  switch (event.type) {
    case 'REQUEST_PERMISSION':
      return 'requesting_permission';
    case 'PERMISSION_GRANTED':
      return 'ready';
    case 'PERMISSION_DENIED':
      return 'permission_denied';
    case 'PERMISSION_BLOCKED':
      return 'permission_blocked';
    case 'APPROACH_ACTIVE':
      return state === 'paused' ? 'ready' : state;
    case 'APPROACH_INACTIVE':
      return state === 'ready' || state === 'processing' ? 'paused' : state;
    case 'QR_DETECTED':
      return state === 'ready' ? 'processing' : state;
    case 'VALID':
      return state === 'processing' ? 'valid' : state;
    case 'PROVISIONAL':
      return state === 'processing' ? 'provisional' : state;
    case 'BLOCKED':
      return state === 'processing' ? 'blocked' : state;
    case 'ERROR':
      return 'error';
    case 'RESET':
      return 'idle';
  }
}
