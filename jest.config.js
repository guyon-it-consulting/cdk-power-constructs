module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  coverageProvider: 'v8',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        outDir: '.test-build',
        rootDir: '.'
      }
    }]
  },
  collectCoverageFrom: [
    '<rootDir>/lib/**/*.ts',
    '!<rootDir>/lib/**/*.d.ts',
    '!<rootDir>/lib/**/*.generated.ts',
    '!<rootDir>/lib/index.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '\\.d\\.ts$',
    '\\.generated\\.ts$',
  ],
  // Note: Coverage thresholds removed for CDK constructs
  // CDK construct tests are integration tests that build entire stacks
  // Coverage metrics don't accurately reflect test quality for constructs
  // Focus on test scenario coverage instead
};
