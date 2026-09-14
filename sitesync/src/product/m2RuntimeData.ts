import { getAttendanceState, getProjectContext, getProjectRoster } from '../database/localPersistence';
import type { AttendanceStateRecord, ProjectContextRecord, ProjectRosterRecord } from '../domain/localPersistence';
import { buildM2OperationalSnapshot, type M2OperationalSnapshot } from './m2OperationalSnapshot';

export interface M2RuntimeDataDependencies {
  getProjectContext: (personId: string) => Promise<ProjectContextRecord | null>;
  getProjectRoster: (projectId: string, personId: string) => Promise<ProjectRosterRecord | null>;
  getAttendanceState: (projectId: string, personId: string, workDateUtc: string) => Promise<AttendanceStateRecord | null>;
}

const databaseDependencies: M2RuntimeDataDependencies = { getProjectContext, getProjectRoster, getAttendanceState };

export async function loadM2OperationalSnapshot(
  input: { personId: string; workDateUtc: string },
  dependencies: M2RuntimeDataDependencies = databaseDependencies,
): Promise<M2OperationalSnapshot | null> {
  const context = await dependencies.getProjectContext(input.personId);
  if (!context) return null;

  const roster = await dependencies.getProjectRoster(context.projectId, input.personId);
  if (!roster) return null;

  const attendance = await dependencies.getAttendanceState(context.projectId, input.personId, input.workDateUtc);
  return buildM2OperationalSnapshot({ context, roster, attendance });
}
