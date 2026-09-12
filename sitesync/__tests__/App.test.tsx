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

jest.mock('react-native-qrcode-svg', () => 'QRCode');

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('starts and disposes the supplied sync lifecycle with the app', async () => {
  const lifecycle = {
    start: jest.fn(async () => undefined),
    dispose: jest.fn(async () => undefined),
  };

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App syncLifecycle={lifecycle} />);
  });

  expect(lifecycle.start).toHaveBeenCalledTimes(1);

  await ReactTestRenderer.act(() => {
    renderer!.unmount();
  });

  expect(lifecycle.dispose).toHaveBeenCalledTimes(1);
});
