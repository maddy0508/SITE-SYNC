import type {
  AttendanceStateRecord,
  ProjectContextRecord,
  ProjectRosterRecord,
} from '../domain/localPersistence';

export interface M2OperationalSnapshotInput {
  context: ProjectContextRecord;
  roster: ProjectRosterRecord;
  attendance: AttendanceStateRecord | null;
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
}

/**
 * Converts persisted M1 identity/roster/attendance records into the stable
 * product-facing shape consumed by M2 surfaces. No operational values are
 * fabricated when an attendance projection is absent.
 */
export function buildM2OperationalSnapshot({ context, roster, attendance }: M2OperationalSnapshotInput): M2OperationalSnapshot {
  if (context.projectId !== roster.projectId || context.personId !== roster.personId) {
    throw new Error('M2 snapshot identity mismatch between project context and roster');
  }

  if (attendance && (attendance.projectId !== context.projectId || attendance.personId !== context.personId)) {
    throw new Error('M2 snapshot identity mismatch between attendance and project context');
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
  };
}
