import { builtinModules } from 'node:module';

const nodeBuiltins = [
  ...new Set(builtinModules.filter((name) => !name.startsWith('node:') && !name.startsWith('_'))),
];

const restrict = (names, groups, message) => [
  'error',
  {
    paths: names.map((name) => ({ name, message })),
    patterns: [{ group: groups, message }],
  },
];

const sharedMessage =
  'The shared package must stay free of apps, UI, Electron, Hono and Node APIs.';
const frontendMessage = 'The frontend must never import from the backend.';
const backendMessage = 'The backend must never import from the frontend, Electron or React.';

export const importBoundaries = [
  {
    files: ['packages/shared/**'],
    rules: {
      'no-restricted-imports': restrict(
        [
          '@risklex/frontend',
          '@risklex/backend',
          'react',
          'react-dom',
          'electron',
          'hono',
          ...nodeBuiltins,
        ],
        [
          'node:*',
          '@risklex/frontend/*',
          '@risklex/backend/*',
          'react/*',
          'react-dom/*',
          'electron/*',
          'hono/*',
          '**/apps/**',
        ],
        sharedMessage,
      ),
    },
  },
  {
    files: ['apps/frontend/**'],
    rules: {
      'no-restricted-imports': restrict(
        ['@risklex/backend'],
        ['@risklex/backend/*', '**/backend/**'],
        frontendMessage,
      ),
    },
  },
  {
    files: ['apps/backend/**'],
    rules: {
      'no-restricted-imports': restrict(
        ['@risklex/frontend', 'electron', 'react', 'react-dom'],
        ['@risklex/frontend/*', '**/frontend/**', 'electron/*', 'react/*', 'react-dom/*'],
        backendMessage,
      ),
    },
  },
];
