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
  'localServerTransport',
  'fakeResolver',
];
const BUILD_TIMEOUT_MS = 120_000;
const EXAMPLE_URL = 'https://example-api.example-account.workers.dev';
const RELEASE_URL_ERROR = 'MAIN_VITE_RISKLEX_API_URL is missing or invalid for a release build';

interface Scan {
  readonly main: string[];
  readonly renderer: string[];
  readonly files: number;
  readonly mainImports: string[];
  readonly indexImports: string[];
  readonly hasPdfWorker: boolean;
  readonly preload: string;
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
  return [...new Set(specifiers)].filter((specifier) => !specifier.includes('${'));
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
    mainImports: filesUnder(join(outDir, 'main'), '.js').flatMap((file) =>
      moduleImports(readFileSync(file, 'utf8')),
    ),
    indexImports: moduleImports(readFileSync(join(outDir, 'main', 'index.js'), 'utf8')),
    hasPdfWorker: filesUnder(join(outDir, 'main'), 'pdf-text.worker.js').length === 1,
    preload: readFileSync(join(outDir, 'preload', 'index.cjs'), 'utf8'),
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

interface BuildOptions {
  readonly define?: Record<string, string>;
  readonly mode?: string;
  readonly url?: string;
}

function runBuild(outDir: string, options: BuildOptions) {
  const config = JSON.stringify({
    logLevel: 'silent',
    build: { outDir },
    ...(options.mode === undefined ? {} : { mode: options.mode }),
    ...(options.define === undefined ? {} : { define: options.define }),
  });
  const script = `import { build } from 'electron-vite'; await build(${config});`;
  return spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: ROOT,
    env: {
      ...process.env,
      [FIXTURE_VARIABLE]: 'sample',
      MAIN_VITE_RISKLEX_API_URL: options.url ?? EXAMPLE_URL,
    },
    encoding: 'utf8',
  });
}

function buildAndInspect(options: BuildOptions = {}): Scan & { readonly mainSource: string } {
  const outDir = mkdtempSync(join(tmpdir(), 'risklex-build-'));
  try {
    const result = runBuild(outDir, options);
    if (result.status !== 0) {
      throw new Error(`electron-vite build failed: ${result.stderr}`);
    }
    return {
      main: markersIn(join(outDir, 'main')),
      renderer: markersIn(join(outDir, 'renderer')),
      files: readdirSync(outDir, { recursive: true }).length,
      mainSource: readFileSync(join(outDir, 'main', 'index.js'), 'utf8'),
      ...inspect(outDir),
    };
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

function failedBuildOutput(options: BuildOptions): string {
  const outDir = mkdtempSync(join(tmpdir(), 'risklex-build-'));
  try {
    const result = runBuild(outDir, options);
    expect(result.status).not.toBe(0);
    return `${result.stdout}${result.stderr}`;
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

describe('production build output (real electron-vite build)', () => {
  it(
    'leaves the fixture out of the build that both build and preview run, even with the variable set',
    () => {
      const scan = buildAndInspect();
      expect(scan.files).toBeGreaterThan(0);
      expect(scan.main).toEqual([]);
      expect(scan.renderer).toEqual([]);
      expect(
        scan.mainImports.filter(
          (name) => name !== 'electron' && !name.startsWith('node:') && !name.startsWith('./'),
        ),
      ).toEqual([]);
      expect(scan.hasPdfWorker).toBe(true);
      expect(scan.preload).not.toMatch(/zod|strictObject|unpdf|pdfjs/u);
      expect(scan.preload).not.toMatch(/acceptedAt|historyEnabled|textSize|welcomeSeen/u);
      expect(moduleImports(scan.preload)).toEqual(['electron']);
      expect(scan.indexImports.filter((name) => name.includes('pdfjs'))).toEqual([]);
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
      const scan = buildAndInspect({ define: { 'import.meta.env.DEV': 'true' } });
      expect(scan.main).toContain('risklex-development-fixture');
      expect(scan.renderer).toEqual([]);
    },
    BUILD_TIMEOUT_MS,
  );
});

describe('release build (real electron-vite build)', () => {
  it(
    'embeds the backend url and keeps the fixture and dev policy out',
    () => {
      const scan = buildAndInspect({ mode: 'release' });
      expect(scan.mainSource).toContain(EXAMPLE_URL);
      expect(scan.main).toEqual([]);
      expect(scan.policy).not.toMatch(/unsafe-|ws:/u);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    'fails without a valid url and never prints the value it rejected',
    () => {
      const rejected = 'http://rejected-value.example.test';
      const output = failedBuildOutput({ mode: 'release', url: rejected });
      expect(output).toContain(RELEASE_URL_ERROR);
      expect(output).not.toContain('rejected-value');
      expect(failedBuildOutput({ mode: 'release', url: '' })).toContain(RELEASE_URL_ERROR);
    },
    BUILD_TIMEOUT_MS,
  );
});
