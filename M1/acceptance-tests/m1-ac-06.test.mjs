// M1-AC-6 [strict] — DocumentRevision lifecycle: missing → uploaded →
// under_review → verified | rejected → expiring_soon → expired → renewal.
// Self-declared documents skip under_review.
// Anchor: §4.3, INV-1 through INV-6.
import { requireCore, report, SRC_DIR } from './lib.mjs';

const absent = requireCore();
if (absent) report('M1-AC-6', absent);

const { createStore, execute, tick, satisfactionState } = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const DAY = 24 * 60 * 60 * 1000;
const s = createStore();
const t0 = s.clock;

execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'founder@example.com', name: 'Founder' } }, payload: { companyName: 'Docs Co' } });
const company = [...s.entities.values()].find((e) => e.type === 'Company');
const admin = [...s.entities.values()].find((e) => e.type === 'Worker');

execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'w@example.com', name: 'W' } });
const inv = s.facts.find((f) => f.type === 'Invitation' && f.state === 'pending');
execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'w@example.com', name: 'W' } }, payload: { invitationId: inv.invitationId } });
const worker = [...s.entities.values()].find((e) => e.type === 'Worker' && e.id !== admin.id);

const mkReq = (title, requiresVerification) => {
  execute(s, {
    type: 'CreateRequirement', actor: { workerId: admin.id },
    payload: { scope: 'company', companyId: company.id, reqType: 'document', title, appliesTo: { kind: 'all_workers' }, requiresVerification, expiry: { kind: 'duration', days: 365 } },
  });
  return [...s.entities.values()].find((e) => e.type === 'Requirement' && e.title === title);
};
const stateOf = (reqId) => satisfactionState(s, worker.id, reqId).state;

// --- Verified path (requires_verification = true) ---
const verifiedReq = mkReq('Licence', true);
if (stateOf(verifiedReq.id) !== 'missing') failures.push(`initial state: ${stateOf(verifiedReq.id)} (expected missing)`);

let r = execute(s, { type: 'UploadDocument', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: verifiedReq.id, documentRef: 'blob:licence-v1' } });
if (r.outcome !== 'server accepted') failures.push(`UploadDocument: ${r.outcome} ${r.reason ?? ''}`);
if (stateOf(verifiedReq.id) !== 'uploaded') failures.push(`after upload: ${stateOf(verifiedReq.id)}`);

// Invalid: verify directly from uploaded when verification is required.
r = execute(s, { type: 'VerifyDocument', actor: { workerId: admin.id }, payload: { workerId: worker.id, requirementId: verifiedReq.id } });
if (r.outcome !== 'server rejected') failures.push(`verify from uploaded: ${r.outcome} (expected server rejected)`);

r = execute(s, { type: 'SubmitDocumentForReview', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: verifiedReq.id } });
if (r.outcome !== 'server accepted') failures.push(`SubmitDocumentForReview: ${r.outcome} ${r.reason ?? ''}`);
if (stateOf(verifiedReq.id) !== 'under_review') failures.push(`after submit: ${stateOf(verifiedReq.id)}`);

r = execute(s, { type: 'VerifyDocument', actor: { workerId: admin.id }, payload: { workerId: worker.id, requirementId: verifiedReq.id } });
if (r.outcome !== 'server accepted') failures.push(`VerifyDocument: ${r.outcome} ${r.reason ?? ''}`);
if (stateOf(verifiedReq.id) !== 'verified') failures.push(`after verify: ${stateOf(verifiedReq.id)}`);

// Time-driven: expiring_soon → expired (threshold 30 days before expiry).
tick(s, t0 + 340 * DAY);
if (stateOf(verifiedReq.id) !== 'expiring_soon') failures.push(`at +340d: ${stateOf(verifiedReq.id)} (expected expiring_soon)`);
tick(s, t0 + 370 * DAY);
if (stateOf(verifiedReq.id) !== 'expired') failures.push(`at +370d: ${stateOf(verifiedReq.id)} (expected expired)`);

// Renewal re-enters at uploaded (§4.6).
r = execute(s, { type: 'RenewDocument', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: verifiedReq.id, documentRef: 'blob:licence-v2' } });
if (r.outcome !== 'server accepted') failures.push(`RenewDocument: ${r.outcome} ${r.reason ?? ''}`);
if (stateOf(verifiedReq.id) !== 'uploaded') failures.push(`after renewal: ${stateOf(verifiedReq.id)} (expected uploaded)`);

// --- Rejected path ---
const rejectedReq = mkReq('Ticket', true);
execute(s, { type: 'UploadDocument', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: rejectedReq.id, documentRef: 'blob:ticket-v1' } });
execute(s, { type: 'SubmitDocumentForReview', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: rejectedReq.id } });
r = execute(s, { type: 'RejectDocument', actor: { workerId: admin.id }, payload: { workerId: worker.id, requirementId: rejectedReq.id, reason: 'illegible scan' } });
if (r.outcome !== 'server accepted') failures.push(`RejectDocument: ${r.outcome} ${r.reason ?? ''}`);
if (stateOf(rejectedReq.id) !== 'rejected') failures.push(`after reject: ${stateOf(rejectedReq.id)}`);

// Re-upload after rejection is permitted.
r = execute(s, { type: 'UploadDocument', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: rejectedReq.id, documentRef: 'blob:ticket-v2' } });
if (r.outcome !== 'server accepted') failures.push(`re-upload after rejection: ${r.outcome} ${r.reason ?? ''}`);
if (stateOf(rejectedReq.id) !== 'uploaded') failures.push(`after re-upload: ${stateOf(rejectedReq.id)}`);

// --- Self-declared path (requires_verification = false) skips under_review ---
const selfReq = mkReq('Self Declared Qual', false);
r = execute(s, { type: 'UploadDocument', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: selfReq.id, documentRef: 'blob:self-v1' } });
if (r.outcome !== 'server accepted') failures.push(`self-declared upload: ${r.outcome} ${r.reason ?? ''}`);
if (stateOf(selfReq.id) !== 'verified') failures.push(`self-declared after upload: ${stateOf(selfReq.id)} (expected verified, skipping under_review)`);
r = execute(s, { type: 'SubmitDocumentForReview', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: selfReq.id } });
if (r.outcome !== 'server rejected') failures.push(`submit-for-review on self-declared: ${r.outcome} (expected server rejected)`);

// Every lifecycle transition is an auditable F record (INV-3).
const docFacts = s.facts.filter((f) => f.type === 'DocumentRevision' && f.subject === worker.id);
if (docFacts.length < 8) failures.push(`expected >=8 DocumentRevision facts across lifecycles, found ${docFacts.length}`);
for (const f of docFacts) {
  if (!f.id || !f.commandId || !f.actor) failures.push(`DocumentRevision fact missing audit identity: ${f.id ?? '(no id)'}`);
}

report('M1-AC-6', failures);
