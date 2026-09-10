import type { ApplicationContext } from '../identity/projectContext';
import type { WorkerQrPayload } from './qrPayload';

export type WorkerQrIdentityErrorCode = 'NO_ACTIVE_PROJECT_ASSIGNMENT';

export class WorkerQrIdentityError extends Error {
  readonly code: WorkerQrIdentityErrorCode;

  constructor(code: WorkerQrIdentityErrorCode, message: string) {
    super(message);
    this.name = 'WorkerQrIdentityError';
    this.code = code;
  }
}

/**
 * Builds the worker QR from authoritative resolved identity/project context.
 * No caller-supplied organisation/company/person identifiers are accepted.
 */
export function createWorkerQrPayload(
  context: ApplicationContext,
  projectId: string,
): WorkerQrPayload {
  const assignment = context.activeProjectAssignments.find(
    (candidate) => candidate.projectId === projectId && candidate.personId === context.person.id,
  );

  if (!assignment) {
    throw new WorkerQrIdentityError(
      'NO_ACTIVE_PROJECT_ASSIGNMENT',
      'No active project assignment exists for the resolved worker identity',
    );
  }

  return {
    version: 1,
    organisationId: context.organisation.id,
    companyId: assignment.companyId,
    personId: context.person.id,
    membershipId: assignment.companyMembershipId,
    projectId: assignment.projectId,
  };
}
