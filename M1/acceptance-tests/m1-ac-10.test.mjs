// M1-AC-10 [strict] — QR identity lifecycle: at most one active
// WorkerQrIdentity per Worker. Rotation atomically creates a new active
// identity and retires the prior. Revocation retires without replacement.
// Anchor: WC-INV-7, §6.3.3.
import { requireCore, report, SRC_DIR } from './lib.mjs';

const absent = requireCore();
if (absent) report('M1-AC-10', absent);

const { createStore, execute, activeQrIdentity } = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const s = createStore();
execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'founder@example.com', name: 'Founder' } }, payload: { companyName: 'QR Co' } });
const admin = [...s.entities.values()].find((e) => e.type === 'Worker');
execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'w@example.com', name: 'W' } });
const inv = s.facts.find((f) => f.type === 'Invitation' && f.state === 'pending');
execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'w@example.com', name: 'W' } }, payload: { invitationId: inv.invitationId } });
const worker = [...s.entities.values()].find((e) => e.type === 'Worker' && e.id !== admin.id);

const qrEvents = () => s.facts.filter((f) => f.type === 'WorkerQrIdentityEvent' && f.subject === worker.id);
const allQrFor = (id) => [...s.entities.values()].filter((e) => e.type === 'WorkerQrIdentity' && e.workerId === id);

// Issue: exactly one active.
let r = execute(s, { type: 'IssueQr', actor: { workerId: admin.id }, payload: { workerId: worker.id } });
if (r.outcome !== 'server accepted') failures.push(`IssueQr: ${r.outcome} ${r.reason ?? ''}`);
const q1 = activeQrIdentity(s, worker.id);
if (!q1) failures.push('no active WorkerQrIdentity after issue');
if (q1 && q1.scope !== 'Company') failures.push('WorkerQrIdentity not Company-scoped (WC-INV-7)');

// Second issue while one active: rejected (at most one active).
r = execute(s, { type: 'IssueQr', actor: { workerId: admin.id }, payload: { workerId: worker.id } });
if (r.outcome !== 'server rejected') failures.push(`second IssueQr: ${r.outcome} (expected server rejected)`);
if (allQrFor(worker.id).length !== 1) failures.push('second issue created an additional QR identity');

// Rotation: atomic create-new + retire-prior; exactly one active afterwards,
// the prior retired, Worker identity unchanged (WC-INV-7).
const priorId = q1?.id;
r = execute(s, { type: 'RotateQr', actor: { workerId: admin.id }, payload: { workerId: worker.id } });
if (r.outcome !== 'server accepted') failures.push(`RotateQr: ${r.outcome} ${r.reason ?? ''}`);
const q2 = activeQrIdentity(s, worker.id);
if (!q2) failures.push('no active QR after rotation');
if (q2 && q2.id === priorId) failures.push('rotation did not create a new identity');
if (q2 && q2.workerId !== worker.id) failures.push('rotation changed the Worker reference');
const all = allQrFor(worker.id);
if (all.length !== 2) failures.push(`expected 2 QR identities (retired + active), found ${all.length}`);
const actives = all.filter((q) => q.id === activeQrIdentity(s, worker.id)?.id);
if (actives.length !== 1) failures.push('at-most-one-active violated after rotation');
if (!qrEvents().some((f) => f.payload.event === 'rotated')) failures.push('no rotation WorkerQrIdentityEvent recorded');

// Rotation atomicity: a failing rotation mutates nothing (G4, §6.3.3 QR atomicity).
const beforeEnt = s.entities.size; const beforeFacts = s.facts.length;
r = execute(s, { type: 'RotateQr', actor: { workerId: admin.id }, payload: { workerId: 'nonexistent-worker' } });
if (r.outcome !== 'server rejected') failures.push(`RotateQr on unknown worker: ${r.outcome} (expected server rejected)`);
if (s.entities.size !== beforeEnt || s.facts.length < beforeFacts) failures.push('failed rotation mutated entity state (atomicity violated)');
// (A CommandOutcome fact for the rejection is permitted and expected; entity count must not change.)

// Revocation: retires without replacement; reason mandatory (§6.3.6).
r = execute(s, { type: 'RevokeQr', actor: { workerId: admin.id }, payload: { workerId: worker.id } });
if (r.outcome !== 'server rejected') failures.push(`RevokeQr without reason: ${r.outcome} (expected server rejected)`);
r = execute(s, { type: 'RevokeQr', actor: { workerId: admin.id }, payload: { workerId: worker.id, reason: 'token compromised' } });
if (r.outcome !== 'server accepted') failures.push(`RevokeQr: ${r.outcome} ${r.reason ?? ''}`);
if (activeQrIdentity(s, worker.id) !== null) failures.push('active QR still present after revocation (revocation must not replace)');
const revokeFact = qrEvents().find((f) => f.payload.event === 'revoked');
if (!revokeFact) failures.push('no revocation WorkerQrIdentityEvent recorded');
else if (!revokeFact.reason) failures.push('revocation fact missing mandatory reason (§6.3.6)');

// Rotation with no active identity: rejected.
r = execute(s, { type: 'RotateQr', actor: { workerId: admin.id }, payload: { workerId: worker.id } });
if (r.outcome !== 'server rejected') failures.push(`RotateQr with no active: ${r.outcome} (expected server rejected)`);

// Offboarding retires the QR (§6.3.3: offboarded Worker has zero active).
// (Re-issue after revocation is not specified by the blueprint and is not
// asserted here; a second worker is used for the offboarding case.)
execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'w2@example.com', name: 'W2' } });
const inv2 = s.facts.filter((f) => f.type === 'Invitation' && f.state === 'pending').find((f) => f.payload.email === 'w2@example.com');
execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'w2@example.com', name: 'W2' } }, payload: { invitationId: inv2.invitationId } });
const worker2 = [...s.entities.values()].find((e) => e.type === 'Worker' && e.id !== admin.id && e.id !== worker.id);
execute(s, { type: 'IssueQr', actor: { workerId: admin.id }, payload: { workerId: worker2.id } });
if (!activeQrIdentity(s, worker2.id)) failures.push('issue for second worker did not establish an active QR');
r = execute(s, { type: 'OffboardWorker', actor: { workerId: admin.id }, payload: { workerId: worker2.id, reason: 'left company' } });
if (r.outcome !== 'server accepted') failures.push(`OffboardWorker: ${r.outcome} ${r.reason ?? ''}`);
if (activeQrIdentity(s, worker2.id) !== null) failures.push('QR still active after offboarding (WC-INV-7)');

report('M1-AC-10', failures);
