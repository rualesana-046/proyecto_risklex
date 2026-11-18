import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPdf, paginate, wrapText } from '../test/support/pdf-builder.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const HARNESS = join(ROOT, 'test', 'electron', 'utility-harness.js');
const ELECTRON = String(createRequire(import.meta.url)('electron'));
const WORKER = join('out', 'main', 'pdf-text.worker.js');
const RUN_TIMEOUT_MS = 120_000;

interface Expectation {
  readonly file: string;
  readonly bytes: Uint8Array;
  readonly check: (message: { ok?: boolean; text?: string; code?: string }) => boolean;
}

function findApp(target: string): string | null {
  if (existsSync(join(target, WORKER))) {
    return target;
  }
  if (!existsSync(target)) {
    return null;
  }
  const asar = readdirSync(target, { recursive: true, withFileTypes: true }).find(
    (entry) => entry.name === 'app.asar' && !entry.parentPath.includes('node_modules'),
  );
  return asar === undefined ? null : join(asar.parentPath, asar.name);
}

function expectations(): Expectation[] {
  const sample = readFileSync(
    join(ROOT, '..', '..', 'docs', 'ai-evaluation', 'synthetic-terms-es.md'),
    'utf8',
  );
  const normal = buildPdf({ pages: paginate(wrapText(sample)) });
  return [
    {
      file: 'terms.pdf',
      bytes: normal,
      check: (message) =>
        message.ok === true &&
        (message.text ?? '').replace(/\s+/gu, ' ').includes('socios comerciales y anunciantes'),
    },
    {
      file: 'no-text.pdf',
      bytes: buildPdf({ pages: [[]] }),
      check: (message) => message.code === 'pdf_no_text',
    },
    {
      file: 'protected.pdf',
      bytes: buildPdf({ pages: [['Documento protegido de prueba']], encrypted: true }),
      check: (message) => message.code === 'pdf_encrypted',
    },
    {
      file: 'damaged.pdf',
      bytes: new Uint8Array([...normal.subarray(0, 40), ...new Uint8Array(200).fill(0x41)]),
      check: (message) => message.code === 'pdf_damaged',
    },
  ];
}

function readWith(
  app: string,
  pdf: string,
): { kind?: string; message?: { ok?: boolean; text?: string; code?: string } } {
  const result = spawnSync(ELECTRON, [HARNESS, 'pdf', join(app, WORKER), pdf, '512'], {
    encoding: 'utf8',
    timeout: RUN_TIMEOUT_MS,
  });
  try {
    return JSON.parse(result.stdout.trim().split('\n').at(-1) ?? '') as { kind?: string };
  } catch {
    return {};
  }
}

function smoke(app: string): boolean {
  const work = mkdtempSync(join(tmpdir(), 'risklex-smoke-'));
  try {
    return expectations().every(({ file, bytes, check }) => {
      const pdf = join(work, file);
      writeFileSync(pdf, bytes);
      const outcome = readWith(app, pdf);
      const passed =
        outcome.kind === 'message' && outcome.message !== undefined && check(outcome.message);
      process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${file}\n`);
      return passed;
    });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const target = resolve(process.argv[2] ?? join(ROOT, 'release'));
const app = findApp(target);
if (app === null) {
  process.stderr.write('No packaged app.asar or built app was found\n');
  process.exit(1);
}
if (!smoke(app)) {
  process.stderr.write('The packaged pdf reader did not behave as expected\n');
  process.exit(1);
}
process.stdout.write('Packaged pdf reader OK\n');
