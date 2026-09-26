export type QaEvidenceStatus = 'PASS' | 'FAIL' | 'NOT_PROVEN';

export type M17GateId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface QaEvidence {
  status: QaEvidenceStatus;
  detail: string;
  countsAsPass: boolean;
}

export function createQaEvidence(status: QaEvidenceStatus, detail: string): QaEvidence {
  return { status, detail, countsAsPass: status === 'PASS' };
}
