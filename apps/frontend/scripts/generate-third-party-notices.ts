import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUTPUT = join(ROOT, 'THIRD-PARTY-NOTICES.txt');
const EXAMPLE_URL = 'https://example-api.example-account.workers.dev';
const ASSET_PACKAGES = ['@fontsource/atkinson-hyperlegible-next', '@fontsource/plus-jakarta-sans'];
const LICENSE_FILE = /^(licen[sc]e|copying|notice)([.-].*)?$/iu;
const HEADER = [
  'Third-party software included in RiskLex',
  '',
  'Electron and Chromium licenses ship with the app as LICENSE.electron.txt and LICENSES.chromium.html.',
  'This file lists the packages bundled into the app and their runtime dependencies.',
].join('\n');

interface PackageInfo {
  readonly name: string;
  readonly version: string;
  readonly license: string;
  readonly dependencies: readonly string[];
}

function buildWithSourceMaps(outDir: string): void {
  const config = JSON.stringify({ logLevel: 'silent', build: { outDir, sourcemap: true } });
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', `import { build } from 'electron-vite'; await build(${config});`],
    {
      cwd: ROOT,
      env: { ...process.env, MAIN_VITE_RISKLEX_API_URL: EXAMPLE_URL },
      encoding: 'utf8',
    },
  );
  if (result.status !== 0) {
    throw new Error('The build for the notices failed');
  }
}

function packageRoot(file: string): string | null {
  const marker = `${sep}node_modules${sep}`;
  const index = file.lastIndexOf(marker);
  if (index === -1) {
    return null;
  }
  const rest = file.slice(index + marker.length).split(sep);
  const depth = rest[0]?.startsWith('@') === true ? 2 : 1;
  return file.slice(0, index + marker.length) + rest.slice(0, depth).join(sep);
}

function bundledPackageRoots(outDir: string): Set<string> {
  const roots = new Set<string>();
  for (const entry of readdirSync(outDir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.map')) {
      const map = JSON.parse(readFileSync(join(entry.parentPath, entry.name), 'utf8')) as {
        sources: string[];
      };
      for (const source of map.sources) {
        const root = packageRoot(resolve(entry.parentPath, source));
        if (root !== null) {
          roots.add(root);
        }
      }
    }
  }
  return roots;
}

function readPackage(root: string): PackageInfo {
  const json = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  const license = typeof json['license'] === 'string' ? json['license'] : 'UNKNOWN';
  const dependencies = Object.keys(
    (json['dependencies'] as Record<string, string> | undefined) ?? {},
  );
  return { name: String(json['name']), version: String(json['version']), license, dependencies };
}

function findInstalled(from: string, name: string): string | null {
  let directory = from;
  for (;;) {
    const candidate = join(directory, 'node_modules', name);
    if (existsSync(join(candidate, 'package.json'))) {
      return candidate;
    }
    const parent = dirname(directory);
    if (parent === directory) {
      return null;
    }
    directory = parent;
  }
}

function withDependencies(roots: Set<string>): Set<string> {
  const pending = [...roots];
  for (let root = pending.pop(); root !== undefined; root = pending.pop()) {
    for (const dependency of readPackage(root).dependencies) {
      const installed = findInstalled(root, dependency);
      if (installed !== null && !roots.has(installed)) {
        roots.add(installed);
        pending.push(installed);
      }
    }
  }
  return roots;
}

function portablePath(file: string, root: string): string {
  return file
    .slice(root.length + 1)
    .split(sep)
    .join('/');
}

function licenseTexts(root: string): string[] {
  const files = readdirSync(root)
    .filter((file) => LICENSE_FILE.test(file))
    .map((file) => join(root, file));
  const bundled = join(root, 'dist', 'licenses');
  const extra = existsSync(bundled) ? readdirSync(bundled).map((file) => join(bundled, file)) : [];
  return [...files, ...extra]
    .sort()
    .map(
      (file) =>
        `--- ${portablePath(file, root)} ---\n${readFileSync(file, 'utf8').replace(/\r\n?/gu, '\n').trim()}`,
    );
}

function notices(roots: Set<string>): string {
  const unique = new Map<string, { root: string; info: PackageInfo }>();
  for (const root of roots) {
    const info = readPackage(root);
    unique.set(`${info.name}@${info.version}`, { root, info });
  }
  const sections = [...unique.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { root, info }]) =>
      [`=== ${info.name} ${info.version} (${info.license}) ===`, ...licenseTexts(root)].join(
        '\n\n',
      ),
    );
  return `${[HEADER, ...sections].join('\n\n')}\n`;
}

function generate(): string {
  const outDir = mkdtempSync(join(tmpdir(), 'risklex-notices-'));
  try {
    buildWithSourceMaps(outDir);
    const roots = bundledPackageRoots(outDir);
    for (const name of ASSET_PACKAGES) {
      const installed = findInstalled(ROOT, name);
      if (installed !== null) {
        roots.add(installed);
      }
    }
    return notices(withDependencies(roots));
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

const content = generate();
if (process.argv.includes('--check')) {
  const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : '';
  if (current !== content) {
    const expected = content.split('\n');
    const line = current.split('\n').findIndex((text, index) => text !== expected[index]);
    process.stderr.write(
      `THIRD-PARTY-NOTICES.txt is out of date at line ${String(line + 1)}: ${expected[line] ?? ''}\n`,
    );
    process.exit(1);
  }
} else {
  writeFileSync(OUTPUT, content);
}
