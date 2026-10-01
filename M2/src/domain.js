// M2 domain core — Project & Site lifecycle, Project suspension overlay,
// assignment states, ExternalParty, ProjectExternalParty, HandoverRecord
// (M2 Execution Contract v1.0.3 §In-scope).
//
// Milestone isolation: M1 source is untouched. M2 is a self-contained
// extension module — M1 command types delegate to M1's execute; M1-internal
// plumbing (nid, deepFreeze, appendFact, createEntity, tenantEntity,
// reject/accept, ensureDevice) is re-implemented here against the shared
// store, preserving the four-class storage discipline (M0): E genesis
// records deep-frozen at creation, F records immutable and append-only,
// D values derived, C vocabulary fixed.
//
// Phase-2 scope (AMB-003/004/005 resolved at EP-6.0, blueprint amended;
// see M2/evidence/open-items.md):
// - Independent Site operational suspension (AMB-004): F-class
//   SiteOperationalSuspension facts with subtype events
//   activated/deactivated; actor, timestamp, and reason mandatory. The
//   operational status derivation folds this stream alongside the Project
//   overlay (AC-5).
// - Project transfer (AMB-003, option C): TransferProject (Platform Admin
//   / system actor) creates a new Project identity under the receiving
//   Company, copies Sites and Project/Site-scoped Requirements as new
//   identities, marks source assignments removed with reason
//   "project transfer", copies no assignments, and records a TransferEvent
//   linking both Project identities (AC-8).
// - Site opt-out from project-scope Requirements (AMB-005): F-class
//   SiteRequirementOptOut facts (activated/deactivated) with mandatory
//   reason; an active opt-out unbinds that Requirement from that Site for
//   readiness derivation (AC-11).
//
// Offline: no M2 command is offline-capable (§6.10.2 classifies
// structural/administrative commands as connectivity-required).
//
// Event vocabulary (AC-ARCH-I3): §7.3-catalogued types only —
// ProjectLifecycleEvent, SiteLifecycleEvent, HandoverRecord, TransferEvent,
// SiteOperationalSuspension, SiteRequirementOptOut (catalogued at EP-6.0),
// and the generic LifecycleEvent for ExternalParty / assignment /
// ProjectExternalParty lifecycle facts (M1 precedent: OffboardWorker).

import * as m1 from '../../M1/src/domain.js';

const DEFAULT_DEVICE = 'dev-default'; // single-device simulation; as M1

// ---------------------------------------------------------------------------
// Command catalogue and authorisation (§6.11.2 admin surfaces; §6.3.3
// supervisor assignment operations; WC-INV-8: capability flags only)
// ---------------------------------------------------------------------------

const M2_COMMAND_AUTH = {
  ActivateProject: { cap: ['company_admin'] },
  SuspendProject: { cap: ['company_admin'] },
  ResumeProject: { cap: ['company_admin'] },
  CompleteProject: { cap: ['company_admin'] },
  ArchiveProject: { cap: ['company_admin'] },
  CancelProject: { cap: ['company_admin'] },
  MobiliseSite: { cap: ['company_admin'] },
  ActivateSite: { cap: ['company_admin'] },
  DemobiliseSite: { cap: ['company_admin'] },
  CloseSite: { cap: ['company_admin'] },
  ArchiveSite: { cap: ['company_admin'] },
  SuspendSite: { cap: ['company_admin'] }, // §6.1.3 amended (EP-6.0)
  UnsuspendSite: { cap: ['company_admin'] },
  TransferProject: { system: true }, // Platform Admin surface (§6.11)
  OptOutSiteRequirement: { cap: ['company_admin'] }, // §6.1.3 amended (EP-6.0)
  RevokeSiteRequirementOptOut: { cap: ['company_admin'] },
  ActivateAssignment: { cap: ['supervisor', 'company_admin'] }, // §6.3.3
  PauseAssignment: { cap: ['supervisor', 'company_admin'] },
  ResumeAssignment: { cap: ['supervisor', 'company_admin'] },
  RemoveAssignment: { cap: ['supervisor', 'company_admin'] },
  CreateExternalParty: { cap: ['company_admin'] },
  UpdateExternalParty: { cap: ['company_admin'] },
  ArchiveExternalParty: { cap: ['company_admin'] },
  AssociateExternalParty: { cap: ['company_admin'] },
  RemoveProjectExternalParty: { cap: ['company_admin'] },
  RecordHandover: { cap: ['company_admin'] }, // §6.11.2
};

export const M2_COMMAND_TYPES = Object.keys(M2_COMMAND_AUTH);
const M2_COMMANDS = new Set(M2_COMMAND_TYPES);

// ---------------------------------------------------------------------------
// Store plumbing (M1 analogues; shared store, shared seq, shared outcomes)
// ---------------------------------------------------------------------------

function nid(store, prefix) {
  store.seq += 1;
  return `${prefix}-${store.seq}`;
}

// DM-INV-2 / AC-ARCH-D4: records are deep-frozen at creation.
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
  return createEntity(store, ctx, { type: 'Device', scope: 'Platform', deviceRef: ctx.deviceId });
}

// Tenant check (DM-INV-5): entity must exist and belong to the actor's Company.
function tenantEntity(store, ctx, id, type) {
  const e = store.entities.get(id);
  if (!e || (type && e.type !== type)) return `${type ?? 'entity'} not found: ${id}`;
  if (ctx.companyId && e.companyId && e.companyId !== ctx.companyId) {
    return 'cross-tenant reference rejected (DM-INV-5)';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Command processing (M1 outcome vocabulary; idempotent replay by commandId)
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

// ---------------------------------------------------------------------------
// Derivations (D) — recomputed from E + F; never authoritative
// ---------------------------------------------------------------------------

function factsOf(store, type, subject) {
  return store.facts.filter((f) => f.type === type && (subject === undefined || f.subject === subject));
}

// §6.1.3 / PS-INV-8: draft → active → suspended → active → completed →
// archived; draft → cancelled. Genesis state 'draft' (M1 scaffolding);
// ProjectLifecycleEvent facts fold forward.
export function projectLifecycleState(store, projectId) {
  const p = store.entities.get(projectId);
  if (!p || p.type !== 'Project') return null;
  let state = p.state ?? 'draft';
  for (const f of factsOf(store, 'ProjectLifecycleEvent', projectId)) {
    const ev = f.payload.event;
    if (ev === 'activated') state = 'active';
    else if (ev === 'suspended') state = 'suspended';
    else if (ev === 'resumed') state = 'active';
    else if (ev === 'completed') state = 'completed';
    else if (ev === 'archived') state = 'archived';
    else if (ev === 'cancelled') state = 'cancelled';
  }
  return state;
}

// §6.1.3 / PS-INV-8: planned → mobilising → active → demobilising → closed →
// archived. Genesis state 'planned' (M1 scaffolding).
export function siteLifecycleState(store, siteId) {
  const s = store.entities.get(siteId);
  if (!s || s.type !== 'Site') return null;
  let state = s.state ?? 'planned';
  for (const f of factsOf(store, 'SiteLifecycleEvent', siteId)) {
    const ev = f.payload.event;
    if (ev === 'mobilising') state = 'mobilising';
    else if (ev === 'activated') state = 'active';
    else if (ev === 'demobilising') state = 'demobilising';
    else if (ev === 'closed') state = 'closed';
    else if (ev === 'archived') state = 'archived';
  }
  return state;
}

// §6.1.2 (M2 milestone-scope expansion): assigned → active → paused →
// removed. Genesis state assigned|active (M1); LifecycleEvent facts fold
// forward. M1 offboarding 'removed' facts are compatible with this fold.
export function assignmentState(store, assignmentId) {
  const a = store.entities.get(assignmentId);
  if (!a || (a.type !== 'SiteAssignment' && a.type !== 'ProjectAssignment')) return null;
  let state = a.state;
  for (const f of factsOf(store, 'LifecycleEvent', assignmentId)) {
    const ev = f.payload.event;
    if (ev === 'activated') state = 'active';
    else if (ev === 'paused') state = 'paused';
    else if (ev === 'resumed') state = 'active';
    else if (ev === 'removed') state = 'removed';
  }
  return state;
}

// §6.1.2: ExternalParty active → archived. Updates do not change state.
export function externalPartyState(store, externalPartyId) {
  const e = store.entities.get(externalPartyId);
  if (!e || e.type !== 'ExternalParty') return null;
  let state = 'active';
  for (const f of factsOf(store, 'LifecycleEvent', externalPartyId)) {
    if (f.payload.event === 'archived') state = 'archived';
  }
  return state;
}

// WC-INV-6 analogue: creation fact plus update facts alone.
export function externalPartyProfile(store, externalPartyId) {
  const e = store.entities.get(externalPartyId);
  if (!e || e.type !== 'ExternalParty') return null;
  const profile = { name: e.name, partyType: e.partyType, contact: e.contact };
  for (const f of factsOf(store, 'LifecycleEvent', externalPartyId)) {
    if (f.payload.event === 'updated') Object.assign(profile, f.payload.changes);
  }
  return profile;
}

// §7.5 relationship-entity rule: associated → removed; current state derived.
export function projectExternalPartyState(store, projectExternalPartyId) {
  const e = store.entities.get(projectExternalPartyId);
  if (!e || e.type !== 'ProjectExternalParty') return null;
  let state = 'associated';
  for (const f of factsOf(store, 'LifecycleEvent', projectExternalPartyId)) {
    if (f.payload.event === 'removed') state = 'removed';
  }
  return state;
}

// Independent operational suspension stream (§6.1.3 amended at EP-6.0,
// AMB-004): the latest SiteOperationalSuspension fact for a Site decides
// whether an independent suspension is active. No SiteLifecycleEvent is
// involved; the underlying lifecycle state is untouched.
function independentSuspensionActive(store, siteId) {
  const facts = factsOf(store, 'SiteOperationalSuspension', siteId);
  const last = facts[facts.length - 1];
  return !!last && last.payload.event === 'activated';
}

// §6.1.3 suspension overlay (D-class): a suspended Project imposes an
// effective operational suspension on every contained Site. The effective
// operational status is 'suspended' when either the Project overlay or an
// independent SiteOperationalSuspension is active; the two streams are
// independent (a Project resume never lifts an independent suspension).
// Derived from facts alone; no stored status (DM-INV-3).
export function siteOperationalStatus(store, siteId) {
  const site = store.entities.get(siteId);
  if (!site || site.type !== 'Site') return null;
  const projectSuspended = projectLifecycleState(store, site.projectId) === 'suspended';
  const independentSuspended = independentSuspensionActive(store, siteId);
  return {
    projectSuspended,
    independentSuspended,
    operational: projectSuspended || independentSuspended ? 'suspended' : 'normal',
  };
}

// --- readiness (§4.4) — M2-aware analogue of M1's siteReady ---------------
// M1's derivation cannot see the M2 `paused` assignment state; M2 supplies
// its own so a paused assignment confers no readiness. Requirement model,
// satisfaction states, and applies_to semantics are inherited unchanged.

const SATISFIED_STATES = {
  document: new Set(['verified', 'expiring_soon']), // §4.6
  induction: new Set(['completed']),
  acknowledgement: new Set(['acknowledged']),
};

function requirementAppliesTo(store, req, workerId) {
  const a = req.appliesTo;
  if (!a || a.kind === 'all_workers') return true;
  if (a.kind === 'named_workers') return Array.isArray(a.workerIds) && a.workerIds.includes(workerId);
  if (a.kind === 'role') return m1.deriveProfile(store, workerId)?.roleLabel === a.role;
  return false;
}

function satisfiedBy(store, workerId, req) {
  const st = m1.satisfactionState(store, workerId, req.id).state;
  return SATISFIED_STATES[req.reqType].has(st);
}

// Latest revision of each requirement group in a scope set is the applicable
// requirement; superseded revisions no longer gate (§4.6).
function applicableRequirements(store, companyId, scopePred) {
  const groups = new Map();
  for (const e of store.entities.values()) {
    if (e.type !== 'Requirement' || (companyId && e.companyId !== companyId) || !scopePred(e)) continue;
    const cur = groups.get(e.groupId);
    if (!cur || e.revision > cur.revision) groups.set(e.groupId, e);
  }
  return [...groups.values()];
}

// Site opt-out (§6.1.3 amended at EP-6.0, AMB-005): the latest
// SiteRequirementOptOut fact for (Site, Requirement) decides; an active
// ('activated') opt-out unbinds that Project-scope Requirement from that
// Site for readiness derivation.
function optOutActive(store, siteId, requirementId) {
  const facts = factsOf(store, 'SiteRequirementOptOut', siteId)
    .filter((f) => f.payload.requirementId === requirementId);
  const last = facts[facts.length - 1];
  return !!last && last.payload.event === 'activated';
}

// §4.4 / PS-INV-4: site_ready := company_ready AND applicable
// project(site)/site requirements AND SiteAssignment in assigned|active
// (M2-aware). Project-scope Requirements apply to all contained Sites by
// default (§6.1.3); a Site with an active SiteRequirementOptOut for a
// Project-scope Requirement is not bound by it (§6.1.3 amended, EP-6.0).
export function siteReady(store, workerId, siteId) {
  const site = store.entities.get(siteId);
  if (!site || site.type !== 'Site') return { ready: false, failing: [], hasAssignment: false };
  const cr = m1.companyReady(store, workerId);
  const project = store.entities.get(site.projectId);
  const scoped = applicableRequirements(store, site.companyId,
    (r) => (r.scope === 'site' && r.siteId === siteId)
        || (r.scope === 'project' && r.projectId === project?.id && !optOutActive(store, siteId, r.id)));
  const failing = scoped
    .filter((r) => requirementAppliesTo(store, r, workerId))
    .filter((r) => !satisfiedBy(store, workerId, r))
    .map((r) => r.id);
  const hasAssignment = [...store.entities.values()].some((e) =>
    e.type === 'SiteAssignment' && e.workerId === workerId && e.siteId === siteId
    && ['assigned', 'active'].includes(assignmentState(store, e.id)));
  return {
    ready: cr.ready && failing.length === 0 && hasAssignment,
    failing: [...new Set([...cr.failing, ...failing])],
    hasAssignment,
    companyReady: cr.ready,
  };
}

// ---------------------------------------------------------------------------
// Handover snapshots (§6.1.3, PS-INV-7, §7.3.2) — point-in-time, frozen into
// the HandoverRecord F. M2 freeze scope (M2's implementation decision,
// anchor §6.1.3): current lifecycle state, non-removed assignments with
// their state at freeze, current (latest-revision) Requirement set with
// scope, for the handed-over entity and its containment descendants.
// ---------------------------------------------------------------------------

function requirementSnapshotEntries(store, scopePred) {
  return applicableRequirements(store, null, scopePred).map((r) => ({
    id: r.id,
    groupId: r.groupId,
    scope: r.scope,
    revision: r.revision,
    reqType: r.reqType,
    title: r.title,
    projectId: r.projectId,
    siteId: r.siteId,
  }));
}

function assignmentSnapshotEntry(store, a) {
  return { id: a.id, type: a.type, workerId: a.workerId, state: assignmentState(store, a.id) };
}

function projectHandoverSnapshot(store, projectId, frozenAt) {
  const assignments = [...store.entities.values()]
    .filter((e) => (e.type === 'ProjectAssignment' && e.projectId === projectId)
      || (e.type === 'SiteAssignment' && store.entities.get(e.siteId)?.projectId === projectId))
    .map((a) => assignmentSnapshotEntry(store, a))
    .filter((a) => a.state !== 'removed');
  const requirements = requirementSnapshotEntries(store,
    (r) => (r.scope === 'project' && r.projectId === projectId)
      || (r.scope === 'site' && store.entities.get(r.siteId)?.projectId === projectId));
  return {
    scope: 'project',
    projectId,
    lifecycleState: projectLifecycleState(store, projectId),
    frozenAt,
    assignments,
    requirements,
  };
}

function siteHandoverSnapshot(store, siteId, frozenAt) {
  const site = store.entities.get(siteId);
  const assignments = [...store.entities.values()]
    .filter((e) => e.type === 'SiteAssignment' && e.siteId === siteId)
    .map((a) => assignmentSnapshotEntry(store, a))
    .filter((a) => a.state !== 'removed');
  const requirements = requirementSnapshotEntries(store,
    (r) => (r.scope === 'site' && r.siteId === siteId)
      || (r.scope === 'project' && r.projectId === site.projectId));
  return {
    scope: 'site',
    siteId,
    lifecycleState: siteLifecycleState(store, siteId),
    frozenAt,
    assignments,
    requirements,
  };
}

// ---------------------------------------------------------------------------
// Lifecycle transition tables
// ---------------------------------------------------------------------------

const PROJECT_TRANSITIONS = {
  ActivateProject: { from: ['draft'], event: 'activated', to: 'active' },
  SuspendProject: { from: ['active'], event: 'suspended', to: 'suspended', reason: true }, // §6.11.6
  ResumeProject: { from: ['suspended'], event: 'resumed', to: 'active' },
  CompleteProject: { from: ['active'], event: 'completed', to: 'completed' },
  ArchiveProject: { from: ['completed'], event: 'archived', to: 'archived' },
  CancelProject: { from: ['draft'], event: 'cancelled', to: 'cancelled' },
};

const SITE_TRANSITIONS = {
  MobiliseSite: { from: ['planned'], event: 'mobilising', to: 'mobilising' },
  ActivateSite: { from: ['mobilising'], event: 'activated', to: 'active' },
  DemobiliseSite: { from: ['active'], event: 'demobilising', to: 'demobilising' },
  CloseSite: { from: ['demobilising'], event: 'closed', to: 'closed' },
  ArchiveSite: { from: ['closed'], event: 'archived', to: 'archived' },
};

// §6.1.2: assigned → active → paused → active; removal from any live state.
const ASSIGNMENT_TRANSITIONS = {
  ActivateAssignment: { from: ['assigned'], event: 'activated' },
  PauseAssignment: { from: ['active'], event: 'paused' },
  ResumeAssignment: { from: ['paused'], event: 'resumed' },
  RemoveAssignment: { from: ['assigned', 'active', 'paused'], event: 'removed', reason: true }, // §6.3.6
};

const PARTY_TYPES = new Set(['epc_client', 'subcontractor']); // §6.1.2 vocabulary

// ---------------------------------------------------------------------------
// Handlers — each returns null on success or a rejection reason string.
// Validation completes before any mutation (AC-ARCH-G4 analogue).
// ---------------------------------------------------------------------------

function projectTransition(store, ctx, payload, spec) {
  const err = tenantEntity(store, ctx, payload.projectId, 'Project');
  if (err) return err;
  if (spec.reason && (typeof payload.reason !== 'string' || payload.reason.length === 0)) {
    return 'reason required for project suspension (§6.11.6)';
  }
  const cur = projectLifecycleState(store, payload.projectId);
  if (!spec.from.includes(cur)) return `cannot ${spec.event} project from state: ${cur}`;
  // PS-INV-2: an active Project has at least one Site.
  if (spec.to === 'active' && spec.event === 'activated') {
    const hasSite = [...store.entities.values()].some((e) => e.type === 'Site' && e.projectId === payload.projectId);
    if (!hasSite) return 'activation requires at least one Site (PS-INV-2)';
  }
  appendFact(store, ctx, {
    type: 'ProjectLifecycleEvent',
    subject: payload.projectId,
    companyId: ctx.companyId,
    ...(spec.reason ? { reason: payload.reason } : {}),
    payload: { event: spec.event, from: cur, to: spec.to },
  });
  return null;
}

function siteTransition(store, ctx, payload, spec) {
  const err = tenantEntity(store, ctx, payload.siteId, 'Site');
  if (err) return err;
  const cur = siteLifecycleState(store, payload.siteId);
  if (!spec.from.includes(cur)) return `cannot ${spec.event} site from state: ${cur}`;
  appendFact(store, ctx, {
    type: 'SiteLifecycleEvent',
    subject: payload.siteId,
    companyId: ctx.companyId,
    payload: { event: spec.event, from: cur, to: spec.to },
  });
  // §6.1.3 closure cascade: closing a Site marks the Site's SiteAssignment
  // records removed with the fixed reason "site closure" (state change via
  // fact, not deletion — §6.3.3). The parent ProjectAssignment records are
  // Worker×Project memberships (PS-INV-3) with no Site referent; they are
  // not touched (noted interpretation, M2/evidence/open-items.md).
  if (spec.event === 'closed') {
    for (const e of [...store.entities.values()]) {
      if (e.type === 'SiteAssignment' && e.siteId === payload.siteId
        && assignmentState(store, e.id) !== 'removed') {
        appendFact(store, ctx, {
          type: 'LifecycleEvent',
          subject: e.id,
          companyId: ctx.companyId,
          reason: 'site closure',
          payload: { event: 'removed', entityType: e.type },
        });
      }
    }
  }
  return null;
}

function assignmentTransition(store, ctx, payload, spec) {
  const a = store.entities.get(payload.assignmentId);
  if (!a || (a.type !== 'SiteAssignment' && a.type !== 'ProjectAssignment')) {
    return `assignment not found: ${payload.assignmentId}`;
  }
  if (ctx.companyId && a.companyId !== ctx.companyId) return 'cross-tenant reference rejected (DM-INV-5)';
  if (spec.reason && (typeof payload.reason !== 'string' || payload.reason.length === 0)) {
    return 'reason required for assignment removal (§6.3.6)';
  }
  const cur = assignmentState(store, payload.assignmentId);
  if (!spec.from.includes(cur)) return `cannot ${spec.event} assignment from state: ${cur}`;
  appendFact(store, ctx, {
    type: 'LifecycleEvent',
    subject: payload.assignmentId,
    companyId: ctx.companyId,
    ...(spec.reason ? { reason: payload.reason } : {}),
    payload: { event: spec.event, entityType: a.type },
  });
  return null;
}

// Independent Site operational suspension (§6.1.3 amended at EP-6.0,
// AMB-004): F-class SiteOperationalSuspension fact, subtype event
// activated|deactivated, mandatory reason. Not a lifecycle transition.
function siteSuspensionTransition(store, ctx, payload, event) {
  const err = tenantEntity(store, ctx, payload.siteId, 'Site');
  if (err) return err;
  if (typeof payload.reason !== 'string' || payload.reason.length === 0) {
    return 'reason required for site operational suspension (§6.1.3 amended)';
  }
  const active = independentSuspensionActive(store, payload.siteId);
  if (event === 'activated' && active) return 'site already independently suspended';
  if (event === 'deactivated' && !active) return 'site is not independently suspended';
  appendFact(store, ctx, {
    type: 'SiteOperationalSuspension',
    subject: payload.siteId,
    companyId: ctx.companyId,
    reason: payload.reason,
    payload: { event },
  });
  return null;
}

// Project transfer (§6.1.3 amended at EP-6.0, AMB-003 option C): a new
// Project identity is created under the receiving Company; Sites and
// Project/Site-scoped Requirements are copied as new identities; source
// assignments are marked removed with reason "project transfer" and none
// are copied; Company-scoped Requirements remain with the source Company; a
// TransferEvent links both Project identities. Source entities are
// deep-frozen at creation and cannot change — the copy is the mechanism.
function transferProject(store, ctx, payload) {
  const src = store.entities.get(payload.projectId);
  if (!src || src.type !== 'Project') return `Project not found: ${payload.projectId}`;
  const dest = store.entities.get(payload.toCompanyId);
  if (!dest || dest.type !== 'Company') return `Company not found: ${payload.toCompanyId}`;
  if (dest.id === src.companyId) return 'destination Company is the source Company';

  // New Project identity under the receiving Company (genesis state draft).
  const { id: _pid, type: _pt, scope: _ps, companyId: _pc, commandId: _pc1, actor: _pa,
    deviceId: _pd, deviceTimestamp: _pdt, serverTimestamp: _pst, state: _pst2, ...pFields } = src;
  const newProject = createEntity(store, ctx, {
    ...pFields,
    type: 'Project',
    scope: 'Company',
    companyId: dest.id,
    state: 'draft',
  });

  // Sites copied as new identities under the new Project (state planned).
  const siteIdMap = new Map();
  for (const e of [...store.entities.values()]) {
    if (e.type !== 'Site' || e.projectId !== src.id) continue;
    const { id: _sid, type: _st, scope: _ss, companyId: _sc, projectId: _sp, commandId: _sc1,
      actor: _sa, deviceId: _sd, deviceTimestamp: _sdt, serverTimestamp: _sst, state: _sst2, ...sFields } = e;
    const ns = createEntity(store, ctx, {
      ...sFields,
      type: 'Site',
      scope: 'Project',
      companyId: dest.id,
      projectId: newProject.id,
      state: 'planned',
    });
    siteIdMap.set(e.id, ns.id);
  }

  // Project/Site-scoped Requirements copied as new identities under the
  // receiving Company; Company-scoped Requirements remain with the source.
  for (const e of [...store.entities.values()]) {
    if (e.type !== 'Requirement') continue;
    if (e.scope !== 'project' && e.scope !== 'site') continue;
    if (e.scope === 'project' && e.projectId !== src.id) continue;
    if (e.scope === 'site' && !siteIdMap.has(e.siteId)) continue;
    const { id: _rid, companyId: _rc, commandId: _rc1, actor: _ra, deviceId: _rd,
      deviceTimestamp: _rdt, serverTimestamp: _rst, projectId: _rp, siteId: _rs,
      groupId: _rg, ...rFields } = e;
    createEntity(store, ctx, {
      ...rFields,
      type: 'Requirement',
      companyId: dest.id,
      projectId: e.scope === 'project' ? newProject.id : undefined,
      siteId: e.scope === 'site' ? siteIdMap.get(e.siteId) : undefined,
      groupId: nid(store, 'reqgrp'), // new identity: new requirement group
    });
  }

  // Source assignments removed with reason "project transfer"; none copied.
  for (const e of [...store.entities.values()]) {
    const inScope = (e.type === 'ProjectAssignment' && e.projectId === src.id)
      || (e.type === 'SiteAssignment' && store.entities.get(e.siteId)?.projectId === src.id);
    if (!inScope || assignmentState(store, e.id) === 'removed') continue;
    appendFact(store, ctx, {
      type: 'LifecycleEvent',
      subject: e.id,
      companyId: src.companyId,
      reason: 'project transfer',
      payload: { event: 'removed', entityType: e.type },
    });
  }

  // TransferEvent links old → new (§7.3 catalogue; §7.8 audit fields).
  appendFact(store, ctx, {
    type: 'TransferEvent',
    subject: src.id,
    companyId: src.companyId,
    payload: { fromProjectId: src.id, toProjectId: newProject.id, toCompanyId: dest.id },
  });
  return null;
}

// Site opt-out from a Project-scope Requirement (§6.1.3 amended at EP-6.0,
// AMB-005): F-class SiteRequirementOptOut fact referencing the Requirement,
// subtype event activated|deactivated, mandatory reason. Project-scope
// only; the Requirement must apply to the Site's Project.
function optOutTransition(store, ctx, payload, event) {
  const err = tenantEntity(store, ctx, payload.siteId, 'Site');
  if (err) return err;
  const reqErr = tenantEntity(store, ctx, payload.requirementId, 'Requirement');
  if (reqErr) return reqErr;
  if (typeof payload.reason !== 'string' || payload.reason.length === 0) {
    return 'reason required for requirement opt-out (§6.1.3 amended)';
  }
  const req = store.entities.get(payload.requirementId);
  if (req.scope !== 'project') return 'opt-out applies to project-scope Requirements only (§6.1.3 amended)';
  const site = store.entities.get(payload.siteId);
  if (req.projectId !== site.projectId) return 'requirement does not apply to this Site';
  const active = optOutActive(store, payload.siteId, payload.requirementId);
  if (event === 'activated' && active) return 'opt-out already active for this (Site, Requirement)';
  if (event === 'deactivated' && !active) return 'no active opt-out for this (Site, Requirement)';
  appendFact(store, ctx, {
    type: 'SiteRequirementOptOut',
    subject: payload.siteId,
    companyId: ctx.companyId,
    reason: payload.reason,
    payload: { event, requirementId: payload.requirementId },
  });
  return null;
}

const HANDLERS = {
  ActivateProject: (store, ctx, payload) => projectTransition(store, ctx, payload, PROJECT_TRANSITIONS.ActivateProject),
  SuspendProject: (store, ctx, payload) => projectTransition(store, ctx, payload, PROJECT_TRANSITIONS.SuspendProject),
  ResumeProject: (store, ctx, payload) => projectTransition(store, ctx, payload, PROJECT_TRANSITIONS.ResumeProject),
  CompleteProject: (store, ctx, payload) => projectTransition(store, ctx, payload, PROJECT_TRANSITIONS.CompleteProject),
  ArchiveProject: (store, ctx, payload) => projectTransition(store, ctx, payload, PROJECT_TRANSITIONS.ArchiveProject),
  CancelProject: (store, ctx, payload) => projectTransition(store, ctx, payload, PROJECT_TRANSITIONS.CancelProject),

  MobiliseSite: (store, ctx, payload) => siteTransition(store, ctx, payload, SITE_TRANSITIONS.MobiliseSite),
  ActivateSite: (store, ctx, payload) => siteTransition(store, ctx, payload, SITE_TRANSITIONS.ActivateSite),
  DemobiliseSite: (store, ctx, payload) => siteTransition(store, ctx, payload, SITE_TRANSITIONS.DemobiliseSite),
  CloseSite: (store, ctx, payload) => siteTransition(store, ctx, payload, SITE_TRANSITIONS.CloseSite),
  ArchiveSite: (store, ctx, payload) => siteTransition(store, ctx, payload, SITE_TRANSITIONS.ArchiveSite),

  SuspendSite: (store, ctx, payload) => siteSuspensionTransition(store, ctx, payload, 'activated'),
  UnsuspendSite: (store, ctx, payload) => siteSuspensionTransition(store, ctx, payload, 'deactivated'),
  TransferProject: (store, ctx, payload) => transferProject(store, ctx, payload),
  OptOutSiteRequirement: (store, ctx, payload) => optOutTransition(store, ctx, payload, 'activated'),
  RevokeSiteRequirementOptOut: (store, ctx, payload) => optOutTransition(store, ctx, payload, 'deactivated'),

  ActivateAssignment: (store, ctx, payload) => assignmentTransition(store, ctx, payload, ASSIGNMENT_TRANSITIONS.ActivateAssignment),
  PauseAssignment: (store, ctx, payload) => assignmentTransition(store, ctx, payload, ASSIGNMENT_TRANSITIONS.PauseAssignment),
  ResumeAssignment: (store, ctx, payload) => assignmentTransition(store, ctx, payload, ASSIGNMENT_TRANSITIONS.ResumeAssignment),
  RemoveAssignment: (store, ctx, payload) => assignmentTransition(store, ctx, payload, ASSIGNMENT_TRANSITIONS.RemoveAssignment),

  // --- ExternalParty (§6.1.2, PS-INV-6) ---

  CreateExternalParty(store, ctx, payload) {
    if (typeof payload.name !== 'string' || payload.name.length === 0) return 'name required';
    if (!PARTY_TYPES.has(payload.partyType)) return `invalid party type (§6.1.2: epc_client | subcontractor): ${payload.partyType}`;
    createEntity(store, ctx, {
      type: 'ExternalParty',
      scope: 'Company',
      companyId: ctx.companyId,
      name: payload.name,
      partyType: payload.partyType,
      contact: payload.contact ?? null,
    });
    return null;
  },

  UpdateExternalParty(store, ctx, payload) {
    const err = tenantEntity(store, ctx, payload.externalPartyId, 'ExternalParty');
    if (err) return err;
    if (externalPartyState(store, payload.externalPartyId) !== 'active') return 'archived ExternalParty admits no update';
    if (!payload.changes || typeof payload.changes !== 'object' || Object.keys(payload.changes).length === 0) {
      return 'changes required';
    }
    appendFact(store, ctx, {
      type: 'LifecycleEvent',
      subject: payload.externalPartyId,
      companyId: ctx.companyId,
      payload: { event: 'updated', entityType: 'ExternalParty', changes: payload.changes },
    });
    return null;
  },

  ArchiveExternalParty(store, ctx, payload) {
    const err = tenantEntity(store, ctx, payload.externalPartyId, 'ExternalParty');
    if (err) return err;
    if (externalPartyState(store, payload.externalPartyId) !== 'active') return 'ExternalParty already archived';
    appendFact(store, ctx, {
      type: 'LifecycleEvent',
      subject: payload.externalPartyId,
      companyId: ctx.companyId,
      payload: { event: 'archived', entityType: 'ExternalParty' },
    });
    return null;
  },

  // --- ProjectExternalParty (§7.5 relationship-entity rule) ---

  AssociateExternalParty(store, ctx, payload) {
    const pErr = tenantEntity(store, ctx, payload.projectId, 'Project');
    if (pErr) return pErr;
    const eErr = tenantEntity(store, ctx, payload.externalPartyId, 'ExternalParty');
    if (eErr) return eErr;
    if (externalPartyState(store, payload.externalPartyId) !== 'active') {
      return 'archived ExternalParty cannot be newly associated';
    }
    const duplicate = [...store.entities.values()].some((e) => e.type === 'ProjectExternalParty'
      && e.projectId === payload.projectId && e.externalPartyId === payload.externalPartyId
      && projectExternalPartyState(store, e.id) === 'associated');
    if (duplicate) return 'active association already exists for this (Project, ExternalParty) pair (§7.5)';
    const pxp = createEntity(store, ctx, {
      type: 'ProjectExternalParty',
      scope: 'Project',
      companyId: ctx.companyId,
      projectId: payload.projectId,
      externalPartyId: payload.externalPartyId,
    });
    appendFact(store, ctx, {
      type: 'LifecycleEvent',
      subject: pxp.id,
      companyId: ctx.companyId,
      payload: { event: 'associated', entityType: 'ProjectExternalParty' },
    });
    return null;
  },

  RemoveProjectExternalParty(store, ctx, payload) {
    const err = tenantEntity(store, ctx, payload.projectExternalPartyId, 'ProjectExternalParty');
    if (err) return err;
    if (projectExternalPartyState(store, payload.projectExternalPartyId) !== 'associated') {
      return 'association already removed (§7.5: removed is terminal)';
    }
    appendFact(store, ctx, {
      type: 'LifecycleEvent',
      subject: payload.projectExternalPartyId,
      companyId: ctx.companyId,
      payload: { event: 'removed', entityType: 'ProjectExternalParty' },
    });
    return null;
  },

  // --- Handover (§6.1.3, PS-INV-7, §7.3.2) ---

  RecordHandover(store, ctx, payload) {
    if (payload.scope === 'project') {
      const err = tenantEntity(store, ctx, payload.projectId, 'Project');
      if (err) return err;
      const snapshot = projectHandoverSnapshot(store, payload.projectId, ctx.serverTimestamp);
      appendFact(store, ctx, {
        type: 'HandoverRecord',
        subject: payload.projectId,
        companyId: ctx.companyId,
        payload: { scope: 'project', projectId: payload.projectId, snapshot },
      });
      return null;
    }
    if (payload.scope === 'site') {
      const err = tenantEntity(store, ctx, payload.siteId, 'Site');
      if (err) return err;
      const snapshot = siteHandoverSnapshot(store, payload.siteId, ctx.serverTimestamp);
      appendFact(store, ctx, {
        type: 'HandoverRecord',
        subject: payload.siteId,
        companyId: ctx.companyId,
        payload: { scope: 'site', siteId: payload.siteId, snapshot },
      });
      return null;
    }
    return `invalid handover scope (§6.1.3): ${payload.scope}`;
  },
};

// ---------------------------------------------------------------------------
// execute — M2 commands handled here; everything else delegates to M1
// (inheritance), including M1's unknown-command-type rejection.
// ---------------------------------------------------------------------------

export function execute(store, cmd) {
  if (!M2_COMMANDS.has(cmd.type)) return m1.execute(store, cmd);

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

  const auth = M2_COMMAND_AUTH[cmd.type];

  // Platform Admin (system) surface — TransferProject only (§6.11). A
  // system actor crosses Companies by design; tenancy checks do not apply
  // to the transfer itself (M1 precedent: ctx.actor = { kind: 'system' }).
  if (cmd.actor?.system) {
    ctx.actor = { kind: 'system' };
    if (!auth.system) return reject(store, ctx, 'command requires a Worker actor (§6.11.2)');
    const err = HANDLERS[cmd.type](store, ctx, cmd.payload ?? {});
    if (err) return reject(store, ctx, err);
    ensureDevice(store, ctx);
    return accept(store, ctx);
  }

  // All other M2 commands are company-scoped administrative/operational
  // surfaces: a Worker actor is required (§6.11.2).
  const actorWorker = cmd.actor?.workerId ? store.entities.get(cmd.actor.workerId) : null;
  if (!actorWorker || actorWorker.type !== 'Worker') {
    ctx.actor = { kind: 'worker', id: cmd.actor?.workerId ?? null };
    return reject(store, ctx, cmd.actor?.workerId ? 'actor worker not found' : 'command requires a Worker actor');
  }
  ctx.actor = { kind: 'worker', id: actorWorker.id };
  ctx.companyId = actorWorker.companyId;

  // §6.3.3: a suspended Worker cannot initiate new actions; offboarded is
  // terminal.
  const lc = m1.workerLifecycleState(store, actorWorker.id);
  if (lc === 'suspended') return reject(store, ctx, 'actor worker is suspended');
  if (lc === 'offboarded') return reject(store, ctx, 'actor worker is offboarded');

  // WC-INV-8: capability flags only; role label is never consulted.
  if (auth.system) return reject(store, ctx, 'TransferProject is a Platform Admin (system) surface (§6.11)');
  const caps = m1.currentCapabilities(store, actorWorker.id);
  if (!auth.cap.some((c) => caps.has(c))) {
    return reject(store, ctx, `requires capability: ${auth.cap.join(' | ')}`);
  }

  const err = HANDLERS[cmd.type](store, ctx, cmd.payload ?? {});
  if (err) return reject(store, ctx, err);

  // Device attribution materialises only for accepted commands (AC-ARCH-D5).
  ensureDevice(store, ctx);
  return accept(store, ctx);
}
