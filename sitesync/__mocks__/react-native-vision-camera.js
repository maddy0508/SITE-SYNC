const React = require('react');
const { View } = require('react-native');

const useCameraPermission = jest.fn(() => ({
  hasPermission: false,
  requestPermission: jest.fn(async () => false),
  status: 'not-determined',
  canRequestPermission: true,
}));

const useCameraDevice = jest.fn(() => null);

const Camera = jest.fn((props) => React.createElement(View, props));

module.exports = {
  Camera,
  useCameraDevice,
  useCameraPermission,
};
