// M1-AC-4 [strict] — Invitation lifecycle: pending → accepted (creating a
// Worker) | cancelled | expired. Invitation is a distinct identity from
// Worker.
// Anchor: §6.3.2, WC-INV-2.
import { requireCore, report, SRC_DIR } from './lib.mjs';

const absent = requireCore();
if (absent) report('M1-AC-4', absent);

const { createStore, execute } = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const s = createStore();
execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'founder@example.com', name: 'Founder' } }, payload: { companyName: 'Invite Co' } });
const admin = [...s.entities.values()].find((e) => e.type === 'Worker');

const pendingOf = (email) => s.facts.filter((f) => f.type === 'Invitation' && f.payload.email === email);
const latestState = (invitationId) => {
  const fs = s.facts.filter((f) => f.type === 'Invitation' && f.invitationId === invitationId);
  return fs.length ? fs[fs.length - 1].state : null;
};

// 1. pending → accepted creates a Worker.
const r1 = execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'one@example.com', name: 'One' } });
if (r1.outcome !== 'server accepted') failures.push(`CreateInvitation: ${r1.outcome} ${r1.reason ?? ''}`);
const inv1 = pendingOf('one@example.com').find((f) => f.state === 'pending');
if (!inv1) failures.push('no pending Invitation fact recorded');
const workersBefore = [...s.entities.values()].filter((e) => e.type === 'Worker').length;
const a1 = execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'one@example.com', name: 'One' } }, payload: { invitationId: inv1?.invitationId } });
if (a1.outcome !== 'server accepted') failures.push(`AcceptInvitation: ${a1.outcome} ${a1.reason ?? ''}`);
if (latestState(inv1?.invitationId) !== 'accepted') failures.push(`invitation state after accept: ${latestState(inv1?.invitationId)}`);
const workersAfter = [...s.entities.values()].filter((e) => e.type === 'Worker');
if (workersAfter.length !== workersBefore + 1) failures.push('acceptance did not create exactly one Worker');

// 2. Invitation identity is distinct from Worker identity (WC-INV-2; F vs E).
const newWorker = workersAfter.find((w) => w.id !== admin.id);
if (newWorker && inv1 && newWorker.id === inv1.invitationId) failures.push('Worker identity reuses Invitation identity (DM-INV-11)');
if (newWorker && newWorker.type !== 'Worker') failures.push('acceptance did not produce a Worker E entity');

// 3. Duplicate delivery of the same acceptance command is idempotent (C2/G1).
const factsBefore = s.facts.length;
const dup = execute(s, { type: 'AcceptInvitation', commandId: a1.commandId, actor: { personRef: { email: 'one@example.com', name: 'One' } }, payload: { invitationId: inv1?.invitationId } });
if (dup.outcome !== a1.outcome) failures.push(`duplicate delivery outcome mismatch: ${dup.outcome} vs ${a1.outcome}`);
if (s.facts.length !== factsBefore) failures.push('duplicate delivery produced new facts (idempotency violated, §6.10.3)');
if ([...s.entities.values()].filter((e) => e.type === 'Worker').length !== workersAfter.length) failures.push('duplicate delivery created a second Worker');

// 4. Accepting an already-accepted invitation under a new command is rejected.
const a2 = execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'one@example.com', name: 'One' } }, payload: { invitationId: inv1?.invitationId } });
if (a2.outcome !== 'server rejected') failures.push(`re-accept under new command: ${a2.outcome} (expected server rejected)`);

// 5. pending → cancelled; acceptance after cancellation rejected.
execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'two@example.com', name: 'Two' } });
const inv2 = pendingOf('two@example.com').find((f) => f.state === 'pending');
const c2 = execute(s, { type: 'CancelInvitation', actor: { workerId: admin.id }, payload: { invitationId: inv2?.invitationId } });
if (c2.outcome !== 'server accepted') failures.push(`CancelInvitation: ${c2.outcome} ${c2.reason ?? ''}`);
if (latestState(inv2?.invitationId) !== 'cancelled') failures.push('invitation not cancelled');
const a3 = execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'two@example.com', name: 'Two' } }, payload: { invitationId: inv2?.invitationId } });
if (a3.outcome !== 'server rejected') failures.push(`accept after cancel: ${a3.outcome} (expected server rejected)`);

// 6. pending → expired; acceptance after expiry rejected.
execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'three@example.com', name: 'Three' } });
const inv3 = pendingOf('three@example.com').find((f) => f.state === 'pending');
const e3 = execute(s, { type: 'ExpireInvitation', actor: { workerId: admin.id }, payload: { invitationId: inv3?.invitationId } });
if (e3.outcome !== 'server accepted') failures.push(`ExpireInvitation: ${e3.outcome} ${e3.reason ?? ''}`);
if (latestState(inv3?.invitationId) !== 'expired') failures.push('invitation not expired');
const a4 = execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'three@example.com', name: 'Three' } }, payload: { invitationId: inv3?.invitationId } });
if (a4.outcome !== 'server rejected') failures.push(`accept after expiry: ${a4.outcome} (expected server rejected)`);

// 7. Duplicate pending invitation for the same email in the same Company is rejected (§6.3.5).
execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'dup@example.com', name: 'Dup' } });
const d2 = execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'dup@example.com', name: 'Dup' } });
if (d2.outcome !== 'server rejected') failures.push(`duplicate pending invitation: ${d2.outcome} (expected server rejected)`);

report('M1-AC-4', failures);
