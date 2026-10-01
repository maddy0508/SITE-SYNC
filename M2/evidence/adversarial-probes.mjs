// M2 adversarial probes (Skill 07). Each probe asks how the M2 domain core
// could APPEAR correct while violating the blueprint, then executes the
// attack. Output lines: PROBE <id> <PASS|FAIL> <summary>.
// Dispositions are recorded in M2/evidence/adversarial.md.
// Coverage (M2 contract, adversarial minimum): tenancy, identity,
// immutability, derived-vs-authoritative, offline durability, idempotency,
// conflict semantics, audit, second source of truth, offline reads,
// archive/retention, transfer provenance, suspension overlay derivation,
// handover snapshot immutability.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const m2 = await import(join(HERE, '..', 'src', 'domain.js'));
const m1 = await import(join(HERE, '..', '..', 'M1', 'src', 'domain.js'));

let failures = 0;
function probe(id, ok, summary) {
  if (!ok) failures += 1;
  console.log(`PROBE ${id} ${ok ? 'PASS' : 'FAIL'} ${summary}`);
}

// Two-tenant scaffold with an active project/site, a worker, an assignment,
// and an ExternalParty in tenant A; a parallel admin in tenant B.
function boot() {
  const s = m1.createStore();
  m1.execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'fa@x.co', name: 'FA' } }, payload: { companyName: 'Tenant A' } });
  m1.execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'fb@x.co', name: 'FB' } }, payload: { companyName: 'Tenant B' } });
  const companyA = [...s.entities.values()].find((e) => e.type === 'Company' && e.name === 'Tenant A');
  const companyB = [...s.entities.values()].find((e) => e.type === 'Company' && e.name === 'Tenant B');
  const adminA = [...s.entities.values()].find((e) => e.type === 'Worker' && e.companyId === companyA.id);
  const adminB = [...s.entities.values()].find((e) => e.type === 'Worker' && e.companyId === companyB.id);
  m1.execute(s, { type: 'CreateProject', actor: { workerId: adminA.id }, payload: { companyId: companyA.id, name: 'PA' } });
  const project = [...s.entities.values()].find((e) => e.type === 'Project');
  m1.execute(s, { type: 'CreateSite', actor: { workerId: adminA.id }, payload: { projectId: project.id, name: 'SA' } });
  const site = [...s.entities.values()].find((e) => e.type === 'Site');
  m1.execute(s, { type: 'CreateInvitation', actor: { workerId: adminA.id }, payload: { email: 'wa@x.co', name: 'WA' } });
  const inv = s.facts.find((f) => f.type === 'Invitation' && f.state === 'pending');
  m1.execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'wa@x.co', name: 'WA' } }, payload: { invitationId: inv.invitationId } });
  const worker = [...s.entities.values()].find((e) => e.type === 'Worker' && e.companyId === companyA.id && e.id !== adminA.id);
  m1.execute(s, { type: 'AssignWorkerToSite', actor: { workerId: adminA.id }, payload: { workerId: worker.id, siteId: site.id } });
  const asg = [...s.entities.values()].find((e) => e.type === 'SiteAssignment');
  m2.execute(s, { type: 'CreateExternalParty', actor: { workerId: adminA.id }, payload: { name: 'EP A', partyType: 'epc_client' } });
  const ep = [...s.entities.values()].find((e) => e.type === 'ExternalParty');
  return { s, companyA, companyB, adminA, adminB, project, site, worker, asg, ep };
}

// --- Q1: tenancy (DM-INV-5, AC-ARCH-B1) ---
{
  const { s, companyB, adminB, project, site, asg, ep } = boot();
  m2.execute(s, { type: 'ActivateProject', actor: { workerId: s ? [...s.entities.values()].find((e) => e.type === 'Worker' && e.companyId !== companyB.id).id : null }, payload: { projectId: project.id } });
  const B = { workerId: adminB.id };
  const attempts = [
    m2.execute(s, { type: 'SuspendProject', actor: B, payload: { projectId: project.id, reason: 'hostile' } }),
    m2.execute(s, { type: 'CloseSite', actor: B, payload: { siteId: site.id } }),
    m2.execute(s, { type: 'ArchiveExternalParty', actor: B, payload: { externalPartyId: ep.id } }),
    m2.execute(s, { type: 'RemoveAssignment', actor: B, payload: { assignmentId: asg.id, reason: 'hostile' } }),
    m2.execute(s, { type: 'RecordHandover', actor: B, payload: { scope: 'project', projectId: project.id } }),
    m2.execute(s, { type: 'AssociateExternalParty', actor: B, payload: { projectId: project.id, externalPartyId: ep.id } }),
  ];
  const allRejected = attempts.every((r) => r.outcome === 'server rejected' && /cross-tenant|not found/.test(r.reason ?? ''));
  const readBlocked = m1.readForCompany(s, companyB.id, ep.id) === null
    && m1.readForCompany(s, companyB.id, project.id) === null;
  probe('Q1', allRejected && readBlocked, `cross-tenant M2 writes rejected (6/6: ${allRejected}); storage reads bounded (${readBlocked})`);
}

// --- Q2: identity (single stable identity; new identity on re-creation) ---
{
  const { s, adminA, project, site, worker, asg, ep } = boot();
  const A = { workerId: adminA.id };
  m2.execute(s, { type: 'AssociateExternalParty', actor: A, payload: { projectId: project.id, externalPartyId: ep.id } });
  const pxp1 = [...s.entities.values()].find((e) => e.type === 'ProjectExternalParty');
  m2.execute(s, { type: 'RemoveProjectExternalParty', actor: A, payload: { projectExternalPartyId: pxp1.id } });
  m2.execute(s, { type: 'AssociateExternalParty', actor: A, payload: { projectId: project.id, externalPartyId: ep.id } });
  const pxp2 = [...s.entities.values()].filter((e) => e.type === 'ProjectExternalParty').at(-1);
  m2.execute(s, { type: 'RemoveAssignment', actor: A, payload: { assignmentId: asg.id, reason: 'r' } });
  m1.execute(s, { type: 'AssignWorkerToSite', actor: A, payload: { workerId: worker.id, siteId: site.id } });
  const asg2 = [...s.entities.values()].filter((e) => e.type === 'SiteAssignment').at(-1);
  const ok = pxp1.id !== pxp2.id
    && m2.projectExternalPartyState(s, pxp1.id) === 'removed'
    && m2.projectExternalPartyState(s, pxp2.id) === 'associated'
    && asg.id !== asg2.id
    && m2.assignmentState(s, asg.id) === 'removed'
    && m2.assignmentState(s, asg2.id) === 'assigned';
  probe('Q2', ok, 're-association and re-assignment create new identities; removed records persist unreactivated (§7.5)');
}

// --- Q3: immutability (DM-INV-2, AC-ARCH-D4) ---
{
  const { s, adminA, project, ep } = boot();
  const A = { workerId: adminA.id };
  m2.execute(s, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } });
  m2.execute(s, { type: 'RecordHandover', actor: A, payload: { scope: 'project', projectId: project.id } });
  const ho = s.facts.find((f) => f.type === 'HandoverRecord');
  const ev = s.facts.find((f) => f.type === 'ProjectLifecycleEvent');
  let threw = 0;
  try { ep.name = 'mutated'; } catch { threw += 1; }
  try { ho.payload.snapshot.lifecycleState = 'completed'; } catch { threw += 1; }
  try { ev.payload.event = 'archived'; } catch { threw += 1; }
  try { ho.payload.snapshot.assignments.push({ id: 'fake' }); } catch { threw += 1; }
  const intact = ep.name === 'EP A' && ev.payload.event === 'activated';
  probe('Q3', threw === 4 && intact, `E genesis / HandoverRecord / LifecycleEvent / snapshot-nested arrays all deep-frozen (mutation attempts threw: ${threw}/4)`);
}

// --- Q4: derived-vs-authoritative (DM-INV-3; no stored status) ---
{
  const { s, adminA, project, site, asg, ep } = boot();
  const A = { workerId: adminA.id };
  // M2-created entities carry no state/status field at all.
  const pxpBefore = [...s.entities.values()].find((e) => e.type === 'ProjectExternalParty');
  const noStoredStatus = !('state' in ep) && !('status' in ep) && !pxpBefore;
  // Derivations recompute from facts: after activation + suspension the same
  // function returns different values with no stored field changing.
  const d0 = m2.projectLifecycleState(s, project.id);
  m2.execute(s, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } });
  const d1 = m2.projectLifecycleState(s, project.id);
  m2.execute(s, { type: 'SuspendProject', actor: A, payload: { projectId: project.id, reason: 'q4' } });
  const d2 = m2.projectLifecycleState(s, project.id);
  const projGenesisUnchanged = project.state === 'draft';
  const ovl = m2.siteOperationalStatus(s, site.id);
  const asgDerived = m2.assignmentState(s, asg.id) === 'assigned' && asg.state === 'assigned';
  probe('Q4', noStoredStatus && d0 === 'draft' && d1 === 'active' && d2 === 'suspended' && projGenesisUnchanged && ovl.projectSuspended && asgDerived,
    `M2 entities store no status (${noStoredStatus}); lifecycle/overlay/assignment state recompute from facts (draft→active→suspended; project genesis untouched: ${projGenesisUnchanged})`);
}

// --- Q5: offline durability (§6.10.2 — M2 adds no offline path) ---
{
  const { s, adminA, project } = boot();
  const offlineSetUnchanged = m1.OFFLINE_CAPABLE_COMMANDS.size === 1 && m1.OFFLINE_CAPABLE_COMMANDS.has('AcknowledgeRequirement');
  const noM2OfflineExport = !('executeOffline' in m2) && !('transmitQueue' in m2) && !('createCache' in m2);
  const r = m1.executeOffline(s, { type: 'SuspendProject', actor: { workerId: adminA.id }, payload: { projectId: project.id, reason: 'offline' } });
  const locallyRejected = r.outcome === 'locally rejected';
  const nothingQueued = s.queue.length === 0;
  probe('Q5', offlineSetUnchanged && noM2OfflineExport && locallyRejected && nothingQueued,
    `offline-capable set unchanged (${[...m1.OFFLINE_CAPABLE_COMMANDS].join(',')}); M2 command offline attempt locally rejected, nothing queued (${nothingQueued})`);
}

// --- Q6: idempotency (AC-ARCH-C2/G1, §6.10.3) ---
{
  const { s, adminA, project } = boot();
  const A = { workerId: adminA.id };
  m2.execute(s, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } });
  const cmdId = 'cmd-dup-1';
  const r1 = m2.execute(s, { type: 'SuspendProject', commandId: cmdId, actor: A, payload: { projectId: project.id, reason: 'hold' } });
  const factsAfterFirst = s.facts.length;
  const r2 = m2.execute(s, { type: 'SuspendProject', commandId: cmdId, actor: A, payload: { projectId: project.id, reason: 'hold' } });
  const r3 = m2.execute(s, { type: 'ResumeProject', commandId: cmdId, actor: A, payload: { projectId: project.id } }); // id reuse, different payload
  const suspEvents = s.facts.filter((f) => f.type === 'ProjectLifecycleEvent' && f.payload.event === 'suspended');
  const ok = r1.outcome === 'server accepted'
    && r2.duplicate === true && r2.outcome === 'server accepted'
    && r3.duplicate === true && r3.outcome === 'server accepted' // replays FIRST outcome
    && s.facts.length === factsAfterFirst
    && suspEvents.length === 1
    && m2.projectLifecycleState(s, project.id) === 'suspended'; // r3 did not apply
  probe('Q6', ok, 'duplicate delivery and commandId reuse replay the recorded outcome; one suspension event; no reapplication');
}

// --- Q7: conflict semantics (declared rule; no silent loss) ---
{
  const { s, adminA, ep } = boot();
  const A = { workerId: adminA.id };
  m2.execute(s, { type: 'UpdateExternalParty', actor: A, payload: { externalPartyId: ep.id, changes: { name: 'First' } } });
  m2.execute(s, { type: 'UpdateExternalParty', actor: A, payload: { externalPartyId: ep.id, changes: { name: 'Second' } } });
  const updFacts = s.facts.filter((f) => f.type === 'LifecycleEvent' && f.subject === ep.id && f.payload.event === 'updated');
  const derived = m2.externalPartyProfile(s, ep.id).name;
  // Competing lifecycle intents: second one lands on a wrong state and is
  // rejected with attribution, not silently dropped or applied.
  m2.execute(s, { type: 'ActivateProject', actor: A, payload: { projectId: [...s.entities.values()].find((e) => e.type === 'Project').id } });
  const pid = [...s.entities.values()].find((e) => e.type === 'Project').id;
  const rej = m2.execute(s, { type: 'ActivateProject', actor: A, payload: { projectId: pid } });
  const ok = updFacts.length === 2 && derived === 'Second' && rej.outcome === 'server rejected'
    && s.facts.some((f) => f.type === 'CommandOutcome' && f.commandId === rej.commandId && f.payload.outcome === 'server rejected');
  probe('Q7', ok, 'same-field updates: both facts recorded, later value derived; competing lifecycle intent rejected with audited outcome');
}

// --- Q8: audit (§7.8, AC-ARCH-D2/D3/D5) ---
{
  const { s, adminA, project } = boot();
  const A = { workerId: adminA.id };
  const cmds = [
    m2.execute(s, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } }),
    m2.execute(s, { type: 'SuspendProject', actor: A, payload: { projectId: project.id } }), // rejected: no reason
    m2.execute(s, { type: 'RecordHandover', actor: A, payload: { scope: 'project', projectId: project.id } }),
  ];
  const outcomes = s.facts.filter((f) => f.type === 'CommandOutcome' && cmds.some((c) => c.commandId === f.commandId));
  const oneEach = cmds.every((c) => outcomes.filter((f) => f.commandId === c.commandId).length === 1);
  const receipts = s.facts.filter((f) => f.type === 'CommandReceipt');
  const acceptedReceipted = cmds.filter((c) => c.outcome === 'server accepted')
    .every((c) => receipts.some((f) => f.commandId === c.commandId));
  const rejectedNoReceipt = cmds.filter((c) => c.outcome === 'server rejected')
    .every((c) => !receipts.some((f) => f.commandId === c.commandId));
  const genesisTraced = [...s.entities.values()].filter((e) => e.type === 'ExternalParty' || e.type === 'ProjectExternalParty')
    .every((e) => receipts.some((f) => f.commandId === e.commandId));
  probe('Q8', oneEach && acceptedReceipted && rejectedNoReceipt && genesisTraced,
    `one CommandOutcome per command (${oneEach}); receipts exactly on accepts (${acceptedReceipted && rejectedNoReceipt}); M2 genesis records trace to receipted commands (${genesisTraced})`);
}

// --- Q9: second source of truth (commandOutcomes is an index, not a shadow store) ---
{
  const { s, adminA, project, site } = boot();
  const A = { workerId: adminA.id };
  m2.execute(s, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } });
  m2.execute(s, { type: 'MobiliseSite', actor: A, payload: { siteId: site.id } });
  m2.execute(s, { type: 'SuspendProject', actor: A, payload: { projectId: project.id, reason: 'q9' } });
  m2.execute(s, { type: 'CompleteProject', actor: A, payload: { projectId: project.id } }); // rejected
  const outcomeFacts = new Map(s.facts.filter((f) => f.type === 'CommandOutcome').map((f) => [f.commandId, f.payload.outcome]));
  let consistent = true;
  for (const [cid, rec] of s.commandOutcomes) {
    if (outcomeFacts.get(cid) !== rec.outcome) consistent = false;
  }
  for (const [cid, oc] of outcomeFacts) {
    if (s.commandOutcomes.get(cid)?.outcome !== oc) consistent = false;
  }
  probe('Q9', consistent, 'commandOutcomes index exactly mirrors CommandOutcome facts for M2 + M1 commands (both directions)');
}

// --- Q10: offline reads (no new cache surface in M2) ---
{
  const exported = Object.keys(m2).sort();
  const noCacheSurface = !exported.some((k) => /cache|snapshot-read|offline/i.test(k));
  const expectedExports = ['M2_COMMAND_TYPES', 'assignmentState', 'execute', 'externalPartyProfile', 'externalPartyState',
    'projectExternalPartyState', 'projectLifecycleState', 'siteLifecycleState', 'siteOperationalStatus', 'siteReady'];
  const exact = JSON.stringify(exported) === JSON.stringify(expectedExports.sort());
  probe('Q10', noCacheSurface && exact, `M2 exports exactly the derivations + execute (${exported.length} exports); no cache/offline-read surface introduced`);
}

// --- Q11: archive/retention (terminal archive; records persist; no deletion) ---
{
  const { s, adminA, project, site, asg, ep } = boot();
  const A = { workerId: adminA.id };
  const entityCountBefore = s.entities.size;
  m2.execute(s, { type: 'ArchiveExternalParty', actor: A, payload: { externalPartyId: ep.id } });
  const upd = m2.execute(s, { type: 'UpdateExternalParty', actor: A, payload: { externalPartyId: ep.id, changes: { name: 'X' } } });
  const dbl = m2.execute(s, { type: 'ArchiveExternalParty', actor: A, payload: { externalPartyId: ep.id } });
  m2.execute(s, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } });
  m2.execute(s, { type: 'MobiliseSite', actor: A, payload: { siteId: site.id } });
  m2.execute(s, { type: 'ActivateSite', actor: A, payload: { siteId: site.id } });
  m2.execute(s, { type: 'DemobiliseSite', actor: A, payload: { siteId: site.id } });
  m2.execute(s, { type: 'CloseSite', actor: A, payload: { siteId: site.id } });
  m2.execute(s, { type: 'ArchiveSite', actor: A, payload: { siteId: site.id } });
  const reopen = m2.execute(s, { type: 'ActivateSite', actor: A, payload: { siteId: site.id } });
  const nothingDeleted = s.entities.size === entityCountBefore
    && s.entities.has(ep.id) && s.entities.has(asg.id) && s.entities.has(site.id);
  const ok = upd.outcome === 'server rejected' && dbl.outcome === 'server rejected'
    && reopen.outcome === 'server rejected' && nothingDeleted
    && m2.assignmentState(s, asg.id) === 'removed'
    && m2.siteLifecycleState(s, site.id) === 'archived';
  probe('Q11', ok, 'archive terminal (EP update/double-archive/site reopen rejected); closure cascade recorded; zero entities deleted');
}

// --- Q12: transfer authority and provenance (EP-6.0; AMB-003 resolved) ---
{
  const { s, companyA, companyB, adminA, project } = boot();
  const A = { workerId: adminA.id };
  // company_admin (even the source Company's) cannot drive transfer:
  // Platform Admin (system) surface only.
  const byAdmin = m2.execute(s, { type: 'TransferProject', actor: A, payload: { projectId: project.id, toCompanyId: companyB.id } });
  const badProject = m2.execute(s, { type: 'TransferProject', actor: { system: true }, payload: { projectId: 'ent-nope', toCompanyId: companyB.id } });
  const badCompany = m2.execute(s, { type: 'TransferProject', actor: { system: true }, payload: { projectId: project.id, toCompanyId: 'ent-nope' } });
  const sameCo = m2.execute(s, { type: 'TransferProject', actor: { system: true }, payload: { projectId: project.id, toCompanyId: companyA.id } });
  const genesisJson = JSON.stringify(project);
  const r = m2.execute(s, { type: 'TransferProject', actor: { system: true }, payload: { projectId: project.id, toCompanyId: companyB.id } });
  const tev = s.facts.find((f) => f.type === 'TransferEvent');
  const links = !!tev && tev.payload.fromProjectId === project.id && typeof tev.payload.toProjectId === 'string';
  const sourceUntouched = JSON.stringify(project) === genesisJson;
  const dup = m2.execute(s, { type: 'TransferProject', commandId: r.commandId, actor: { system: true }, payload: { projectId: project.id, toCompanyId: companyB.id } });
  const oneEvent = s.facts.filter((f) => f.type === 'TransferEvent').length === 1;
  const ok = byAdmin.outcome === 'server rejected'
    && badProject.outcome === 'server rejected' && badCompany.outcome === 'server rejected'
    && sameCo.outcome === 'server rejected'
    && r.outcome === 'server accepted' && links && sourceUntouched
    && dup.duplicate === true && oneEvent;
  probe('Q12', ok, `transfer is system-only (company_admin rejected: ${byAdmin.outcome === 'server rejected'}); bad refs/self-transfer rejected; TransferEvent links old→new (${links}); source genesis byte-identical (${sourceUntouched}); replay adds no second TransferEvent (${oneEvent})`);
}

// --- Q13: suspension overlay derivation (D-class; §6.1.3) ---
{
  const { s, adminA, project, site } = boot();
  const A = { workerId: adminA.id };
  m2.execute(s, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } });
  m2.execute(s, { type: 'MobiliseSite', actor: A, payload: { siteId: site.id } });
  m2.execute(s, { type: 'ActivateSite', actor: A, payload: { siteId: site.id } });
  const siteGenesisJson = JSON.stringify(site);
  const factsBefore = s.facts.length;
  m2.execute(s, { type: 'SuspendProject', actor: A, payload: { projectId: project.id, reason: 'q13' } });
  const on = m2.siteOperationalStatus(s, site.id);
  const newFacts = s.facts.slice(factsBefore);
  const noSiteFacts = !newFacts.some((f) => f.type === 'SiteLifecycleEvent' || f.subject === site.id);
  const siteUntouched = JSON.stringify(site) === siteGenesisJson;
  const underlyingIntact = m2.siteLifecycleState(s, site.id) === 'active';
  m2.execute(s, { type: 'ResumeProject', actor: A, payload: { projectId: project.id } });
  const off = m2.siteOperationalStatus(s, site.id);
  const ok = on.projectSuspended && on.operational === 'suspended' && noSiteFacts && siteUntouched && underlyingIntact
    && !off.projectSuspended && off.operational === 'normal';
  probe('Q13', ok, `overlay derives from the Project stream alone: no Site facts (${noSiteFacts}), Site genesis byte-identical (${siteUntouched}), resume clears it`);
}

// --- Q14: handover snapshot immutability (§6.1.3, PS-INV-7) ---
{
  const { s, adminA, project, site, worker, asg } = boot();
  const A = { workerId: adminA.id };
  m2.execute(s, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } });
  m2.execute(s, { type: 'RecordHandover', actor: A, payload: { scope: 'project', projectId: project.id } });
  const ho = s.facts.find((f) => f.type === 'HandoverRecord');
  const frozen = JSON.stringify(ho);
  m2.execute(s, { type: 'SuspendProject', actor: A, payload: { projectId: project.id, reason: 'q14' } });
  m2.execute(s, { type: 'RemoveAssignment', actor: A, payload: { assignmentId: asg.id, reason: 'q14' } });
  m1.execute(s, { type: 'CreateRequirement', actor: A, payload: { scope: 'project', projectId: project.id, reqType: 'induction', title: 'late', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } } });
  const unchanged = JSON.stringify(ho) === frozen && ho.payload.snapshot.lifecycleState === 'active';
  m2.execute(s, { type: 'RecordHandover', actor: A, payload: { scope: 'project', projectId: project.id } });
  const ho2 = s.facts.filter((f) => f.type === 'HandoverRecord').at(-1);
  const pointInTime = ho2.id !== ho.id && ho2.payload.snapshot.lifecycleState === 'suspended'
    && ho2.payload.snapshot.assignments.length === 0
    && ho2.payload.snapshot.requirements.length === 1;
  probe('Q14', unchanged && pointInTime, `frozen record byte-identical after lifecycle/assignment/requirement change (${unchanged}); later handover is a new point-in-time record (${pointInTime})`);
}

// --- Q15: independent suspension fact discipline (EP-6.0; AMB-004) ---
{
  const { s, adminA, project, site } = boot();
  const A = { workerId: adminA.id };
  m2.execute(s, { type: 'ActivateProject', actor: A, payload: { projectId: project.id } });
  m2.execute(s, { type: 'MobiliseSite', actor: A, payload: { siteId: site.id } });
  m2.execute(s, { type: 'ActivateSite', actor: A, payload: { siteId: site.id } });
  const noReason = m2.execute(s, { type: 'SuspendSite', actor: A, payload: { siteId: site.id } });
  const unsuspendFirst = m2.execute(s, { type: 'UnsuspendSite', actor: A, payload: { siteId: site.id, reason: 'x' } });
  m2.execute(s, { type: 'SuspendSite', actor: A, payload: { siteId: site.id, reason: 'q15' } });
  const dbl = m2.execute(s, { type: 'SuspendSite', actor: A, payload: { siteId: site.id, reason: 'again' } });
  const fact = s.facts.find((f) => f.type === 'SiteOperationalSuspension');
  let frozen = false;
  try { fact.reason = 'mutated'; } catch { frozen = true; }
  // A project suspension + resume must not lift the independent stream.
  m2.execute(s, { type: 'SuspendProject', actor: A, payload: { projectId: project.id, reason: 'q15' } });
  m2.execute(s, { type: 'ResumeProject', actor: A, payload: { projectId: project.id } });
  const stillSuspended = m2.siteOperationalStatus(s, site.id).operational === 'suspended';
  const lifecycleUntouched = m2.siteLifecycleState(s, site.id) === 'active';
  const ok = noReason.outcome === 'server rejected' && unsuspendFirst.outcome === 'server rejected'
    && dbl.outcome === 'server rejected' && frozen && stillSuspended && lifecycleUntouched
    && s.facts.filter((f) => f.type === 'SiteOperationalSuspension').length === 1;
  probe('Q15', ok, `reason mandatory (${noReason.outcome === 'server rejected'}); unsuspend-without-active and double-suspend rejected; fact frozen (${frozen}); project suspend/resume does not lift the independent stream (${stillSuspended})`);
}

// --- Q16: opt-out guard rails (EP-6.0; AMB-005) ---
{
  const { s, companyA, adminA, project, site } = boot();
  const A = { workerId: adminA.id };
  const mkReq = (payload) => {
    const before = new Set([...s.entities.values()].filter((e) => e.type === 'Requirement').map((e) => e.id));
    m1.execute(s, { type: 'CreateRequirement', actor: A, payload });
    return [...s.entities.values()].find((e) => e.type === 'Requirement' && !before.has(e.id));
  };
  const pReq = mkReq({ scope: 'project', projectId: project.id, reqType: 'induction', title: 'P', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } });
  const sReq = mkReq({ scope: 'site', siteId: site.id, reqType: 'induction', title: 'S', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } });
  const cReq = mkReq({ scope: 'company', companyId: companyA.id, reqType: 'acknowledgement', title: 'C', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } });
  m1.execute(s, { type: 'CreateProject', actor: A, payload: { companyId: companyA.id, name: 'P2' } });
  const project2 = [...s.entities.values()].filter((e) => e.type === 'Project').at(-1);
  const otherPReq = mkReq({ scope: 'project', projectId: project2.id, reqType: 'induction', title: 'P2', appliesTo: { kind: 'all_workers' }, requiresVerification: false, expiry: { kind: 'none' } });
  const noReason = m2.execute(s, { type: 'OptOutSiteRequirement', actor: A, payload: { siteId: site.id, requirementId: pReq.id } });
  const siteScope = m2.execute(s, { type: 'OptOutSiteRequirement', actor: A, payload: { siteId: site.id, requirementId: sReq.id, reason: 'x' } });
  const companyScope = m2.execute(s, { type: 'OptOutSiteRequirement', actor: A, payload: { siteId: site.id, requirementId: cReq.id, reason: 'x' } });
  const wrongProject = m2.execute(s, { type: 'OptOutSiteRequirement', actor: A, payload: { siteId: site.id, requirementId: otherPReq.id, reason: 'x' } });
  const revokeNone = m2.execute(s, { type: 'RevokeSiteRequirementOptOut', actor: A, payload: { siteId: site.id, requirementId: pReq.id, reason: 'x' } });
  m2.execute(s, { type: 'OptOutSiteRequirement', actor: A, payload: { siteId: site.id, requirementId: pReq.id, reason: 'q16' } });
  const dup = m2.execute(s, { type: 'OptOutSiteRequirement', actor: A, payload: { siteId: site.id, requirementId: pReq.id, reason: 'again' } });
  const fact = s.facts.find((f) => f.type === 'SiteRequirementOptOut');
  let frozen = false;
  try { fact.payload.requirementId = 'mutated'; } catch { frozen = true; }
  const ok = noReason.outcome === 'server rejected' && siteScope.outcome === 'server rejected'
    && companyScope.outcome === 'server rejected' && wrongProject.outcome === 'server rejected'
    && revokeNone.outcome === 'server rejected' && dup.outcome === 'server rejected' && frozen;
  probe('Q16', ok, 'opt-out is project-scope-only (site/company-scope rejected); cross-project opt-out rejected; revoke-without-active and duplicate rejected; reason mandatory; fact frozen');
}

// --- Q17: transfer leaves no cross-tenant operational reference (EP-6.0) ---
{
  const { s, companyA, companyB, adminA, project } = boot();
  const A = { workerId: adminA.id };
  m2.execute(s, { type: 'TransferProject', actor: { system: true }, payload: { projectId: project.id, toCompanyId: companyB.id } });
  const tev = s.facts.find((f) => f.type === 'TransferEvent');
  const srcIds = new Set([...s.entities.values()].filter((e) => e.companyId === companyA.id).map((e) => e.id));
  let leak = false;
  for (const e of s.entities.values()) {
    if (e.companyId !== companyB.id) continue;
    for (const [k, v] of Object.entries(e)) {
      if (k === 'id' || k === 'companyId') continue;
      if (typeof v === 'string' && srcIds.has(v)) leak = true;
    }
  }
  const readsBounded = m1.readForCompany(s, companyA.id, tev.payload.toProjectId) === null
    && m1.readForCompany(s, companyB.id, project.id) === null;
  probe('Q17', !leak && readsBounded, `no receiving-side entity references a source entity (${!leak}); storage reads bounded both directions (${readsBounded})`);
}

console.log(failures === 0 ? 'ALL PROBES PASS (exit 0)' : `${failures} PROBE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
