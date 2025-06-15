export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverage: false,
  verbose: true,
  testTimeout: 10000
}; 