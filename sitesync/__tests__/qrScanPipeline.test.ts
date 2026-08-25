import type { ProjectContextRecord } from '../src/domain/localPersistence';
import { QrScanPipeline } from '../src/qr/qrScanPipeline';
import { QrValidationService, type QrRosterResolver } from '../src/qr/qrValidation';
import { encodeWorkerQrPayload } from '../src/qr/qrPayload';

const context: ProjectContextRecord = {
  personId: 'supervisor-1',
  projectId: 'project-7',
  organisationId: 'org-a',
  companyId: 'company-a',
  companyMembershipId: 'membership-supervisor',
  projectRole: 'SUPERVISOR',
  selectedAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

const resolver: QrRosterResolver = {
  getRoster: jest.fn(async () => ({
    projectId: 'project-7',
    personId: 'worker-1',
    organisationId: 'org-a',
    companyId: 'company-a',
    displayName: 'Jordan Morgan',
    projectRole: 'WORKER',
    assignmentStatus: 'ACTIVE',
    membershipStatus: 'ACTIVE',
    syncedAt: '2026-08-20T00:00:00.000Z',
  })),
  getMembership: jest.fn(async () => ({
    id: 'membership-1',
    organisationId: 'org-a',
    companyId: 'company-a',
    personId: 'worker-1',
    status: 'ACTIVE' as const,
  })),
};

const raw = encodeWorkerQrPayload({
  version: 1,
  organisationId: 'org-a',
  companyId: 'company-a',
  personId: 'worker-1',
  membershipId: 'membership-1',
  projectId: 'project-7',
});

describe('QrScanPipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses and validates a trusted assigned worker', async () => {
    const pipeline = new QrScanPipeline(new QrValidationService(resolver));

    const result = await pipeline.process(raw, context, { online: true });

    expect(result.kind).toBe('VALIDATION');
    if (result.kind !== 'VALIDATION') throw new Error('Expected validation result');
    expect(result.result.status).toBe('VALID');
    expect(result.result.displayName).toBe('Jordan Morgan');
  });

  it('returns a parse error without invoking trusted validation', async () => {
    const pipeline = new QrScanPipeline(new QrValidationService(resolver));

    const result = await pipeline.process('not-a-site-sync-qr', context, { online: true });

    expect(result).toMatchObject({ kind: 'PARSE_ERROR', code: 'INVALID_PREFIX' });
    expect(resolver.getMembership).not.toHaveBeenCalled();
  });
});
