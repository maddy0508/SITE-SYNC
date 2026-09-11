import {
  buildAttendanceCommand,
  deriveWorkDateUtc,
} from '../src/attendance/attendanceCommands';

describe('M1.6 attendance command contract', () => {
  it('derives the work date from the client timestamp in UTC', () => {
    expect(deriveWorkDateUtc('2026-09-11T23:30:00.000Z')).toBe('2026-09-11');
    expect(deriveWorkDateUtc('2026-09-11T23:30:00.000Z')).not.toBe('2026-09-12');
  });

  it('builds a check-in command with the aggregate identity and base revision', () => {
    const command = buildAttendanceCommand({
      commandId: 'cmd-1',
      eventId: 'event-1',
      projectAssignmentId: 'assignment-1',
      projectId: 'project-1',
      personId: 'person-1',
      organisationId: 'org-1',
      companyId: 'company-1',
      source: 'SELF',
      eventType: 'ATTENDANCE_CHECK_IN',
      baseRevision: 0,
      clientOccurredAt: '2026-09-11T08:15:00.123Z',
    });

    expect(command).toEqual({
      commandId: 'cmd-1',
      eventId: 'event-1',
      projectAssignmentId: 'assignment-1',
      projectId: 'project-1',
      personId: 'person-1',
      organisationId: 'org-1',
      companyId: 'company-1',
      source: 'SELF',
      eventType: 'ATTENDANCE_CHECK_IN',
      baseRevision: 0,
      clientOccurredAt: '2026-09-11T08:15:00.123Z',
      workDateUtc: '2026-09-11',
    });
  });

  it('rejects invalid UTC timestamps and negative revisions', () => {
    expect(() => deriveWorkDateUtc('2026-09-11 08:15:00')).toThrow('Invalid UTC timestamp');
    expect(() => buildAttendanceCommand({
      commandId: 'cmd-1',
      eventId: 'event-1',
      projectAssignmentId: 'assignment-1',
      projectId: 'project-1',
      personId: 'person-1',
      organisationId: 'org-1',
      companyId: 'company-1',
      source: 'SELF',
      eventType: 'ATTENDANCE_CHECK_OUT',
      baseRevision: -1,
      clientOccurredAt: '2026-09-11T08:15:00.000Z',
    })).toThrow('baseRevision must be >= 0');
  });
});
