import { getAttendanceState, getProjectContext, getProjectRoster } from '../database/localPersistence';
import type { AttendanceStateRecord, ProjectContextRecord, ProjectRosterRecord } from '../domain/localPersistence';
import { loadM2OperationalProject } from './m2OperationalPersistence';
import type { M2OperationalProject } from './m2OperationalProject';
import { sqliteM2OperationalProjectStore } from './m2OperationalStore';
import { buildM2OperationalSnapshot, type M2OperationalSnapshot } from './m2OperationalSnapshot';

export interface M2RuntimeDataDependencies {
  getProjectContext: (personId: string) => Promise<ProjectContextRecord | null>;
  getProjectRoster: (projectId: string, personId: string) => Promise<ProjectRosterRecord | null>;
  getAttendanceState: (projectId: string, personId: string, workDateUtc: string) => Promise<AttendanceStateRecord | null>;
  getOperationalProject: (projectId: string, organisationId: string, companyId: string) => Promise<M2OperationalProject | null>;
}

const databaseDependencies: M2RuntimeDataDependencies = {
  getProjectContext,
  getProjectRoster,
  getAttendanceState,
  getOperationalProject: (projectId, organisationId, companyId) =>
    loadM2OperationalProject(sqliteM2OperationalProjectStore, projectId, organisationId, companyId),
};

export async function loadM2OperationalSnapshot(
  input: { personId: string; workDateUtc: string },
  dependencies: M2RuntimeDataDependencies = databaseDependencies,
): Promise<M2OperationalSnapshot | null> {
  const context = await dependencies.getProjectContext(input.personId);
  if (!context) return null;

  const roster = await dependencies.getProjectRoster(context.projectId, input.personId);
  if (!roster) return null;

  const attendance = await dependencies.getAttendanceState(context.projectId, input.personId, input.workDateUtc);
  const operationalProject = await dependencies.getOperationalProject(
    context.projectId,
    context.organisationId,
    context.companyId,
  );

  return buildM2OperationalSnapshot({ context, roster, attendance, operationalProject });
}
