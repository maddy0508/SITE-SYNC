// M1-AC-3 [strict] — Worker profile is derived: current profile recomputable
// from creation fact plus WorkerProfileChange events alone. No stored profile
// column is authoritative.
// Anchor: WC-INV-6, §7.5, AC-ARCH-A3.
import { requireCore, report, SRC_DIR } from './lib.mjs';

const absent = requireCore();
if (absent) report('M1-AC-3', absent);

const { createStore, execute, deriveProfile } = await import(`${SRC_DIR}/domain.js`);
const failures = [];

const s = createStore();
execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'founder@example.com', name: 'Founder' } }, payload: { companyName: 'Profile Co' } });
const admin = [...s.entities.values()].find((e) => e.type === 'Worker');

const inv = execute(s, { type: 'CreateInvitation', actor: { workerId: admin.id }, payload: { email: 'w@example.com', name: 'Initial Name' } });
const invFact = s.facts.find((f) => f.type === 'Invitation' && f.state === 'pending');
execute(s, { type: 'AcceptInvitation', actor: { personRef: { email: 'w@example.com', name: 'Initial Name' } }, payload: { invitationId: invFact.invitationId } });
const worker = [...s.entities.values()].find((e) => e.type === 'Worker' && e.id !== admin.id);
if (!worker) failures.push('worker not created');

// Profile derivation exists and reflects the creation fact.
const p0 = worker ? deriveProfile(s, worker.id) : null;
if (!p0) failures.push('deriveProfile returned nothing');
else if (p0.displayName !== 'Initial Name') failures.push(`creation-fact profile not derived: ${JSON.stringify(p0)}`);

// A WorkerProfileChange event changes the derived profile.
const c1 = execute(s, { type: 'ChangeWorkerProfile', actor: { workerId: worker?.id }, payload: { workerId: worker?.id, changes: { displayName: 'Changed Name', contactPhone: '+61400000000' } } });
if (c1.outcome !== 'server accepted') failures.push(`ChangeWorkerProfile: ${c1.outcome} ${c1.reason ?? ''}`);
const p1 = worker ? deriveProfile(s, worker.id) : null;
if (p1?.displayName !== 'Changed Name') failures.push('derived profile did not reflect WorkerProfileChange (displayName)');
if (p1?.contactPhone !== '+61400000000') failures.push('derived profile did not reflect WorkerProfileChange (contactPhone)');

// A second change supersedes the first for the same field; history is retained.
execute(s, { type: 'ChangeWorkerProfile', actor: { workerId: worker?.id }, payload: { workerId: worker?.id, changes: { displayName: 'Final Name' } } });
const p2 = worker ? deriveProfile(s, worker.id) : null;
if (p2?.displayName !== 'Final Name') failures.push('later WorkerProfileChange did not supersede earlier value');
const changeFacts = s.facts.filter((f) => f.type === 'WorkerProfileChange' && f.subject === worker?.id);
if (changeFacts.length < 2) failures.push(`expected >=2 WorkerProfileChange facts, found ${changeFacts.length}`);

// No stored profile column is authoritative on the Worker E record:
// the entity record carries no profile fields at all (§7.5, AC-ARCH-A3/A4).
const PROFILE_FIELDS = ['profile', 'displayName', 'contactPhone', 'contactEmail', 'photo', 'roleLabel', 'managementContact', 'capabilities'];
const ent = s.entities.get(worker?.id);
const stored = PROFILE_FIELDS.filter((k) => ent && Object.prototype.hasOwnProperty.call(ent, k));
if (stored.length > 0) failures.push(`Worker entity stores profile fields directly: ${stored.join(', ')} (AC-ARCH-A3/A4)`);

report('M1-AC-3', failures);
