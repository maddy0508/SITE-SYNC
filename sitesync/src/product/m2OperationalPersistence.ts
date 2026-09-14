import type { M2OperationalProject } from './m2OperationalProject';

export interface M2OperationalProjectStore {
  save(value: M2OperationalProject): Promise<void>;
  load(projectId: string, organisationId: string, companyId: string): Promise<M2OperationalProject | null>;
}

export async function saveM2OperationalProject(store: M2OperationalProjectStore, value: M2OperationalProject): Promise<void> {
  await store.save(value);
}

export async function loadM2OperationalProject(
  store: M2OperationalProjectStore,
  projectId: string,
  organisationId: string,
  companyId: string,
): Promise<M2OperationalProject | null> {
  const value = await store.load(projectId, organisationId, companyId);
  if (!value) return null;
  if (value.projectId !== projectId || value.organisationId !== organisationId || value.companyId !== companyId) {
    throw new Error('M2 operational projection tenant mismatch');
  }
  return value;
}
