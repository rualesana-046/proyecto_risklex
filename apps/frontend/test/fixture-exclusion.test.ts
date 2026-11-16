import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FIXTURE_VARIABLE = 'MAIN_VITE_RISKLEX_FIXTURE';
const MARKERS = [
  'risklex-development-fixture',
  'createFixtureAnalysisClient',
  'keyPhrase',
  'expectedSeverity',
];
const BUILD_TIMEOUT_MS = 120_000;

interface Scan {
  readonly main: string[];
  readonly renderer: string[];
  readonly files: number;
  readonly mainImports: string[];
  readonly absoluteReferences: string[];
  readonly fonts: number;
  readonly policy: string;
}

function filesUnder(directory: string, extension: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => join(entry.parentPath, entry.name));
}

function moduleImports(source: string): string[] {
  const specifiers = [
    ...source.matchAll(/^import\s[^'"]*["']([^"']+)["']/gmu),
    ...source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/gu),
    ...source.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/gu),
  ].map((match) => match[1] ?? '');
  return [...new Set(specifiers)];
}

function absoluteReferences(renderer: string): string[] {
  const sources = [...filesUnder(renderer, '.html'), ...filesUnder(renderer, '.css')].map((file) =>
    readFileSync(file, 'utf8'),
  );
  return sources.flatMap((source) =>
    [...source.matchAll(/(?:src|href)="(\/[^"]*)"|url\(\s*["']?(\/[^)"']*)/gu)].map(
      (match) => match[1] ?? match[2] ?? '',
    ),
  );
}

function inspect(outDir: string) {
  const renderer = join(outDir, 'renderer');
  const html = readFileSync(join(renderer, 'index.html'), 'utf8');
  return {
    mainImports: moduleImports(readFileSync(join(outDir, 'main', 'index.js'), 'utf8')),
    absoluteReferences: absoluteReferences(renderer),
    fonts: filesUnder(renderer, '.woff2').length,
    policy: (
      /http-equiv="Content-Security-Policy" content="([^"]*)"/u.exec(html)?.[1] ?? ''
    ).replaceAll('&#39;', "'"),
  };
}

function markersIn(directory: string): string[] {
  const found = new Set<string>();
  for (const entry of readdirSync(directory, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) {
      const content = readFileSync(join(entry.parentPath, entry.name), 'utf8');
      for (const marker of MARKERS.filter((candidate) => content.includes(candidate))) {
        found.add(marker);
      }
    }
  }
  return [...found];
}

function runBuild(outDir: string, define: Record<string, string> | undefined): void {
  const config = JSON.stringify({
    logLevel: 'silent',
    build: { outDir },
    ...(define ? { define } : {}),
  });
  const script = `import { build } from 'electron-vite'; await build(${config});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: ROOT,
    env: { ...process.env, [FIXTURE_VARIABLE]: 'sample' },
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`electron-vite build failed: ${result.stderr}`);
  }
}

function buildWithFixtureVariable(define?: Record<string, string>): Scan {
  const outDir = mkdtempSync(join(tmpdir(), 'risklex-fixture-'));
  try {
    runBuild(outDir, define);
    return {
      main: markersIn(join(outDir, 'main')),
      renderer: markersIn(join(outDir, 'renderer')),
      files: readdirSync(outDir, { recursive: true }).length,
      ...inspect(outDir),
    };
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

describe('production build output (real electron-vite build)', () => {
  it(
    'leaves the fixture out of the build that both build and preview run, even with the variable set',
    () => {
      const scan = buildWithFixtureVariable();
      expect(scan.files).toBeGreaterThan(0);
      expect(scan.main).toEqual([]);
      expect(scan.renderer).toEqual([]);
      expect(
        scan.mainImports.filter((name) => name !== 'electron' && !name.startsWith('node:')),
      ).toEqual([]);
      expect(scan.absoluteReferences).toEqual([]);
      expect(scan.fonts).toBeGreaterThanOrEqual(5);
      expect(scan.policy).toContain("default-src 'none'");
      expect(scan.policy).not.toMatch(/unsafe-|ws:/u);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    'detects the fixture when development mode is forced, so the scan is not blind',
    () => {
      const scan = buildWithFixtureVariable({ 'import.meta.env.DEV': 'true' });
      expect(scan.main).toContain('risklex-development-fixture');
      expect(scan.renderer).toEqual([]);
    },
    BUILD_TIMEOUT_MS,
  );
});
