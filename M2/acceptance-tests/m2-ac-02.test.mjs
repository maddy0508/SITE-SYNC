// M2-AC-2 [strict] — Site lifecycle transitions: planned → mobilising →
// active → demobilising → closed → archived. Every transition produces a
// SiteLifecycleEvent. Site closure marks the Site's ProjectAssignment and
// SiteAssignment records removed with reason "site closure" (§6.1.3).
// Anchor: §6.1.3, PS-INV-8.
//
// Noted interpretation (disclosed in M2/evidence/open-items.md): "the Site's
// ProjectAssignment ... records" has no referent in the §7 model —
// ProjectAssignment is Worker × Project and carries no Site scope
// (PS-INV-3, WC-INV-4). The closure cascade therefore removes the closed
// Site's SiteAssignment records; the parent Project's ProjectAssignment
// records are NOT removed, and this test asserts that distinction.
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-2', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { m1, store, admin, project, siteA, worker } = await buildBase();
const A = { workerId: admin.id };
const lc = () => m2.siteLifecycleState(store, siteA.id);
const events = () => store.facts.filter((f) => f.type === 'SiteLifecycleEvent' && f.subject === siteA.id).map((f) => f.payload.event);

if (lc() !== 'planned') failures.push(`site entry state not planned: ${lc()}`);

// Invalid transitions rejected.
let r = m2.execute(store, { type: 'ActivateSite', actor: A, payload: { siteId: siteA.id } });
if (r.outcome !== 'server rejected') failures.push(`planned→active not rejected: ${JSON.stringify(r)}`);
r = m2.execute(store, { type: 'CloseSite', actor: A, payload: { siteId: siteA.id } });
if (r.outcome !== 'server rejected') failures.push(`planned→closed not rejected: ${JSON.stringify(r)}`);
r = m2.execute(store, { type: 'ArchiveSite', actor: A, payload: { siteId: siteA.id } });
if (r.outcome !== 'server rejected') failures.push(`planned→archived not rejected: ${JSON.stringify(r)}`);

// Assign the worker to the project and to Site A (for the closure cascade).
m1.execute(store, { type: 'AssignWorkerToProject', actor: A, payload: { workerId: worker.id, projectId: project.id } });
m1.execute(store, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: siteA.id } });
const pAsg = [...store.entities.values()].find((e) => e.type === 'ProjectAssignment' && e.workerId === worker.id);
const sAsg = [...store.entities.values()].find((e) => e.type === 'SiteAssignment' && e.workerId === worker.id && e.siteId === siteA.id);

// Happy path: planned → mobilising → active → demobilising → closed → archived.
const seq = [
  ['MobiliseSite', 'mobilising'],
  ['ActivateSite', 'active'],
  ['DemobiliseSite', 'demobilising'],
  ['CloseSite', 'closed'],
  ['ArchiveSite', 'archived'],
];
for (const [type, want] of seq) {
  r = m2.execute(store, { type, actor: A, payload: { siteId: siteA.id } });
  if (r.outcome !== 'server accepted') failures.push(`${type} not accepted: ${JSON.stringify(r)}`);
  if (lc() !== want) failures.push(`${type}: derived state ${lc()} != ${want}`);
}
const ev = events();
const want = ['mobilising', 'activated', 'demobilising', 'closed', 'archived'];
if (ev.length !== want.length || !want.every((w, i) => ev[i] === w)) {
  failures.push(`SiteLifecycleEvent stream mismatch: got ${JSON.stringify(ev)}, want ${JSON.stringify(want)} (PS-INV-8)`);
}

// Closure cascade (§6.1.3): the Site's SiteAssignment is removed with reason
// "site closure"; the removal is a state change via LifecycleEvent, not a
// deletion (§6.3.3).
if (m2.assignmentState(store, sAsg.id) !== 'removed') failures.push(`site assignment not removed on closure: ${m2.assignmentState(store, sAsg.id)}`);
const cascade = store.facts.filter((f) => f.type === 'LifecycleEvent' && f.subject === sAsg.id && f.payload.event === 'removed');
if (cascade.length !== 1) failures.push(`expected exactly 1 removal fact for site assignment, got ${cascade.length}`);
else if (cascade[0].reason !== 'site closure') failures.push(`closure removal reason != "site closure": ${cascade[0].reason}`);
if (!store.entities.has(sAsg.id)) failures.push('site assignment identity deleted (must be state change, not deletion)');

// Noted interpretation: the parent Project's ProjectAssignment is the
// Project's record, not the Site's; it survives Site closure (PS-INV-3).
if (m2.assignmentState(store, pAsg.id) !== 'assigned') failures.push(`project assignment wrongly affected by site closure: ${m2.assignmentState(store, pAsg.id)}`);

// Terminal archived: no further transitions.
r = m2.execute(store, { type: 'DemobiliseSite', actor: A, payload: { siteId: siteA.id } });
if (r.outcome !== 'server rejected') failures.push('archived site accepted a transition');

report('M2-AC-2', failures);
