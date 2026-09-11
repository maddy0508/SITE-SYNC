import type { CommandSource } from '../domain/localPersistence';
import type { ProjectAssignment } from '../identity/identityService';
import type { ApplicationContext } from '../identity/projectContext';
import type { ProjectRosterRecord } from '../domain/localPersistence';

export type AttendanceAuthorizationCode =
  | 'ACTOR_UNASSIGNED'
  | 'ACTOR_NOT_PERMITTED'
  | 'TARGET_PROJECT_UNASSIGNED'
  | 'TARGET_ASSIGNMENT_INACTIVE'
  | 'TARGET_ORGANISATION_MISMATCH'
  | 'TARGET_COMPANY_MISMATCH'
  | 'TARGET_PERSON_MISMATCH'
  | 'TARGET_ROSTER_MISMATCH';

export interface AttendanceAuthorizationRequest {
  context: ApplicationContext;
  projectId: string;
  targetPersonId: string;
  source: CommandSource;
  targetAssignment?: ProjectAssignment | null;
}

export type AttendanceAuthorizationResult =
  | { allowed: true; actorAssignment: ProjectAssignment; targetAssignment: ProjectAssignment }
  | { allowed: false; code: AttendanceAuthorizationCode; reason: string };

function activeAssignmentFor(context: ApplicationContext, projectId: string): ProjectAssignment | null {
  return context.activeProjectAssignments.find(
    (assignment) => assignment.projectId === projectId && assignment.status === 'ACTIVE',
  ) ?? null;
}

/**
 * Compares a caller-supplied assignment against trusted local roster data.
 * The roster remains non-authoritative; it only proves that the supplied
 * assignment corresponds to the locally cached project/person relationship.
 */
export function targetAssignmentMatchesTrustedRoster(
  assignment: ProjectAssignment,
  roster: ProjectRosterRecord,
): boolean {
  return (
    assignment.projectId === roster.projectId &&
    assignment.personId === roster.personId &&
    assignment.organisationId === roster.organisationId &&
    assignment.companyId === roster.companyId &&
    assignment.projectRole === roster.projectRole &&
    assignment.status === roster.assignmentStatus &&
    roster.membershipStatus === 'ACTIVE'
  );
}

export function authorizeAttendance(request: AttendanceAuthorizationRequest): AttendanceAuthorizationResult {
  const actorAssignment = activeAssignmentFor(request.context, request.projectId);
  if (!actorAssignment) {
    return { allowed: false, code: 'ACTOR_UNASSIGNED', reason: 'Authenticated actor has no active assignment in the selected project' };
  }

  if (request.source === 'SELF') {
    if (request.targetPersonId !== request.context.person.id) {
      return { allowed: false, code: 'TARGET_PERSON_MISMATCH', reason: 'Self-service attendance can only target the authenticated person' };
    }
    return { allowed: true, actorAssignment, targetAssignment: actorAssignment };
  }

  if (actorAssignment.projectRole !== 'SUPERVISOR' && actorAssignment.projectRole !== 'ADMIN') {
    return { allowed: false, code: 'ACTOR_NOT_PERMITTED', reason: 'QR attendance requires an active supervisor or admin project assignment' };
  }

  const targetAssignment = request.targetAssignment;
  if (!targetAssignment) {
    return { allowed: false, code: 'TARGET_PROJECT_UNASSIGNED', reason: 'Target worker has no resolved project assignment' };
  }
  if (targetAssignment.status !== 'ACTIVE') {
    return { allowed: false, code: 'TARGET_ASSIGNMENT_INACTIVE', reason: 'Target worker project assignment is not active' };
  }
  if (targetAssignment.projectId !== request.projectId) {
    return { allowed: false, code: 'TARGET_PROJECT_UNASSIGNED', reason: 'Target worker is not assigned to the selected project' };
  }
  if (targetAssignment.personId !== request.targetPersonId) {
    return { allowed: false, code: 'TARGET_PERSON_MISMATCH', reason: 'Resolved target assignment does not match the requested person' };
  }
  if (targetAssignment.organisationId !== request.context.organisation.id) {
    return { allowed: false, code: 'TARGET_ORGANISATION_MISMATCH', reason: 'Target worker belongs to a different organisation' };
  }
  if (targetAssignment.companyId !== actorAssignment.companyId) {
    return { allowed: false, code: 'TARGET_COMPANY_MISMATCH', reason: 'Target worker belongs to a different company' };
  }

  return { allowed: true, actorAssignment, targetAssignment };
}
