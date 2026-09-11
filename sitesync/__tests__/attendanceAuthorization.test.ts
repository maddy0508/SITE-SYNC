import { authorizeAttendance } from '../src/attendance/attendanceAuthorization';
import type { ApplicationContext } from '../src/identity/projectContext';
import type { ProjectAssignment } from '../src/identity/identityService';

const ORG = 'org-1';
const COMPANY = 'company-1';
const PROJECT = 'project-1';
const ACTOR = 'person-actor';
const TARGET = 'person-target';

const actorAssignment: ProjectAssignment = {
  id: 'assignment-actor', organisationId: ORG, projectId: PROJECT, companyId: COMPANY,
  companyMembershipId: 'membership-actor', personId: ACTOR, projectRole: 'WORKER', status: 'ACTIVE',
};
const supervisorAssignment: ProjectAssignment = { ...actorAssignment, id: 'assignment-supervisor', personId: ACTOR, projectRole: 'SUPERVISOR' };
const targetAssignment: ProjectAssignment = {
  id: 'assignment-target', organisationId: ORG, projectId: PROJECT, companyId: COMPANY,
  companyMembershipId: 'membership-target', personId: TARGET, projectRole: 'WORKER', status: 'ACTIVE',
};

function context(assignments: ProjectAssignment[]): ApplicationContext {
  return {
    userId: 'user-1',
    profile: { userId: 'user-1', organisationId: ORG, personId: ACTOR },
    person: { id: ACTOR, organisationId: ORG, displayName: 'ACTOR' },
    organisation: { id: ORG, name: 'Organisation' },
    memberships: [],
    activeProjectAssignments: assignments,
    hasProjectAccess: assignments.length > 0,
    device: null,
  };
}

describe('M1.6 attendance authorization', () => {
  it('allows worker self-service only for their active project assignment', () => {
    expect(authorizeAttendance({ context: context([actorAssignment]), projectId: PROJECT, targetPersonId: ACTOR, source: 'SELF' })).toMatchObject({ allowed: true });
  });

  it('denies self-service when the actor has no active assignment', () => {
    expect(authorizeAttendance({ context: context([]), projectId: PROJECT, targetPersonId: ACTOR, source: 'SELF' })).toMatchObject({ allowed: false, code: 'ACTOR_UNASSIGNED' });
  });

  it('allows supervisor QR scans for an assigned worker in the same company', () => {
    expect(authorizeAttendance({ context: context([supervisorAssignment]), projectId: PROJECT, targetPersonId: TARGET, targetAssignment, source: 'QR_SCAN' })).toMatchObject({ allowed: true });
  });

  it('denies QR scans by a worker without supervisor/admin authority', () => {
    expect(authorizeAttendance({ context: context([actorAssignment]), projectId: PROJECT, targetPersonId: TARGET, targetAssignment, source: 'QR_SCAN' })).toMatchObject({ allowed: false, code: 'ACTOR_NOT_PERMITTED' });
  });

  it('denies a target outside the active project', () => {
    const otherProject = { ...targetAssignment, projectId: 'project-other' };
    expect(authorizeAttendance({ context: context([supervisorAssignment]), projectId: PROJECT, targetPersonId: TARGET, targetAssignment: otherProject, source: 'QR_SCAN' })).toMatchObject({ allowed: false, code: 'TARGET_PROJECT_UNASSIGNED' });
  });

  it('denies a target from another organisation', () => {
    const otherOrganisation = { ...targetAssignment, organisationId: 'org-other' };
    expect(authorizeAttendance({ context: context([supervisorAssignment]), projectId: PROJECT, targetPersonId: TARGET, targetAssignment: otherOrganisation, source: 'QR_SCAN' })).toMatchObject({ allowed: false, code: 'TARGET_ORGANISATION_MISMATCH' });
  });

  it('denies a target from another company', () => {
    const otherCompany = { ...targetAssignment, companyId: 'company-other' };
    expect(authorizeAttendance({ context: context([supervisorAssignment]), projectId: PROJECT, targetPersonId: TARGET, targetAssignment: otherCompany, source: 'QR_SCAN' })).toMatchObject({ allowed: false, code: 'TARGET_COMPANY_MISMATCH' });
  });

  it('denies an inactive target assignment', () => {
    const inactive = { ...targetAssignment, status: 'INACTIVE' } as ProjectAssignment;
    expect(authorizeAttendance({ context: context([supervisorAssignment]), projectId: PROJECT, targetPersonId: TARGET, targetAssignment: inactive, source: 'QR_SCAN' })).toMatchObject({ allowed: false, code: 'TARGET_ASSIGNMENT_INACTIVE' });
  });
});
