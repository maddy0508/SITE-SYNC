module.exports = {
  preset: '@react-native/jest-preset',

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],

  transformIgnorePatterns: [
    'node_modules/(?!((@)?react-native|@react-native-community)/)',
  ],

  moduleNameMapper: {
    '^@op-engineering/op-sqlite$':
      '<rootDir>/__mocks__/@op-engineering/op-sqlite.js',
    '^react-native-vision-camera$':
      '<rootDir>/__mocks__/react-native-vision-camera.js',
    '^react-native-vision-camera-barcode-scanner$':
      '<rootDir>/__mocks__/react-native-vision-camera-barcode-scanner.js',
  },
};
