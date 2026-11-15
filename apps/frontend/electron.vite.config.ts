import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import type { Plugin } from 'vite';
import { contentSecurityPolicy } from './build/content-security-policy.ts';

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

export default defineConfig(({ mode }) => ({
  main: {
    build: { externalizeDeps: { exclude: ['@risklex/shared'] } },
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
}));
