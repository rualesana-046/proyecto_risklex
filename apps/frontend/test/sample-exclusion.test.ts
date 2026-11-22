import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SAMPLE = join(ROOT, '..', '..', 'docs', 'ai-evaluation', 'synthetic-terms-es.md');
const EXAMPLE_URL = 'https://example-api.example-account.workers.dev';
const BUILD_TIMEOUT_MS = 120_000;
const SAMPLE_PHRASES = [
  'servicio ficticio de almacenamiento de fotos',
  'Al crear una cuenta en Nubeo',
  'Términos del servicio de Nubeo',
];

function phrasesIn(directory: string): string[] {
  const found = new Set<string>();
  for (const entry of readdirSync(directory, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) {
      const content = readFileSync(join(entry.parentPath, entry.name), 'utf8');
      for (const phrase of SAMPLE_PHRASES.filter((candidate) => content.includes(candidate))) {
        found.add(phrase);
      }
    }
  }
  return [...found];
}

describe('sample document kept out of the build (real electron-vite build)', () => {
  const work = mkdtempSync(join(tmpdir(), 'risklex-sample-exclusion-'));
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
  }, BUILD_TIMEOUT_MS);

  afterAll(() => {
    rmSync(work, { recursive: true, force: true });
  });

  it('looks for phrases that really are in the sample document', () => {
    const sample = readFileSync(SAMPLE, 'utf8');
    for (const phrase of SAMPLE_PHRASES) {
      expect(sample).toContain(phrase);
    }
  });

  it.each(['renderer', 'main'])('finds none of them in out/%s', (folder) => {
    expect(phrasesIn(join(out, folder))).toEqual([]);
  });

  it('detects a phrase planted in a built folder, so the scan is not blind', () => {
    const planted = join(work, 'planted', 'renderer', 'assets');
    mkdirSync(planted, { recursive: true });
    writeFileSync(join(planted, 'index.js'), `const text = "${SAMPLE_PHRASES[1] ?? ''}";\n`);
    expect(phrasesIn(join(work, 'planted'))).toEqual([SAMPLE_PHRASES[1]]);
  });
});
