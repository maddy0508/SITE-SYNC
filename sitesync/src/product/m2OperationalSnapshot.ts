import type {
  AttendanceStateRecord,
  ProjectContextRecord,
  ProjectRosterRecord,
} from '../domain/localPersistence';
import type { M2OperationalProject } from './m2OperationalProject';

export interface M2OperationalSnapshotInput {
  context: ProjectContextRecord;
  roster: ProjectRosterRecord;
  attendance: AttendanceStateRecord | null;
  operationalProject: M2OperationalProject | null;
}

export interface M2OperationalSnapshot {
  projectId: string;
  organisationId: string;
  companyId: string;
  personId: string;
  workerName: string;
  workerRole: string;
  assignmentStatus: string;
  membershipStatus: string;
  attendanceState: 'CHECKED_IN' | 'CHECKED_OUT' | 'UNKNOWN';
  attendanceSyncStatus: string | null;
  attendanceUpdatedAt: string | null;
  operationalProject: M2OperationalProject | null;
}

/**
 * Converts persisted M1 identity/roster/attendance and M2 operational
 * projection records into the stable product-facing shape consumed by M2.
 * Missing operational data remains explicitly unavailable; it is never
 * replaced with fabricated metrics.
 */
export function buildM2OperationalSnapshot({ context, roster, attendance, operationalProject }: M2OperationalSnapshotInput): M2OperationalSnapshot {
  if (context.projectId !== roster.projectId || context.personId !== roster.personId) {
    throw new Error('M2 snapshot identity mismatch between project context and roster');
  }

  if (attendance && (attendance.projectId !== context.projectId || attendance.personId !== context.personId)) {
    throw new Error('M2 snapshot identity mismatch between attendance and project context');
  }

  if (operationalProject && (
    operationalProject.projectId !== context.projectId ||
    operationalProject.organisationId !== context.organisationId ||
    operationalProject.companyId !== context.companyId
  )) {
    throw new Error('M2 operational projection tenant mismatch');
  }

  return {
    projectId: context.projectId,
    organisationId: context.organisationId,
    companyId: context.companyId,
    personId: context.personId,
    workerName: roster.displayName,
    workerRole: roster.projectRole,
    assignmentStatus: roster.assignmentStatus,
    membershipStatus: roster.membershipStatus,
    attendanceState: attendance?.state ?? 'UNKNOWN',
    attendanceSyncStatus: attendance?.syncStatus ?? null,
    attendanceUpdatedAt: attendance?.updatedAt ?? null,
    operationalProject,
  };
}
