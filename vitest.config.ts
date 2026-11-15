import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'tooling',
          include: ['tooling/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'shared',
          include: ['packages/shared/src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'backend',
          include: ['apps/backend/{src,test,scripts}/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'frontend-node',
          include: [
            'apps/frontend/{build,test}/**/*.test.ts',
            'apps/frontend/src/{main,preload,common}/**/*.test.ts',
          ],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'frontend-renderer',
          include: ['apps/frontend/src/renderer/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
