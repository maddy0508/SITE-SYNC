import { QrScanController } from '../src/qr/qrScanController';

describe('QrScanController', () => {
  it('accepts the first decoded value and suppresses duplicate frames while processing', () => {
    const controller = new QrScanController(750);

    expect(controller.accept('SITE-SYNC:1|org=org-a|company=company-a|person=person-42|membership=membership-42')).toBe(true);
    expect(controller.accept('SITE-SYNC:1|org=org-a|company=company-a|person=person-42|membership=membership-42')).toBe(false);
  });

  it('rejects empty decoder values', () => {
    const controller = new QrScanController(750);

    expect(controller.accept(undefined)).toBe(false);
    expect(controller.accept('')).toBe(false);
    expect(controller.accept('   ')).toBe(false);
  });

  it('allows the same value again after the duplicate suppression window', () => {
    let now = 1000;
    const controller = new QrScanController(750, () => now);
    const value = 'SITE-SYNC:1|org=org-a|company=company-a|person=person-42|membership=membership-42';

    expect(controller.accept(value)).toBe(true);
    now += 751;
    expect(controller.accept(value)).toBe(true);
  });

  it('can be reset when the scanner leaves the active lifecycle', () => {
    const controller = new QrScanController(750);
    const value = 'SITE-SYNC:1|org=org-a|company=company-a|person=person-42|membership=membership-42';

    expect(controller.accept(value)).toBe(true);
    controller.reset();
    expect(controller.accept(value)).toBe(true);
  });
});
