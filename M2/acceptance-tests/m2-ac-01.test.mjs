// M2-AC-1 [strict] — Project lifecycle transitions: draft → active →
// suspended → active (resumed) → completed → archived; draft → cancelled.
// Every transition produces a ProjectLifecycleEvent.
// Anchor: §6.1.3, PS-INV-8. PS-INV-2: an active Project has ≥1 Site.
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-1', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { store, admin, project } = await buildBase();
const A = { workerId: admin.id };
const lc = () => m2.projectLifecycleState(store, project.id);
const events = () => store.facts.filter((f) => f.type === 'ProjectLifecycleEvent' && f.subject === project.id).map((f) => f.payload.event);

// Entry state (M1 scaffolding): draft, no lifecycle events yet.
if (lc() !== 'draft') failures.push(`project entry state not draft: ${lc()}`);

// Invalid transitions from draft are rejected with reason.
let r = m2.execute(store, { type: 'SuspendProject', actor: A, payload: { projectId: project.id, reason: 'early' } });
if (r.outcome !== 'server rejected') failures.push(`draft→suspended not rejected: ${JSON.stringify(r)}`);
r = m2.execute(store, { type: 'CompleteProject', actor: A, payload: { projectId: project.id } });
if (r.outcome !== 'server rejected') failures.push(`draft→completed not rejected: ${JSON.stringify(r)}`);
r = m2.execute(store, { type: 'ArchiveProject', actor: A, payload: { projectId: project.id } });
if (r.outcome !== 'server rejected') failures.push(`draft→archived not rejected: ${JSON.stringify(r)}`);

// PS-INV-2: a draft Project with zero Sites... this one has 2 (buildBase).
// Separate zero-site project must not activate.
m2.execute(store, { type: 'CreateProject', actor: A, payload: { companyId: admin.companyId, name: 'Empty P' } });
const emptyP = [...store.entities.values()].find((e) => e.type === 'Project' && e.name === 'Empty P');
r = m2.execute(store, { type: 'ActivateProject', actor: A, payload: { projectId: emptyP.id } });
if (r.outcome !== 'server rejected' || !/PS-INV-2|at least one Site/i.test(r.reason ?? '')) {
  failures.push(`zero-site activation not rejected per PS-INV-2: ${JSON.stringify(r)}`);
}
if (m2.projectLifecycleState(store, emptyP.id) !== 'draft') failures.push('rejected activation changed lifecycle state');

// Happy path: draft → active → suspended → active (resumed) → completed → archived.
const seq = [
  ['ActivateProject', { projectId: project.id }, 'active'],
  ['SuspendProject', { projectId: project.id, reason: 'weather hold' }, 'suspended'],
  ['ResumeProject', { projectId: project.id }, 'active'],
  ['CompleteProject', { projectId: project.id }, 'completed'],
  ['ArchiveProject', { projectId: project.id }, 'archived'],
];
for (const [type, payload, want] of seq) {
  r = m2.execute(store, { type, actor: A, payload });
  if (r.outcome !== 'server accepted') failures.push(`${type} not accepted: ${JSON.stringify(r)}`);
  if (lc() !== want) failures.push(`${type}: derived state ${lc()} != ${want}`);
}
const ev = events();
const want = ['activated', 'suspended', 'resumed', 'completed', 'archived'];
if (ev.length !== want.length || !want.every((w, i) => ev[i] === w)) {
  failures.push(`ProjectLifecycleEvent stream mismatch: got ${JSON.stringify(ev)}, want ${JSON.stringify(want)} (PS-INV-8)`);
}

// Terminal archived: no further transitions.
r = m2.execute(store, { type: 'SuspendProject', actor: A, payload: { projectId: project.id, reason: 'x' } });
if (r.outcome !== 'server rejected') failures.push('archived project accepted a transition');

// Second project: draft → cancelled.
m2.execute(store, { type: 'CreateProject', actor: A, payload: { companyId: admin.companyId, name: 'P2' } });
const p2 = [...store.entities.values()].find((e) => e.type === 'Project' && e.name === 'P2');
m2.execute(store, { type: 'CreateSite', actor: A, payload: { projectId: p2.id, name: 'P2S' } });
r = m2.execute(store, { type: 'CancelProject', actor: A, payload: { projectId: p2.id } });
if (r.outcome !== 'server accepted') failures.push(`CancelProject not accepted: ${JSON.stringify(r)}`);
if (m2.projectLifecycleState(store, p2.id) !== 'cancelled') failures.push('cancelled state not derived');
// Cancelled is terminal.
r = m2.execute(store, { type: 'ActivateProject', actor: A, payload: { projectId: p2.id } });
if (r.outcome !== 'server rejected') failures.push('cancelled project accepted activation');

report('M2-AC-1', failures);
