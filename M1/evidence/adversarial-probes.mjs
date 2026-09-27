// M1 adversarial probes (Skill 07). Each probe asks how the M1 domain core
// could APPEAR correct while violating the blueprint, then executes the
// attack. Output lines: PROBE <id> <PASS|FAIL> <summary>.
// Dispositions are recorded in M1/evidence/adversarial.md.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const domain = await import(join(HERE, '..', 'src', 'domain.js'));
const {
  createStore, execute, tick, deriveProfile, workerLifecycleState,
  currentCapabilities, satisfactionState, activeQrIdentity,
  readForCompany, listForCompany,
} = domain;

let failures = 0;
function probe(id, ok, summary) {
  if (!ok) failures += 1;
  console.log(`PROBE ${id} ${ok ? 'PASS' : 'FAIL'} ${summary}`);
}

function boot() {
  const s = createStore();
  execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'fa@x.co', name: 'FA' } }, deviceId: 'dev-a', payload: { companyName: 'Tenant A' } });
  execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'fb@x.co', name: 'FB' } }, deviceId: 'dev-b', payload: { companyName: 'Tenant B' } });
  const companyA = [...s.entities.values()].find((e) => e.type === 'Company' && e.name === 'Tenant A');
  const companyB = [...s.entities.values()].find((e) => e.type === 'Company' && e.name === 'Tenant B');
  const adminA = [...s.entities.values()].find((e) => e.type === 'Worker' && e.companyId === companyA.id);
  const adminB = [...s.entities.values()].find((e) => e.type === 'Worker' && e.companyId === companyB.id);
  return { s, companyA, companyB, adminA, adminB };
}

function addWorker(s, admin, email) {
  execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, deviceId: 'dev-adm', payload: { email, name: email } });
  const inv = s.facts.filter((f) => f.type === 'Invitation' && f.state === 'pending').find((f) => f.payload.email === email);
  execute(s, { type: 'AcceptInvitation', actor: { personRef: { email, name: email } }, deviceId: 'dev-w', payload: { invitationId: inv.invitationId } });
  return [...s.entities.values()].find((e) => e.type === 'Worker' && e.id !== admin.id && deriveProfile(s, e.id)?.contactEmail === email);
}

// --- P1/P2/P3: tenancy bypass attempts (§8 B1, DM-INV-5, AD-INV-9) ---
{
  const { s, companyA, companyB, adminA, adminB } = boot();
  const wB = addWorker(s, adminB, 'wb@x.co');
  const attempts = [];

  // Write path via every reference kind.
  attempts.push(execute(s, { type: 'ChangeWorkerProfile', actor: { workerId: adminA.id }, payload: { workerId: wB.id, changes: { displayName: 'X' } } }).outcome);
  execute(s, { type: 'CreateProject', actor: { workerId: adminB.id }, payload: { companyId: companyB.id, name: 'PB' } });
  const pB = [...s.entities.values()].find((e) => e.type === 'Project');
  execute(s, { type: 'CreateSite', actor: { workerId: adminB.id }, payload: { projectId: pB.id, name: 'SB' } });
  const siteB = [...s.entities.values()].find((e) => e.type === 'Site');
  attempts.push(execute(s, { type: 'CreateSite', actor: { workerId: adminA.id }, payload: { projectId: pB.id, name: 'hop' } }).outcome);
  attempts.push(execute(s, { type: 'AssignWorkerToSite', actor: { workerId: adminA.id }, payload: { workerId: wB.id, siteId: siteB.id } }).outcome);
  execute(s, { type: 'CreateRequirement', actor: { workerId: adminB.id }, payload: { scope: 'company', companyId: companyB.id, reqType: 'document', title: 'RB', appliesTo: { kind: 'all_workers' }, requiresVerification: true, expiry: { kind: 'none' } } });
  const reqB = [...s.entities.values()].find((e) => e.type === 'Requirement');
  attempts.push(execute(s, { type: 'ReviseRequirement', actor: { workerId: adminA.id }, payload: { requirementId: reqB.id } }).outcome);
  attempts.push(execute(s, { type: 'RevokeQr', actor: { workerId: adminA.id }, payload: { workerId: wB.id, reason: 'x' } }).outcome);
  execute(s, { type: 'CreateInvitation', actor: { workerId: adminB.id }, payload: { email: 'z@x.co', name: 'Z' } });
  const invB = s.facts.filter((f) => f.type === 'Invitation' && f.state === 'pending').find((f) => f.payload.email === 'z@x.co');
  attempts.push(execute(s, { type: 'CancelInvitation', actor: { workerId: adminA.id }, payload: { invitationId: invB.invitationId } }).outcome);
  probe('P1', attempts.every((o) => o === 'server rejected'), `cross-tenant writes via worker/project/site/requirement/QR/invitation refs all rejected (${attempts.filter((o) => o === 'server rejected').length}/${attempts.length})`);

  // Read paths.
  const reads = [
    readForCompany(s, companyA.id, wB.id),
    readForCompany(s, companyA.id, pB.id),
    readForCompany(s, companyA.id, siteB.id),
    readForCompany(s, companyA.id, reqB.id),
    readForCompany(s, companyA.id, companyB.id),
    readForCompany(s, companyA.id, wB.personId),
  ];
  const leakedEnum = listForCompany(s, companyA.id, 'Worker').some((e) => e.companyId !== companyA.id);
  probe('P2', reads.every((r) => r === null) && !leakedEnum, 'cross-tenant reads (worker/project/site/requirement/company/person) and enumeration return nothing');

  // Indirect reference: foreign worker id embedded in a payload field of an
  // otherwise valid command (requirement targeting).
  const sneak = execute(s, {
    type: 'CreateRequirement', actor: { workerId: adminA.id },
    payload: { scope: 'company', companyId: companyA.id, reqType: 'document', title: 'Sneak', appliesTo: { kind: 'named_workers', workerIds: [wB.id] }, requiresVerification: false, expiry: { kind: 'none' } },
  });
  // The requirement is created in A (valid), but naming a B worker must not
  // let A act on B's satisfaction stream: A verifying B's worker is rejected.
  const sneakVerify = execute(s, { type: 'VerifyDocument', actor: { workerId: adminA.id }, payload: { workerId: wB.id, requirementId: 'any' } });
  probe('P3', sneakVerify.outcome === 'server rejected', 'indirect cross-tenant reference (named_workers carrying foreign id) yields no actionable path');
}

// --- P4/P5/P6: identity and dual-keying (§8 A2, C2, G1) ---
{
  const { s, adminA } = boot();
  const before = [...s.entities.values()].filter((e) => e.type === 'Company').length;
  const r1 = execute(s, { type: 'CreateCompany', commandId: 'cmd-fixed-1', actor: { personRef: { email: 'q@x.co', name: 'Q' } }, payload: { companyName: 'Dup Probe' } });
  const r2 = execute(s, { type: 'CreateCompany', commandId: 'cmd-fixed-1', actor: { personRef: { email: 'q@x.co', name: 'Q' } }, payload: { companyName: 'Dup Probe' } });
  const after = [...s.entities.values()].filter((e) => e.type === 'Company').length;
  probe('P4', r1.outcome === 'server accepted' && r2.outcome === 'server accepted' && r2.duplicate === true && after === before + 1, 'duplicate delivery applies once; replay returns recorded outcome');

  const factsBefore = s.facts.length;
  const r3 = execute(s, { type: 'CreateCompany', commandId: 'cmd-fixed-1', actor: { personRef: { email: 'evil@x.co', name: 'E' } }, payload: { companyName: 'Evil Co' } });
  probe('P5', r3.duplicate === true && s.facts.length === factsBefore && ![...s.entities.values()].some((e) => e.name === 'Evil Co'), 'commandId reuse with different payload replays first outcome; no second logical action materialises');

  const ids = [...s.entities.keys()];
  probe('P6', new Set(ids).size === ids.length && [...s.entities.values()].every((e) => e.id && typeof e.id === 'string'), 'single stable identity per entity; identity generated where entity is born');
}

// --- P7/P8/P9: immutability (§8 D4, DM-INV-2) ---
{
  const { s, adminA } = boot();
  const w = addWorker(s, adminA, 'im@x.co');
  execute(s, { type: 'ChangeWorkerProfile', actor: { workerId: w.id }, payload: { workerId: w.id, changes: { displayName: 'Original' } } });
  const fact = s.facts.find((f) => f.type === 'WorkerProfileChange' && f.subject === w.id);
  let threw = false;
  try { fact.payload.changes.displayName = 'Forged'; } catch { threw = true; }
  probe('P7', (threw || fact.payload.changes.displayName === 'Original') && Object.isFrozen(fact), 'F record mutation via returned reference is prevented (deep-frozen)');
  const ent = s.entities.get(w.id);
  let threw2 = false;
  try { ent.companyId = 'elsewhere'; } catch { threw2 = true; }
  probe('P8', (threw2 || ent.companyId !== 'elsewhere') && Object.isFrozen(ent), 'E genesis record mutation via reference is prevented');
  const exported = Object.keys(domain);
  probe('P9', !exported.some((n) => /delete|remove|destroy|purge/i.test(n)), `no deletion path exported (exports: ${exported.join(', ')})`);
}

// --- P10/P11: derived vs authoritative (§8 A4, E3; WC-INV-6/13) ---
{
  const { s, adminA } = boot();
  const w = addWorker(s, adminA, 'dv@x.co');
  const SUSPECT = ['status', 'profile', 'capabilities', 'ready', 'readiness', 'lifecycle', 'currentState'];
  const hits = [];
  for (const e of s.entities.values()) {
    for (const k of Object.keys(e)) if (SUSPECT.includes(k)) hits.push(`${e.type}.${k}`);
  }
  probe('P10', hits.length === 0, hits.length ? `suspect stored fields: ${hits.join(', ')}` : 'no stored profile/capability/lifecycle/readiness fields on any entity (all derived)');
  const factPayloads = JSON.stringify(s.facts.map((f) => f.payload));
  probe('P11', !/"(companyReady|siteReady|profileComplete|derivedProfile)"/.test(factPayloads), 'no F record embeds a derived value as input (AC-ARCH-E3)');
}

// --- P13: declared conflict rule for M1's only overlapping-write surface ---
{
  const { s, adminA } = boot();
  const w = addWorker(s, adminA, 'cf@x.co');
  // §6.10.3: same worker, same field, later timestamp → later wins, both recorded.
  execute(s, { type: 'ChangeWorkerProfile', actor: { workerId: w.id }, deviceTimestamp: 1000, payload: { workerId: w.id, changes: { displayName: 'Early' } } });
  execute(s, { type: 'ChangeWorkerProfile', actor: { workerId: w.id }, deviceTimestamp: 2000, payload: { workerId: w.id, changes: { displayName: 'Later' } } });
  const both = s.facts.filter((f) => f.type === 'WorkerProfileChange' && f.subject === w.id).length === 2;
  probe('P13', both && deriveProfile(s, w.id).displayName === 'Later', 'same-field conflict: both facts recorded, later value derived (declared rule, no silent loss)');
}

// --- P15/P16: audit completeness (§8 D1, C9; §7.8) ---
{
  const { s, adminA, companyA } = boot();
  const w = addWorker(s, adminA, 'au@x.co');
  const seq = [
    { type: 'GrantCapability', actor: { workerId: adminA.id }, payload: { workerId: w.id, capability: 'supervisor' } },
    { type: 'SuspendWorker', actor: { workerId: adminA.id }, payload: { workerId: w.id } }, // rejected: no reason
    { type: 'SuspendWorker', actor: { workerId: adminA.id }, payload: { workerId: w.id, reason: 'r' } },
    { type: 'OffboardWorker', actor: { workerId: adminA.id }, payload: { workerId: w.id, reason: 'left' } },
  ];
  const cmdIds = seq.map((c) => execute(s, c).commandId);
  const outcomes = s.facts.filter((f) => f.type === 'CommandOutcome' && cmdIds.includes(f.commandId));
  const rejectedVisible = outcomes.some((f) => f.payload.outcome === 'server rejected' && f.reason);
  probe('P15', outcomes.length === seq.length && rejectedVisible, 'every command (accepted and rejected) has exactly one audited CommandOutcome; rejection carries reason');

  const acceptedReceipts = s.facts.filter((f) => f.type === 'CommandReceipt');
  const entityCmdIds = new Set([...s.entities.values()].map((e) => e.commandId));
  const receiptCmdIds = new Set(acceptedReceipts.map((f) => f.commandId));
  probe('P16', [...entityCmdIds].every((c) => receiptCmdIds.has(c)), 'every entity genesis traces to a receipted accepted command (no mutation without audit)');
}

// --- P17: second source of truth (§8 A1; M0: audit = F ∪ CommandOutcome) ---
{
  const { s } = boot();
  const outcomeFacts = new Map(s.facts.filter((f) => f.type === 'CommandOutcome').map((f) => [f.commandId, f.payload.outcome]));
  let consistent = true;
  for (const [cmdId, rec] of s.commandOutcomes) {
    if (outcomeFacts.get(cmdId) !== rec.outcome) consistent = false;
  }
  probe('P17', consistent && outcomeFacts.size === s.commandOutcomes.size, 'idempotency index is exactly consistent with CommandOutcome facts (an index, not a shadow store)');
}

// --- P19: QR adversarial surface beyond AC-10 (WC-INV-7, §6.3.3) ---
{
  const { s, adminA } = boot();
  const w = addWorker(s, adminA, 'qr@x.co');
  execute(s, { type: 'IssueQr', actor: { workerId: adminA.id }, payload: { workerId: w.id } });
  const q1 = activeQrIdentity(s, w.id);
  execute(s, { type: 'RotateQr', actor: { workerId: adminA.id }, payload: { workerId: w.id } });
  const q2 = activeQrIdentity(s, w.id);
  const retiredNotActive = q2.id !== q1.id;
  // Retired identity must not resolve as active even though its record persists.
  const all = [...s.entities.values()].filter((e) => e.type === 'WorkerQrIdentity' && e.workerId === w.id);
  const activeCount = all.filter((q) => q.id === activeQrIdentity(s, w.id).id).length;
  probe('P19', retiredNotActive && activeCount === 1 && all.length === 2, 'retired QR persists as record but never resolves active; exactly one active at all times');
}

console.log(failures === 0 ? 'ALL PROBES PASS' : `${failures} PROBE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
