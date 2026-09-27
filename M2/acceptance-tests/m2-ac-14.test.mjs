// M2-AC-14 [strict] — Audit fields present on M2 F records as required by
// §7.8 for each event type: id, commandId, actor, deviceId,
// deviceTimestamp, serverTimestamp; reason where (and only where) mandated.
// Positive implementation assertion across every M2 F type:
// ProjectLifecycleEvent, SiteLifecycleEvent, LifecycleEvent (M2 subjects),
// HandoverRecord.
// Anchor: §7.8, AC-ARCH-D2, D3.
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-14', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { m1, store, admin, project, siteA, worker } = await buildBase();
const A = { workerId: admin.id };

const factBase = store.facts.length;
const acceptedCommandIds = new Set();
const run = (type, payload) => {
  const r = m2.execute(store, { type, actor: A, payload });
  if (r.outcome !== 'server accepted') failures.push(`${type} rejected: ${JSON.stringify(r)}`);
  else acceptedCommandIds.add(r.commandId);
  return r;
};

// Exercise every M2 F-producing command surface.
run('ActivateProject', { projectId: project.id });
run('SuspendProject', { projectId: project.id, reason: 'weather hold' });
run('ResumeProject', { projectId: project.id });
m1.execute(store, { type: 'AssignWorkerToProject', actor: A, payload: { workerId: worker.id, projectId: project.id } });
m1.execute(store, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: siteA.id } });
const sAsg = [...store.entities.values()].find((e) => e.type === 'SiteAssignment');
run('MobiliseSite', { siteId: siteA.id });
run('ActivateSite', { siteId: siteA.id });
run('ActivateAssignment', { assignmentId: sAsg.id });
run('PauseAssignment', { assignmentId: sAsg.id });
run('RemoveAssignment', { assignmentId: sAsg.id, reason: 'rotation' });
run('CreateExternalParty', { name: 'Client Pty', partyType: 'epc_client' });
const ep = [...store.entities.values()].find((e) => e.type === 'ExternalParty');
run('UpdateExternalParty', { externalPartyId: ep.id, changes: { contact: { email: 'n@example.com' } } });
run('AssociateExternalParty', { projectId: project.id, externalPartyId: ep.id });
const pxp = [...store.entities.values()].find((e) => e.type === 'ProjectExternalParty');
run('RemoveProjectExternalParty', { projectExternalPartyId: pxp.id });
run('RecordHandover', { scope: 'project', projectId: project.id });
run('RecordHandover', { scope: 'site', siteId: siteA.id });

const M2_F_TYPES = ['ProjectLifecycleEvent', 'SiteLifecycleEvent', 'LifecycleEvent', 'HandoverRecord'];
const m2Facts = store.facts.slice(factBase).filter((f) => M2_F_TYPES.includes(f.type));

// Coverage: every M2 F type produced at least one record.
for (const t of M2_F_TYPES) {
  if (!m2Facts.some((f) => f.type === t)) failures.push(`no ${t} record produced by the exercise`);
}

// §7.8 field assertion on every M2 F record.
for (const f of m2Facts) {
  const tag = `${f.type}(${f.id ?? '?'})`;
  if (typeof f.id !== 'string' || f.id.length === 0) failures.push(`${tag}: id missing`);
  if (typeof f.commandId !== 'string' || f.commandId.length === 0) failures.push(`${tag}: commandId missing`);
  if (!acceptedCommandIds.has(f.commandId)) failures.push(`${tag}: commandId not attributable to an accepted M2 command`);
  if (f.actor?.kind !== 'worker' || f.actor?.id !== admin.id) failures.push(`${tag}: actor ${JSON.stringify(f.actor)}`);
  if (typeof f.deviceId !== 'string' || f.deviceId.length === 0) failures.push(`${tag}: deviceId missing`);
  if (typeof f.deviceTimestamp !== 'number') failures.push(`${tag}: deviceTimestamp missing`);
  if (typeof f.serverTimestamp !== 'number') failures.push(`${tag}: serverTimestamp missing`);
}

// Reason discipline (§6.1.6/§6.3.6): present where mandated, absent where
// not — no fabricated reason fields.
const susp = m2Facts.find((f) => f.type === 'ProjectLifecycleEvent' && f.payload.event === 'suspended');
if (susp?.reason !== 'weather hold') failures.push(`suspension reason: ${JSON.stringify(susp?.reason)}`);
const act = m2Facts.find((f) => f.type === 'ProjectLifecycleEvent' && f.payload.event === 'activated');
if (act && 'reason' in act) failures.push('activation fact carries a fabricated reason');
const rem = m2Facts.find((f) => f.type === 'LifecycleEvent' && f.subject === sAsg.id && f.payload.event === 'removed');
if (rem?.reason !== 'rotation') failures.push(`assignment removal reason: ${JSON.stringify(rem?.reason)}`);
const pause = m2Facts.find((f) => f.type === 'LifecycleEvent' && f.subject === sAsg.id && f.payload.event === 'paused');
if (pause && 'reason' in pause) failures.push('pause fact carries a fabricated reason');

// HandoverRecord carries its freeze timestamp (§6.1.3).
for (const f of m2Facts.filter((x) => x.type === 'HandoverRecord')) {
  if (f.payload.snapshot?.frozenAt !== f.serverTimestamp) failures.push(`HandoverRecord ${f.id}: freeze timestamp absent or ≠ serverTimestamp`);
}

// M2 E genesis records carry the same audit fields (creation facts, §7.8).
for (const e of [ep, pxp]) {
  if (!e) continue;
  for (const k of ['id', 'commandId', 'deviceId', 'deviceTimestamp', 'serverTimestamp']) {
    if (e[k] === undefined || e[k] === null) failures.push(`${e.type} ${e.id}: genesis audit field ${k} missing`);
  }
  if (e.actor?.kind !== 'worker' || e.actor?.id !== admin.id) failures.push(`${e.type} ${e.id}: genesis actor wrong`);
}

report('M2-AC-14', failures);
