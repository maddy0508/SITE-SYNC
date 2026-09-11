import { validateUtcTimestamp } from '../database/localPersistence';
import type { AttendanceEventType, CommandSource } from '../domain/localPersistence';

export type AttendanceCommandType = 'CHECK_IN' | 'CHECK_OUT';

export interface AttendanceCommandInput {
  commandId: string;
  eventId: string;
  projectAssignmentId: string;
  projectId: string;
  personId: string;
  organisationId: string;
  companyId: string;
  source: CommandSource;
  eventType: AttendanceEventType;
  baseRevision: number;
  clientOccurredAt: string;
}

export interface AttendanceCommand extends AttendanceCommandInput {
  commandType: AttendanceCommandType;
  workDateUtc: string;
}

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
}

export function deriveWorkDateUtc(clientOccurredAt: string): string {
  if (!validateUtcTimestamp(clientOccurredAt)) {
    throw new Error('Invalid UTC timestamp');
  }
  return clientOccurredAt.substring(0, 10);
}

export function buildAttendanceCommand(input: AttendanceCommandInput): AttendanceCommand {
  assertNonEmpty(input.commandId, 'commandId');
  assertNonEmpty(input.eventId, 'eventId');
  assertNonEmpty(input.projectAssignmentId, 'projectAssignmentId');
  assertNonEmpty(input.projectId, 'projectId');
  assertNonEmpty(input.personId, 'personId');
  assertNonEmpty(input.organisationId, 'organisationId');
  assertNonEmpty(input.companyId, 'companyId');

  if (input.baseRevision < 0 || !Number.isInteger(input.baseRevision)) {
    throw new Error('baseRevision must be >= 0');
  }
  if (input.source !== 'SELF' && input.source !== 'QR_SCAN') {
    throw new Error('Invalid command source');
  }
  if (input.eventType !== 'ATTENDANCE_CHECK_IN' && input.eventType !== 'ATTENDANCE_CHECK_OUT') {
    throw new Error('Invalid attendance event type');
  }

  const commandType: AttendanceCommandType = input.eventType === 'ATTENDANCE_CHECK_IN'
    ? 'CHECK_IN'
    : 'CHECK_OUT';

  return Object.freeze({
    ...input,
    commandType,
    workDateUtc: deriveWorkDateUtc(input.clientOccurredAt),
  });
}
