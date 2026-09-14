import { loadM2OperationalSnapshot } from './m2RuntimeData';
import type { M2OperationalProject } from './m2OperationalProject';

const context = { personId: 'person-1', projectId: 'project-1', organisationId: 'org-1', companyId: 'company-1', companyMembershipId: 'membership-1', projectRole: 'SUPERVISOR', selectedAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z' };
const roster = { projectId: 'project-1', personId: 'person-1', organisationId: 'org-1', companyId: 'company-1', displayName: 'TEST WORKER', projectRole: 'SUPERVISOR', assignmentStatus: 'ACTIVE', membershipStatus: 'ACTIVE', syncedAt: '2026-09-14T00:00:00.000Z' };
const operationalProject: M2OperationalProject = {
  projectId: 'project-1',
  organisationId: 'org-1',
  companyId: 'company-1',
  site: { siteId: 'site-1', name: 'SITE A', latitude: -36.1, longitude: 146.9, locationState: 'VERIFIED' },
  shift: { shiftId: 'shift-1', name: 'DAY SHIFT', startsAt: '2026-09-14T07:00:00.000Z', endsAt: '2026-09-14T17:00:00.000Z' },
  workFronts: [{ id: 'front-1', name: 'BLOCK A', status: 'ACTIVE', plannedQuantity: 1000, completedQuantity: 250, unit: 'PANELS', crewId: 'crew-1', progressPercent: 25 }],
  crews: [{ id: 'crew-1', name: 'CREW A', supervisorPersonId: 'person-1', workerCount: 4 }],
  safety: { preStart: 'COMPLETE', swms: 'REQUIRED', permits: 'NONE', hazards: [], restrictions: [], warnings: [] },
  actions: { blockers: [], outstanding: [], upcoming: ['Continue BLOCK A'] },
};

describe('loadM2OperationalSnapshot', () => {
  it('reads context, roster, attendance and operational projection through the dependency boundary', async () => {
    const snapshot = await loadM2OperationalSnapshot({ personId: 'person-1', workDateUtc: '2026-09-14' }, {
      getProjectContext: async () => context,
      getProjectRoster: async () => roster,
      getAttendanceState: async () => null,
      getOperationalProject: async () => operationalProject,
    });
    expect(snapshot?.projectId).toBe('project-1');
    expect(snapshot?.attendanceState).toBe('UNKNOWN');
    expect(snapshot?.operationalProject?.site.name).toBe('SITE A');
    expect(snapshot?.operationalProject?.workFronts[0].progressPercent).toBe(25);
  });

  it('returns an explicit unavailable operational state when the projection is absent', async () => {
    const snapshot = await loadM2OperationalSnapshot({ personId: 'person-1', workDateUtc: '2026-09-14' }, {
      getProjectContext: async () => context,
      getProjectRoster: async () => roster,
      getAttendanceState: async () => null,
      getOperationalProject: async () => null,
    });
    expect(snapshot?.operationalProject).toBeNull();
  });

  it('rejects an operational projection that crosses the requested tenant boundary', async () => {
    await expect(loadM2OperationalSnapshot({ personId: 'person-1', workDateUtc: '2026-09-14' }, {
      getProjectContext: async () => context,
      getProjectRoster: async () => roster,
      getAttendanceState: async () => null,
      getOperationalProject: async () => ({ ...operationalProject, organisationId: 'other-org' }),
    })).rejects.toThrow('tenant mismatch');
  });

  it('returns empty when there is no project context', async () => {
    const snapshot = await loadM2OperationalSnapshot({ personId: 'person-1', workDateUtc: '2026-09-14' }, {
      getProjectContext: async () => null,
      getProjectRoster: async () => roster,
      getAttendanceState: async () => null,
      getOperationalProject: async () => operationalProject,
    });
    expect(snapshot).toBeNull();
  });
});
