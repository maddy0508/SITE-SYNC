// M1-AC-5 [strict] — Requirement model: requirements are typed (document |
// induction | acknowledgement), scoped (company | project | site), versioned,
// and carry applies_to / requires_verification / expiry.
// Anchor: §4.2.
import { requireCore, report, SRC_DIR } from './lib.mjs';

const absent = requireCore();
if (absent) report('M1-AC-5', absent);

const { createStore, execute } = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const s = createStore();
execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'founder@example.com', name: 'Founder' } }, payload: { companyName: 'Req Co' } });
const company = [...s.entities.values()].find((e) => e.type === 'Company');
const admin = [...s.entities.values()].find((e) => e.type === 'Worker');
execute(s, { type: 'CreateProject', actor: { workerId: admin.id }, payload: { companyId: company.id, name: 'Proj 1' } });
const project = [...s.entities.values()].find((e) => e.type === 'Project');
execute(s, { type: 'CreateSite', actor: { workerId: admin.id }, payload: { projectId: project.id, name: 'Site 1' } });
const site = [...s.entities.values()].find((e) => e.type === 'Site');

// Typed + scoped: one requirement per (type, scope) combination sample.
const specs = [
  { scope: 'company', scopeId: company.id, reqType: 'document', title: 'White Card' },
  { scope: 'company', scopeId: company.id, reqType: 'induction', title: 'Company Induction' },
  { scope: 'company', scopeId: company.id, reqType: 'acknowledgement', title: 'Safety Policy' },
  { scope: 'project', scopeId: project.id, reqType: 'induction', title: 'Project Induction' },
  { scope: 'site', scopeId: site.id, reqType: 'acknowledgement', title: 'Site Rules' },
];
for (const spec of specs) {
  const r = execute(s, {
    type: 'CreateRequirement',
    actor: { workerId: admin.id },
    payload: {
      scope: spec.scope,
      companyId: company.id,
      projectId: spec.scope === 'project' ? project.id : undefined,
      siteId: spec.scope === 'site' ? site.id : undefined,
      reqType: spec.reqType,
      title: spec.title,
      appliesTo: { kind: 'all_workers' },
      requiresVerification: spec.reqType === 'document',
      expiry: { kind: 'duration', days: 365 },
    },
  });
  if (r.outcome !== 'server accepted') failures.push(`CreateRequirement ${spec.title}: ${r.outcome} ${r.reason ?? ''}`);
}

const reqs = [...s.entities.values()].filter((e) => e.type === 'Requirement');
if (reqs.length !== specs.length) failures.push(`expected ${specs.length} Requirements, found ${reqs.length}`);

// Attributes carried (§4.2): type, scope, applies_to, requires_verification, expiry, revision.
for (const spec of specs) {
  const rq = reqs.find((e) => e.title === spec.title);
  if (!rq) { failures.push(`Requirement missing: ${spec.title}`); continue; }
  if (rq.reqType !== spec.reqType) failures.push(`${spec.title}: reqType ${rq.reqType}`);
  if (rq.scope !== spec.scope) failures.push(`${spec.title}: scope ${rq.scope}`);
  if (!rq.appliesTo || rq.appliesTo.kind !== 'all_workers') failures.push(`${spec.title}: applies_to not carried`);
  if (typeof rq.requiresVerification !== 'boolean') failures.push(`${spec.title}: requires_verification not carried`);
  if (!rq.expiry || rq.expiry.kind !== 'duration') failures.push(`${spec.title}: expiry not carried`);
  if (rq.revision !== 1) failures.push(`${spec.title}: initial revision ${rq.revision} (expected 1)`);
}

// Versioned: a revision supersedes the prior (revision tracked, §4.2).
const whiteCard = reqs.find((e) => e.title === 'White Card');
const rv = execute(s, { type: 'ReviseRequirement', actor: { workerId: admin.id }, payload: { requirementId: whiteCard?.id } });
if (rv.outcome !== 'server accepted') failures.push(`ReviseRequirement: ${rv.outcome} ${rv.reason ?? ''}`);
const rev2 = [...s.entities.values()].filter((e) => e.type === 'Requirement' && e.title === 'White Card')
  .find((e) => e.revision === 2);
if (!rev2) failures.push('revision 2 of White Card not created');
else if (rev2.groupId !== whiteCard.groupId) failures.push('revision 2 not linked to the same requirement group');

// Closed type set (AC-ARCH-I2): invalid type rejected.
const badType = execute(s, {
  type: 'CreateRequirement', actor: { workerId: admin.id },
  payload: { scope: 'company', companyId: company.id, reqType: 'permit', title: 'Bad', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } },
});
if (badType.outcome !== 'server rejected') failures.push(`invalid reqType accepted: ${badType.outcome}`);

// Closed scope set: invalid scope rejected.
const badScope = execute(s, {
  type: 'CreateRequirement', actor: { workerId: admin.id },
  payload: { scope: 'platform', companyId: company.id, reqType: 'document', title: 'Bad Scope', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } },
});
if (badScope.outcome !== 'server rejected') failures.push(`invalid scope accepted: ${badScope.outcome}`);

report('M1-AC-5', failures);
