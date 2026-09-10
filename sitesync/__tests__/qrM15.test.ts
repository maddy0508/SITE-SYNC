import { QrScanController } from '../src/qr/qrScanController';
import { reduceQrCameraState } from '../src/qr/qrCameraState';
import { encodeWorkerQrPayload, parseWorkerQrPayload } from '../src/qr/qrPayload';
import { QrValidationService } from '../src/qr/qrValidation';
import type { ProjectContextRecord, ProjectRosterRecord } from '../src/domain/localPersistence';
import type { WorkerQrPayload } from '../src/qr/qrPayload';
import { QrCameraFrameAdapter } from '../src/qr/qrCameraFrameAdapter';
import { createWorkerQrPayload, WorkerQrIdentityError } from '../src/qr/workerQrIdentity';
import type { ApplicationContext } from '../src/identity/projectContext';

describe('M1.5 QR payload', () => {
  const payload: WorkerQrPayload = {
    version: 1,
    organisationId: 'org_1',
    companyId: 'company_1',
    personId: 'person_1',
    membershipId: 'membership_1',
    projectId: 'project_1',
  };

  test('round-trips the canonical worker payload', () => {
    expect(parseWorkerQrPayload(encodeWorkerQrPayload(payload))).toEqual(payload);
  });

  test('rejects malformed and unsafe payloads', () => {
    expect(() => parseWorkerQrPayload('')).toThrow('QR payload is empty');
    expect(() => parseWorkerQrPayload('NOT-SITE-SYNC:1|org=org_1')).toThrow('invalid header');
    expect(() => parseWorkerQrPayload('SITE-SYNC:2|org=org_1|company=company_1|person=person_1|membership=membership_1')).toThrow('Unsupported QR version');
    expect(() => parseWorkerQrPayload('SITE-SYNC:1|org=org_1|company=company_1|person=person_1|membership=membership_1|membership=membership_2')).toThrow('Duplicate QR field');
    expect(() => parseWorkerQrPayload('SITE-SYNC:1|org=org_1|company=company_1|person=person_1')).toThrow('Missing required QR field membership');
    expect(() => parseWorkerQrPayload('SITE-SYNC:1|org=org_1|company=company_1|person=person_1|membership=../../etc')).toThrow('Invalid membership value');
  });

  test('derives the QR from trusted application context rather than caller-supplied identifiers', () => {
    const context = {
      userId: 'user_1',
      profile: { userId: 'user_1', organisationId: 'org_1', personId: 'person_1' },
      person: { id: 'person_1', organisationId: 'org_1', displayName: 'WORKER ONE' },
      organisation: { id: 'org_1', name: 'ORG ONE' },
      memberships: [],
      activeProjectAssignments: [{
        id: 'assignment_1',
        organisationId: 'org_1',
        projectId: 'project_1',
        companyId: 'company_1',
        companyMembershipId: 'membership_1',
        personId: 'person_1',
        projectRole: 'WORKER',
        status: 'ACTIVE',
      }],
      hasProjectAccess: true,
      device: null,
    } satisfies ApplicationContext;

    expect(createWorkerQrPayload(context, 'project_1')).toEqual(payload);
    expect(() => createWorkerQrPayload(context, 'project_2')).toThrow(WorkerQrIdentityError);
  });
});

describe('M1.5 QR validation', () => {
  const context: ProjectContextRecord = {
    personId: 'actor_1',
    projectId: 'project_1',
    organisationId: 'org_1',
    companyId: 'company_1',
    companyMembershipId: 'actor_membership',
    projectRole: 'SUPERVISOR',
    selectedAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
  };

  const roster: ProjectRosterRecord = {
    projectId: 'project_1',
    personId: 'person_2',
    organisationId: 'org_1',
    companyId: 'company_1',
    displayName: 'WORKER TWO',
    projectRole: 'WORKER',
    assignmentStatus: 'ACTIVE',
    membershipStatus: 'ACTIVE',
    syncedAt: '2026-09-10T00:00:00.000Z',
  };

  const payload: WorkerQrPayload = {
    version: 1,
    organisationId: 'org_1',
    companyId: 'company_1',
    personId: 'person_2',
    membershipId: 'membership_2',
    projectId: 'project_1',
  };

  test('returns VALID for trusted online roster data', async () => {
    const service = new QrValidationService({
      getMembership: async () => ({
        id: 'membership_2',
        organisationId: 'org_1',
        companyId: 'company_1',
        personId: 'person_2',
        status: 'ACTIVE',
      }),
      getRoster: async () => roster,
    });

    await expect(service.validate(payload, context, { online: true })).resolves.toMatchObject({
      status: 'VALID',
      personId: 'person_2',
      displayName: 'WORKER TWO',
      provisional: false,
    });
  });

  test('returns PROVISIONAL for the same trusted result while offline', async () => {
    const service = new QrValidationService({
      getMembership: async () => ({
        id: 'membership_2',
        organisationId: 'org_1',
        companyId: 'company_1',
        personId: 'person_2',
        status: 'ACTIVE',
      }),
      getRoster: async () => roster,
    });

    await expect(service.validate(payload, context, { online: false })).resolves.toMatchObject({
      status: 'PROVISIONAL',
      provisional: true,
    });
  });

  test('blocks a worker from scanning another worker', async () => {
    const workerContext: ProjectContextRecord = { ...context, personId: 'person_1', projectRole: 'WORKER' };
    const service = new QrValidationService({
      getMembership: async () => ({
        id: 'membership_2',
        organisationId: 'org_1',
        companyId: 'company_1',
        personId: 'person_2',
        status: 'ACTIVE',
      }),
      getRoster: async () => roster,
    });

    await expect(service.validate(payload, workerContext, { online: true })).resolves.toMatchObject({
      status: 'BLOCKED',
      reason: 'ACTOR_NOT_PERMITTED',
    });
  });
});

describe('M1.5 QR camera lifecycle', () => {
  test('pauses on app inactivity and resumes when active', () => {
    expect(reduceQrCameraState('ready', { type: 'APPROACH_INACTIVE' })).toBe('paused');
    expect(reduceQrCameraState('paused', { type: 'APPROACH_ACTIVE' })).toBe('ready');
  });

  test('moves detected scans through processing to terminal result state', () => {
    expect(reduceQrCameraState('ready', { type: 'QR_DETECTED' })).toBe('processing');
    expect(reduceQrCameraState('processing', { type: 'VALID' })).toBe('valid');
    expect(reduceQrCameraState('processing', { type: 'PROVISIONAL' })).toBe('provisional');
    expect(reduceQrCameraState('processing', { type: 'BLOCKED' })).toBe('blocked');
  });

  test('suppresses duplicate native callbacks inside the scan window', () => {
    let now = 1_000;
    const controller = new QrScanController(750, () => now);

    expect(controller.accept(' SITE-SYNC:1|x=y ')).toBe(true);
    now += 200;
    expect(controller.accept('SITE-SYNC:1|x=y')).toBe(false);
    now += 800;
    expect(controller.accept('SITE-SYNC:1|x=y')).toBe(true);
    controller.reset();
    expect(controller.accept('SITE-SYNC:1|x=y')).toBe(true);
  });

  test('routes native frame values through the duplicate guard', () => {
    let now = 5_000;
    const controller = new QrScanController(750, () => now);
    const adapter = new QrCameraFrameAdapter(controller);

    expect(adapter.handle({ rawValue: 'SITE-SYNC:1|org=o|company=c|person=p|membership=m' })).toBe(true);
    now += 100;
    expect(adapter.handle({ displayValue: 'SITE-SYNC:1|org=o|company=c|person=p|membership=m' })).toBe(false);
    now += 800;
    expect(adapter.handle({ rawValue: 'SITE-SYNC:1|org=o|company=c|person=p|membership=m' })).toBe(true);
    expect(adapter.handle({})).toBe(false);
  });
});
