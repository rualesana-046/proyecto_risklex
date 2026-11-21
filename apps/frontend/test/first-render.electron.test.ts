import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { encodeInitialSettings } from '../src/common/initial-settings.ts';
import type { PublicSettings } from '../src/common/settings-vocabulary.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const HARNESS = join(ROOT, 'test', 'electron', 'first-render-harness.js');
const ELECTRON = String(createRequire(import.meta.url)('electron'));
const EXAMPLE_URL = 'https://example-api.example-account.workers.dev';
const RUN_TIMEOUT_MS = 120_000;
const BASE: PublicSettings = {
  language: 'es',
  theme: 'light',
  textSize: 'normal',
  welcomeSeen: true,
  historyEnabled: true,
  consentGranted: false,
};

interface FirstRender {
  readonly kind: string;
  readonly page?: {
    readonly theme: string | null;
    readonly textSize: string | null;
    readonly lang: string;
    readonly rootFontSize: string;
    readonly background: string;
    readonly rendered: number;
  };
}

describe.runIf(existsSync(ELECTRON))('first render in a real sandboxed Electron window', () => {
  const work = mkdtempSync(join(tmpdir(), 'risklex-first-render-'));
  const out = join(work, 'out');

  beforeAll(() => {
    const config = JSON.stringify({ logLevel: 'silent', build: { outDir: out } });
    const build = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { build } from 'electron-vite'; await build(${config});`,
      ],
      {
        cwd: ROOT,
        env: { ...process.env, MAIN_VITE_RISKLEX_API_URL: EXAMPLE_URL },
        encoding: 'utf8',
      },
    );
    expect(build.status).toBe(0);
  }, RUN_TIMEOUT_MS);

  afterAll(() => {
    rmSync(work, { recursive: true, force: true });
  });

  function firstRender(settings: PublicSettings): FirstRender {
    const preload = join(out, 'preload', 'index.cjs');
    const page = join(out, 'renderer', 'index.html');
    const result = spawnSync(ELECTRON, [HARNESS, preload, page, encodeInitialSettings(settings)], {
      encoding: 'utf8',
      timeout: RUN_TIMEOUT_MS,
    });
    const line = result.stdout.trim().split('\n').at(-1) ?? '';
    if (!line.startsWith('{')) {
      throw new Error(
        `Electron gave no result: ${result.stderr.trimEnd().split('\n').slice(-30).join('\n')}`,
      );
    }
    return JSON.parse(line) as FirstRender;
  }

  it(
    'shows the saved dark theme, larger text and English from the first paint',
    () => {
      const result = firstRender({ ...BASE, theme: 'dark', textSize: 'larger', language: 'en' });
      expect(result.kind).toBe('page');
      expect(result.page).toMatchObject({
        theme: 'dark',
        textSize: 'larger',
        lang: 'en',
        rootFontSize: '20.8px',
        background: 'rgb(16, 35, 42)',
      });
      expect(result.page?.rendered).toBeGreaterThan(0);
    },
    RUN_TIMEOUT_MS,
  );

  it(
    'shows the saved light theme and normal text from the first paint',
    () => {
      const result = firstRender(BASE);
      expect(result.page).toMatchObject({
        theme: 'light',
        textSize: 'normal',
        lang: 'es',
        rootFontSize: '16px',
        background: 'rgb(246, 239, 229)',
      });
    },
    RUN_TIMEOUT_MS,
  );
});
