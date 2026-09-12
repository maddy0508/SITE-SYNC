import type { AttendanceCommand } from '../attendance/attendanceCommands';
import type { CommandLedgerRecord } from '../domain/localPersistence';

export interface SyncAggregateIdentity {
  projectId: string;
  personId: string;
  workDateUtc: string;
}

export interface SyncTransportRequest {
  command: CommandLedgerRecord;
  aggregate: SyncAggregateIdentity;
  payload: AttendanceCommand;
  deviceInstallationId: string;
}

export type SyncTransportResponse =
  | { kind: 'ACCEPTED'; serverRevision: number; result: unknown }
  | { kind: 'DUPLICATE_ACCEPTED'; serverRevision: number; result: unknown }
  | { kind: 'REVISION_CONFLICT'; serverRevision: number; serverPayload: string | null; reasonCode: string }
  | { kind: 'AUTHORIZATION_REJECTED'; code: string; message: string }
  | { kind: 'VALIDATION_REJECTED'; code: string; message: string }
  | { kind: 'DEVICE_REVOKED'; code: string; message: string }
  | { kind: 'SERVER_ERROR'; code: string; message: string; retryable: boolean };

export interface SyncTransport {
  submit(request: SyncTransportRequest): Promise<SyncTransportResponse>;
}

export type PersistedCommandLedgerRecord = CommandLedgerRecord & {
  commandPayloadJson: string;
};

export function parsePersistedAttendancePayload(command: PersistedCommandLedgerRecord): AttendanceCommand {
  const parsed: unknown = JSON.parse(command.commandPayloadJson);
  if (!parsed || typeof parsed !== 'object' || (parsed as { commandId?: unknown }).commandId !== command.commandId) {
    throw new Error(`Invalid persisted payload for command ${command.commandId}`);
  }
  return parsed as AttendanceCommand;
}
