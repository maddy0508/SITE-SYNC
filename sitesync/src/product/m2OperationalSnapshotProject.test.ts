import { buildM2OperationalSnapshot } from './m2OperationalSnapshot';
import { buildM2OperationalProject } from './m2OperationalProject';

test('operational project projection remains distinct from identity and attendance snapshot', () => {
  const snapshot = buildM2OperationalSnapshot({
    context: { personId: 'person-1', projectId: 'project-1', organisationId: 'org-1', companyId: 'company-1', companyMembershipId: 'membership-1', projectRole: 'SUPERVISOR', selectedAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z' },
    roster: { projectId: 'project-1', personId: 'person-1', organisationId: 'org-1', companyId: 'company-1', displayName: 'JANE DOE', projectRole: 'SUPERVISOR', assignmentStatus: 'ACTIVE', membershipStatus: 'ACTIVE', syncedAt: '2026-09-14T00:00:00.000Z' },
    attendance: null,
  });
  const operational = buildM2OperationalProject({
    projectId: snapshot.projectId, organisationId: snapshot.organisationId, companyId: snapshot.companyId,
    site: { siteId: 'site-1', name: 'SITE A', latitude: null, longitude: null, locationState: 'UNAVAILABLE' },
    shift: null, workFronts: [], crews: [],
    safety: { preStart: 'UNAVAILABLE', swms: 'UNAVAILABLE', permits: 'UNAVAILABLE', hazards: [], restrictions: [], warnings: [] },
    actions: { blockers: [], outstanding: [], upcoming: [] },
  });
  expect(operational.projectId).toBe(snapshot.projectId);
  expect(operational.safety.preStart).toBe('UNAVAILABLE');
});
