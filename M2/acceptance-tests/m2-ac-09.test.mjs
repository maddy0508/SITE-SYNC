// M2-AC-9 [strict] — Handover produces an immutable HandoverRecord F
// carrying the freeze timestamp and the M2-defined freeze scope (current
// Project/Site lifecycle state, non-removed assignments with their state at
// freeze, current Requirement set with scope). Subsequent lifecycle,
// assignment, or Requirement changes do not alter the frozen record; a
// handover taken at `active` still reads `active` after later suspension.
// Anchor: §6.1.3, PS-INV-7, §7.3.2.
//
// Noted interpretation (disclosed in M2/evidence/open-items.md and
// state.md): "active assignments" in the criterion is read as "assignments
// not removed at freeze time, with their derived state recorded" — a
// point-in-time snapshot must record the state as it was, and discarding
// paused assignments would silently drop roster facts from the handover.
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-9', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { m1, store, company, admin, project, siteA, siteB, worker } = await buildBase();
const A = { workerId: admin.id };

// --- setup: active project, active site A, planned site B, assignments ---
m2.execute(store, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } });
m2.execute(store, { type: 'MobiliseSite', actor: A, payload: { siteId: siteA.id } });
m2.execute(store, { type: 'ActivateSite', actor: A, payload: { siteId: siteA.id } });
m1.execute(store, { type: 'AssignWorkerToProject', actor: A, payload: { workerId: worker.id, projectId: project.id } });
m1.execute(store, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: siteA.id } });
const pAsg = [...store.entities.values()].find((e) => e.type === 'ProjectAssignment');
const sAsg = [...store.entities.values()].find((e) => e.type === 'SiteAssignment');
m2.execute(store, { type: 'ActivateAssignment', actor: A, payload: { assignmentId: sAsg.id } });

// Requirements: project-scope, site-scope (site A), company-scope.
const mkReq = (payload) => {
  const before = new Set([...store.entities.values()].filter((e) => e.type === 'Requirement').map((e) => e.id));
  const r = m1.execute(store, { type: 'CreateRequirement', actor: A, payload });
  if (r.outcome !== 'server accepted') failures.push(`setup CreateRequirement rejected: ${JSON.stringify(r)}`);
  return [...store.entities.values()].find((e) => e.type === 'Requirement' && !before.has(e.id));
};
const reqP = mkReq({ scope: 'project', projectId: project.id, reqType: 'acknowledgement', title: 'P induction ack', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } });
const reqS = mkReq({ scope: 'site', siteId: siteA.id, reqType: 'induction', title: 'Site A induction', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } });
const reqC = mkReq({ scope: 'company', companyId: company.id, reqType: 'acknowledgement', title: 'Company policy ack', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } });

// --- handover at project scope ---
let r = m2.execute(store, { type: 'RecordHandover', actor: A, payload: { scope: 'project', projectId: project.id } });
if (r.outcome !== 'server accepted') failures.push(`RecordHandover(project) rejected: ${JSON.stringify(r)}`);
const ho1 = store.facts.find((f) => f.type === 'HandoverRecord' && f.payload.scope === 'project');
if (!ho1) failures.push('no HandoverRecord fact produced');
if ([...store.entities.values()].some((e) => e.type === 'HandoverRecord')) failures.push('HandoverRecord materialised as E (must be F, §7.3.2)');
const snap1 = ho1?.payload.snapshot;
if (snap1) {
  if (snap1.lifecycleState !== 'active') failures.push(`snapshot lifecycleState: ${snap1.lifecycleState}`);
  if (snap1.frozenAt !== ho1.serverTimestamp) failures.push('snapshot does not carry the freeze timestamp');
  const asgIds = (snap1.assignments ?? []).map((a) => a.id);
  if (!asgIds.includes(pAsg.id) || !asgIds.includes(sAsg.id)) failures.push(`snapshot assignments missing: ${JSON.stringify(snap1.assignments)}`);
  const s = (snap1.assignments ?? []).find((a) => a.id === sAsg.id);
  if (s?.state !== 'active') failures.push(`snapshot assignment state not point-in-time: ${JSON.stringify(s)}`);
  const reqIds = (snap1.requirements ?? []).map((q) => q.id);
  if (!reqIds.includes(reqP.id) || !reqIds.includes(reqS.id)) failures.push('snapshot requirement set incomplete (project + contained sites)');
  if (reqIds.includes(reqC.id)) failures.push('snapshot leaked a Company-scope Requirement into a project handover');
  const q = (snap1.requirements ?? []).find((x) => x.id === reqP.id);
  if (q?.scope !== 'project' || q?.revision !== 1) failures.push(`snapshot requirement lacks scope/revision: ${JSON.stringify(q)}`);
}

// --- subsequent events (permitted; outside the frozen set) ---
const frozenJson = JSON.stringify(ho1);
m2.execute(store, { type: 'SuspendProject', actor: A, payload: { projectId: project.id, reason: 'hold' } });
m2.execute(store, { type: 'PauseAssignment', actor: A, payload: { assignmentId: sAsg.id } });
m1.execute(store, { type: 'ReviseRequirement', actor: A, payload: { requirementId: reqP.id } });
m2.execute(store, { type: 'RemoveAssignment', actor: A, payload: { assignmentId: pAsg.id, reason: 'roster complete' } });
if (m2.projectLifecycleState(store, project.id) !== 'suspended') failures.push('setup sanity: project not suspended after SuspendProject');

// Frozen-record immutability (criterion's named test: active stays active).
if (JSON.stringify(ho1) !== frozenJson) failures.push('frozen HandoverRecord changed under subsequent events');
if (!Object.isFrozen(ho1) || !Object.isFrozen(snap1)) failures.push('HandoverRecord/snapshot not deep-frozen');
try { snap1.lifecycleState = 'completed'; failures.push('frozen snapshot accepted mutation'); } catch { /* strict-mode TypeError expected */ }
if (snap1.lifecycleState !== 'active') failures.push(`frozen snapshot no longer reads active: ${snap1.lifecycleState}`);

// A later handover is a new point-in-time record: suspended, paused
// assignment recorded as paused, removed assignment absent, current
// revision of the Requirement set.
r = m2.execute(store, { type: 'RecordHandover', actor: A, payload: { scope: 'project', projectId: project.id } });
if (r.outcome !== 'server accepted') failures.push(`second RecordHandover rejected: ${JSON.stringify(r)}`);
const ho2 = store.facts.filter((f) => f.type === 'HandoverRecord' && f.payload.scope === 'project').at(-1);
const snap2 = ho2?.payload.snapshot;
if (snap2) {
  if (ho2.id === ho1.id) failures.push('second handover reused the first record identity');
  if (snap2.lifecycleState !== 'suspended') failures.push(`second snapshot lifecycleState: ${snap2.lifecycleState}`);
  const a2 = snap2.assignments ?? [];
  if (a2.some((a) => a.id === pAsg.id)) failures.push('second snapshot contains a removed assignment');
  const s2 = a2.find((a) => a.id === sAsg.id);
  if (s2?.state !== 'paused') failures.push(`second snapshot assignment state: ${JSON.stringify(s2)}`);
  const cur = (snap2.requirements ?? []).find((q) => q.groupId === reqP.groupId);
  if (cur?.revision !== 2) failures.push(`second snapshot did not capture the current revision: ${JSON.stringify(cur)}`);
  if ((snap2.requirements ?? []).some((q) => q.id === reqP.id)) failures.push('second snapshot contains a superseded revision');
}

// --- handover at site scope ---
r = m2.execute(store, { type: 'RecordHandover', actor: A, payload: { scope: 'site', siteId: siteA.id } });
if (r.outcome !== 'server accepted') failures.push(`RecordHandover(site) rejected: ${JSON.stringify(r)}`);
const hoS = store.facts.find((f) => f.type === 'HandoverRecord' && f.payload.scope === 'site');
const snapS = hoS?.payload.snapshot;
if (snapS) {
  if (snapS.lifecycleState !== m2.siteLifecycleState(store, siteA.id)) failures.push('site snapshot lifecycleState mismatch');
  if (!(snapS.assignments ?? []).some((a) => a.id === sAsg.id)) failures.push('site snapshot missing the Site assignment');
  if ((snapS.assignments ?? []).some((a) => a.id === pAsg.id)) failures.push('site snapshot leaked a Project-scope assignment');
  const ids = (snapS.requirements ?? []).map((q) => q.id);
  if (!ids.includes(reqS.id)) failures.push('site snapshot missing the site-scope Requirement');
  if (!(snapS.requirements ?? []).some((q) => q.groupId === reqP.groupId)) failures.push('site snapshot missing the applicable project-scope Requirement');
  if (ids.includes(reqC.id)) failures.push('site snapshot leaked a Company-scope Requirement');
}

report('M2-AC-9', failures);
