// M2-AC-10 [strict] — Multi-site project: site readiness is per Site. A
// worker assigned to Site A but not Site B is site_ready at A and not at B,
// within the same Project.
// Anchor: §6.1.2, PS-INV-4, §4.4.
//
// The readiness derivation exercised here is M2's (M2-aware): M1's
// derivation cannot see the M2 `paused` state, so M2 supplies its own
// siteReady; M1 source is untouched (milestone isolation).
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-10', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { m1, store, admin, project, siteA, siteB, worker } = await buildBase();
const A = { workerId: admin.id };

// Complete the worker's profile so readiness turns on assignment +
// requirement state alone (§4.4 company_ready precondition).
m1.execute(store, { type: 'ChangeWorkerProfile', actor: A, payload: { workerId: worker.id, changes: { displayName: 'W', contactPhone: '+61400000000' } } });

// Assign to the Project and to Site A only (§4.4: readiness needs a
// SiteAssignment in a live state at that Site).
m1.execute(store, { type: 'AssignWorkerToProject', actor: A, payload: { workerId: worker.id, projectId: project.id } });
m1.execute(store, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: siteA.id } });
const sAsgA = [...store.entities.values()].find((e) => e.type === 'SiteAssignment' && e.siteId === siteA.id);

const ra = m2.siteReady(store, worker.id, siteA.id);
if (ra.ready !== true) failures.push(`ready at assigned Site A expected true: ${JSON.stringify(ra)}`);
if (ra.hasAssignment !== true) failures.push('hasAssignment at Site A expected true');
const rb = m2.siteReady(store, worker.id, siteB.id);
if (rb.ready !== false) failures.push(`ready at unassigned Site B expected false: ${JSON.stringify(rb)}`);
if (rb.hasAssignment !== false) failures.push('hasAssignment at Site B expected false');

// M2-aware derivation: pausing the Site A assignment (M2 state, §6.1.2)
// removes readiness at A. M1's derivation cannot express this.
let r = m2.execute(store, { type: 'ActivateAssignment', actor: A, payload: { assignmentId: sAsgA.id } });
if (r.outcome !== 'server accepted') failures.push(`ActivateAssignment rejected: ${JSON.stringify(r)}`);
if (m2.siteReady(store, worker.id, siteA.id).ready !== true) failures.push('ready at Site A lost after activation');
r = m2.execute(store, { type: 'PauseAssignment', actor: A, payload: { assignmentId: sAsgA.id } });
if (r.outcome !== 'server accepted') failures.push(`PauseAssignment rejected: ${JSON.stringify(r)}`);
const rp = m2.siteReady(store, worker.id, siteA.id);
if (rp.ready !== false || rp.hasAssignment !== false) failures.push(`paused assignment still confers readiness: ${JSON.stringify(rp)}`);

report('M2-AC-10', failures);
