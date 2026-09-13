import { canRunGate, nextRequiredAction } from '../src/attendance/m17QaTestPlan';

describe('M1.7 QA gate dependencies', () => {
  test('sync cannot run before durable command and process restart proof', () => {
    expect(canRunGate(4, { 1: 'PASS', 2: 'PASS', 3: 'NOT_PROVEN' })).toBe(false);
    expect(nextRequiredAction({ 1: 'PASS', 2: 'PASS', 3: 'NOT_PROVEN' })).toMatch(/Gate 3|force-stop|relaunch/i);
  });

  test('Gate 8 is blocked until authoritative reconciliation is proven', () => {
    expect(canRunGate(8, { 1: 'PASS', 2: 'PASS', 3: 'PASS', 4: 'PASS', 5: 'PASS', 6: 'NOT_PROVEN' })).toBe(false);
  });

  test('Gate 9 does not become a pass from a normal sync', () => {
    expect(canRunGate(9, { 1: 'PASS', 6: 'PASS' })).toBe(true);
  });
});
