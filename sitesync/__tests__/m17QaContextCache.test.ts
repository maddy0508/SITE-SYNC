import { deserializeM17QaContext, serializeM17QaContext } from '../src/attendance/m17QaContextCache';
import type { ApplicationContext } from '../src/identity/projectContext';

describe('M17 QA offline context cache', () => {
  const context: ApplicationContext = {
    userId: 'user-1',
    profile: { userId: 'user-1', organisationId: 'org-1', personId: 'person-1' },
    person: { id: 'person-1', organisationId: 'org-1', displayName: 'M17 QA WORKER' },
    organisation: { id: 'org-1', name: 'M17 Test Organisation' },
    memberships: [{ id: 'membership-1', organisationId: 'org-1', companyId: 'company-1', personId: 'person-1', status: 'ACTIVE' }],
    activeProjectAssignments: [{ id: 'assignment-1', organisationId: 'org-1', projectId: 'project-1', companyId: 'company-1', companyMembershipId: 'membership-1', personId: 'person-1', projectRole: 'WORKER', status: 'ACTIVE' }],
    hasProjectAccess: true,
    device: {
      id: 'device-1', deviceInstallationId: 'device-1', userId: 'user-1', installationKey: 'install-1', deviceName: 'M1.7 PHYSICAL QA DEVICE', appVersion: 'M1.7-QA-HARDENED', osVersion: 'android', status: 'ACTIVE', createdAt: '2026-09-13T00:00:00.000Z', lastSeenAt: '2026-09-13T00:00:00.000Z', revokedAt: null,
    },
  };
  Object.defineProperty(context.device, 'deviceInstallationId', { value: 'device-1', enumerable: false, configurable: false, writable: false });

  it('round-trips the complete isolated context and restores the transport device alias', () => {
    const restored = deserializeM17QaContext(serializeM17QaContext(context));
    expect(restored).toEqual(context);
    expect(restored.device?.deviceInstallationId).toBe('device-1');
  });

  it('rejects a cache containing cross-tenant assignment data', () => {
    const tampered = JSON.parse(serializeM17QaContext(context));
    tampered.activeProjectAssignments[0].organisationId = 'other-org';
    expect(() => deserializeM17QaContext(JSON.stringify(tampered))).toThrow('invalid project assignment');
  });
});
