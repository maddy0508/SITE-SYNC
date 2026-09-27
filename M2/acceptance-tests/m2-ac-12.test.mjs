// M2-AC-12 [strict] — Assignment states: ProjectAssignment and
// SiteAssignment transition assigned → active → paused → removed (§6.1.2
// milestone-scope expansion; M1's assigned|active boundary does not survive
// into M2). `removed` is terminal and not reusable; a new assignment is a
// new identity. Removal reason is mandatory (§6.3.6); pause/resume carry no
// mandatory reason. Site closure cascade with reason "site closure" is
// covered in m2-ac-02.
// Anchor: §6.1.2, §6.1.3, §7.5.
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-12', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { m1, store, admin, project, siteA, worker } = await buildBase();
const A = { workerId: admin.id };

m1.execute(store, { type: 'AssignWorkerToProject', actor: A, payload: { workerId: worker.id, projectId: project.id } });
m1.execute(store, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: siteA.id } });
const pAsg = [...store.entities.values()].find((e) => e.type === 'ProjectAssignment');
const sAsg = [...store.entities.values()].find((e) => e.type === 'SiteAssignment');

// Entry state is `assigned` (genesis; no fact yet).
if (m2.assignmentState(store, sAsg.id) !== 'assigned') failures.push('SiteAssignment entry state not assigned');
if (m2.assignmentState(store, pAsg.id) !== 'assigned') failures.push('ProjectAssignment entry state not assigned');

// Invalid: assigned → paused (pause is defined from active, §6.1.2).
let r = m2.execute(store, { type: 'PauseAssignment', actor: A, payload: { assignmentId: sAsg.id } });
if (r.outcome !== 'server rejected') failures.push('assigned → paused accepted');
if (m2.assignmentState(store, sAsg.id) !== 'assigned') failures.push('rejected pause changed state');

// assigned → active.
r = m2.execute(store, { type: 'ActivateAssignment', actor: A, payload: { assignmentId: sAsg.id } });
if (r.outcome !== 'server accepted') failures.push(`ActivateAssignment rejected: ${JSON.stringify(r)}`);
if (m2.assignmentState(store, sAsg.id) !== 'active') failures.push('activation not derived');

// active → paused (no reason mandated; none supplied).
r = m2.execute(store, { type: 'PauseAssignment', actor: A, payload: { assignmentId: sAsg.id } });
if (r.outcome !== 'server accepted') failures.push(`PauseAssignment rejected: ${JSON.stringify(r)}`);
if (m2.assignmentState(store, sAsg.id) !== 'paused') failures.push('pause not derived');

// paused → active (resume).
r = m2.execute(store, { type: 'ResumeAssignment', actor: A, payload: { assignmentId: sAsg.id } });
if (r.outcome !== 'server accepted') failures.push(`ResumeAssignment rejected: ${JSON.stringify(r)}`);
if (m2.assignmentState(store, sAsg.id) !== 'active') failures.push('resume not derived');

// active → removed; reason mandatory (§6.3.6).
r = m2.execute(store, { type: 'RemoveAssignment', actor: A, payload: { assignmentId: sAsg.id, reason: 'roster change' } });
if (r.outcome !== 'server accepted') failures.push(`RemoveAssignment rejected: ${JSON.stringify(r)}`);
if (m2.assignmentState(store, sAsg.id) !== 'removed') failures.push('removal not derived');
const remFact = store.facts.find((f) => f.type === 'LifecycleEvent' && f.subject === sAsg.id && f.payload.event === 'removed');
if (remFact?.reason !== 'roster change') failures.push(`removal fact reason: ${JSON.stringify(remFact?.reason)}`);

// removed is terminal: no transition out, no second removal.
for (const type of ['ActivateAssignment', 'PauseAssignment', 'ResumeAssignment', 'RemoveAssignment']) {
  r = m2.execute(store, { type, actor: A, payload: { assignmentId: sAsg.id, reason: 'again' } });
  if (r.outcome !== 'server rejected') failures.push(`${type} on removed assignment accepted`);
}

// New assignment after removal is a new identity; the removed record stands.
m1.execute(store, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: siteA.id } });
const sAsg2 = [...store.entities.values()].filter((e) => e.type === 'SiteAssignment').find((e) => e.id !== sAsg.id);
if (!sAsg2) failures.push('re-assignment produced no new identity');
else if (m2.assignmentState(store, sAsg2.id) !== 'assigned') failures.push('new assignment not in entry state assigned');
if (m2.assignmentState(store, sAsg.id) !== 'removed') failures.push('removed assignment resurrected by re-assignment');

// Same vocabulary on ProjectAssignment.
r = m2.execute(store, { type: 'ActivateAssignment', actor: A, payload: { assignmentId: pAsg.id } });
if (r.outcome !== 'server accepted') failures.push(`ActivateAssignment(ProjectAssignment) rejected: ${JSON.stringify(r)}`);
r = m2.execute(store, { type: 'RemoveAssignment', actor: A, payload: { assignmentId: pAsg.id, reason: 'project rotation' } });
if (r.outcome !== 'server accepted') failures.push(`RemoveAssignment(ProjectAssignment) rejected: ${JSON.stringify(r)}`);
if (m2.assignmentState(store, pAsg.id) !== 'removed') failures.push('ProjectAssignment removal not derived');

// Fact vocabulary (AC-ARCH-I3): assignment lifecycle rides the catalogued
// generic LifecycleEvent with entityType attribution; no bespoke event type.
const stream = store.facts.filter((f) => f.type === 'LifecycleEvent' && f.subject === sAsg.id).map((f) => f.payload.event);
if (JSON.stringify(stream) !== JSON.stringify(['activated', 'paused', 'resumed', 'removed'])) {
  failures.push(`SiteAssignment event stream: ${JSON.stringify(stream)}`);
}
const badType = store.facts.find((f) => f.type === 'LifecycleEvent' && (f.subject === sAsg.id || f.subject === pAsg.id)
  && !['SiteAssignment', 'ProjectAssignment'].includes(f.payload.entityType));
if (badType) failures.push(`assignment LifecycleEvent without entityType attribution: ${JSON.stringify(badType.payload)}`);
if (store.facts.some((f) => f.type === 'AssignmentEvent')) failures.push('bespoke AssignmentEvent type introduced (AC-ARCH-I3)');

report('M2-AC-12', failures);
