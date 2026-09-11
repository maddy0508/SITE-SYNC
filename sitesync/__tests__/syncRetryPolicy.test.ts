import { classifySyncResponse, computeRetryAt } from '../src/sync/syncRetryPolicy';

describe('sync retry policy', () => {
  it.each([
    ['TIMEOUT', 'RETRYABLE_FAILURE'],
    ['TRANSPORT', 'RETRYABLE_FAILURE'],
    ['503', 'RETRYABLE_FAILURE'],
  ])('classifies %s as %s', (code, expected) => {
    expect(classifySyncResponse({ kind: 'SERVER_ERROR', code, message: 'failure', retryable: true })).toBe(expected);
  });

  it('classifies durable failures and conflicts distinctly', () => {
    expect(classifySyncResponse({ kind: 'AUTHORIZATION_REJECTED', code: 'FORBIDDEN', message: 'no' })).toBe('FAILED');
    expect(classifySyncResponse({ kind: 'VALIDATION_REJECTED', code: 'INVALID', message: 'bad' })).toBe('FAILED');
    expect(classifySyncResponse({ kind: 'DEVICE_REVOKED', code: 'REVOKED', message: 'revoked' })).toBe('FAILED');
    expect(classifySyncResponse({ kind: 'REVISION_CONFLICT', serverRevision: 4, serverPayload: '{}', reasonCode: 'REVISION_CONFLICT' })).toBe('CONFLICT');
    expect(classifySyncResponse({ kind: 'ACCEPTED', serverRevision: 1, result: {} })).toBe('SUCCEEDED');
    expect(classifySyncResponse({ kind: 'DUPLICATE_ACCEPTED', serverRevision: 1, result: {} })).toBe('SUCCEEDED');
  });

  it('uses bounded exponential backoff', () => {
    const first = computeRetryAt('2026-09-12T00:00:00.000Z', 1);
    const second = computeRetryAt('2026-09-12T00:00:00.000Z', 2);
    const tenth = computeRetryAt('2026-09-12T00:00:00.000Z', 10);
    expect(Date.parse(second)).toBeGreaterThan(Date.parse(first));
    expect(Date.parse(tenth) - Date.parse('2026-09-12T00:00:00.000Z')).toBeLessThanOrEqual(15 * 60 * 1000);
  });
});
