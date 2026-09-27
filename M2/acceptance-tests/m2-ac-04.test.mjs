// M2-AC-4 [strict] — Project suspension overlay: Project lifecycle state =
// suspended imposes a D-class effective operational suspension on all
// contained Sites. No SiteLifecycleEvent is produced. The Site's underlying
// lifecycle state is unchanged. The overlay is derived from Project
// lifecycle facts alone. (No AMB dependency; the independent-suspension
// representation is AMB-004 scope, tested nowhere here.)
// Anchor: §6.1.3.
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-4', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { store, admin, project, siteA, siteB } = await buildBase();
const A = { workerId: admin.id };

m2.execute(store, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } });
m2.execute(store, { type: 'MobiliseSite', actor: A, payload: { siteId: siteA.id } });
m2.execute(store, { type: 'ActivateSite', actor: A, payload: { siteId: siteA.id } });
m2.execute(store, { type: 'MobiliseSite', actor: A, payload: { siteId: siteB.id } });

// Pre-suspension: no overlay.
for (const s of [siteA, siteB]) {
  const v = m2.siteOperationalStatus(store, s.id);
  if (v.projectSuspended !== false || v.operational !== 'normal') {
    failures.push(`overlay present before suspension on ${s.id}: ${JSON.stringify(v)}`);
  }
}

const factsBefore = store.facts.length;
m2.execute(store, { type: 'SuspendProject', actor: A, payload: { projectId: project.id, reason: 'client hold' } });

// Overlay applies to ALL contained Sites, regardless of underlying state.
for (const s of [siteA, siteB]) {
  const v = m2.siteOperationalStatus(store, s.id);
  if (v.projectSuspended !== true) failures.push(`overlay absent on ${s.id} during project suspension`);
  if (v.operational !== 'suspended') failures.push(`site ${s.id} not effectively suspended: ${JSON.stringify(v)}`);
}
// Underlying lifecycle unchanged (D-class overlay, not a state change).
if (m2.siteLifecycleState(store, siteA.id) !== 'active') failures.push('site A underlying lifecycle altered by overlay');
if (m2.siteLifecycleState(store, siteB.id) !== 'mobilising') failures.push('site B underlying lifecycle altered by overlay');

// No SiteLifecycleEvent produced by the suspension.
const newFacts = store.facts.slice(factsBefore);
if (newFacts.some((f) => f.type === 'SiteLifecycleEvent')) {
  failures.push('project suspension produced a SiteLifecycleEvent (overlay must be derivation-only)');
}
// Exactly one ProjectLifecycleEvent was produced.
const pl = newFacts.filter((f) => f.type === 'ProjectLifecycleEvent' && f.payload.event === 'suspended');
if (pl.length !== 1) failures.push(`expected 1 suspension event, got ${pl.length}`);

// Derived from Project lifecycle facts alone: the derivation reads only the
// Project stream — demonstrated by recomputation equivalence after unrelated
// fact growth (a handover on site B does not disturb the overlay).
m2.execute(store, { type: 'RecordHandover', actor: A, payload: { scope: 'site', siteId: siteB.id } });
const vB = m2.siteOperationalStatus(store, siteB.id);
if (vB.projectSuspended !== true || vB.operational !== 'suspended') failures.push('overlay not stable under unrelated fact growth');

// Resume clears the overlay (derivation follows the Project stream).
m2.execute(store, { type: 'ResumeProject', actor: A, payload: { projectId: project.id } });
for (const s of [siteA, siteB]) {
  const v = m2.siteOperationalStatus(store, s.id);
  if (v.projectSuspended !== false || v.operational !== 'normal') {
    failures.push(`overlay persists after resume on ${s.id}: ${JSON.stringify(v)}`);
  }
}
if (m2.siteLifecycleState(store, siteA.id) !== 'active') failures.push('site A underlying lifecycle altered across suspend/resume');

report('M2-AC-4', failures);
