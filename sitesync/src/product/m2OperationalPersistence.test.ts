import { buildM2OperationalProject, type M2OperationalProjectInput } from './m2OperationalProject';
import { saveM2OperationalProject, loadM2OperationalProject, type M2OperationalProjectStore } from './m2OperationalPersistence';

const project: M2OperationalProjectInput = {
  projectId: 'project-1', organisationId: 'org-1', companyId: 'company-1',
  site: { siteId: 'site-1', name: 'SITE A', latitude: -36.1, longitude: 146.9, locationState: 'VERIFIED' },
  shift: { shiftId: 'shift-1', name: 'DAY SHIFT', startsAt: '2026-09-14T07:00:00.000Z', endsAt: '2026-09-14T17:00:00.000Z' },
  workFronts: [{ id: 'front-1', name: 'BLOCK A', status: 'ACTIVE', plannedQuantity: 1000, completedQuantity: 250, unit: 'PANELS', crewId: 'crew-1' }],
  crews: [{ id: 'crew-1', name: 'CREW A', supervisorPersonId: 'person-1', workerCount: 4 }],
  safety: { preStart: 'COMPLETE', swms: 'REQUIRED', permits: 'NONE', hazards: [], restrictions: [], warnings: [] },
  actions: { blockers: [], outstanding: [], upcoming: [] },
};

test('persists and reloads an operational project through the store boundary', async () => {
  const rows = new Map<string, any>();
  const store: M2OperationalProjectStore = {
    save: async value => { rows.set(value.projectId, value); },
    load: async (projectId, organisationId, companyId) => {
      const value = rows.get(projectId);
      if (!value || value.organisationId !== organisationId || value.companyId !== companyId) return null;
      return value;
    },
  };
  const normalised = buildM2OperationalProject(project);
  await saveM2OperationalProject(store, normalised);
  const loaded = await loadM2OperationalProject(store, 'project-1', 'org-1', 'company-1');
  expect(loaded?.workFronts[0].progressPercent).toBe(25);
});

test('rejects a store result that crosses the requested tenant boundary', async () => {
  const store: M2OperationalProjectStore = {
    save: async () => undefined,
    load: async () => ({ ...buildM2OperationalProject(project), organisationId: 'other-org' }),
  };
  await expect(loadM2OperationalProject(store, 'project-1', 'org-1', 'company-1')).rejects.toThrow('tenant mismatch');
});
