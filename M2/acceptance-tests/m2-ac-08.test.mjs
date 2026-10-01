// M2-AC-8 [strict] — Project transfer per AMB-003 resolution (EP-6.0):
// new Project identity under receiving Company; source Project unchanged
// and owned by source Company; TransferEvent links old → new; Sites and
// Project/Site-scoped Requirements copied as new identities; source
// assignments marked `removed` with reason `project transfer`; no
// assignments copied; Company-scoped Requirements remain with source
// Company; no cross-tenant operational reference introduced.
// Anchor: §6.1.3 (amended at EP-6.0), AC-ARCH-A2a, AC-ARCH-B3, WC-INV-2,
// DM-INV-5.
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-8', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { m1, store, company, admin, project, siteA, siteB, worker } = await buildBase();
const A = { workerId: admin.id };

// Setup: source project active, sites in mixed states, assignments live.
m2.execute(store, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } });
m2.execute(store, { type: 'MobiliseSite', actor: A, payload: { siteId: siteA.id } });
m2.execute(store, { type: 'ActivateSite', actor: A, payload: { siteId: siteA.id } });
m1.execute(store, { type: 'AssignWorkerToProject', actor: A, payload: { workerId: worker.id, projectId: project.id } });
m1.execute(store, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: siteA.id } });
const pAsg = [...store.entities.values()].find((e) => e.type === 'ProjectAssignment');
const sAsg = [...store.entities.values()].find((e) => e.type === 'SiteAssignment');

// Requirements at all three scopes.
const mkReq = (payload) => {
  const before = new Set([...store.entities.values()].filter((e) => e.type === 'Requirement').map((e) => e.id));
  m1.execute(store, { type: 'CreateRequirement', actor: A, payload });
  return [...store.entities.values()].find((e) => e.type === 'Requirement' && !before.has(e.id));
};
const reqP = mkReq({ scope: 'project', projectId: project.id, reqType: 'acknowledgement', title: 'P ack', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } });
const reqS = mkReq({ scope: 'site', siteId: siteA.id, reqType: 'induction', title: 'Site A induction', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } });
const reqC = mkReq({ scope: 'company', companyId: company.id, reqType: 'acknowledgement', title: 'Co policy', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } });

// Receiving Company.
m1.execute(store, { type: 'CreateCompany', actor: { personRef: { email: 'recv@example.com', name: 'R' } }, payload: { companyName: 'Recv Co' } });
const recvCompany = [...store.entities.values()].find((e) => e.type === 'Company' && e.name === 'Recv Co');
const recvAdmin = [...store.entities.values()].find((e) => e.type === 'Worker' && e.companyId === recvCompany.id);

const entitiesBefore = store.entities.size;
const factsBefore = store.facts.length;

// Transfer — Platform Admin (system actor; §6.11 Platform Admin surface).
let r = m2.execute(store, { type: 'TransferProject', actor: { system: true }, payload: { projectId: project.id, toCompanyId: recvCompany.id } });
if (r.outcome !== 'server accepted') failures.push(`TransferProject rejected: ${JSON.stringify(r)}`);

// TransferEvent links old → new.
const tev = store.facts.find((f) => f.type === 'TransferEvent');
if (!tev) failures.push('no TransferEvent produced');
else {
  if (tev.payload.fromProjectId !== project.id) failures.push(`TransferEvent from: ${tev.payload.fromProjectId}`);
  if (!tev.payload.toProjectId) failures.push('TransferEvent has no toProjectId');
  for (const k of ['id', 'commandId', 'actor', 'deviceId', 'deviceTimestamp', 'serverTimestamp']) {
    if (tev[k] === undefined || tev[k] === null) failures.push(`TransferEvent missing §7.8 field ${k}`);
  }
}
const newProject = tev ? store.entities.get(tev.payload.toProjectId) : null;

// New Project identity under receiving Company; source unchanged.
if (!newProject) failures.push('new Project entity not found');
else {
  if (newProject.id === project.id) failures.push('transfer reused the source Project identity');
  if (newProject.companyId !== recvCompany.id) failures.push(`new Project companyId: ${newProject.companyId}`);
  if (m2.projectLifecycleState(store, newProject.id) !== 'draft') failures.push('new Project not in draft state');
}
if (project.companyId !== company.id) failures.push('source Project ownership changed');
if (m2.projectLifecycleState(store, project.id) !== 'active') failures.push('source Project lifecycle state changed');

// Sites copied as new identities under the new Project.
const newSites = [...store.entities.values()].filter((e) => e.type === 'Site' && e.projectId === newProject?.id);
if (newSites.length !== 2) failures.push(`expected 2 copied Sites, got ${newSites.length}`);
for (const ns of newSites) {
  if (ns.companyId !== recvCompany.id) failures.push(`copied Site companyId: ${ns.companyId}`);
  if (ns.id === siteA.id || ns.id === siteB.id) failures.push('transfer reused a source Site identity');
  if (m2.siteLifecycleState(store, ns.id) !== 'planned') failures.push(`copied Site not in planned state: ${m2.siteLifecycleState(store, ns.id)}`);
}
// Source sites unchanged and still under source project.
for (const ss of [siteA, siteB]) {
  if (ss.projectId !== project.id) failures.push('source Site projectId changed');
}
if (m2.siteLifecycleState(store, siteA.id) !== 'active') failures.push('source Site A lifecycle changed');
if (m2.siteLifecycleState(store, siteB.id) !== 'planned') failures.push('source Site B lifecycle changed');

// Source assignments marked removed with reason 'project transfer'.
for (const asg of [pAsg, sAsg]) {
  if (m2.assignmentState(store, asg.id) !== 'removed') failures.push(`source ${asg.type} not removed: ${m2.assignmentState(store, asg.id)}`);
  const remFact = store.facts.find((f) => f.type === 'LifecycleEvent' && f.subject === asg.id && f.payload.event === 'removed');
  if (remFact?.reason !== 'project transfer') failures.push(`removal reason: ${JSON.stringify(remFact?.reason)}`);
}
// No assignments copied to the receiving side.
const copiedAssignments = [...store.entities.values()].filter((e) =>
  (e.type === 'ProjectAssignment' || e.type === 'SiteAssignment') && e.companyId === recvCompany.id);
if (copiedAssignments.length > 0) failures.push(`${copiedAssignments.length} assignment(s) copied to receiving Company`);

// Requirements: project/site-scope copied as new identities under receiving
// Company; company-scope stays with source.
const recvReqs = [...store.entities.values()].filter((e) => e.type === 'Requirement' && e.companyId === recvCompany.id);
if (recvReqs.length !== 2) failures.push(`expected 2 copied Requirements, got ${recvReqs.length}`);
for (const rq of recvReqs) {
  if (rq.id === reqP.id || rq.id === reqS.id || rq.id === reqC.id) failures.push('transfer reused a source Requirement identity');
  if (rq.companyId !== recvCompany.id) failures.push('copied Requirement has wrong companyId');
}
const recvPReq = recvReqs.find((e) => e.scope === 'project');
if (recvPReq?.projectId !== newProject?.id) failures.push(`copied project-scope Requirement points at: ${recvPReq?.projectId}`);
const recvSReq = recvReqs.find((e) => e.scope === 'site');
if (!recvSReq || !newSites.some((s) => s.id === recvSReq.siteId)) failures.push('copied site-scope Requirement does not point at a copied Site');
// Company-scope Requirement untouched, still source-owned.
if (reqC.companyId !== company.id) failures.push('company-scope Requirement ownership changed');
if (recvReqs.some((e) => e.scope === 'company')) failures.push('company-scope Requirement was copied');

// No cross-tenant operational reference: nothing in the receiving Company
// points back at a source-Company entity (except the TransferEvent's
// linkage itself).
for (const e of [...store.entities.values()]) {
  if (e.companyId !== recvCompany.id) continue;
  for (const [k, v] of Object.entries(e)) {
    if (k === 'companyId' || k === 'id') continue;
    if (typeof v === 'string' && (v === project.id || v === siteA.id || v === siteB.id || v === reqP.id || v === reqS.id || v === reqC.id)) {
      failures.push(`receiving-side entity ${e.type} ${e.id} references source entity via ${k}`);
    }
  }
}
// Storage-layer isolation: source admin cannot read the new Project;
// receiving admin cannot read the source Project.
if (m1.readForCompany(store, company.id, newProject?.id) !== null) failures.push('source Company can read the transferred Project');
if (m1.readForCompany(store, recvCompany.id, project.id) !== null) failures.push('receiving Company can read the source Project');

// Historical record preservation: attendance/evidence/QA/progress are
// deferred to M6/M7/M8 (open-items); nothing to assert in M2.

report('M2-AC-8', failures);
