import { SyncWorker } from '../src/sync/syncWorker';
import type { ClaimedSyncCommand, SyncCommandRepository } from '../src/sync/syncCommandRepository';
import type { SyncTransport } from '../src/sync/syncTransport';

const command = {
  commandId: 'cmd-1', projectId: 'project-1', personId: 'person-1', organisationId: 'org-1', companyId: 'company-1',
  commandType: 'CHECK_IN', source: 'SELF', baseRevision: 0, status: 'PROCESSING', attemptCount: 1, maxAttempts: 3,
  processingStartedAt: '2026-09-12T00:00:00.000Z', serverRespondedAt: null, syncedAt: null, nextRetryAt: null,
  serverResultJson: null, serverErrorCode: null, failureDiagnostics: null, createdAt: '2026-09-12T00:00:00.000Z',
  updatedAt: '2026-09-12T00:00:00.000Z', commandPayloadJson: JSON.stringify({
    commandId: 'cmd-1', eventId: 'event-1', projectAssignmentId: 'assignment-1', projectId: 'project-1', personId: 'person-1',
    organisationId: 'org-1', companyId: 'company-1', source: 'SELF', eventType: 'ATTENDANCE_CHECK_IN', baseRevision: 0,
    clientOccurredAt: '2026-09-12T00:00:00.000Z', commandType: 'CHECK_IN', workDateUtc: '2026-09-12',
  }),
} as ClaimedSyncCommand;

type RepoMock = jest.Mocked<Pick<SyncCommandRepository, 'releaseStaleClaims' | 'claimNextEligible' | 'markSucceeded' | 'markRetryableFailure' | 'markFailed' | 'markConflict'>>;

function repo(): RepoMock {
  return {
    releaseStaleClaims: jest.fn().mockResolvedValue(0), claimNextEligible: jest.fn().mockResolvedValue(command),
    markSucceeded: jest.fn().mockResolvedValue(undefined), markRetryableFailure: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined), markConflict: jest.fn().mockResolvedValue(undefined),
  };
}

describe('sync worker', () => {
  it('serializes concurrent runs and submits a claimed command once', async () => {
    const repository = repo();
    let release!: () => void;
    const transport: SyncTransport = { submit: jest.fn(() => new Promise(resolve => { release = () => resolve({ kind: 'ACCEPTED', serverRevision: 1, result: { ok: true } }); })) };
    const worker = new SyncWorker(transport, repository);
    const first = worker.runOnce('2026-09-12T00:00:00.000Z');
    const second = worker.runOnce('2026-09-12T00:00:00.000Z');
    await Promise.resolve();
    await Promise.resolve();
    expect(transport.submit).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
    expect(repository.markSucceeded).toHaveBeenCalledTimes(1);
  });

  it('uses the persisted payload and marks a duplicate as successful', async () => {
    const repository = repo();
    const transport: SyncTransport = { submit: jest.fn().mockResolvedValue({ kind: 'DUPLICATE_ACCEPTED', serverRevision: 1, result: { duplicate: true } }) };
    const worker = new SyncWorker(transport, repository);
    await worker.runOnce('2026-09-12T00:00:00.000Z');
    expect(transport.submit).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ commandId: 'cmd-1' }) }));
    expect(repository.markSucceeded).toHaveBeenCalledWith('cmd-1', expect.any(String), 1, { duplicate: true });
  });

  it('persists retryable failures until attempts are exhausted', async () => {
    const repository = repo();
    const transport: SyncTransport = { submit: jest.fn().mockResolvedValue({ kind: 'SERVER_ERROR', code: '503', message: 'unavailable', retryable: true }) };
    const worker = new SyncWorker(transport, repository);
    await worker.runOnce('2026-09-12T00:00:00.000Z');
    expect(repository.markRetryableFailure).toHaveBeenCalledWith('cmd-1', expect.any(String), expect.any(String), '503', 'unavailable');
  });

  it('records revision conflicts without marking the attendance state verified', async () => {
    const repository = repo();
    const transport: SyncTransport = { submit: jest.fn().mockResolvedValue({ kind: 'REVISION_CONFLICT', serverRevision: 4, serverPayload: '{}', reasonCode: 'REVISION_CONFLICT' }) };
    const worker = new SyncWorker(transport, repository);
    await worker.runOnce('2026-09-12T00:00:00.000Z');
    expect(repository.markConflict).toHaveBeenCalledWith('cmd-1', expect.any(String), 4, '{}', 'REVISION_CONFLICT');
    expect(repository.markSucceeded).not.toHaveBeenCalled();
  });
});
