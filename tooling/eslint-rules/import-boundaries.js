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
const rendererMessage =
  'The renderer must stay free of the backend, Electron, Node APIs and main or preload code.';
const preloadMessage =
  'The sandboxed preload may only use Electron and the shared channel names, never Node APIs or zod.';
const commonMessage =
  'Frontend common code must stay free of the backend, Electron, Node APIs and React.';

const backendImports = [['@risklex/backend'], ['@risklex/backend/*', '**/backend/**']];
const nodeImports = [nodeBuiltins, ['node:*']];

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
    files: ['apps/frontend/src/renderer/**'],
    rules: {
      'no-restricted-imports': restrict(
        [...backendImports[0], 'electron', ...nodeImports[0]],
        [...backendImports[1], 'electron/*', ...nodeImports[1], '**/main/**', '**/preload/**'],
        rendererMessage,
      ),
    },
  },
  {
    files: ['apps/frontend/src/preload/**'],
    rules: {
      'no-restricted-imports': restrict(
        [...backendImports[0], 'zod', 'react', 'react-dom', ...nodeImports[0]],
        [
          ...backendImports[1],
          'zod/*',
          ...nodeImports[1],
          '**/main/**',
          '**/renderer/**',
          '**/ipc-schemas*',
        ],
        preloadMessage,
      ),
    },
  },
  {
    files: ['apps/frontend/src/common/**'],
    rules: {
      'no-restricted-imports': restrict(
        [...backendImports[0], 'electron', 'react', 'react-dom', ...nodeImports[0]],
        [
          ...backendImports[1],
          'electron/*',
          'react/*',
          'react-dom/*',
          ...nodeImports[1],
          '**/main/**',
          '**/preload/**',
          '**/renderer/**',
        ],
        commonMessage,
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
