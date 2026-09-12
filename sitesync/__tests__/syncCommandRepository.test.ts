import { closeDatabase, getDb, initializeDatabase } from '../src/database/localPersistence';
import { SyncCommandRepository } from '../src/sync/syncCommandRepository';

const NOW = '2026-09-12T00:00:00.000Z';

function insertCommand(overrides: Record<string, unknown> = {}) {
  const values = {
    commandId: 'cmd-1', projectId: 'project-1', personId: 'person-1', organisationId: 'org-1', companyId: 'company-1',
    commandType: 'CHECK_IN', source: 'SELF', baseRevision: 0, status: 'PENDING', attemptCount: 0, maxAttempts: 3,
    processingStartedAt: null, serverRespondedAt: null, syncedAt: null, nextRetryAt: null, serverResultJson: null,
    serverErrorCode: null, failureDiagnostics: null, createdAt: NOW, updatedAt: NOW, commandPayloadJson: '{}', ...overrides,
  };
  return getDb().execute(`INSERT INTO command_ledger (
    command_id, project_id, person_id, organisation_id, company_id, command_type, source, base_revision, status,
    attempt_count, max_attempts, processing_started_at, server_responded_at, synced_at, next_retry_at,
    server_result_json, server_error_code, failure_diagnostics, created_at, updated_at, command_payload_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, Object.values(values));
}

describe('sync command repository', () => {
  beforeEach(async () => { await initializeDatabase(`m17-repository-${Date.now()}-${Math.random()}.db`); });
  afterEach(async () => { await closeDatabase(); });

  it('claims commands in created-at then command-id order', async () => {
    await insertCommand({ commandId: 'cmd-b', createdAt: '2026-09-12T00:00:02.000Z' });
    await insertCommand({ commandId: 'cmd-a', createdAt: '2026-09-12T00:00:01.000Z' });
    const repository = new SyncCommandRepository();
    expect((await repository.claimNextEligible(NOW))?.commandId).toBe('cmd-a');
  });

  it('does not claim retryable failures before next_retry_at', async () => {
    await insertCommand({ status: 'RETRYABLE_FAILURE', nextRetryAt: '2026-09-12T00:05:00.000Z' });
    const repository = new SyncCommandRepository();
    expect(await repository.claimNextEligible(NOW)).toBeNull();
  });

  it('enforces sequential processing within one aggregate', async () => {
    await insertCommand({ commandId: 'cmd-1', createdAt: '2026-09-12T00:00:01.000Z' });
    await insertCommand({ commandId: 'cmd-2', createdAt: '2026-09-12T00:00:02.000Z' });
    const repository = new SyncCommandRepository();
    const first = await repository.claimNextEligible(NOW);
    expect(first?.commandId).toBe('cmd-1');
    expect((await repository.claimNextEligible(NOW))?.commandId).not.toBe('cmd-2');
  });

  it('recovers stale processing claims before selecting work', async () => {
    await insertCommand({ status: 'PROCESSING', processingStartedAt: '2026-09-11T23:50:00.000Z', attemptCount: 1 });
    const repository = new SyncCommandRepository();
    expect(await repository.releaseStaleClaims(NOW)).toBe(1);
    expect((await repository.claimNextEligible(NOW))?.status).toBe('PROCESSING');
  });
});
