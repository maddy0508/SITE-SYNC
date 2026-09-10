/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders the SITE-SYNC QR attendance entry screen', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Scan worker QR' })).toBeTruthy();
  expect(renderer!.root.findAllByType('Text').some((node) => node.props.children === 'QR ATTENDANCE')).toBe(true);
});
