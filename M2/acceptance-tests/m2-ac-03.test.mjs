// M2-AC-3 [strict] — Every M2 lifecycle F record (ProjectLifecycleEvent,
// SiteLifecycleEvent, TransferEvent, HandoverRecord) carries actor and
// timestamp as required by §6.1.6. Reason is mandatory only where §6.1 or
// another governing section explicitly requires it; M2 does not expand the
// mandatory-reason set. (TransferEvent: no M2 F record exists — transfer is
// halted pending AMB-003; sentinel coverage in m2-ac-08.)
// Anchor: §6.1.6, §7.8, AC-ARCH-D2.
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-3', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { m1, store, admin, project, siteA, worker } = await buildBase();
const A = { workerId: admin.id };

// Reason mandatory where a governing section requires it:
// - suspension (§6.11.6: administrative suspension → mandatory reason)
let r = m2.execute(store, { type: 'SuspendProject', actor: A, payload: { projectId: project.id } });
if (r.outcome !== 'server rejected' || !/reason/i.test(r.reason ?? '')) {
  failures.push(`reason-less project suspension not rejected (§6.11.6): ${JSON.stringify(r)}`);
}
// - assignment removal (§6.3.6: reason mandatory for assignment removal)
m1.execute(store, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: siteA.id } });
const asg = [...store.entities.values()].find((e) => e.type === 'SiteAssignment' && e.workerId === worker.id);
r = m2.execute(store, { type: 'RemoveAssignment', actor: A, payload: { assignmentId: asg.id } });
if (r.outcome !== 'server rejected' || !/reason/i.test(r.reason ?? '')) {
  failures.push(`reason-less assignment removal not rejected (§6.3.6): ${JSON.stringify(r)}`);
}
if (m2.assignmentState(store, asg.id) !== 'assigned') failures.push('rejected removal changed assignment state');

// Reason NOT mandatory where no governing section requires it (no expansion):
// project activation carries no reason mandate in §6.1/§6.11.
r = m2.execute(store, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } });
if (r.outcome !== 'server accepted') failures.push(`activation without reason wrongly rejected (no mandate — M2 must not expand): ${JSON.stringify(r)}`);

// Exercise the remaining M2 lifecycle F types.
m2.execute(store, { type: 'SuspendProject', actor: A, payload: { projectId: project.id, reason: 'hold' } });
m2.execute(store, { type: 'MobiliseSite', actor: A, payload: { siteId: siteA.id } });
m2.execute(store, { type: 'ActivateSite', actor: A, payload: { siteId: siteA.id } });
m2.execute(store, { type: 'RecordHandover', actor: A, payload: { scope: 'project', projectId: project.id } });

// §7.8 minimum common audit fields on every M2 lifecycle F record.
const M2_F_TYPES = ['ProjectLifecycleEvent', 'SiteLifecycleEvent', 'HandoverRecord'];
const seen = new Set();
for (const f of store.facts) {
  if (!M2_F_TYPES.includes(f.type)) continue;
  seen.add(f.type);
  for (const k of ['id', 'commandId', 'actor', 'deviceId', 'deviceTimestamp', 'serverTimestamp']) {
    if (f[k] === undefined || f[k] === null) failures.push(`${f.type} ${f.id} missing §7.8 field ${k}`);
  }
  if (!f.actor || f.actor.kind !== 'worker' || !f.actor.id) failures.push(`${f.type} ${f.id} actor not attributed`);
}
for (const t of M2_F_TYPES) {
  if (!seen.has(t)) failures.push(`no ${t} F record produced by the scenario`);
}

// Suspension fact carries the mandatory reason; activation fact carries no
// reason requirement (presence optional, never fabricated).
const susp = store.facts.find((f) => f.type === 'ProjectLifecycleEvent' && f.payload.event === 'suspended');
if (susp?.reason !== 'hold') failures.push('suspension fact does not carry the mandatory reason');
const act = store.facts.find((f) => f.type === 'ProjectLifecycleEvent' && f.payload.event === 'activated');
if (act && act.reason !== undefined && act.reason !== null && act.reason !== '') {
  failures.push('activation fact carries a reason the blueprint did not mandate (expansion)');
}

// §6.1.3: closure cascade reason is the fixed value "site closure".
m2.execute(store, { type: 'DemobiliseSite', actor: A, payload: { siteId: siteA.id } });
m2.execute(store, { type: 'CloseSite', actor: A, payload: { siteId: siteA.id } });
const cascade = store.facts.filter((f) => f.type === 'LifecycleEvent' && f.subject === asg.id && f.payload.event === 'removed');
if (cascade.length !== 1 || cascade[0].reason !== 'site closure') {
  failures.push('closure cascade removal does not carry reason "site closure" (§6.1.3)');
}

report('M2-AC-3', failures);
