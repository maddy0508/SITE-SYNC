/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevice: () => null,
  useCameraPermission: () => ({
    hasPermission: false,
    canRequestPermission: false,
    requestPermission: jest.fn(),
  }),
}));

jest.mock('react-native-vision-camera-barcode-scanner', () => ({
  useBarcodeScannerOutput: () => ({}),
}));

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
