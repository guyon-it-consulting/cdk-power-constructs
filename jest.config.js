module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/custom-resource-handlers/test'],
  testMatch: ['**/*.test.ts'],
  coverageProvider: 'v8',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        outDir: '.test-build',
        rootDir: '.'
      }
    }]
  },
  collectCoverageFrom: [
    'lib/**/*.ts',
    'custom-resource-handlers/lib/**/*.ts',
    '!**/*.d.ts',
    '!**/*.generated.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!lib/index.ts',
    '!custom-resource-handlers/lib/**/handler.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '\\.d\\.ts$',
    '\\.generated\\.ts$',
  ],
  coverageThreshold: {
    global: {
      branches: 35,
      statements: 55,
    },
    './custom-resource-handlers/lib/**/*.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
