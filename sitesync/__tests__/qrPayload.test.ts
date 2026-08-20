import {
  encodeWorkerQrPayload,
  parseWorkerQrPayload,
  QrParseError,
  type WorkerQrPayload,
} from '../src/qr/qrPayload';

const valid: WorkerQrPayload = {
  version: 1,
  organisationId: 'org-a',
  companyId: 'company-a',
  personId: 'person-42',
  membershipId: 'membership-42',
  projectId: 'project-7',
};

describe('worker QR payload', () => {
  it('encodes and parses the canonical v1 format', () => {
    const raw = encodeWorkerQrPayload(valid);
    expect(raw).toBe(
      'SITE-SYNC:1|org=org-a|company=company-a|person=person-42|membership=membership-42|project=project-7',
    );
    expect(parseWorkerQrPayload(raw)).toEqual(valid);
  });

  it('allows the optional project hint to be absent', () => {
    const { projectId: _projectId, ...withoutProject } = valid;
    const raw = encodeWorkerQrPayload(withoutProject);
    expect(parseWorkerQrPayload(raw)).toEqual(withoutProject);
  });

  it.each([
    ['', 'EMPTY'],
    ['NOT-SITE-SYNC:1|org=org-a|company=company-a|person=person-42|membership=membership-42', 'INVALID_PREFIX'],
    ['SITE-SYNC:2|org=org-a|company=company-a|person=person-42|membership=membership-42', 'UNSUPPORTED_VERSION'],
    ['SITE-SYNC:1|org=org-a|company=company-a|person=person-42', 'MISSING_FIELD'],
    ['SITE-SYNC:1|org=org-a|company=company-a|person=person-42|membership=', 'MALFORMED'],
    ['SITE-SYNC:1|org=org-a|company=company-a|person=person-42|membership=membership-42|org=org-b', 'DUPLICATE_FIELD'],
    ['SITE-SYNC:1|org=org a|company=company-a|person=person-42|membership=membership-42', 'INVALID_VALUE'],
  ])('rejects invalid payload (%s)', (raw, code) => {
    try {
      parseWorkerQrPayload(raw);
      throw new Error('expected parser to reject payload');
    } catch (error) {
      expect(error).toBeInstanceOf(QrParseError);
      expect((error as QrParseError).code).toBe(code);
    }
  });

  it('rejects unknown fields instead of silently ignoring attacker-controlled input', () => {
    expect(() =>
      parseWorkerQrPayload(
        'SITE-SYNC:1|org=org-a|company=company-a|person=person-42|membership=membership-42|role=admin',
      ),
    ).toThrow('Unknown QR field role');
  });
});
