// M1 domain core — Identity, Company & Onboarding (M1 Execution Contract §In-scope).
//
// Pure-JS, dependency-free implementation of the M1 slice of the Master
// Blueprint (§4, §6.1, §6.3, §6.11, §7, §8) under the accepted M0
// architecture. This module is a domain core, not an application: it models
// commands, facts, entities, derivations, and tenancy-bounded reads.
//
// Inherited M0 architecture (not re-decided here):
//   - E/F/C/D discipline; E current representation derived from creation fact
//     + immutable facts; no stored authoritative status for derived values.
//   - CommandOutcome six-state vocabulary; this online-path implementation
//     produces 'server accepted' / 'server rejected'. ('locally rejected' /
//     'locally committed' / offline queue belong to the halted AC-11 scope —
//     see M1/evidence/open-items.md AMB-002.)
//   - CommandReceipt-keyed idempotency; duplicate delivery replays the
//     recorded outcome without reapplication.
//   - Company is the tenancy boundary, enforced at storage (companyId on every
//     Company-owned record) and at the application layer (tenant checks on
//     every command and read).
//   - Audit = F ∪ CommandOutcome; every F record carries §7.8 fields.
//
// §8.J decisions taken here are recorded in M1/evidence/state.md.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 30; // §4.6 "configured threshold" — M1 default
const DEFAULT_DEVICE = 'dev-default'; // single-device simulation; see state.md

const REQ_TYPES = new Set(['document', 'induction', 'acknowledgement']); // §4.2, AC-ARCH-I2
const REQ_SCOPES = new Set(['company', 'project', 'site']); // §4.2
const EXPIRY_KINDS = new Set(['none', 'fixed_date', 'duration']); // duration = duration_from_satisfaction
const APPLIES_KINDS = new Set(['all_workers', 'role', 'named_workers']); // §4.2
const CAPABILITIES = new Set(['company_admin', 'supervisor', 'first_aider', 'management_contact']); // §6.3.2/§6.3.9 + §6.11 company_admin
const ASSIGNMENT_STATES = new Set(['assigned', 'active']); // M1 lifecycle boundary

const SATISFACTION_FACT = {
  document: 'DocumentRevision',
  induction: 'InductionCompletion',
  acknowledgement: 'Acknowledgement',
};
const SATISFACTION_DEFAULT = {
  document: 'missing',
  induction: 'not_started',
  acknowledgement: 'required',
};

// Command classification (M0 offline-reconciliation-model §2/§4; §6.10.2).
// In M1's implemented slice all commands are connectivity-required except
// AcknowledgeRequirement, which §6.10.2 classifies offline-mutating; its
// offline path is deferred with the halted AC-11 scope (AMB-002). No M1
// mutation beyond the blueprint's classification is declared offline-capable.
export const OFFLINE_CAPABLE_COMMANDS = new Set(['AcknowledgeRequirement']);

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export function createStore() {
  return {
    clock: 1700000000000, // deterministic start; tick() advances
    seq: 0,
    entities: new Map(), // id -> E genesis record (creation fact + fixed attrs)
    facts: [], // append-only F records (domain facts + CommandReceipt + CommandOutcome)
    commandOutcomes: new Map(), // commandId -> { outcome, reason } idempotency record
    queue: [], // durable local queue (OS-INV-3/F4): offline-capable commands only
  };
}

function nid(store, prefix) {
  store.seq += 1;
  return `${prefix}-${store.seq}`;
}

// DM-INV-2 / AC-ARCH-D4: F records are immutable and append-only; E genesis
// records are creation facts. Records are deep-frozen at creation so no code
// path (including callers holding a reference) can mutate history.
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const k of Object.keys(value)) deepFreeze(value[k]);
    Object.freeze(value);
  }
  return value;
}

function auditFields(store, ctx) {
  return {
    commandId: ctx.commandId,
    actor: ctx.actor,
    deviceId: ctx.deviceId,
    deviceTimestamp: ctx.deviceTimestamp,
    serverTimestamp: ctx.serverTimestamp,
  };
}

function appendFact(store, ctx, fields) {
  const f = deepFreeze({
    id: nid(store, 'fact'),
    ...auditFields(store, ctx),
    ...fields,
  });
  store.facts.push(f);
  return f;
}

function createEntity(store, ctx, fields) {
  const e = deepFreeze({ id: nid(store, 'ent'), ...fields, ...auditFields(store, ctx) });
  store.entities.set(e.id, e);
  return e;
}

function ensureDevice(store, ctx) {
  for (const e of store.entities.values()) {
    if (e.type === 'Device' && e.deviceRef === ctx.deviceId) return e;
  }
  // Device (E, Platform) — minimal representation sufficient to attribute
  // M1 facts (M1 contract: "enough to attribute M1 facts; full device
  // lifecycle is out of scope"). No second identity (§7.15).
  return createEntity(store, ctx, { type: 'Device', scope: 'Platform', deviceRef: ctx.deviceId });
}

// ---------------------------------------------------------------------------
// Derivations (D) — never authoritative, always recomputed from E + F
// ---------------------------------------------------------------------------

function factsOf(store, type, subject) {
  return store.facts.filter((f) => f.type === type && (subject === undefined || f.subject === subject));
}

export function deriveProfile(store, workerId) {
  const w = store.entities.get(workerId);
  if (!w || w.type !== 'Worker') return null;
  // WC-INV-6: creation fact plus WorkerProfileChange events alone.
  const profile = { ...(w.creation?.profile ?? {}) };
  for (const f of factsOf(store, 'WorkerProfileChange', workerId)) {
    Object.assign(profile, f.payload.changes);
  }
  return profile;
}

export function workerLifecycleState(store, workerId) {
  const w = store.entities.get(workerId);
  if (!w || w.type !== 'Worker') return null;
  // WC-INV-13: lifecycle is derived. Creation fact establishes `registered`;
  // WorkerLifecycleEvent facts fold forward.
  let state = 'registered';
  for (const f of factsOf(store, 'WorkerLifecycleEvent', workerId)) {
    const ev = f.payload.event;
    if (ev === 'activated') state = 'active';
    else if (ev === 'suspended') state = 'suspended';
    else if (ev === 'resumed') state = 'active';
    else if (ev === 'offboarded') state = 'offboarded';
  }
  return state;
}

export function currentCapabilities(store, workerId) {
  const caps = new Set();
  for (const f of factsOf(store, 'CapabilityGrant', workerId)) {
    if (f.payload.granted) caps.add(f.payload.capability);
    else caps.delete(f.payload.capability);
  }
  return caps;
}

export function satisfactionState(store, workerId, requirementId, excludeCommandId = null) {
  const req = store.entities.get(requirementId);
  if (!req || req.type !== 'Requirement') return null;
  const factType = SATISFACTION_FACT[req.reqType];
  const facts = store.facts.filter(
    (f) => f.type === factType && f.subject === workerId && f.payload.requirementId === requirementId
      && f.commandId !== excludeCommandId,
  );
  const state = facts.length ? facts[facts.length - 1].state : SATISFACTION_DEFAULT[req.reqType];
  return { state, facts };
}

// The applicable revision of a requirement group is its latest (§4.2/§4.6:
// a new revision supersedes prior satisfaction).
function isLatestRevision(store, req) {
  return [...store.entities.values()]
    .filter((r) => r.type === 'Requirement' && r.groupId === req.groupId)
    .every((r) => r.revision <= req.revision);
}

export function activeQrIdentity(store, workerId) {
  const retired = new Set(
    store.facts
      .filter((f) => f.type === 'WorkerQrIdentityEvent' && ['retired', 'rotated-out', 'revoked'].includes(f.payload.event))
      .map((f) => f.payload.qrId),
  );
  for (const e of store.entities.values()) {
    if (e.type === 'WorkerQrIdentity' && e.workerId === workerId && !retired.has(e.id)) return e;
  }
  return null;
}

function latestInvitationState(store, invitationId) {
  const fs = store.facts.filter((f) => f.type === 'Invitation' && f.invitationId === invitationId);
  return fs.length ? fs[fs.length - 1] : null;
}

function requirementAppliesTo(store, req, workerId) {
  const a = req.appliesTo;
  if (!a || a.kind === 'all_workers') return true;
  if (a.kind === 'named_workers') return Array.isArray(a.workerIds) && a.workerIds.includes(workerId);
  if (a.kind === 'role') return deriveProfile(store, workerId)?.roleLabel === a.role;
  return false;
}

// ---------------------------------------------------------------------------
// Tenancy-bounded reads (DM-INV-5, AC-ARCH-B1, AD-INV-9)
// ---------------------------------------------------------------------------

export function readForCompany(store, companyId, entityId) {
  const e = store.entities.get(entityId);
  if (!e) return null;
  if (e.type === 'Company') return e.id === companyId ? e : null;
  if (e.type === 'Person') {
    // §7.15: a Person is visible only to Companies the Person is a member of.
    const member = [...store.entities.values()].some(
      (w) => w.type === 'Worker' && w.personId === entityId && w.companyId === companyId,
    );
    return member ? e : null;
  }
  if (e.type === 'Device') return null; // Platform-scoped; not company-readable
  // Everything else is tenancy-keyed at storage.
  return e.companyId === companyId ? e : null;
}

export function listForCompany(store, companyId, type) {
  return [...store.entities.values()].filter((e) => e.type === type && e.companyId === companyId);
}

// ---------------------------------------------------------------------------
// Command processing
// ---------------------------------------------------------------------------

function reject(store, ctx, reason) {
  appendFact(store, ctx, {
    type: 'CommandOutcome',
    companyId: ctx.companyId,
    reason,
    payload: { outcome: 'server rejected', commandType: ctx.type },
  });
  const record = { outcome: 'server rejected', reason };
  store.commandOutcomes.set(ctx.commandId, record);
  return { commandId: ctx.commandId, ...record };
}

function accept(store, ctx) {
  appendFact(store, ctx, {
    type: 'CommandReceipt',
    companyId: ctx.companyId,
    payload: { commandType: ctx.type, applied: true },
  });
  appendFact(store, ctx, {
    type: 'CommandOutcome',
    companyId: ctx.companyId,
    payload: { outcome: 'server accepted', commandType: ctx.type },
  });
  const record = { outcome: 'server accepted' };
  store.commandOutcomes.set(ctx.commandId, record);
  return { commandId: ctx.commandId, ...record };
}

function findPersonByEmail(store, email) {
  for (const e of store.entities.values()) {
    if (e.type === 'Person' && e.email === email) return e;
  }
  return null;
}

function activeWorkerFor(store, personId, companyId) {
  for (const w of store.entities.values()) {
    if (w.type === 'Worker' && w.personId === personId && w.companyId === companyId) {
      if (workerLifecycleState(store, w.id) !== 'offboarded') return w;
    }
  }
  return null;
}

function createWorker(store, ctx, { companyId, personId, profile }) {
  const w = createEntity(store, ctx, {
    type: 'Worker',
    scope: 'Company',
    companyId,
    personId,
    creation: { profile }, // WC-INV-6: creation fact; immutable
  });
  // §6.3.3: activation is automatic on registration unless held for review
  // (no hold mechanism in M1 scope).
  appendFact(store, ctx, {
    type: 'WorkerLifecycleEvent',
    subject: w.id,
    companyId,
    payload: { event: 'activated', basis: 'automatic on registration (§6.3.3)' },
  });
  return w;
}

// Command authorisation table. cap: required capability flag(s) (WC-INV-8:
// capabilities are flags; role label is never consulted). self: actor must be
// the target worker. selfOrAdmin: actor is target or holds company_admin.
const COMMAND_AUTH = {
  CreateInvitation: { cap: ['company_admin'] },
  CancelInvitation: { cap: ['company_admin'] },
  ExpireInvitation: { cap: ['company_admin'] },
  CreateProject: { cap: ['company_admin'] },
  CreateSite: { cap: ['company_admin'] },
  CreateRequirement: { cap: ['company_admin'] },
  ReviseRequirement: { cap: ['company_admin'] },
  VerifyDocument: { cap: ['company_admin'] },
  RejectDocument: { cap: ['company_admin'] },
  GrantCapability: { cap: ['company_admin'] },
  RevokeCapability: { cap: ['company_admin'] },
  SuspendWorker: { cap: ['company_admin'] },
  ResumeWorker: { cap: ['company_admin'] },
  OffboardWorker: { cap: ['company_admin'] },
  IssueQr: { cap: ['company_admin'] },
  RotateQr: { cap: ['company_admin'] },
  RevokeQr: { cap: ['company_admin'] },
  AssignWorkerToProject: { cap: ['supervisor', 'company_admin'] }, // §6.3.3
  AssignWorkerToSite: { cap: ['supervisor', 'company_admin'] }, // §6.3.3
  ChangeWorkerProfile: { selfOrAdmin: true },
  UploadDocument: { self: true },
  RenewDocument: { self: true },
  SubmitDocumentForReview: { self: true },
  StartInduction: { self: true },
  CompleteInduction: { self: true },
  PresentAcknowledgement: { self: true },
  AcknowledgeRequirement: { self: true },
};

const KNOWN_COMMANDS = new Set(['CreateCompany', 'AcceptInvitation', ...Object.keys(COMMAND_AUTH)]);

export function execute(store, cmd) {
  const commandId = cmd.commandId ?? nid(store, 'cmd');
  // Idempotency (AC-ARCH-C2/G1, §6.10.3): duplicate delivery replays the
  // recorded outcome without reapplication or new records.
  if (store.commandOutcomes.has(commandId)) {
    return { commandId, ...store.commandOutcomes.get(commandId), duplicate: true };
  }

  const ctx = {
    type: cmd.type,
    commandId,
    deviceId: cmd.deviceId ?? DEFAULT_DEVICE,
    deviceTimestamp: cmd.deviceTimestamp ?? store.clock,
    serverTimestamp: store.clock,
    actor: null,
    companyId: undefined,
  };

  if (!KNOWN_COMMANDS.has(cmd.type)) {
    ctx.actor = { kind: 'unknown' };
    return reject(store, ctx, `unknown command type: ${cmd.type}`);
  }

  // --- actor resolution ---
  let actorWorker = null;
  if (cmd.actor?.system) {
    ctx.actor = { kind: 'system' };
  } else if (cmd.actor?.personRef?.email) {
    const p = findPersonByEmail(store, cmd.actor.personRef.email);
    ctx.actor = { kind: 'person', id: p?.id ?? null, email: cmd.actor.personRef.email };
  } else if (cmd.actor?.workerId) {
    actorWorker = store.entities.get(cmd.actor.workerId);
    if (!actorWorker || actorWorker.type !== 'Worker') {
      ctx.actor = { kind: 'worker', id: cmd.actor.workerId };
      return reject(store, ctx, 'actor worker not found');
    }
    ctx.actor = { kind: 'worker', id: actorWorker.id };
    ctx.companyId = actorWorker.companyId;
    // §6.3.3: a suspended Worker cannot initiate new Worker actions;
    // offboarded is terminal.
    const lc = workerLifecycleState(store, actorWorker.id);
    if (lc === 'suspended') return reject(store, ctx, 'actor worker is suspended');
    if (lc === 'offboarded') return reject(store, ctx, 'actor worker is offboarded');
  } else {
    ctx.actor = { kind: 'unknown' };
    return reject(store, ctx, 'command actor not resolvable');
  }

  // --- authorisation (company-scoped commands) ---
  const auth = COMMAND_AUTH[cmd.type];
  if (auth) {
    if (!actorWorker) return reject(store, ctx, 'command requires a Worker actor');
    if (auth.self && cmd.payload?.workerId !== actorWorker.id) {
      return reject(store, ctx, 'command must be performed by the subject worker');
    }
    if (auth.selfOrAdmin) {
      const isSelf = cmd.payload?.workerId === actorWorker.id;
      if (!isSelf && !currentCapabilities(store, actorWorker.id).has('company_admin')) {
        return reject(store, ctx, 'requires company_admin capability or self');
      }
    }
    if (auth.cap) {
      const caps = currentCapabilities(store, actorWorker.id);
      if (!auth.cap.some((c) => caps.has(c))) {
        return reject(store, ctx, `requires capability: ${auth.cap.join(' | ')}`);
      }
    }
  }

  // --- dispatch ---
  const err = HANDLERS[cmd.type](store, ctx, cmd.payload ?? {}, actorWorker);
  if (err) return reject(store, ctx, err);

  // Device attribution materialises only for accepted commands (AC-ARCH-D5).
  ensureDevice(store, ctx);
  return accept(store, ctx);
}

// Tenant check: entity must exist and belong to the actor's Company.
function tenantEntity(store, ctx, id, type) {
  const e = store.entities.get(id);
  if (!e || (type && e.type !== type)) return `${type ?? 'entity'} not found: ${id}`;
  if (ctx.companyId && e.companyId && e.companyId !== ctx.companyId) {
    return 'cross-tenant reference rejected (DM-INV-5)';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Command handlers — validate fully, then apply atomically (AC-ARCH-G4/C3).
// Each returns null on success or a rejection reason string.
// ---------------------------------------------------------------------------

const HANDLERS = {
  // §6.11.3/§6.11.4, §6.3.2: Company creation establishes Company E, resolves
  // or creates the Person (Platform, WC-INV-1), creates the Worker membership
  // (WC-INV-2) and the initial company_admin CapabilityGrant — atomically.
  CreateCompany(store, ctx, payload) {
    if (typeof payload.companyName !== 'string' || payload.companyName.length === 0) {
      return 'companyName required';
    }
    let person = findPersonByEmail(store, ctx.actor.email);
    if (!person) {
      person = createEntity(store, ctx, {
        type: 'Person',
        scope: 'Platform',
        email: ctx.actor.email,
        name: cmd_name(ctx, payload),
      });
    }
    ctx.actor = { kind: 'person', id: person.id, email: person.email };
    const company = createEntity(store, ctx, { type: 'Company', scope: 'Platform', name: payload.companyName });
    ctx.companyId = company.id;
    const worker = createWorker(store, ctx, {
      companyId: company.id,
      personId: person.id,
      profile: { displayName: person.name, contactEmail: person.email },
    });
    appendFact(store, ctx, {
      type: 'CapabilityGrant',
      subject: worker.id,
      companyId: company.id,
      payload: { capability: 'company_admin', granted: true, basis: 'founder (§6.11.3)' },
    });
    return null;
  },

  CreateInvitation(store, ctx, payload) {
    if (typeof payload.email !== 'string' || payload.email.length === 0) return 'invitation email required';
    // §6.3.5: duplicate pending invitation rejected.
    const dup = store.facts.some(
      (f) => f.type === 'Invitation' && f.companyId === ctx.companyId
        && f.payload.email === payload.email
        && latestInvitationState(store, f.invitationId)?.state === 'pending',
    );
    if (dup) return 'duplicate pending invitation for email';
    const existing = findPersonByEmail(store, payload.email);
    const invitationId = nid(store, 'inv');
    appendFact(store, ctx, {
      type: 'Invitation',
      invitationId,
      state: 'pending',
      companyId: ctx.companyId,
      payload: { email: payload.email, name: payload.name, personId: existing?.id ?? null },
    });
    return null;
  },

  // §6.3.2: recipient accepts; Person resolved/created; Worker created at the
  // registered transition.
  AcceptInvitation(store, ctx, payload) {
    const inv = latestInvitationState(store, payload.invitationId);
    if (!inv) return 'invitation not found';
    if (inv.state !== 'pending') return `invitation not pending (state: ${inv.state})`;
    if (inv.payload.email !== ctx.actor.email) return 'invitation email does not match accepting person';
    ctx.companyId = inv.companyId;
    let person = findPersonByEmail(store, inv.payload.email);
    if (!person) {
      person = createEntity(store, ctx, {
        type: 'Person',
        scope: 'Platform',
        email: inv.payload.email,
        name: payload.name ?? inv.payload.name ?? inv.payload.email,
      });
    }
    ctx.actor = { kind: 'person', id: person.id, email: person.email };
    // §6.3.2: not two simultaneous memberships in the same Company.
    if (activeWorkerFor(store, person.id, inv.companyId)) return 'person already holds an active membership in this Company';
    createWorker(store, ctx, {
      companyId: inv.companyId,
      personId: person.id,
      profile: { displayName: person.name, contactEmail: person.email },
    });
    appendFact(store, ctx, {
      type: 'Invitation',
      invitationId: inv.invitationId,
      state: 'accepted',
      companyId: inv.companyId,
      payload: inv.payload,
    });
    return null;
  },

  CancelInvitation(store, ctx, payload) {
    const inv = latestInvitationState(store, payload.invitationId);
    if (!inv) return 'invitation not found';
    if (inv.companyId !== ctx.companyId) return 'cross-tenant reference rejected (DM-INV-5)';
    if (inv.state !== 'pending') return `invitation not pending (state: ${inv.state})`;
    appendFact(store, ctx, { type: 'Invitation', invitationId: inv.invitationId, state: 'cancelled', companyId: inv.companyId, payload: inv.payload });
    return null;
  },

  ExpireInvitation(store, ctx, payload) {
    const inv = latestInvitationState(store, payload.invitationId);
    if (!inv) return 'invitation not found';
    if (inv.companyId !== ctx.companyId) return 'cross-tenant reference rejected (DM-INV-5)';
    if (inv.state !== 'pending') return `invitation not pending (state: ${inv.state})`;
    appendFact(store, ctx, { type: 'Invitation', invitationId: inv.invitationId, state: 'expired', companyId: inv.companyId, payload: inv.payload });
    return null;
  },

  CreateProject(store, ctx, payload) {
    if (typeof payload.name !== 'string' || payload.name.length === 0) return 'project name required';
    if (payload.companyId !== ctx.companyId) return 'cross-tenant reference rejected (DM-INV-5)';
    // M1 lifecycle boundary: entry state `draft` only (§6.1.3).
    createEntity(store, ctx, { type: 'Project', scope: 'Company', companyId: ctx.companyId, name: payload.name, state: 'draft' });
    return null;
  },

  CreateSite(store, ctx, payload) {
    if (typeof payload.name !== 'string' || payload.name.length === 0) return 'site name required';
    const err = tenantEntity(store, ctx, payload.projectId, 'Project');
    if (err) return err;
    const project = store.entities.get(payload.projectId);
    // M1 lifecycle boundary: entry state `planned` only (§6.1.3; PS-INV-1).
    createEntity(store, ctx, { type: 'Site', scope: 'Project', companyId: project.companyId, projectId: project.id, name: payload.name, state: 'planned' });
    return null;
  },

  ChangeWorkerProfile(store, ctx, payload) {
    const err = tenantEntity(store, ctx, payload.workerId, 'Worker');
    if (err) return err;
    if (workerLifecycleState(store, payload.workerId) === 'offboarded') return 'worker is offboarded';
    if (!payload.changes || typeof payload.changes !== 'object' || Object.keys(payload.changes).length === 0) {
      return 'profile changes required';
    }
    appendFact(store, ctx, {
      type: 'WorkerProfileChange',
      subject: payload.workerId,
      companyId: ctx.companyId,
      payload: { changes: payload.changes },
    });
    return null;
  },

  GrantCapability(store, ctx, payload) {
    const err = tenantEntity(store, ctx, payload.workerId, 'Worker');
    if (err) return err;
    if (!CAPABILITIES.has(payload.capability)) return `unknown capability: ${payload.capability}`;
    if (workerLifecycleState(store, payload.workerId) === 'offboarded') return 'worker is offboarded';
    appendFact(store, ctx, {
      type: 'CapabilityGrant',
      subject: payload.workerId,
      companyId: ctx.companyId,
      payload: { capability: payload.capability, granted: true },
    });
    return null;
  },

  RevokeCapability(store, ctx, payload) {
    const err = tenantEntity(store, ctx, payload.workerId, 'Worker');
    if (err) return err;
    if (!CAPABILITIES.has(payload.capability)) return `unknown capability: ${payload.capability}`;
    if (typeof payload.reason !== 'string' || payload.reason.length === 0) return 'reason required for capability revocation (§6.3.6)';
    appendFact(store, ctx, {
      type: 'CapabilityGrant',
      subject: payload.workerId,
      companyId: ctx.companyId,
      reason: payload.reason,
      payload: { capability: payload.capability, granted: false },
    });
    return null;
  },

  SuspendWorker(store, ctx, payload) {
    const err = tenantEntity(store, ctx, payload.workerId, 'Worker');
    if (err) return err;
    if (typeof payload.reason !== 'string' || payload.reason.length === 0) return 'reason required for suspension (§6.3.6)';
    const lc = workerLifecycleState(store, payload.workerId);
    if (lc !== 'active') return `worker not active (state: ${lc})`;
    appendFact(store, ctx, {
      type: 'WorkerLifecycleEvent',
      subject: payload.workerId,
      companyId: ctx.companyId,
      reason: payload.reason,
      payload: { event: 'suspended' },
    });
    return null;
  },

  ResumeWorker(store, ctx, payload) {
    const err = tenantEntity(store, ctx, payload.workerId, 'Worker');
    if (err) return err;
    const lc = workerLifecycleState(store, payload.workerId);
    if (lc !== 'suspended') return `worker not suspended (state: ${lc})`;
    appendFact(store, ctx, {
      type: 'WorkerLifecycleEvent',
      subject: payload.workerId,
      companyId: ctx.companyId,
      payload: { event: 'resumed' },
    });
    return null;
  },

  // §6.3.3 offboarding: all assignments and memberships ended; QR retired;
  // historical facts and Person preserved. Reason mandatory (§6.3.6).
  //
  // Open-artifact preconditions (M1 contract behaviour 3): the artifact
  // classes M1 implements are checked explicitly below. Classes M1 does not
  // implement — open shifts (M6), pending Tasks (M5/M7), pending
  // CompletionClaims (M7) — do not exist in this build; the check here is
  // "no applicable open artifacts exist in M1-implemented classes", NOT
  // "later classes ignored". Those classes become additional enforcement
  // obligations in their milestones.
  OffboardWorker(store, ctx, payload) {
    const err = tenantEntity(store, ctx, payload.workerId, 'Worker');
    if (err) return err;
    if (typeof payload.reason !== 'string' || payload.reason.length === 0) return 'reason required for offboarding (§6.3.6)';
    const lc = workerLifecycleState(store, payload.workerId);
    if (lc === 'offboarded') return 'worker already offboarded';

    // M1-implemented artifact classes checked: SiteAssignment,
    // ProjectAssignment (ended below), WorkerQrIdentity (retired below).
    // No other M1 artifact class can block offboarding.
    appendFact(store, ctx, {
      type: 'WorkerLifecycleEvent',
      subject: payload.workerId,
      companyId: ctx.companyId,
      reason: payload.reason,
      payload: { event: 'offboarded' },
    });
    // QR retired without replacement (WC-INV-7).
    const qr = activeQrIdentity(store, payload.workerId);
    if (qr) {
      appendFact(store, ctx, {
        type: 'WorkerQrIdentityEvent',
        subject: payload.workerId,
        companyId: ctx.companyId,
        reason: payload.reason,
        payload: { event: 'retired', qrId: qr.id, via: 'offboarding' },
      });
    }
    // Assignments ended (state change, not deletion — §6.3.3; LifecycleEvent F).
    for (const e of [...store.entities.values()]) {
      if ((e.type === 'SiteAssignment' || e.type === 'ProjectAssignment') && e.workerId === payload.workerId && !assignmentEnded(store, e.id)) {
        appendFact(store, ctx, {
          type: 'LifecycleEvent',
          subject: e.id,
          companyId: ctx.companyId,
          reason: `worker offboarding: ${payload.reason}`,
          payload: { event: 'removed', entityType: e.type },
        });
      }
    }
    return null;
  },

  CreateRequirement(store, ctx, payload) {
    if (!REQ_TYPES.has(payload.reqType)) return `invalid requirement type (§4.2 fixed set, AC-ARCH-I2): ${payload.reqType}`;
    if (!REQ_SCOPES.has(payload.scope)) return `invalid requirement scope (§4.2): ${payload.scope}`;
    if (!payload.appliesTo || !APPLIES_KINDS.has(payload.appliesTo.kind)) return 'invalid applies_to (§4.2)';
    if (typeof payload.requiresVerification !== 'boolean') return 'requires_verification must be boolean';
    if (!payload.expiry || !EXPIRY_KINDS.has(payload.expiry.kind)) return 'invalid expiry (§4.2)';
    if (payload.scope === 'company' && payload.companyId !== ctx.companyId) return 'cross-tenant reference rejected (DM-INV-5)';
    if (payload.scope === 'project') {
      const err = tenantEntity(store, ctx, payload.projectId, 'Project');
      if (err) return err;
    }
    if (payload.scope === 'site') {
      const err = tenantEntity(store, ctx, payload.siteId, 'Site');
      if (err) return err;
    }
    createEntity(store, ctx, {
      type: 'Requirement',
      scope: payload.scope, // §4.2 attribute vocabulary: company | project | site
      companyId: ctx.companyId,
      projectId: payload.projectId,
      siteId: payload.siteId,
      reqType: payload.reqType,
      title: payload.title,
      appliesTo: payload.appliesTo,
      requiresVerification: payload.requiresVerification,
      expiry: payload.expiry,
      revision: 1,
      groupId: nid(store, 'reqgrp'),
    });
    return null;
  },

  // §4.2/§4.6: a new revision supersedes prior satisfaction without resetting
  // unrelated requirements. The successor is a new Requirement E in the same
  // group; prior satisfied records are superseded as attributed facts (INV-3).
  ReviseRequirement(store, ctx, payload) {
    const err = tenantEntity(store, ctx, payload.requirementId, 'Requirement');
    if (err) return err;
    const prior = store.entities.get(payload.requirementId);
    const successor = createEntity(store, ctx, {
      type: 'Requirement',
      scope: prior.scope,
      companyId: prior.companyId,
      projectId: prior.projectId,
      siteId: prior.siteId,
      reqType: prior.reqType,
      title: prior.title,
      appliesTo: prior.appliesTo,
      requiresVerification: prior.requiresVerification,
      expiry: prior.expiry,
      revision: prior.revision + 1,
      groupId: prior.groupId,
    });
    // Supersede satisfactions of the prior revision where the lifecycle
    // defines `superseded` (induction completed; acknowledgement
    // acknowledged). Document lifecycles define no superseded state (§4.3);
    // prior document satisfactions remain attached to the superseded
    // revision, which is no longer the applicable revision.
    const factType = SATISFACTION_FACT[prior.reqType];
    if (prior.reqType !== 'document') {
      const targetState = prior.reqType === 'induction' ? 'completed' : 'acknowledged';
      const subjects = new Set(
        store.facts
          .filter((f) => f.type === factType && f.payload.requirementId === prior.id)
          .map((f) => f.subject),
      );
      for (const subject of subjects) {
        const st = satisfactionState(store, subject, prior.id);
        if (st.state === targetState) {
          appendFact(store, ctx, {
            type: factType,
            subject,
            state: 'superseded',
            companyId: prior.companyId,
            payload: { requirementId: prior.id, supersededBy: successor.id },
          });
        }
      }
    }
    return null;
  },

  // --- RequirementSatisfaction lifecycles (§4.3; canonical §7 fact names) ---

  UploadDocument(store, ctx, payload) {
    const chk = satisfactionPrelude(store, ctx, payload, 'document');
    if (chk.err) return chk.err;
    const st = satisfactionState(store, payload.workerId, payload.requirementId).state;
    if (!['missing', 'rejected'].includes(st)) return `cannot upload from state: ${st}`;
    // §4.3: self-declared documents move uploaded → verified (skip under_review).
    const next = chk.req.requiresVerification ? 'uploaded' : 'verified';
    appendFact(store, ctx, {
      type: 'DocumentRevision',
      subject: payload.workerId,
      state: next,
      companyId: ctx.companyId,
      payload: { requirementId: chk.req.id, documentRef: payload.documentRef ?? null },
    });
    return null;
  },

  SubmitDocumentForReview(store, ctx, payload) {
    const chk = satisfactionPrelude(store, ctx, payload, 'document');
    if (chk.err) return chk.err;
    if (!chk.req.requiresVerification) return 'self-declared documents do not enter review (§4.3)';
    const st = satisfactionState(store, payload.workerId, payload.requirementId).state;
    if (st !== 'uploaded') return `cannot submit for review from state: ${st}`;
    appendFact(store, ctx, {
      type: 'DocumentRevision',
      subject: payload.workerId,
      state: 'under_review',
      companyId: ctx.companyId,
      payload: { requirementId: chk.req.id },
    });
    return null;
  },

  VerifyDocument(store, ctx, payload) {
    const chk = satisfactionPrelude(store, ctx, payload, 'document');
    if (chk.err) return chk.err;
    const st = satisfactionState(store, payload.workerId, payload.requirementId).state;
    if (st !== 'under_review') return `cannot verify from state: ${st}`;
    appendFact(store, ctx, {
      type: 'DocumentRevision',
      subject: payload.workerId,
      state: 'verified',
      companyId: ctx.companyId,
      payload: { requirementId: chk.req.id },
    });
    return null;
  },

  RejectDocument(store, ctx, payload) {
    const chk = satisfactionPrelude(store, ctx, payload, 'document');
    if (chk.err) return chk.err;
    const st = satisfactionState(store, payload.workerId, payload.requirementId).state;
    if (st !== 'under_review') return `cannot reject from state: ${st}`;
    appendFact(store, ctx, {
      type: 'DocumentRevision',
      subject: payload.workerId,
      state: 'rejected',
      companyId: ctx.companyId,
      reason: payload.reason,
      payload: { requirementId: chk.req.id },
    });
    return null;
  },

  // §4.3/§4.6: renewal re-enters the requirement at uploaded.
  RenewDocument(store, ctx, payload) {
    const chk = satisfactionPrelude(store, ctx, payload, 'document');
    if (chk.err) return chk.err;
    const st = satisfactionState(store, payload.workerId, payload.requirementId).state;
    if (st !== 'expired') return `cannot renew from state: ${st}`;
    const next = chk.req.requiresVerification ? 'uploaded' : 'verified';
    appendFact(store, ctx, {
      type: 'DocumentRevision',
      subject: payload.workerId,
      state: next,
      companyId: ctx.companyId,
      payload: { requirementId: chk.req.id, documentRef: payload.documentRef ?? null, renewal: true },
    });
    return null;
  },

  StartInduction(store, ctx, payload) {
    const chk = satisfactionPrelude(store, ctx, payload, 'induction');
    if (chk.err) return chk.err;
    const st = satisfactionState(store, payload.workerId, payload.requirementId).state;
    // §4.6: renewal re-enters an expired induction at not_started.
    if (!['not_started', 'expired'].includes(st)) return `cannot start from state: ${st}`;
    appendFact(store, ctx, {
      type: 'InductionCompletion',
      subject: payload.workerId,
      state: 'in_progress',
      companyId: ctx.companyId,
      payload: { requirementId: chk.req.id },
    });
    return null;
  },

  CompleteInduction(store, ctx, payload) {
    const chk = satisfactionPrelude(store, ctx, payload, 'induction');
    if (chk.err) return chk.err;
    const st = satisfactionState(store, payload.workerId, payload.requirementId).state;
    if (st !== 'in_progress') return `cannot complete from state: ${st}`;
    appendFact(store, ctx, {
      type: 'InductionCompletion',
      subject: payload.workerId,
      state: 'completed',
      companyId: ctx.companyId,
      payload: { requirementId: chk.req.id },
    });
    return null;
  },

  PresentAcknowledgement(store, ctx, payload) {
    const chk = satisfactionPrelude(store, ctx, payload, 'acknowledgement');
    if (chk.err) return chk.err;
    const st = satisfactionState(store, payload.workerId, payload.requirementId).state;
    if (st !== 'required') return `cannot present from state: ${st}`;
    appendFact(store, ctx, {
      type: 'Acknowledgement',
      subject: payload.workerId,
      state: 'presented',
      companyId: ctx.companyId,
      payload: { requirementId: chk.req.id },
    });
    return null;
  },

  // §6.10.2 classifies acknowledgement with signature capture as
  // offline-mutating; the offline durable-intent path is deferred with the
  // halted AC-11 scope (AMB-002). This is the online path only.
  AcknowledgeRequirement(store, ctx, payload) {
    const chk = satisfactionPrelude(store, ctx, payload, 'acknowledgement');
    if (chk.err) return chk.err;
    // Server application of a queued offline command must not trip over its
    // own durable local fact (C8 two-sided slices reconciled by identity).
    const st = satisfactionState(store, payload.workerId, payload.requirementId, ctx.commandId).state;
    if (st !== 'presented') return `cannot acknowledge from state: ${st}`;
    appendFact(store, ctx, {
      type: 'Acknowledgement',
      subject: payload.workerId,
      state: 'acknowledged',
      companyId: ctx.companyId,
      payload: { requirementId: chk.req.id, signature: payload.signature ?? null },
    });
    return null;
  },

  // --- Assignments (§6.1.2; M1: creation into assigned|active only) ---

  AssignWorkerToProject(store, ctx, payload) {
    const wErr = tenantEntity(store, ctx, payload.workerId, 'Worker');
    if (wErr) return wErr;
    const pErr = tenantEntity(store, ctx, payload.projectId, 'Project');
    if (pErr) return pErr;
    const lc = workerLifecycleState(store, payload.workerId);
    if (lc !== 'active') return `cannot assign worker in state: ${lc} (§6.3.3)`;
    createEntity(store, ctx, {
      type: 'ProjectAssignment',
      scope: 'Project',
      companyId: ctx.companyId,
      workerId: payload.workerId,
      projectId: payload.projectId,
      state: 'assigned',
    });
    return null;
  },

  AssignWorkerToSite(store, ctx, payload) {
    const wErr = tenantEntity(store, ctx, payload.workerId, 'Worker');
    if (wErr) return wErr;
    const sErr = tenantEntity(store, ctx, payload.siteId, 'Site');
    if (sErr) return sErr;
    const state = payload.state ?? 'assigned';
    if (!ASSIGNMENT_STATES.has(state)) return `M1 assignment states are assigned|active only: ${state}`;
    const lc = workerLifecycleState(store, payload.workerId);
    if (lc !== 'active') return `cannot assign worker in state: ${lc} (§6.3.3)`;
    createEntity(store, ctx, {
      type: 'SiteAssignment',
      scope: 'Site',
      companyId: ctx.companyId,
      workerId: payload.workerId,
      siteId: payload.siteId,
      state,
    });
    return null;
  },

  // --- QR identity (WC-INV-7, §6.3.3) ---

  IssueQr(store, ctx, payload) {
    const err = tenantEntity(store, ctx, payload.workerId, 'Worker');
    if (err) return err;
    if (workerLifecycleState(store, payload.workerId) === 'offboarded') return 'offboarded worker holds no QR (WC-INV-7)';
    if (activeQrIdentity(store, payload.workerId)) return 'worker already has an active QR identity (WC-INV-7)';
    const qr = createEntity(store, ctx, {
      type: 'WorkerQrIdentity',
      scope: 'Company',
      companyId: ctx.companyId,
      workerId: payload.workerId,
      token: nid(store, 'qrt'),
    });
    appendFact(store, ctx, {
      type: 'WorkerQrIdentityEvent',
      subject: payload.workerId,
      companyId: ctx.companyId,
      payload: { event: 'issued', qrId: qr.id },
    });
    return null;
  },

  // Rotation is a single atomic operation (create new + retire prior);
  // validated fully before any mutation (§6.3.3 QR atomicity, AC-ARCH-G4).
  RotateQr(store, ctx, payload) {
    const err = tenantEntity(store, ctx, payload.workerId, 'Worker');
    if (err) return err;
    const prior = activeQrIdentity(store, payload.workerId);
    if (!prior) return 'no active QR identity to rotate';
    const qr = createEntity(store, ctx, {
      type: 'WorkerQrIdentity',
      scope: 'Company',
      companyId: ctx.companyId,
      workerId: payload.workerId,
      token: nid(store, 'qrt'),
    });
    appendFact(store, ctx, {
      type: 'WorkerQrIdentityEvent',
      subject: payload.workerId,
      companyId: ctx.companyId,
      payload: { event: 'rotated-out', qrId: prior.id, supersededBy: qr.id },
    });
    appendFact(store, ctx, {
      type: 'WorkerQrIdentityEvent',
      subject: payload.workerId,
      companyId: ctx.companyId,
      payload: { event: 'rotated', qrId: qr.id, supersedes: prior.id },
    });
    return null;
  },

  // Revocation retires without replacement; reason mandatory (§6.3.6).
  RevokeQr(store, ctx, payload) {
    const err = tenantEntity(store, ctx, payload.workerId, 'Worker');
    if (err) return err;
    if (typeof payload.reason !== 'string' || payload.reason.length === 0) return 'reason required for QR revocation (§6.3.6)';
    const prior = activeQrIdentity(store, payload.workerId);
    if (!prior) return 'no active QR identity to revoke';
    appendFact(store, ctx, {
      type: 'WorkerQrIdentityEvent',
      subject: payload.workerId,
      companyId: ctx.companyId,
      reason: payload.reason,
      payload: { event: 'revoked', qrId: prior.id },
    });
    return null;
  },
};

function cmd_name(ctx, payload) {
  return payload.founderName ?? ctx.actor.email;
}

function assignmentEnded(store, assignmentId) {
  return store.facts.some(
    (f) => f.type === 'LifecycleEvent' && f.subject === assignmentId && f.payload.event === 'removed',
  );
}

// Shared validation for RequirementSatisfaction commands: requirement exists,
// is of the expected type, belongs to the actor's Company, is the current
// (applicable) revision, the target worker belongs to the actor's Company,
// and the requirement applies to the worker.
function satisfactionPrelude(store, ctx, payload, reqType) {
  const rErr = tenantEntity(store, ctx, payload.requirementId, 'Requirement');
  if (rErr) return { err: rErr };
  const req = store.entities.get(payload.requirementId);
  if (req.reqType !== reqType) return { err: `requirement is not of type ${reqType}` };
  if (!isLatestRevision(store, req)) return { err: 'requirement revision superseded (§4.6)' };
  const wErr = tenantEntity(store, ctx, payload.workerId, 'Worker');
  if (wErr) return { err: wErr };
  if (workerLifecycleState(store, payload.workerId) === 'offboarded') return { err: 'worker is offboarded' };
  if (!requirementAppliesTo(store, req, payload.workerId)) return { err: 'requirement does not apply to this worker (§4.2 applies_to)' };
  return { req };
}

// ---------------------------------------------------------------------------
// Time-driven transitions (§4.3: expiring_soon / expired; INV-3: attributed
// and auditable — appended as system-actor facts, never silent derivation).
// ---------------------------------------------------------------------------

export function tick(store, now) {
  if (typeof now !== 'number' || now < store.clock) {
    throw new Error('tick requires a monotonically advancing timestamp');
  }
  store.clock = now;
  const ctx = {
    type: 'tick',
    commandId: nid(store, 'tick'),
    actor: { kind: 'system' },
    deviceId: 'server',
    deviceTimestamp: now,
    serverTimestamp: now,
  };
  for (const req of store.entities.values()) {
    if (req.type !== 'Requirement' || req.expiry.kind === 'none') continue;
    // Only the latest revision of a group accrues new expiries.
    const latestRevision = [...store.entities.values()]
      .filter((r) => r.type === 'Requirement' && r.groupId === req.groupId)
      .every((r) => r.revision <= req.revision);
    if (!latestRevision) continue;
    for (const w of store.entities.values()) {
      if (w.type !== 'Worker' || w.companyId !== req.companyId) continue;
      if (!requirementAppliesTo(store, req, w.id)) continue;
      const sat = satisfactionState(store, w.id, req.id);
      const satisfiedFact = [...sat.facts].reverse().find((f) =>
        (req.reqType === 'document' && f.state === 'verified')
        || (req.reqType === 'induction' && f.state === 'completed')
        || (req.reqType === 'acknowledgement' && f.state === 'acknowledged'));
      if (!satisfiedFact) continue;
      const expiryTime = req.expiry.kind === 'fixed_date'
        ? Date.parse(req.expiry.at)
        : satisfiedFact.serverTimestamp + req.expiry.days * DAY;
      const factType = SATISFACTION_FACT[req.reqType];
      const base = { type: factType, subject: w.id, companyId: req.companyId, payload: { requirementId: req.id } };
      if (now >= expiryTime) {
        const expirable = { document: ['verified', 'expiring_soon'], induction: ['completed'], acknowledgement: ['acknowledged'] }[req.reqType];
        if (expirable.includes(sat.state)) appendFact(store, ctx, { ...base, state: 'expired' });
      } else if (req.reqType === 'document' && sat.state === 'verified' && now >= expiryTime - EXPIRING_SOON_DAYS * DAY) {
        appendFact(store, ctx, { ...base, state: 'expiring_soon' });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Readiness derivation (§4.4 as amended by EP-4.0; §4.5; INV-1..6;
// AC-ARCH-E1/E3) — D records: recomputed from E + F, never stored.
// ---------------------------------------------------------------------------

// §4.4 (EP-4.0): display_name non-empty AND (contact_phone OR contact_email).
export function profileComplete(store, workerId) {
  const p = deriveProfile(store, workerId);
  if (!p) return false;
  const nonEmpty = (v) => typeof v === 'string' && v.length > 0;
  return nonEmpty(p.displayName) && (nonEmpty(p.contactPhone) || nonEmpty(p.contactEmail));
}

// Latest revision of each requirement group in a scope set is the applicable
// requirement; superseded revisions no longer gate.
function applicableRequirements(store, companyId, scopePred) {
  const groups = new Map();
  for (const e of store.entities.values()) {
    if (e.type !== 'Requirement' || e.companyId !== companyId || !scopePred(e)) continue;
    const cur = groups.get(e.groupId);
    if (!cur || e.revision > cur.revision) groups.set(e.groupId, e);
  }
  return [...groups.values()];
}

const SATISFIED_STATES = {
  document: new Set(['verified', 'expiring_soon']), // §4.6: expiring_soon warns; expiry removes readiness
  induction: new Set(['completed']),
  acknowledgement: new Set(['acknowledged']),
};

function satisfiedBy(store, workerId, req) {
  const st = satisfactionState(store, workerId, req.id).state;
  return SATISFIED_STATES[req.reqType].has(st);
}

// §4.4: company_ready := profile_complete AND all applicable company-scope
// requirements satisfied. §4.5: every block returns the specific failing
// requirement(s) — never a generic error.
export function companyReady(store, workerId) {
  const w = store.entities.get(workerId);
  if (!w || w.type !== 'Worker') return { ready: false, failing: [], profileComplete: false };
  const pc = profileComplete(store, workerId);
  const failing = applicableRequirements(store, w.companyId, (r) => r.scope === 'company')
    .filter((r) => requirementAppliesTo(store, r, workerId))
    .filter((r) => !satisfiedBy(store, workerId, r))
    .map((r) => r.id);
  return { ready: pc && failing.length === 0, failing, profileComplete: pc };
}

// §4.4: site_ready := company_ready AND applicable project(site)/site
// requirements AND SiteAssignment in assigned|active (§6.3.3). PS-INV-4:
// readiness is per-site.
export function siteReady(store, workerId, siteId) {
  const site = store.entities.get(siteId);
  if (!site || site.type !== 'Site') return { ready: false, failing: [], hasAssignment: false };
  const cr = companyReady(store, workerId);
  const project = store.entities.get(site.projectId);
  const scoped = applicableRequirements(store, site.companyId,
    (r) => (r.scope === 'site' && r.siteId === siteId)
        || (r.scope === 'project' && r.projectId === project?.id));
  const failing = scoped
    .filter((r) => requirementAppliesTo(store, r, workerId))
    .filter((r) => !satisfiedBy(store, workerId, r))
    .map((r) => r.id);
  const hasAssignment = [...store.entities.values()].some((e) =>
    e.type === 'SiteAssignment' && e.workerId === workerId && e.siteId === siteId
    && ASSIGNMENT_STATES.has(e.state) && !assignmentEnded(store, e.id));
  return {
    ready: cr.ready && failing.length === 0 && hasAssignment,
    failing: [...new Set([...cr.failing, ...failing])],
    hasAssignment,
    companyReady: cr.ready,
  };
}

// ---------------------------------------------------------------------------
// Offline cached reads with freshness (§6.10.2; M0 offline-reconciliation §3;
// AC-ARCH-E2: locally-committed / server-confirmed / stale / unknown).
// A cache is a snapshot projection (D): recomputable, never authoritative.
// ---------------------------------------------------------------------------

function receiptConfirmed(store, commandId) {
  return store.facts.some((f) => f.type === 'CommandReceipt' && f.commandId === commandId);
}

// Freshness of a snapshot section: local-unconfirmed facts beneath it make it
// locally-committed; server facts newer than the snapshot make it stale;
// otherwise server-confirmed.
function sectionFreshness(store, cache, { local, newer }) {
  if (local) return 'locally-committed';
  if (newer) return 'stale';
  return 'server-confirmed';
}

export function createCache(store, workerId) {
  const w = store.entities.get(workerId);
  const cache = {
    workerId,
    factsLen: store.facts.length,
    entSeq: store.seq,
    exists: !!w,
    companyId: w?.companyId ?? null,
  };
  if (w) {
    cache.profile = deriveProfile(store, workerId);
    const cr = companyReady(store, workerId);
    const siteEntries = [...store.entities.values()]
      .filter((e) => e.type === 'SiteAssignment' && e.workerId === workerId && !assignmentEnded(store, e.id))
      .map((a) => [a.siteId, siteReady(store, workerId, a.siteId)]);
    cache.readiness = {
      companyReady: cr.ready,
      siteReady: Object.fromEntries(siteEntries.map(([id, sr]) => [id, sr.ready])),
      detail: { companyReady: cr, siteReady: Object.fromEntries(siteEntries) },
    };
    cache.assignments = [...store.entities.values()]
      .filter((e) => (e.type === 'SiteAssignment' || e.type === 'ProjectAssignment') && e.workerId === workerId)
      .map((a) => ({ id: a.id, type: a.type, state: a.state, siteId: a.siteId, projectId: a.projectId, ended: assignmentEnded(store, a.id) }));
  }
  return cache;
}

export function cacheRead(store, cache) {
  if (!cache || !cache.exists) {
    return {
      profile: { value: null, freshness: 'unknown' },
      readiness: { value: null, freshness: 'unknown' },
      assignments: { value: null, freshness: 'unknown' },
    };
  }
  const newFacts = store.facts.slice(cache.factsLen);
  // Only facts beneath the snapshot affect its freshness basis; facts newer
  // than the snapshot (local or server) make it stale, never silently current.
  const localUnconfirmed = (pred) => store.facts.slice(0, cache.factsLen)
    .some((f) => f.layer === 'local' && !receiptConfirmed(store, f.commandId) && pred(f));

  const profile = {
    value: cache.profile,
    freshness: sectionFreshness(store, cache, {
      local: localUnconfirmed((f) => f.subject === cache.workerId && f.type === 'WorkerProfileChange'),
      newer: newFacts.some((f) => f.type === 'WorkerProfileChange' && f.subject === cache.workerId),
    }),
  };

  const readiness = {
    value: cache.readiness,
    freshness: sectionFreshness(store, cache, {
      local: localUnconfirmed((f) => f.subject === cache.workerId && ['DocumentRevision', 'InductionCompletion', 'Acknowledgement'].includes(f.type)),
      newer: newFacts.some((f) => f.subject === cache.workerId && ['DocumentRevision', 'InductionCompletion', 'Acknowledgement', 'WorkerLifecycleEvent'].includes(f.type))
        || [...store.entities.values()].some((e) => e.type === 'Requirement' && e.companyId === cache.companyId && e.creationSeq > cache.entSeq),
    }),
  };

  const assignments = {
    value: cache.assignments,
    freshness: sectionFreshness(store, cache, {
      local: false, // M1 assignments are connectivity-required; never locally committed
      newer: newFacts.some((f) => f.type === 'LifecycleEvent' && cache.assignments.some((a) => a.id === f.subject))
        || [...store.entities.values()].some((e) => (e.type === 'SiteAssignment' || e.type === 'ProjectAssignment') && e.workerId === cache.workerId && e.creationSeq > cache.entSeq),
    }),
  };

  return { profile, readiness, assignments };
}

// ---------------------------------------------------------------------------
// Offline command path (§6.10.3; OS-INV-2/3/4; AC-ARCH-C1/C2/F1/F3/F4).
// Durable intent: validate locally → durable local record (fact + queue
// entry) in one atomic step → 'locally committed'. Transmission is separate
// and per-command (transmitQueue).
// ---------------------------------------------------------------------------

export function executeOffline(store, cmd) {
  const commandId = cmd.commandId ?? nid(store, 'cmd');
  if (!OFFLINE_CAPABLE_COMMANDS.has(cmd.type)) {
    // AC-ARCH-F1 + M0 vocabulary: terminal local rejection, never queued.
    return {
      commandId,
      outcome: 'locally rejected',
      reason: `${cmd.type} is connectivity-required (§6.10.2/§6.11.3); not offline-capable`,
    };
  }
  // Idempotent re-submission of a durable local intent (OS-INV-4/C2).
  const existing = store.queue.find((q) => q.commandId === commandId);
  if (existing) return { commandId, outcome: 'locally committed', duplicate: true };
  if (store.commandOutcomes.has(commandId)) {
    return { commandId, ...store.commandOutcomes.get(commandId), duplicate: true };
  }

  const ctx = {
    type: cmd.type,
    commandId,
    deviceId: cmd.deviceId ?? DEFAULT_DEVICE,
    deviceTimestamp: cmd.deviceTimestamp ?? store.clock,
    serverTimestamp: null, // no server contact offline; receipt carries sync time
    actor: null,
    companyId: undefined,
  };

  // Local preconditions (M0 §F.2): actor resolves, is the subject, is not
  // suspended/offboarded, and the local slice satisfies the command's
  // preconditions (acknowledgement: presented state per local facts).
  const actorWorker = store.entities.get(cmd.actor?.workerId);
  if (!actorWorker || actorWorker.type !== 'Worker') {
    return { commandId, outcome: 'locally rejected', reason: 'actor worker not in local slice' };
  }
  ctx.actor = { kind: 'worker', id: actorWorker.id };
  ctx.companyId = actorWorker.companyId;
  const lc = workerLifecycleState(store, actorWorker.id);
  if (lc === 'suspended' || lc === 'offboarded') {
    return { commandId, outcome: 'locally rejected', reason: `actor worker is ${lc}` };
  }
  if (cmd.payload?.workerId !== actorWorker.id) {
    return { commandId, outcome: 'locally rejected', reason: 'acknowledgement must be performed by the subject worker' };
  }
  const chk = satisfactionPrelude(store, ctx, cmd.payload ?? {}, 'acknowledgement');
  if (chk.err) return { commandId, outcome: 'locally rejected', reason: chk.err };
  const st = satisfactionState(store, cmd.payload.workerId, cmd.payload.requirementId).state;
  if (st !== 'presented') {
    return { commandId, outcome: 'locally rejected', reason: `cannot acknowledge from state: ${st}` };
  }

  // Durable local commit: local-layer fact + queue entry, atomically (C1,
  // OS-INV-3). The local slice is locally authoritative until reconciled
  // (DM-INV-10); the server slice applies at transmission.
  appendFact(store, ctx, {
    type: 'Acknowledgement',
    subject: cmd.payload.workerId,
    state: 'acknowledged',
    layer: 'local',
    companyId: ctx.companyId,
    payload: { requirementId: chk.req.id, signature: cmd.payload.signature ?? null },
  });
  store.queue.push({
    commandId,
    cmd: deepFreeze({ type: cmd.type, actor: cmd.actor, deviceId: ctx.deviceId, deviceTimestamp: ctx.deviceTimestamp, payload: cmd.payload }),
    state: 'queued',
  });
  return { commandId, outcome: 'locally committed' };
}

// Transmission: per-command independent outcomes; exactly-once via receipt;
// succeeded commands retired; rejections preserved as CommandOutcome (C9) and
// surfaced with reason (§6.10.3). Server revalidates against the current
// server slice — a requirement superseded while offline rejects the queued
// acknowledgement (readiness-gate violation discovered at sync).
export function transmitQueue(store) {
  const results = [];
  for (const entry of store.queue) {
    if (entry.state !== 'queued') continue;
    const res = execute(store, { ...entry.cmd, commandId: entry.commandId });
    entry.state = res.outcome === 'server accepted' ? 'confirmed' : 'surfaced';
    results.push({ commandId: entry.commandId, outcome: res.outcome, reason: res.reason });
  }
  store.queue = store.queue.filter((q) => q.state === 'queued' || q.state === 'surfaced' ? q.state === 'surfaced' : false);
  return { results };
}
