import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildPdf, paginate, wrapText } from './support/pdf-builder.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const HARNESS = join(ROOT, 'test', 'electron', 'utility-harness.js');
const MEMORY_HOG = join(ROOT, 'test', 'electron', 'memory-hog.worker.js');
const ELECTRON = String(createRequire(import.meta.url)('electron'));
const EXAMPLE_URL = 'https://example-api.example-account.workers.dev';
const RUN_TIMEOUT_MS = 120_000;
const canRunElectron = process.platform === 'darwin' && existsSync(ELECTRON);

interface HarnessResult {
  readonly kind: 'message' | 'exit' | 'timeout' | 'killed';
  readonly message?: { ok: boolean; text?: string; code?: string };
  readonly code?: number;
  readonly usageMb?: number;
  readonly lastReport?: { heapMb: number } | null;
  readonly ms: number;
}

function harness(
  mode: string,
  modulePath: string,
  pdfPath: string,
  limitMb: number,
): HarnessResult {
  const result = spawnSync(ELECTRON, [HARNESS, mode, modulePath, pdfPath, String(limitMb)], {
    encoding: 'utf8',
    timeout: RUN_TIMEOUT_MS,
  });
  const line = result.stdout.trim().split('\n').at(-1) ?? '';
  return JSON.parse(line) as HarnessResult;
}

describe.runIf(canRunElectron)('pdf reader in a real Electron utility process', () => {
  const work = mkdtempSync(join(tmpdir(), 'risklex-utility-'));
  const outDir = join(work, 'out');
  const samplePdf = join(work, 'sample.pdf');

  beforeAll(() => {
    const config = JSON.stringify({ logLevel: 'silent', build: { outDir } });
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
    const sample = readFileSync(
      join(ROOT, '..', '..', 'docs', 'ai-evaluation', 'synthetic-terms-es.md'),
      'utf8',
    );
    writeFileSync(samplePdf, buildPdf({ pages: paginate(wrapText(sample)) }));
  }, RUN_TIMEOUT_MS);

  afterAll(() => {
    rmSync(work, { recursive: true, force: true });
  });

  it(
    'extracts text with the compiled worker',
    () => {
      const result = harness('pdf', join(outDir, 'main', 'pdf-text.worker.js'), samplePdf, 512);
      expect(result.kind).toBe('message');
      expect(result.message?.ok).toBe(true);
      expect(result.message?.text?.replace(/\s+/gu, ' ')).toContain(
        'socios comerciales y anunciantes',
      );
    },
    RUN_TIMEOUT_MS,
  );

  it(
    'lets the main process watch and stop a reader that goes over its memory limit',
    () => {
      const result = harness('memory', MEMORY_HOG, samplePdf, 512);
      expect(result.kind).toBe('killed');
      expect(result.usageMb).toBeGreaterThan(512);
      expect(result.lastReport?.heapMb ?? 0).toBeLessThan(1024);
    },
    RUN_TIMEOUT_MS,
  );
});
