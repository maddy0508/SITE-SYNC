import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { M2AppShell } from '../src/product/M2AppShell';

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
