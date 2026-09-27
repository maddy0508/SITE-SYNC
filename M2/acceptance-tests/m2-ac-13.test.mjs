// M2-AC-13 [strict] — Project/Site permissions: role × scope × membership
// evaluated for M2 operations. Lifecycle, ExternalParty, association, and
// handover administration are Company Admin surfaces (§6.11.2); assignment
// transitions admit supervisor (§6.3.3); capability flags only, never role
// labels (WC-INV-8); membership/tenancy bound every operation (DM-INV-5);
// suspended actors initiate nothing (§6.3.3).
// Anchor: §2, §6.1.2.
import { requireCore, report, SRC_DIR, buildBase } from './lib.mjs';

const absent = requireCore();
if (absent) report('M2-AC-13', absent);

const m2 = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const { m1, store, company, admin, project, siteA, siteB, worker } = await buildBase();
const A = { workerId: admin.id };
const W = { workerId: worker.id }; // no capabilities

// Setup (admin, M1 surfaces): assignments + an ExternalParty to act upon.
m1.execute(store, { type: 'AssignWorkerToProject', actor: A, payload: { workerId: worker.id, projectId: project.id } });
m1.execute(store, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: siteA.id } });
const sAsg = [...store.entities.values()].find((e) => e.type === 'SiteAssignment');
m2.execute(store, { type: 'CreateExternalParty', actor: A, payload: { name: 'Client Pty', partyType: 'epc_client' } });
const ep = [...store.entities.values()].find((e) => e.type === 'ExternalParty');

// --- plain worker (no capabilities): rejected on every M2 surface ---
const workerAttempts = [
  { type: 'ActivateProject', payload: { projectId: project.id } },
  { type: 'SuspendProject', payload: { projectId: project.id, reason: 'x' } },
  { type: 'CompleteProject', payload: { projectId: project.id } },
  { type: 'MobiliseSite', payload: { siteId: siteA.id } },
  { type: 'ActivateSite', payload: { siteId: siteA.id } },
  { type: 'CloseSite', payload: { siteId: siteA.id } },
  { type: 'ActivateAssignment', payload: { assignmentId: sAsg.id } },
  { type: 'RemoveAssignment', payload: { assignmentId: sAsg.id, reason: 'x' } },
  { type: 'CreateExternalParty', payload: { name: 'N', partyType: 'subcontractor' } },
  { type: 'UpdateExternalParty', payload: { externalPartyId: ep.id, changes: { name: 'H' } } },
  { type: 'ArchiveExternalParty', payload: { externalPartyId: ep.id } },
  { type: 'AssociateExternalParty', payload: { projectId: project.id, externalPartyId: ep.id } },
  { type: 'RecordHandover', payload: { scope: 'project', projectId: project.id } },
];
for (const c of workerAttempts) {
  const r = m2.execute(store, { ...c, actor: W });
  if (r.outcome !== 'server rejected') failures.push(`plain worker ${c.type}: ${JSON.stringify(r)}`);
}
// Rejection storm changed nothing.
if (m2.projectLifecycleState(store, project.id) !== 'draft') failures.push('project state moved by rejected commands');
if (m2.siteLifecycleState(store, siteA.id) !== 'planned') failures.push('site state moved by rejected commands');
if (m2.assignmentState(store, sAsg.id) !== 'assigned') failures.push('assignment state moved by rejected commands');
if (m2.externalPartyState(store, ep.id) !== 'active') failures.push('external party state moved by rejected commands');

// --- supervisor: assignment transitions allowed; admin surfaces denied ---
let r = m1.execute(store, { type: 'GrantCapability', actor: A, payload: { workerId: worker.id, capability: 'supervisor' } });
if (r.outcome !== 'server accepted') failures.push(`GrantCapability rejected: ${JSON.stringify(r)}`);
r = m2.execute(store, { type: 'ActivateAssignment', actor: W, payload: { assignmentId: sAsg.id } });
if (r.outcome !== 'server accepted') failures.push(`supervisor ActivateAssignment rejected: ${JSON.stringify(r)}`);
r = m2.execute(store, { type: 'PauseAssignment', actor: W, payload: { assignmentId: sAsg.id } });
if (r.outcome !== 'server accepted') failures.push(`supervisor PauseAssignment rejected: ${JSON.stringify(r)}`);
r = m2.execute(store, { type: 'ResumeAssignment', actor: W, payload: { assignmentId: sAsg.id } });
if (r.outcome !== 'server accepted') failures.push(`supervisor ResumeAssignment rejected: ${JSON.stringify(r)}`);
const supervisorDenied = [
  { type: 'ActivateProject', payload: { projectId: project.id } },
  { type: 'MobiliseSite', payload: { siteId: siteA.id } },
  { type: 'CreateExternalParty', payload: { name: 'N2', partyType: 'subcontractor' } },
  { type: 'UpdateExternalParty', payload: { externalPartyId: ep.id, changes: { name: 'H' } } },
  { type: 'AssociateExternalParty', payload: { projectId: project.id, externalPartyId: ep.id } },
  { type: 'RecordHandover', payload: { scope: 'project', projectId: project.id } },
];
for (const c of supervisorDenied) {
  r = m2.execute(store, { ...c, actor: W });
  if (r.outcome !== 'server rejected') failures.push(`supervisor ${c.type} accepted: ${JSON.stringify(r)}`);
}

// --- company_admin positive control ---
for (const c of [
  { type: 'ActivateProject', payload: { projectId: project.id } },
  { type: 'MobiliseSite', payload: { siteId: siteA.id } },
  { type: 'RecordHandover', payload: { scope: 'project', projectId: project.id } },
]) {
  r = m2.execute(store, { ...c, actor: A });
  if (r.outcome !== 'server accepted') failures.push(`admin ${c.type} rejected: ${JSON.stringify(r)}`);
}

// --- membership/tenancy: another Company's admin cannot operate here ---
m1.execute(store, { type: 'CreateCompany', actor: { personRef: { email: 'other@example.com', name: 'O' } }, payload: { companyName: 'Other Co' } });
const otherAdmin = [...store.entities.values()].find((e) => e.type === 'Worker' && e.companyId !== company.id);
const OA = { workerId: otherAdmin.id };
for (const c of [
  { type: 'SuspendProject', payload: { projectId: project.id, reason: 'hostile' } },
  { type: 'CloseSite', payload: { siteId: siteA.id } },
  { type: 'ArchiveExternalParty', payload: { externalPartyId: ep.id } },
  { type: 'RemoveAssignment', payload: { assignmentId: sAsg.id, reason: 'hostile' } },
  { type: 'RecordHandover', payload: { scope: 'project', projectId: project.id } },
]) {
  r = m2.execute(store, { ...c, actor: OA });
  if (r.outcome !== 'server rejected' || !/cross-tenant|not found/.test(r.reason ?? '')) {
    failures.push(`cross-tenant ${c.type}: ${JSON.stringify(r)}`);
  }
}
if (m2.projectLifecycleState(store, project.id) !== 'active') failures.push('project state moved cross-tenant');
if (m2.siteLifecycleState(store, siteA.id) !== 'mobilising') failures.push('site state moved cross-tenant');

// --- suspended actor initiates nothing (§6.3.3) ---
r = m1.execute(store, { type: 'SuspendWorker', actor: A, payload: { workerId: worker.id, reason: 'stand down' } });
if (r.outcome !== 'server accepted') failures.push(`SuspendWorker rejected: ${JSON.stringify(r)}`);
r = m2.execute(store, { type: 'PauseAssignment', actor: W, payload: { assignmentId: sAsg.id } });
if (r.outcome !== 'server rejected' || !/suspended/.test(r.reason ?? '')) {
  failures.push(`suspended supervisor PauseAssignment: ${JSON.stringify(r)}`);
}

report('M2-AC-13', failures);
