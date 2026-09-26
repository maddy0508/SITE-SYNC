import { createQaEvidence } from '../src/attendance/m17QaContracts';

describe('M1.7 QA evidence', () => {
  test('NOT_PROVEN never counts as a pass', () => {
    expect(createQaEvidence('NOT_PROVEN', 'duplicate delivery was not actually replayed')).toEqual({
      status: 'NOT_PROVEN',
      detail: 'duplicate delivery was not actually replayed',
      countsAsPass: false,
    });
  });

  test('PASS explicitly counts as a pass', () => {
    expect(createQaEvidence('PASS', 'authoritative server response observed')).toEqual({
      status: 'PASS',
      detail: 'authoritative server response observed',
      countsAsPass: true,
    });
  });
});
