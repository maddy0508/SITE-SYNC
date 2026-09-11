import { targetAssignmentMatchesTrustedRoster } from '../src/attendance/attendanceAuthorization';
import type { ProjectAssignment } from '../src/identity/identityService';
import type { ProjectRosterRecord } from '../src/domain/localPersistence';

const roster: ProjectRosterRecord = {
  projectId: 'project-1',
  personId: 'person-target',
  organisationId: 'org-1',
  companyId: 'company-1',
  displayName: 'TARGET',
  projectRole: 'WORKER',
  assignmentStatus: 'ACTIVE',
  membershipStatus: 'ACTIVE',
  syncedAt: '2026-09-12T00:00:00.000Z',
};

const assignment: ProjectAssignment = {
  id: 'assignment-target',
  organisationId: 'org-1',
  projectId: 'project-1',
  companyId: 'company-1',
  companyMembershipId: 'membership-target',
  personId: 'person-target',
  projectRole: 'WORKER',
  status: 'ACTIVE',
};

describe('M1.6 trusted attendance assignment provenance', () => {
  it('accepts an assignment whose authorization fields match the trusted roster', () => {
    expect(targetAssignmentMatchesTrustedRoster(assignment, roster)).toBe(true);
  });

  it('rejects a forged assignment whose company differs from trusted roster', () => {
    expect(targetAssignmentMatchesTrustedRoster({ ...assignment, companyId: 'company-other' }, roster)).toBe(false);
  });

  it('rejects a forged assignment whose role differs from trusted roster', () => {
    expect(targetAssignmentMatchesTrustedRoster({ ...assignment, projectRole: 'SUPERVISOR' }, roster)).toBe(false);
  });

  it('rejects roster data that is no longer active', () => {
    expect(targetAssignmentMatchesTrustedRoster(assignment, { ...roster, membershipStatus: 'INACTIVE' })).toBe(false);
  });
});
