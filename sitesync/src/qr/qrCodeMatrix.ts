import qrcode from 'qrcode-generator';

export type QrMatrix = boolean[][];

/**
 * Creates a platform-neutral QR matrix for rendering in native UI.
 * The payload must already be canonicalised by encodeWorkerQrPayload().
 */
export function buildQrMatrix(payload: string): QrMatrix {
  if (!payload.trim()) {
    throw new Error('QR payload is required');
  }

  const qr = qrcode(0, 'M');
  qr.addData(payload);
  qr.make();

  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => qr.isDark(row, column)),
  );
}
