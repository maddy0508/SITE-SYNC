import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { M2AppShell } from '../src/product/M2AppShell';
import { buildM2OperationalSnapshot } from '../src/product/m2OperationalSnapshot';

test('renders the M2 operational shell with Today as the landing surface', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<M2AppShell />);
  });

  const text = renderer!.root.findAllByType('Text').map(node => String(node.props.children)).join(' ');
  expect(text).toContain('SITE-SYNC');
  expect(text).toContain('TODAY');
  expect(text).toContain("TODAY'S ACTIONS");
  expect(text).toContain('CREW');
  expect(text).toContain('SITE CONDITIONS');
});

test('opens the reusable worker profile from the Today crew card', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<M2AppShell />);
  });

  const crewButton = renderer!.root.findByProps({ accessibilityLabel: 'Open worker profile' });
  await ReactTestRenderer.act(() => {
    crewButton.props.onPress();
  });

  const text = renderer!.root.findAllByType('Text').map(node => String(node.props.children)).join(' ');
  expect(text).toContain('ORG A WORKER');
  expect(text).toContain('QUALIFICATIONS');
  expect(text).toContain('SAFETY & ELIGIBILITY');
});

test('builds Today identity and attendance state from persisted domain records', () => {
  const snapshot = buildM2OperationalSnapshot({
    context: {
      personId: 'person-1',
      projectId: 'project-1',
      organisationId: 'org-1',
      companyId: 'company-1',
      companyMembershipId: 'membership-1',
      projectRole: 'SUPERVISOR',
      selectedAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
    },
    roster: {
      projectId: 'project-1',
      personId: 'person-1',
      organisationId: 'org-1',
      companyId: 'company-1',
      displayName: 'JANE DOE',
      projectRole: 'SUPERVISOR',
      assignmentStatus: 'ACTIVE',
      membershipStatus: 'ACTIVE',
      syncedAt: '2026-09-14T00:00:00.000Z',
    },
    attendance: {
      projectId: 'project-1',
      personId: 'person-1',
      workDateUtc: '2026-09-14',
      organisationId: 'org-1',
      companyId: 'company-1',
      projectAssignmentId: 'assignment-1',
      state: 'CHECKED_IN',
      lastEventId: 'event-1',
      lastCommandId: 'command-1',
      lastClientOccurredAt: '2026-09-14T00:04:00.000Z',
      currentRevision: 2,
      serverRevision: 2,
      syncStatus: 'ONLINE_VERIFIED',
      updatedAt: '2026-09-14T00:04:01.000Z',
    },
  });

  expect(snapshot.workerName).toBe('JANE DOE');
  expect(snapshot.workerRole).toBe('SUPERVISOR');
  expect(snapshot.attendanceState).toBe('CHECKED_IN');
  expect(snapshot.attendanceSyncStatus).toBe('ONLINE_VERIFIED');
  expect(snapshot.projectId).toBe('project-1');
  expect(snapshot.organisationId).toBe('org-1');
});
