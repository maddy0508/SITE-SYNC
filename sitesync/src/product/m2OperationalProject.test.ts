import { buildM2OperationalProject, type M2OperationalProjectInput } from './m2OperationalProject';

const base: M2OperationalProjectInput = {
  projectId: 'project-1',
  organisationId: 'org-1',
  companyId: 'company-1',
  site: { siteId: 'site-1', name: 'SITE A', latitude: -36.1, longitude: 146.9, locationState: 'VERIFIED' },
  shift: { shiftId: 'shift-1', name: 'DAY SHIFT', startsAt: '2026-09-14T07:00:00.000Z', endsAt: '2026-09-14T17:00:00.000Z' },
  workFronts: [{ id: 'front-1', name: 'BLOCK A', status: 'ACTIVE', plannedQuantity: 1000, completedQuantity: 250, unit: 'PANELS', crewId: 'crew-1' }],
  crews: [{ id: 'crew-1', name: 'CREW A', supervisorPersonId: 'person-1', workerCount: 4 }],
  safety: { preStart: 'COMPLETE', swms: 'REQUIRED', permits: 'NONE', hazards: [], restrictions: [], warnings: [] },
  actions: { blockers: [], outstanding: [], upcoming: [] },
};

test('builds a tenant-bound operational project projection without changing source values', () => {
  const result = buildM2OperationalProject(base);
  expect(result.projectId).toBe('project-1');
  expect(result.site.name).toBe('SITE A');
  expect(result.workFronts[0].completedQuantity).toBe(250);
  expect(result.crews[0].supervisorPersonId).toBe('person-1');
});

test('calculates progress from persisted quantities', () => {
  const result = buildM2OperationalProject(base);
  expect(result.workFronts[0].progressPercent).toBe(25);
});

test('rejects cross-tenant work fronts and crews', () => {
  expect(() => buildM2OperationalProject({ ...base, workFronts: [{ ...base.workFronts[0], companyId: 'other-company' }] })).toThrow('tenant mismatch');
  expect(() => buildM2OperationalProject({ ...base, crews: [{ ...base.crews[0], organisationId: 'other-org' }] })).toThrow('tenant mismatch');
});

test('rejects invalid quantities instead of producing misleading progress', () => {
  expect(() => buildM2OperationalProject({ ...base, workFronts: [{ ...base.workFronts[0], completedQuantity: 1100 }] })).toThrow('quantity');
});
