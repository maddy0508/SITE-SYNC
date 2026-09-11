import type { SyncTransportResponse } from './syncTransport';
import type { CommandStatus } from '../domain/localPersistence';

export function classifySyncResponse(response: SyncTransportResponse): Extract<CommandStatus, 'SUCCEEDED' | 'RETRYABLE_FAILURE' | 'FAILED' | 'CONFLICT'> {
  switch (response.kind) {
    case 'ACCEPTED':
    case 'DUPLICATE_ACCEPTED':
      return 'SUCCEEDED';
    case 'REVISION_CONFLICT':
      return 'CONFLICT';
    case 'AUTHORIZATION_REJECTED':
    case 'VALIDATION_REJECTED':
    case 'DEVICE_REVOKED':
      return 'FAILED';
    case 'SERVER_ERROR':
      return response.retryable ? 'RETRYABLE_FAILURE' : 'FAILED';
  }
}

const MAX_BACKOFF_MS = 15 * 60 * 1000;
const BASE_BACKOFF_MS = 30 * 1000;

export function computeRetryAt(now: string, attemptCount: number): string {
  if (!Number.isInteger(attemptCount) || attemptCount < 1) throw new Error('attemptCount must be >= 1');
  const exponent = Math.min(attemptCount - 1, 10);
  const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * (2 ** exponent));
  return new Date(Date.parse(now) + delay).toISOString();
}
