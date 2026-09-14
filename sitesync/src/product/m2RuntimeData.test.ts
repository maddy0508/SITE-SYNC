import { loadM2OperationalSnapshot } from './m2RuntimeData';

const context = { personId: 'person-1', projectId: 'project-1', organisationId: 'org-1', companyId: 'company-1', companyMembershipId: 'membership-1', projectRole: 'SUPERVISOR', selectedAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z' };
const roster = { projectId: 'project-1', personId: 'person-1', organisationId: 'org-1', companyId: 'company-1', displayName: 'TEST WORKER', projectRole: 'SUPERVISOR', assignmentStatus: 'ACTIVE', membershipStatus: 'ACTIVE', syncedAt: '2026-09-14T00:00:00.000Z' };

describe('loadM2OperationalSnapshot', () => {
  it('reads context, roster and attendance through the dependency boundary', async () => {
    const snapshot = await loadM2OperationalSnapshot({ personId: 'person-1', workDateUtc: '2026-09-14' }, {
      getProjectContext: async () => context,
      getProjectRoster: async () => roster,
      getAttendanceState: async () => null,
    });
    expect(snapshot?.projectId).toBe('project-1');
    expect(snapshot?.attendanceState).toBe('UNKNOWN');
  });

  it('returns empty when there is no project context', async () => {
    const snapshot = await loadM2OperationalSnapshot({ personId: 'person-1', workDateUtc: '2026-09-14' }, {
      getProjectContext: async () => null,
      getProjectRoster: async () => roster,
      getAttendanceState: async () => null,
    });
    expect(snapshot).toBeNull();
  });
});
