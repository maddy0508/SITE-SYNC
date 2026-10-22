import { buildM2OperationalSnapshot } from './m2OperationalSnapshot';
import type { AttendanceStateRecord, ProjectContextRecord, ProjectRosterRecord } from '../domain/localPersistence';

const context: ProjectContextRecord = {
  personId: 'person-1', projectId: 'project-1', organisationId: 'org-1', companyId: 'company-1',
  companyMembershipId: 'membership-1', projectRole: 'SUPERVISOR', selectedAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z',
};
const roster: ProjectRosterRecord = {
  projectId: 'project-1', personId: 'person-1', organisationId: 'org-1', companyId: 'company-1',
  displayName: 'TEST WORKER', projectRole: 'SUPERVISOR', assignmentStatus: 'ACTIVE', membershipStatus: 'ACTIVE', syncedAt: '2026-09-14T00:00:00.000Z',
};
const attendance: AttendanceStateRecord = {
  projectId: 'project-1', personId: 'person-1', workDateUtc: '2026-09-14', organisationId: 'org-1', companyId: 'company-1',
  projectAssignmentId: 'assignment-1', state: 'CHECKED_IN', lastEventId: 'event-1', lastCommandId: 'command-1',
  lastClientOccurredAt: '2026-09-14T01:00:00.000Z', currentRevision: 1, serverRevision: 1, syncStatus: 'ONLINE_VERIFIED', updatedAt: '2026-09-14T01:00:00.000Z',
};

describe('buildM2OperationalSnapshot', () => {
  it('projects persisted identity and attendance without fabricating operational values', () => {
    expect(buildM2OperationalSnapshot({ context, roster, attendance })).toEqual(expect.objectContaining({
      projectId: 'project-1', workerName: 'TEST WORKER', workerRole: 'SUPERVISOR', attendanceState: 'CHECKED_IN', attendanceSyncStatus: 'ONLINE_VERIFIED',
    }));
  });

  it('uses UNKNOWN when attendance has not been recorded', () => {
    expect(buildM2OperationalSnapshot({ context, roster, attendance: null }).attendanceState).toBe('UNKNOWN');
  });

  it('rejects cross-person or cross-project attendance', () => {
    expect(() => buildM2OperationalSnapshot({ context, roster, attendance: { ...attendance, personId: 'person-2' } })).toThrow('identity mismatch');
  });
});
