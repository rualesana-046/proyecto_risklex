import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { importBoundaries } from './tooling/eslint-rules/import-boundaries.js';
import { localPlugin } from './tooling/eslint-rules/no-comments.ts';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/out/**',
      '**/dist/**',
      '**/release/**',
      '**/coverage/**',
      '**/.wrangler/**',
      '**/worker-configuration.d.ts',
      'docs/**',
    ],
  },
  {
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' },
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { local: localPlugin },
    rules: {
      'local/no-comments': 'error',
      'max-lines': ['error', { max: 200, skipBlankLines: true }],
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true }],
      complexity: ['error', 10],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    files: ['apps/backend/src/common/logger.ts', 'apps/backend/scripts/**'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended],
  },
  importBoundaries,
);
