// M1-AC-11 [strict] — Offline read/cache and freshness: M1's offline-capable
// read operations expose cached own profile, applicable readiness,
// assignments, and other M1 read models explicitly permitted by §6.3 and
// §6.10. Cached data exposes the M0-defined freshness state
// (locally-committed/unconfirmed, server-confirmed, stale, or unknown) where
// applicable. No connectivity-required M1 mutation is declared
// offline-capable merely to satisfy this criterion. The blueprint-classified
// offline-mutating M1 command (acknowledgement with signature capture,
// §6.10.2) satisfies durable intent (§6.10.3, OS-INV-3).
// Anchor: OS-INV-1..12, AC-ARCH-C1, C2, E2, F1, F3; M0 offline-reconciliation
// model §2–§4.
import { requireCore, report, SRC_DIR } from './lib.mjs';

const absent = requireCore();
if (absent) report('M1-AC-11', absent);

const {
  createStore, execute, executeOffline, transmitQueue,
  createCache, cacheRead, OFFLINE_CAPABLE_COMMANDS, deriveProfile,
} = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const s = createStore();
execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'founder@example.com', name: 'F' } }, deviceId: 'dev-admin', payload: { companyName: 'Offline Co' } });
const company = [...s.entities.values()].find((e) => e.type === 'Company');
const admin = [...s.entities.values()].find((e) => e.type === 'Worker');
execute(s, { type: 'CreateProject', actor: { workerId: admin.id }, payload: { companyId: company.id, name: 'P1' } });
const project = [...s.entities.values()].find((e) => e.type === 'Project');
execute(s, { type: 'CreateSite', actor: { workerId: admin.id }, payload: { projectId: project.id, name: 'S1' } });
const site = [...s.entities.values()].find((e) => e.type === 'Site');
execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'w@example.com', name: 'W' } });
const inv = s.facts.find((f) => f.type === 'Invitation' && f.state === 'pending');
execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'w@example.com', name: 'W' } }, deviceId: 'dev-worker', payload: { invitationId: inv.invitationId } });
const worker = [...s.entities.values()].find((e) => e.type === 'Worker' && e.id !== admin.id);
execute(s, { type: 'AssignWorkerToSite', actor: { workerId: admin.id }, payload: { workerId: worker.id, siteId: site.id } });

// Company-scope acknowledgement requirement; worker presents online.
execute(s, {
  type: 'CreateRequirement', actor: { workerId: admin.id },
  payload: { scope: 'company', companyId: company.id, reqType: 'acknowledgement', title: 'Safety Policy', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } },
});
const ackReq = [...s.entities.values()].find((e) => e.type === 'Requirement' && e.title === 'Safety Policy');
execute(s, { type: 'PresentAcknowledgement', actor: { workerId: worker.id }, deviceId: 'dev-worker', payload: { workerId: worker.id, requirementId: ackReq.id } });

// --- Classification honesty (AC-11 clause: no mutation declared
// offline-capable merely to satisfy this criterion) ---
if (!OFFLINE_CAPABLE_COMMANDS || !(OFFLINE_CAPABLE_COMMANDS instanceof Set)) {
  failures.push('offline classification not exported as a Set');
} else {
  if (!OFFLINE_CAPABLE_COMMANDS.has('AcknowledgeRequirement')) {
    failures.push('AcknowledgeRequirement (§6.10.2 offline-mutating) not classified offline-capable');
  }
  const CONNECTIVITY_REQUIRED = ['CreateCompany', 'CreateInvitation', 'AcceptInvitation', 'UploadDocument', 'VerifyDocument', 'GrantCapability', 'SuspendWorker', 'OffboardWorker', 'IssueQr', 'RotateQr', 'RevokeQr', 'CreateRequirement', 'CreateProject', 'CreateSite', 'AssignWorkerToSite'];
  for (const t of CONNECTIVITY_REQUIRED) {
    if (OFFLINE_CAPABLE_COMMANDS.has(t)) failures.push(`${t} declared offline-capable contrary to §6.10.2/§6.11.3`);
  }
}

// --- Cached reads with freshness (§6.10.2/M0 §3: own profile, readiness,
// assigned Sites; §6.11.2 offline-readable admin profile) ---
const cache = createCache(s, worker.id);
const r1 = cacheRead(s, cache);
if (!r1.profile || r1.profile.value?.displayName !== 'W') failures.push('cached own profile not exposed');
if (r1.profile?.freshness !== 'server-confirmed') failures.push(`profile freshness: ${r1.profile?.freshness} (expected server-confirmed)`);
if (!r1.readiness || typeof r1.readiness.value?.companyReady !== 'boolean') failures.push('cached readiness not exposed');
if (r1.readiness?.freshness !== 'server-confirmed') failures.push(`readiness freshness: ${r1.readiness?.freshness}`);
if (!Array.isArray(r1.assignments?.value) || r1.assignments.value.length !== 1) failures.push('cached assignments not exposed');
if (r1.assignments?.freshness !== 'server-confirmed') failures.push(`assignments freshness: ${r1.assignments?.freshness}`);

// Unknown: a worker never snapshotted reads as unknown (E2).
const rUnknown = cacheRead(s, createCache(s, 'nonexistent-worker'));
if (rUnknown.profile?.freshness !== 'unknown') failures.push(`uncached read freshness: ${rUnknown.profile?.freshness} (expected unknown)`);

// Stale: server-side change after snapshot is disclosed, not presented as current (E2, §7.7 rule 3).
execute(s, { type: 'ChangeWorkerProfile', actor: { workerId: admin.id }, payload: { workerId: worker.id, changes: { contactPhone: '+61411111111' } } });
const r2 = cacheRead(s, cache);
if (r2.profile?.freshness !== 'stale') failures.push(`post-change cached profile freshness: ${r2.profile?.freshness} (expected stale)`);
if (r2.profile?.value?.contactPhone === '+61411111111') failures.push('stale cache silently presented new data as current');

// --- Durable intent for the blueprint-classified offline mutation ---
// Worker goes offline and acknowledges (§6.10.2). Locally committed, queued,
// survives, transmitted exactly once.
const offline = executeOffline(s, { type: 'AcknowledgeRequirement', commandId: 'cmd-offline-ack-1', actor: { workerId: worker.id }, deviceId: 'dev-worker', payload: { workerId: worker.id, requirementId: ackReq.id, signature: 'sig-offline' } });
if (offline.outcome !== 'locally committed') failures.push(`offline ack outcome: ${offline.outcome} (expected locally committed)`);
if (s.facts.some((f) => f.commandId === 'cmd-offline-ack-1' && f.type === 'CommandReceipt')) failures.push('receipt written before transmission (no server contact offline)');

// Durable local fact exists and is exposed as locally-committed, not
// server-confirmed (E2: never presented as confirmed).
const localFact = s.facts.find((f) => f.commandId === 'cmd-offline-ack-1' && f.type === 'Acknowledgement' && f.layer === 'local');
if (!localFact) failures.push('no durable local Acknowledgement fact (OS-INV-3)');
const cacheAfterOffline = createCache(s, worker.id);
const r3 = cacheRead(s, cacheAfterOffline);
if (r3.readiness?.freshness !== 'locally-committed') failures.push(`readiness freshness with unconfirmed local fact: ${r3.readiness?.freshness} (expected locally-committed)`);

// Duplicate offline submission of the same command id is idempotent (C2/G1).
const factsBefore = s.facts.length;
const dup = executeOffline(s, { type: 'AcknowledgeRequirement', commandId: 'cmd-offline-ack-1', actor: { workerId: worker.id }, deviceId: 'dev-worker', payload: { workerId: worker.id, requirementId: ackReq.id, signature: 'sig-offline' } });
if (dup.outcome !== 'locally committed' || dup.duplicate !== true) failures.push('duplicate offline submission not handled idempotently');
if (s.facts.length !== factsBefore) failures.push('duplicate offline submission wrote a second fact (OS-INV-4)');

// Connectivity-required command attempted offline: locally rejected, terminal,
// NOT queued (M0 vocabulary; F1: fails locally with specific reason).
const qBefore = s.queue?.length ?? 0;
const offlineUpload = executeOffline(s, { type: 'UploadDocument', actor: { workerId: worker.id }, payload: { workerId: worker.id, requirementId: ackReq.id } });
if (offlineUpload.outcome !== 'locally rejected') failures.push(`offline UploadDocument: ${offlineUpload.outcome} (expected locally rejected)`);
if (!offlineUpload.reason) failures.push('local rejection lacks specific reason (F1)');
if ((s.queue?.length ?? 0) !== qBefore) failures.push('locally rejected command entered the queue (M0: terminal, not queued)');

// Transmission: exactly-once server application, receipt + outcome, queue retired.
const tx = transmitQueue(s);
const entry = tx.results.find((r) => r.commandId === 'cmd-offline-ack-1');
if (!entry || entry.outcome !== 'server accepted') failures.push(`transmission outcome: ${entry?.outcome} (expected server accepted)`);
if (!s.facts.some((f) => f.commandId === 'cmd-offline-ack-1' && f.type === 'CommandReceipt')) failures.push('no CommandReceipt after transmission');
if (s.queue.some((q) => q.commandId === 'cmd-offline-ack-1' && q.state === 'queued')) failures.push('queue entry not retired after acceptance');

// Reconnect freshness: the slice is server-confirmed after receipt.
const r4 = cacheRead(s, createCache(s, worker.id));
if (r4.readiness?.freshness !== 'server-confirmed') failures.push(`post-sync readiness freshness: ${r4.readiness?.freshness} (expected server-confirmed)`);

// Re-transmission is safe (idempotent): no new facts.
const factsAfterTx = s.facts.length;
const tx2 = transmitQueue(s);
if (s.facts.length !== factsAfterTx || tx2.results.length !== 0) failures.push('re-transmission not idempotent (G1)');

// Rejection at sync (§6.10.3: readiness-gate violation discovered at sync →
// rejected, user-notified, preserved as rejected record): second worker
// acknowledges offline; requirement revised before sync; sync rejects.
execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'w2@example.com', name: 'W2' } });
const inv2 = s.facts.filter((f) => f.type === 'Invitation' && f.state === 'pending').find((f) => f.payload.email === 'w2@example.com');
execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'w2@example.com', name: 'W2' } }, payload: { invitationId: inv2.invitationId } });
const worker2 = [...s.entities.values()].find((e) => e.type === 'Worker' && e.id !== admin.id && e.id !== worker.id);
execute(s, { type: 'PresentAcknowledgement', actor: { workerId: worker2.id }, payload: { workerId: worker2.id, requirementId: ackReq.id } });
executeOffline(s, { type: 'AcknowledgeRequirement', commandId: 'cmd-offline-ack-2', actor: { workerId: worker2.id }, payload: { workerId: worker2.id, requirementId: ackReq.id, signature: 'sig2' } });
execute(s, { type: 'ReviseRequirement', actor: { workerId: admin.id }, payload: { requirementId: ackReq.id } });
const tx3 = transmitQueue(s);
const entry2 = tx3.results.find((r) => r.commandId === 'cmd-offline-ack-2');
if (!entry2 || entry2.outcome !== 'server rejected') failures.push(`superseded offline ack at sync: ${entry2?.outcome} (expected server rejected)`);
if (!s.facts.some((f) => f.commandId === 'cmd-offline-ack-2' && f.type === 'CommandOutcome' && f.payload.outcome === 'server rejected')) {
  failures.push('sync rejection not preserved as auditable record (C9)');
}

report('M1-AC-11', failures);
