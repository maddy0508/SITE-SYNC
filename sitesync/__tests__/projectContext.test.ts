import { IdentityServiceError } from '../src/identity/identityService';
import { DeviceRegistrationServiceError } from '../src/identity/deviceRegistrationService';
import { ProjectContext } from '../src/identity/projectContext';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const identity = {
  userId: USER_ID,
  profile: { userId: USER_ID, organisationId: ORG_ID, personId: PERSON_ID },
  person: { id: PERSON_ID, organisationId: ORG_ID, displayName: 'ORG A WORKER' },
  organisation: { id: ORG_ID, name: 'Organisation A' },
  memberships: [],
  projectAssignments: [{
    id: 'assignment-1',
    organisationId: ORG_ID,
    projectId: PROJECT_ID,
    companyId: 'company-1',
    companyMembershipId: 'membership-1',
    personId: PERSON_ID,
    projectRole: 'WORKER' as const,
    status: 'ACTIVE' as const,
  }],
};

const activeDevice = {
  id: 'device-1',
  userId: USER_ID,
  installationKey: 'device-key',
  deviceName: 'Worker phone',
  appVersion: '1.0.0',
  osVersion: 'Android 16',
  status: 'ACTIVE' as const,
  createdAt: '2026-08-17T10:00:00.000Z',
  lastSeenAt: '2026-08-17T10:00:00.000Z',
  revokedAt: null,
};

function services(identityResult = identity, deviceResult: any = activeDevice) {
  return {
    identity: { resolve: jest.fn(async () => identityResult) },
    device: { get: jest.fn(async () => deviceResult) },
  };
}

describe('ProjectContext', () => {
  it('composes authoritative identity, active assignments, and device state', async () => {
    const deps = services();
    const context = await new ProjectContext(deps.identity as never, deps.device as never).resolve(USER_ID);

    expect(context.userId).toBe(USER_ID);
    expect(context.organisation.id).toBe(ORG_ID);
    expect(context.person.id).toBe(PERSON_ID);
    expect(context.activeProjectAssignments).toHaveLength(1);
    expect(context.activeProjectAssignments[0].projectId).toBe(PROJECT_ID);
    expect(context.hasProjectAccess).toBe(true);
    expect(context.device).toEqual(activeDevice);
  });

  it('provides no project access when there are no active assignments', async () => {
    const noProjects = { ...identity, projectAssignments: [] };
    const deps = services(noProjects);
    const context = await new ProjectContext(deps.identity as never, deps.device as never).resolve(USER_ID);

    expect(context.activeProjectAssignments).toEqual([]);
    expect(context.hasProjectAccess).toBe(false);
  });

  it('rejects device state that is not owned by the authenticated identity', async () => {
    const deps = services(identity, { ...activeDevice, userId: '99999999-9999-4999-8999-999999999999' });

    await expect(new ProjectContext(deps.identity as never, deps.device as never).resolve(USER_ID)).rejects.toMatchObject({
      code: 'CROSS_USER_DEVICE',
    });
  });

  it('preserves revoked-device state instead of treating it as absent or active', async () => {
    const revoked = { ...activeDevice, status: 'REVOKED' as const, revokedAt: '2026-08-17T10:02:00.000Z' };
    const deps = services(identity, revoked);
    const context = await new ProjectContext(deps.identity as never, deps.device as never).resolve(USER_ID);

    expect(context.device?.status).toBe('REVOKED');
    expect(context.device?.revokedAt).toBe('2026-08-17T10:02:00.000Z');
  });

  it('propagates authoritative identity errors without inventing context', async () => {
    const deps = services();
    deps.identity.resolve.mockRejectedValue(new IdentityServiceError('IDENTITY_UNRESOLVED', 'profile missing'));

    await expect(new ProjectContext(deps.identity as never, deps.device as never).resolve(USER_ID)).rejects.toMatchObject({
      code: 'IDENTITY_UNRESOLVED',
      message: 'profile missing',
    });
    expect(deps.device.get).not.toHaveBeenCalled();
  });

  it('propagates device service errors without masking them', async () => {
    const deps = services();
    deps.device.get.mockRejectedValue(new DeviceRegistrationServiceError('SUPABASE_FAILED', 'permission denied'));

    await expect(new ProjectContext(deps.identity as never, deps.device as never).resolve(USER_ID)).rejects.toMatchObject({
      code: 'SUPABASE_FAILED',
      message: 'permission denied',
    });
  });
});
