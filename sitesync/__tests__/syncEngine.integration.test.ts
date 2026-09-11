import { closeDatabase, getDb, initializeDatabase } from '../src/database/localPersistence';
import { SyncWorker } from '../src/sync/syncWorker';
import type { SyncTransport } from '../src/sync/syncTransport';

const NOW = '2026-09-12T00:00:00.000Z';
const PAYLOAD = JSON.stringify({
  commandId: 'cmd-1', eventId: 'event-1', projectAssignmentId: 'assignment-1', projectId: 'project-1', personId: 'person-1',
  organisationId: 'org-1', companyId: 'company-1', source: 'SELF', eventType: 'ATTENDANCE_CHECK_IN', baseRevision: 0,
  clientOccurredAt: NOW, commandType: 'CHECK_IN', workDateUtc: '2026-09-12',
});

async function seedPendingCommand() {
  await getDb().execute(`INSERT INTO command_ledger (
    command_id, project_id, person_id, organisation_id, company_id, command_type, source, base_revision, status,
    attempt_count, max_attempts, processing_started_at, server_responded_at, synced_at, next_retry_at,
    server_result_json, server_error_code, failure_diagnostics, created_at, updated_at, command_payload_json
  ) VALUES ('cmd-1','project-1','person-1','org-1','company-1','CHECK_IN','SELF',0,'PENDING',0,3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,?,?,?)`,
  [NOW, NOW, PAYLOAD]);
}

describe('M1.7 controlled sync integration', () => {
  beforeEach(async () => initializeDatabase(`m17-integration-${Date.now()}-${Math.random()}.db`));
  afterEach(async () => closeDatabase());

  it('synchronizes a pending command and preserves command history', async () => {
    await seedPendingCommand();
    const transport: SyncTransport = { submit: async request => ({ kind: 'ACCEPTED', serverRevision: request.command.baseRevision + 1, result: { accepted: true } }) };
    const worker = new SyncWorker(undefined, transport);
    const result = await worker.runOnce(NOW);
    expect(result.status).toBe('SUCCEEDED');
    const row = await getDb().execute(`SELECT status, attempt_count as attemptCount, synced_at as syncedAt FROM command_ledger WHERE command_id='cmd-1'`);
    expect(row.rows.item(0)).toMatchObject({ status: 'SUCCEEDED', attemptCount: 1 });
    expect(row.rows.item(0).syncedAt).toBe(NOW);
  });

  it('records a retryable transport failure durably', async () => {
    await seedPendingCommand();
    const transport: SyncTransport = { submit: async () => ({ kind: 'SERVER_ERROR', code: '503', message: 'unavailable', retryable: true }) };
    const worker = new SyncWorker(undefined, transport);
    const result = await worker.runOnce(NOW);
    expect(result.status).toBe('RETRY_SCHEDULED');
    const row = await getDb().execute(`SELECT status, next_retry_at as nextRetryAt FROM command_ledger WHERE command_id='cmd-1'`);
    expect(row.rows.item(0).status).toBe('RETRYABLE_FAILURE');
    expect(row.rows.item(0).nextRetryAt).toBeTruthy();
  });
});
