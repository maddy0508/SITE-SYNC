// M1-AC-9 [strict] — Readiness derivation: company_ready(worker) and
// site_ready(worker, site) computed per §4.4 (as amended by EP-4.0, AMB-002
// resolution) from RequirementSatisfaction records. site_ready additionally
// requires SiteAssignment. No stored readiness flag is authoritative.
// Anchor: §4.4 (EP-4.0), §4.5, INV-1, INV-6, AC-ARCH-E1, AC-ARCH-E3.
import { requireCore, report, SRC_DIR } from './lib.mjs';

const absent = requireCore();
if (absent) report('M1-AC-9', absent);

const {
  createStore, execute, profileComplete, companyReady, siteReady,
} = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const s = createStore();
execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'founder@example.com', name: 'Founder' } }, payload: { companyName: 'Ready Co' } });
const company = [...s.entities.values()].find((e) => e.type === 'Company');
const admin = [...s.entities.values()].find((e) => e.type === 'Worker');
execute(s, { type: 'CreateProject', actor: { workerId: admin.id }, payload: { companyId: company.id, name: 'P1' } });
const project = [...s.entities.values()].find((e) => e.type === 'Project');
execute(s, { type: 'CreateSite', actor: { workerId: admin.id }, payload: { projectId: project.id, name: 'S1' } });
const site = [...s.entities.values()].find((e) => e.type === 'Site');
execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'w@example.com', name: 'W' } });
const inv = s.facts.find((f) => f.type === 'Invitation' && f.state === 'pending');
execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'w@example.com', name: 'W' } }, payload: { invitationId: inv.invitationId } });
const worker = [...s.entities.values()].find((e) => e.type === 'Worker' && e.id !== admin.id);

// --- profile_complete per §4.4 (EP-4.0): display_name non-empty AND
//     (contact_phone non-empty OR contact_email non-empty) ---
// Creation fact supplies displayName + contactEmail → complete.
if (profileComplete(s, worker.id) !== true) failures.push('profile_complete false despite name+email');

// Remove contact email AND no phone → incomplete even with display name.
execute(s, { type: 'ChangeWorkerProfile', actor: { workerId: worker.id }, payload: { workerId: worker.id, changes: { contactEmail: '', contactPhone: '' } } });
if (profileComplete(s, worker.id) !== false) failures.push('profile_complete true with no contact channel');
// Phone alone suffices.
execute(s, { type: 'ChangeWorkerProfile', actor: { workerId: worker.id }, payload: { workerId: worker.id, changes: { contactPhone: '+61400000000' } } });
if (profileComplete(s, worker.id) !== true) failures.push('profile_complete false with phone only');
// Empty display name → incomplete regardless of contacts.
execute(s, { type: 'ChangeWorkerProfile', actor: { workerId: worker.id }, payload: { workerId: worker.id, changes: { displayName: '' } } });
if (profileComplete(s, worker.id) !== false) failures.push('profile_complete true with empty display_name');
execute(s, { type: 'ChangeWorkerProfile', actor: { workerId: worker.id }, payload: { workerId: worker.id, changes: { displayName: 'W' } } });

// --- company_ready: requirements gate ---
const cr0 = companyReady(s, worker.id);
if (cr0.ready !== true) failures.push(`company_ready false with no requirements: ${JSON.stringify(cr0)}`);

// A company-scope document requirement (verification required) blocks readiness.
execute(s, {
  type: 'CreateRequirement', actor: { workerId: admin.id },
  payload: { scope: 'company', companyId: company.id, reqType: 'document', title: 'Licence', appliesTo: { kind: 'all_workers' }, requiresVerification: true, expiry: { kind: 'none' } },
});
const docReq = [...s.entities.values()].find((e) => e.type === 'Requirement' && e.title === 'Licence');
let cr = companyReady(s, worker.id);
if (cr.ready !== false) failures.push('company_ready true with unsatisfied requirement');
if (!cr.failing.includes(docReq.id)) failures.push('failing requirement not identified specifically (§4.5)');

// Satisfy it fully: upload → review → verify.
execute(s, { type: 'UploadDocument', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: docReq.id, documentRef: 'blob:l1' } });
if (companyReady(s, worker.id).ready !== false) failures.push('company_ready true at uploaded (not verified)');
execute(s, { type: 'SubmitDocumentForReview', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: docReq.id } });
if (companyReady(s, worker.id).ready !== false) failures.push('company_ready true at under_review');
execute(s, { type: 'VerifyDocument', actor: { workerId: admin.id }, payload: { workerId: worker.id, requirementId: docReq.id } });
if (companyReady(s, worker.id).ready !== true) failures.push('company_ready false after verification');

// A rejected satisfaction blocks (§4.5).
execute(s, {
  type: 'CreateRequirement', actor: { workerId: admin.id },
  payload: { scope: 'company', companyId: company.id, reqType: 'document', title: 'Ticket', appliesTo: { kind: 'all_workers' }, requiresVerification: true, expiry: { kind: 'none' } },
});
const tickReq = [...s.entities.values()].find((e) => e.type === 'Requirement' && e.title === 'Ticket');
execute(s, { type: 'UploadDocument', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: tickReq.id, documentRef: 'blob:t1' } });
execute(s, { type: 'SubmitDocumentForReview', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: tickReq.id } });
execute(s, { type: 'RejectDocument', actor: { workerId: admin.id }, payload: { workerId: worker.id, requirementId: tickReq.id, reason: 'expired card' } });
cr = companyReady(s, worker.id);
if (cr.ready !== false || !cr.failing.includes(tickReq.id)) failures.push('rejected requirement does not block company_ready');

// applies_to scoping: a requirement not applying to this worker does not gate.
execute(s, {
  type: 'CreateRequirement', actor: { workerId: admin.id },
  payload: { scope: 'company', companyId: company.id, reqType: 'induction', title: 'Supervisor Only', appliesTo: { kind: 'role', role: 'Supervisor' }, requiresVerification: false, expiry: { kind: 'none' } },
});
cr = companyReady(s, worker.id);
if (cr.failing.some((id) => [...s.entities.values()].find((e) => e.id === id)?.title === 'Supervisor Only')) {
  failures.push('role-scoped requirement gated a worker it does not apply to');
}

// --- site_ready: company + project/site requirements + SiteAssignment ---
const sr0 = siteReady(s, worker.id, site.id);
if (sr0.ready !== false) failures.push('site_ready true without SiteAssignment (§4.4/§6.3.3)');
if (sr0.hasAssignment !== false) failures.push('site_ready did not report missing assignment');

execute(s, { type: 'AssignWorkerToSite', actor: { workerId: admin.id }, payload: { workerId: worker.id, siteId: site.id, state: 'assigned' } });
// Still blocked: company-scope Ticket is rejected.
let sr = siteReady(s, worker.id, site.id);
if (sr.ready !== false) failures.push('site_ready true while company_ready false (INV-1)');

// Fix the company requirement (re-upload + verify).
execute(s, { type: 'UploadDocument', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: tickReq.id, documentRef: 'blob:t2' } });
execute(s, { type: 'SubmitDocumentForReview', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: tickReq.id } });
execute(s, { type: 'VerifyDocument', actor: { workerId: admin.id }, payload: { workerId: worker.id, requirementId: tickReq.id } });
sr = siteReady(s, worker.id, site.id);
if (sr.ready !== true) failures.push(`site_ready false with all satisfied + assigned: ${JSON.stringify(sr)}`);

// A site-scope requirement blocks only that site (§6.1: per-site readiness).
execute(s, {
  type: 'CreateRequirement', actor: { workerId: admin.id },
  payload: { scope: 'site', siteId: site.id, reqType: 'induction', title: 'Site Induction', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } },
});
const siteReq = [...s.entities.values()].find((e) => e.type === 'Requirement' && e.title === 'Site Induction');
sr = siteReady(s, worker.id, site.id);
if (sr.ready !== false || !sr.failing.includes(siteReq.id)) failures.push('site-scope requirement does not gate site_ready');
if (companyReady(s, worker.id).ready !== true) failures.push('site-scope requirement leaked into company_ready');

// Complete it → site_ready true.
execute(s, { type: 'StartInduction', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: siteReq.id } });
execute(s, { type: 'CompleteInduction', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: siteReq.id } });
sr = siteReady(s, worker.id, site.id);
if (sr.ready !== true) failures.push(`site_ready false after site induction: ${JSON.stringify(sr)}`);

// A project-scope requirement gates the project's sites.
execute(s, {
  type: 'CreateRequirement', actor: { workerId: admin.id },
  payload: { scope: 'project', projectId: project.id, reqType: 'acknowledgement', title: 'Project Rules', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } },
});
const projReq = [...s.entities.values()].find((e) => e.type === 'Requirement' && e.title === 'Project Rules');
sr = siteReady(s, worker.id, site.id);
if (sr.ready !== false || !sr.failing.includes(projReq.id)) failures.push('project-scope requirement does not gate site_ready');

// No stored readiness flag is authoritative: no entity carries readiness
// fields, and no F record embeds a readiness value (AC-ARCH-E1/E3/A4).
for (const e of s.entities.values()) {
  for (const k of Object.keys(e)) {
    if (/ready|readiness/i.test(k)) failures.push(`entity ${e.id} (${e.type}) stores readiness field: ${k}`);
  }
}
for (const f of s.facts) {
  for (const k of Object.keys(f.payload ?? {})) {
    if (/ready|readiness|profileComplete/i.test(k)) failures.push(`fact ${f.id} (${f.type}) embeds derived readiness: ${k}`);
  }
}

report('M1-AC-9', failures);
