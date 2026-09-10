import { buildQrMatrix } from '../src/qr/qrCodeMatrix';

describe('buildQrMatrix', () => {
  it('builds a square matrix containing the encoded payload', () => {
    const matrix = buildQrMatrix('SITE-SYNC:1|org=org-a|company=company-a|person=person-42|membership=membership-42');

    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
    expect(matrix.some((row) => row.some(Boolean))).toBe(true);
  });

  it('rejects an empty payload', () => {
    expect(() => buildQrMatrix('')).toThrow('QR payload is required');
  });
});
