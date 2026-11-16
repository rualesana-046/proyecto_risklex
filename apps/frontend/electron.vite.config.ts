import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'electron-vite';
import type { Plugin } from 'vite';
import { contentSecurityPolicy } from './build/content-security-policy.ts';
import { assertReleaseEnvironment } from './build/release-environment.ts';

function contentSecurityPolicyPlugin(mode: string): Plugin {
  return {
    name: 'risklex-content-security-policy',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy(mode) },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig(({ mode }) => {
  assertReleaseEnvironment(mode, loadEnv(mode));
  return {
    main: {
      build: {
        externalizeDeps: false,
        rolldownOptions: {
          input: {
            index: 'src/main/index.ts',
            'pdf-text.worker': 'src/main/workers/pdf-text.worker.ts',
          },
        },
      },
    },
    preload: {
      build: {
        externalizeDeps: false,
        rolldownOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } },
      },
    },
    renderer: {
      plugins: [react(), contentSecurityPolicyPlugin(mode)],
      build: { assetsInlineLimit: 0 },
    },
  };
});
