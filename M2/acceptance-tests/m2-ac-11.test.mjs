// M2-AC-11 [strict] — Requirement scope precedence, both portions (EP-6.0;
// AMB-005 resolved):
// (a) Default-apply: a Project-scope Requirement applies to all contained
//     Sites by default (gates readiness at every Site).
// (b) Opt-out: a Site with an active SiteRequirementOptOut for a
//     Project-scope Requirement is not bound by that Requirement for
//     readiness derivation (§6.1.3 amended; §4.4).
// Anchor: §6.1.2, §6.1.3 (amended at EP-6.0), §4.2, §4.4.
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-11', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { m1, store, admin, project, siteA, siteB, worker } = await buildBase();
const A = { workerId: admin.id };

// Complete profile; assign worker to both sites so readiness turns on
// requirement state alone.
m1.execute(store, { type: 'ChangeWorkerProfile', actor: A, payload: { workerId: worker.id, changes: { displayName: 'W', contactPhone: '+61400000000' } } });
m1.execute(store, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: siteA.id } });
m1.execute(store, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: siteB.id } });

// Project-scope requirement.
m1.execute(store, { type: 'CreateRequirement', actor: A, payload: { scope: 'project', projectId: project.id, reqType: 'induction', title: 'P Induction', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } } });
const pReq = [...store.entities.values()].find((e) => e.type === 'Requirement');

// (a) Default-apply: gates readiness at both sites.
for (const s of [siteA, siteB]) {
  const sr = m2.siteReady(store, worker.id, s.id);
  if (sr.ready !== false || !sr.failing.includes(pReq.id)) {
    failures.push(`default-apply failed at ${s.id}: ${JSON.stringify(sr)}`);
  }
}

// (b) Opt Site A out of the project-scope requirement.
let r = m2.execute(store, { type: 'OptOutSiteRequirement', actor: A, payload: { siteId: siteA.id, requirementId: pReq.id, reason: 'client waiver' } });
if (r.outcome !== 'server accepted') failures.push(`OptOutSiteRequirement rejected: ${JSON.stringify(r)}`);

// Site A no longer bound; Site B still bound.
const ra = m2.siteReady(store, worker.id, siteA.id);
if (ra.ready !== true || ra.failing.includes(pReq.id)) failures.push(`opt-out ineffective at A: ${JSON.stringify(ra)}`);
const rb = m2.siteReady(store, worker.id, siteB.id);
if (rb.ready !== false || !rb.failing.includes(pReq.id)) failures.push(`default-apply broken at B: ${JSON.stringify(rb)}`);

// Fact discipline: F-class SiteRequirementOptOut with reason (§6.1.3
// amended; §7.8 audit fields).
const ooFacts = store.facts.filter((f) => f.type === 'SiteRequirementOptOut' && f.subject === siteA.id);
if (ooFacts.length !== 1) failures.push(`expected 1 SiteRequirementOptOut fact, got ${ooFacts.length}`);
else {
  const f = ooFacts[0];
  if (f.payload.requirementId !== pReq.id) failures.push(`opt-out references wrong requirement: ${f.payload.requirementId}`);
  if (f.payload.event !== 'activated') failures.push(`opt-out subtype event: ${f.payload.event}`);
  if (f.reason !== 'client waiver') failures.push(`opt-out reason: ${JSON.stringify(f.reason)}`);
  for (const k of ['id', 'commandId', 'actor', 'deviceId', 'deviceTimestamp', 'serverTimestamp']) {
    if (f[k] === undefined || f[k] === null) failures.push(`SiteRequirementOptOut missing §7.8 field ${k}`);
  }
}

// Reactivation path: a deactivated opt-out re-binds the Site.
r = m2.execute(store, { type: 'OptOutSiteRequirement', actor: A, payload: { siteId: siteA.id, requirementId: pReq.id, reason: 'duplicate' } });
if (r.outcome !== 'server rejected') failures.push('duplicate active opt-out accepted (should be rejected)');
r = m2.execute(store, { type: 'RevokeSiteRequirementOptOut', actor: A, payload: { siteId: siteA.id, requirementId: pReq.id, reason: 'waiver expired' } });
if (r.outcome !== 'server accepted') failures.push(`RevokeSiteRequirementOptOut rejected: ${JSON.stringify(r)}`);
const ra2 = m2.siteReady(store, worker.id, siteA.id);
if (ra2.ready !== false || !ra2.failing.includes(pReq.id)) failures.push(`opt-out revocation did not re-bind Site A: ${JSON.stringify(ra2)}`);

// Cross-scope guard: cannot opt out of a site-scope requirement.
m1.execute(store, { type: 'CreateRequirement', actor: A, payload: { scope: 'site', siteId: siteA.id, reqType: 'induction', title: 'Site A induction', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } } });
const sReq = [...store.entities.values()].filter((e) => e.type === 'Requirement').find((e) => e.scope === 'site');
r = m2.execute(store, { type: 'OptOutSiteRequirement', actor: A, payload: { siteId: siteA.id, requirementId: sReq.id, reason: 'wrong scope' } });
if (r.outcome !== 'server rejected') failures.push('site-scope requirement opt-out accepted (§6.1.3: project-scope only)');

report('M2-AC-11', failures);
