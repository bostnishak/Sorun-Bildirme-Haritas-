import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/e2e/**/*.e2e.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
      },
    }],
  },
  globalSetup: './src/__tests__/e2e/setup.ts',
  globalTeardown: './src/__tests__/e2e/teardown.ts',
  testTimeout: 30000, // E2E testler daha uzun sürebilir
  clearMocks: true,
};

export default config;
