import type { QaEvidenceStatus } from './m17QaContracts';

export type M17QaGateId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface M17QaGate {
  id: M17QaGateId;
  title: string;
  prerequisites: M17QaGateId[];
  physicalAction?: string;
}

export const M17_QA_GATES: readonly M17QaGate[] = [
  { id: 1, title: 'Isolated authentication/context', prerequisites: [] },
  { id: 2, title: 'Offline durable command', prerequisites: [1], physicalAction: 'Turn Wi-Fi and mobile data OFF before creating the offline command.' },
  { id: 3, title: 'Process termination persistence', prerequisites: [2], physicalAction: 'Capture the checkpoint, force-stop SITE-SYNC, then relaunch before syncing.' },
  { id: 4, title: 'Connectivity restoration/retry', prerequisites: [3], physicalAction: 'Restore Wi-Fi or mobile data and verify the device is online before sync.' },
  { id: 5, title: 'Real authenticated RPC', prerequisites: [4] },
  { id: 6, title: 'Authoritative response/reconciliation', prerequisites: [5] },
  { id: 7, title: 'Check-in/check-out + timesheet', prerequisites: [6] },
  { id: 8, title: 'Repository-driven UI observation', prerequisites: [6] },
  { id: 9, title: 'Duplicate replay/idempotency', prerequisites: [6] },
  { id: 10, title: 'Revision conflict/server-wins', prerequisites: [6] },
  { id: 11, title: 'Validation/authorization/revocation/failure paths', prerequisites: [6] },
  { id: 12, title: 'Lifecycle/race safety', prerequisites: [1] },
];

export function canRunGate(gateId: M17QaGateId, results: Partial<Record<M17QaGateId, QaEvidenceStatus>>): boolean {
  const gate = M17_QA_GATES.find(candidate => candidate.id === gateId);
  if (!gate) return false;
  return gate.prerequisites.every(prerequisite => results[prerequisite] === 'PASS');
}

export function nextRequiredAction(results: Partial<Record<M17QaGateId, QaEvidenceStatus>>): string | null {
  const next = M17_QA_GATES.find(gate => !results[gate.id] || results[gate.id] === 'NOT_PROVEN' || results[gate.id] === 'FAIL');
  if (!next) return null;
  if (!canRunGate(next.id, results)) {
    const prerequisite = next.prerequisites.find(id => results[id] !== 'PASS');
    return prerequisite ? `Complete Gate ${prerequisite} before Gate ${next.id}.` : `Complete Gate ${next.id}.`;
  }
  return next.physicalAction ?? `Run Gate ${next.id}: ${next.title}.`;
}
