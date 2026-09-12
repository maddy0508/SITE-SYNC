import type { CommandLedgerRecord } from '../src/domain/localPersistence';
import type { AttendanceCommand } from '../src/attendance/attendanceCommands';
import type { SyncTransport, SyncTransportRequest, SyncTransportResponse } from '../src/sync/syncTransport';

const command = {
  commandId: 'cmd-1',
  projectId: 'project-1',
  personId: 'person-1',
  organisationId: 'org-1',
  companyId: 'company-1',
  commandType: 'CHECK_IN',
  source: 'SELF',
  baseRevision: 0,
  status: 'PENDING',
  attemptCount: 0,
  maxAttempts: 3,
  processingStartedAt: null,
  serverRespondedAt: null,
  syncedAt: null,
  nextRetryAt: null,
  serverResultJson: null,
  serverErrorCode: null,
  failureDiagnostics: null,
  createdAt: '2026-09-12T00:00:00Z',
  updatedAt: '2026-09-12T00:00:00Z',
} as CommandLedgerRecord;

const payload = {
  commandId: 'cmd-1', eventId: 'event-1', projectAssignmentId: 'assignment-1', projectId: 'project-1',
  personId: 'person-1', organisationId: 'org-1', companyId: 'company-1', source: 'SELF',
  eventType: 'ATTENDANCE_CHECK_IN', baseRevision: 0, clientOccurredAt: '2026-09-12T00:00:00Z',
  commandType: 'CHECK_IN', workDateUtc: '2026-09-12',
} as AttendanceCommand;

describe('sync transport contract', () => {
  it('requires persisted command, aggregate identity, and registered device identity', async () => {
    const seen: SyncTransportRequest[] = [];
    const transport: SyncTransport = {
      submit: async request => {
        seen.push(request);
        return { kind: 'ACCEPTED', serverRevision: 1, result: { ok: true } };
      },
    };

    await transport.submit({
      command,
      aggregate: { projectId: command.projectId, personId: command.personId, workDateUtc: '2026-09-12' },
      payload,
      deviceInstallationId: 'device-1',
    });

    expect(seen[0].command.commandId).toBe(command.commandId);
    expect(seen[0].aggregate).toEqual({ projectId: 'project-1', personId: 'person-1', workDateUtc: '2026-09-12' });
    expect(seen[0].payload).toBe(payload);
    expect(seen[0].deviceInstallationId).toBe('device-1');
  });

  it('models every server outcome as an explicit discriminated response', () => {
    const responses: SyncTransportResponse[] = [
      { kind: 'ACCEPTED', serverRevision: 1, result: {} },
      { kind: 'DUPLICATE_ACCEPTED', serverRevision: 1, result: {} },
      { kind: 'REVISION_CONFLICT', serverRevision: 2, serverPayload: '{}', reasonCode: 'REVISION_CONFLICT' },
      { kind: 'AUTHORIZATION_REJECTED', code: 'FORBIDDEN', message: 'forbidden' },
      { kind: 'VALIDATION_REJECTED', code: 'INVALID_COMMAND', message: 'invalid' },
      { kind: 'DEVICE_REVOKED', code: 'DEVICE_REVOKED', message: 'revoked' },
      { kind: 'SERVER_ERROR', code: '503', message: 'unavailable', retryable: true },
    ];

    expect(new Set(responses.map(response => response.kind)).size).toBe(7);
  });
});
