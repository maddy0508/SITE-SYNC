// M1-AC-13 [strict] — Audit fields present on M1 F records as required by
// §7.8 for each event type. The criterion imposes no field beyond what §7.8
// and the owning Blueprint section require for that event type.
// Anchor: §7.8, §6.3.6, §6.11.6, AC-ARCH-D2, D3.
import { requireCore, report, SRC_DIR } from './lib.mjs';

const absent = requireCore();
if (absent) report('M1-AC-13', absent);

const { createStore, execute } = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const s = createStore();

// A representative sequence producing every M1 F-record type.
execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'founder@example.com', name: 'Founder' } }, deviceId: 'dev-admin', payload: { companyName: 'Audit Co' } });
const company = [...s.entities.values()].find((e) => e.type === 'Company');
const admin = [...s.entities.values()].find((e) => e.type === 'Worker');

execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, deviceId: 'dev-admin', payload: { email: 'w@example.com', name: 'W' } });
const inv = s.facts.find((f) => f.type === 'Invitation' && f.state === 'pending');
execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'w@example.com', name: 'W' } }, deviceId: 'dev-worker', payload: { invitationId: inv.invitationId } });
const worker = [...s.entities.values()].find((e) => e.type === 'Worker' && e.id !== admin.id);

execute(s, { type: 'ChangeWorkerProfile', actor: { workerId: worker.id }, deviceId: 'dev-worker', payload: { workerId: worker.id, changes: { contactPhone: '+61400000000' } } });
execute(s, { type: 'GrantCapability', actor: { workerId: admin.id }, deviceId: 'dev-admin', payload: { workerId: worker.id, capability: 'supervisor' } });
execute(s, { type: 'RevokeCapability', actor: { workerId: admin.id }, deviceId: 'dev-admin', payload: { workerId: worker.id, capability: 'supervisor', reason: 'no longer needed' } });
execute(s, { type: 'SuspendWorker', actor: { workerId: admin.id }, deviceId: 'dev-admin', payload: { workerId: worker.id, reason: 'investigation' } });
execute(s, { type: 'ResumeWorker', actor: { workerId: admin.id }, deviceId: 'dev-admin', payload: { workerId: worker.id } });
execute(s, {
  type: 'CreateRequirement', actor: { workerId: admin.id }, deviceId: 'dev-admin',
  payload: { scope: 'company', companyId: company.id, reqType: 'acknowledgement', title: 'Policy', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } },
});
const req = [...s.entities.values()].find((e) => e.type === 'Requirement');
execute(s, { type: 'PresentAcknowledgement', actor: { workerId: worker.id }, deviceId: 'dev-worker', payload: { workerId: worker.id, requirementId: req.id } });
execute(s, { type: 'AcknowledgeRequirement', actor: { workerId: worker.id }, deviceId: 'dev-worker', payload: { workerId: worker.id, requirementId: req.id, signature: 'sig' } });
execute(s, { type: 'IssueQr', actor: { workerId: admin.id }, deviceId: 'dev-admin', payload: { workerId: worker.id } });
execute(s, { type: 'RotateQr', actor: { workerId: admin.id }, deviceId: 'dev-admin', payload: { workerId: worker.id } });
execute(s, { type: 'RevokeQr', actor: { workerId: admin.id }, deviceId: 'dev-admin', payload: { workerId: worker.id, reason: 'lost card' } });

// A rejected command — suspension without the mandatory reason (§6.3.6) —
// to verify CommandOutcome audit for rejections (AC-ARCH-C9).
execute(s, { type: 'SuspendWorker', actor: { workerId: admin.id }, deviceId: 'dev-admin', payload: { workerId: worker.id } });

// §7.8 minimum common audit fields on every F record:
// event identity, command identity, actor, device identity, device timestamp,
// server sync timestamp (reason where required — checked separately below).
if (s.facts.length === 0) failures.push('no F records produced');
for (const f of s.facts) {
  if (!f.id) failures.push(`F record missing event identity (type ${f.type})`);
  if (!f.commandId) failures.push(`F record ${f.id} (${f.type}) missing command identity`);
  if (!f.actor) failures.push(`F record ${f.id} (${f.type}) missing actor`);
  if (!f.deviceId) failures.push(`F record ${f.id} (${f.type}) missing device identity`);
  if (f.deviceTimestamp == null) failures.push(`F record ${f.id} (${f.type}) missing device timestamp`);
  if (f.serverTimestamp == null) failures.push(`F record ${f.id} (${f.type}) missing server sync timestamp`);
}

// Actor / subject distinction explicit (AC-ARCH-D3): admin-acted facts about
// the worker carry both, distinctly.
const grant = s.facts.find((f) => f.type === 'CapabilityGrant' && f.payload.capability === 'supervisor' && f.payload.granted === true);
if (!grant) failures.push('CapabilityGrant fact missing');
else {
  if (!grant.subject || grant.subject !== worker.id) failures.push('CapabilityGrant subject not the target Worker');
  if (!grant.actor || grant.actor.id !== admin.id) failures.push('CapabilityGrant actor not the admin Worker');
  if (grant.subject === grant.actor?.id) failures.push('actor/subject collapsed (AC-ARCH-D3)');
}

// Reason mandatory (§6.3.6): suspension, offboarding, capability revocation,
// QR revocation.
const reasonChecks = [
  ...s.facts.filter((f) => f.type === 'WorkerLifecycleEvent' && (f.payload.event === 'suspended' || f.payload.event === 'offboarded')),
  ...s.facts.filter((f) => f.type === 'CapabilityGrant' && f.payload.granted === false),
  ...s.facts.filter((f) => f.type === 'WorkerQrIdentityEvent' && f.payload.event === 'revoked'),
];
if (reasonChecks.length === 0) failures.push('no reason-mandatory facts produced by the sequence');
for (const f of reasonChecks) {
  if (!f.reason || typeof f.reason !== 'string' || f.reason.length === 0) {
    failures.push(`reason-mandatory fact ${f.id} (${f.type}/${f.payload.event ?? f.payload.capability}) lacks reason`);
  }
}

// CommandOutcome records exist for accepted AND rejected commands (C9).
const outcomes = s.facts.filter((f) => f.type === 'CommandOutcome');
if (outcomes.length === 0) failures.push('no CommandOutcome records');
if (!outcomes.some((f) => f.payload.outcome === 'server accepted')) failures.push('no accepted CommandOutcome recorded');
if (!outcomes.some((f) => f.payload.outcome === 'server rejected')) failures.push('rejected command produced no CommandOutcome (AC-ARCH-C9)');
const rejectedOutcome = outcomes.find((f) => f.payload.outcome === 'server rejected');
if (rejectedOutcome && !rejectedOutcome.reason) failures.push('rejected CommandOutcome lacks reason (§6.10.6)');

// CommandReceipt exists for processed commands (idempotency substrate, §7.10).
if (!s.facts.some((f) => f.type === 'CommandReceipt')) failures.push('no CommandReceipt records');

// M1 F vocabulary closure: every F record is an M1-authorised §7 type.
const M1_F = new Set(['WorkerProfileChange', 'WorkerLifecycleEvent', 'Invitation', 'CapabilityGrant', 'DocumentRevision', 'InductionCompletion', 'Acknowledgement', 'WorkerQrIdentityEvent', 'CommandReceipt', 'CommandOutcome']);
for (const f of s.facts) {
  if (!M1_F.has(f.type)) failures.push(`F record of non-M1 type: ${f.type}`);
}

report('M1-AC-13', failures);
