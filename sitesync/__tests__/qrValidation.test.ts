import type { ProjectContextRecord, ProjectRosterRecord } from '../src/domain/localPersistence';
import { QrValidationService, type QrRosterResolver } from '../src/qr/qrValidation';
import type { WorkerQrPayload } from '../src/qr/qrPayload';

const payload: WorkerQrPayload = {
  version: 1,
  organisationId: 'org-a',
  companyId: 'company-a',
  personId: 'person-42',
  membershipId: 'membership-42',
  projectId: 'project-7',
};

const context: ProjectContextRecord = {
  personId: 'supervisor-1',
  projectId: 'project-7',
  organisationId: 'org-a',
  companyId: 'company-a',
  companyMembershipId: 'supervisor-membership',
  projectRole: 'SUPERVISOR',
  selectedAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

const roster: ProjectRosterRecord = {
  projectId: 'project-7',
  personId: 'person-42',
  organisationId: 'org-a',
  companyId: 'company-a',
  displayName: 'Jordan Morgan',
  projectRole: 'WORKER',
  assignmentStatus: 'ACTIVE',
  membershipStatus: 'ACTIVE',
  syncedAt: '2026-08-20T00:00:00.000Z',
};

const resolver: QrRosterResolver = {
  getRoster: jest.fn(async () => roster),
  getMembership: jest.fn(async () => ({
    id: 'membership-42',
    organisationId: 'org-a',
    companyId: 'company-a',
    personId: 'person-42',
    status: 'ACTIVE' as const,
  })),
};

describe('QrValidationService', () => {
  it('returns VALID for an assigned worker when online', async () => {
    const result = await new QrValidationService(resolver).validate(payload, context, { online: true });
    expect(result).toMatchObject({ status: 'VALID', personId: 'person-42', displayName: 'Jordan Morgan', provisional: false });
  });

  it('returns PROVISIONAL for the same trusted cached roster while offline', async () => {
    const result = await new QrValidationService(resolver).validate(payload, context, { online: false });
    expect(result).toMatchObject({ status: 'PROVISIONAL', personId: 'person-42', provisional: true });
  });

  it('blocks a mismatched organisation before resolving the roster', async () => {
    const result = await new QrValidationService(resolver).validate(
      { ...payload, organisationId: 'org-b' },
      context,
      { online: true },
    );
    expect(result).toMatchObject({ status: 'BLOCKED', reason: 'ORG_MISMATCH' });
    expect(resolver.getRoster).not.toHaveBeenCalled();
  });

  it('blocks an unassigned worker', async () => {
    (resolver.getRoster as jest.Mock).mockResolvedValueOnce(null);
    const result = await new QrValidationService(resolver).validate(payload, context, { online: true });
    expect(result).toMatchObject({ status: 'BLOCKED', reason: 'PERSON_UNASSIGNED' });
  });

  it('blocks a worker from a different company', async () => {
    (resolver.getMembership as jest.Mock).mockResolvedValueOnce({
      id: 'membership-42',
      organisationId: 'org-a',
      companyId: 'company-b',
      personId: 'person-42',
      status: 'ACTIVE',
    });
    const result = await new QrValidationService(resolver).validate(payload, context, { online: true });
    expect(result).toMatchObject({ status: 'BLOCKED', reason: 'MEMBERSHIP_INVALID' });
  });

  it('allows self-scan for a worker without requiring supervisor role', async () => {
    const selfContext = { ...context, personId: 'person-42', projectRole: 'WORKER' };
    const result = await new QrValidationService(resolver).validate(payload, selfContext, { online: true });
    expect(result.status).toBe('VALID');
  });

  it('blocks a non-supervisor scanning another worker', async () => {
    const workerContext = { ...context, personId: 'worker-1', projectRole: 'WORKER' };
    const result = await new QrValidationService(resolver).validate(payload, workerContext, { online: true });
    expect(result).toMatchObject({ status: 'BLOCKED', reason: 'ACTOR_NOT_PERMITTED' });
  });
});
