import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(fileURLToPath(new URL('.', import.meta.url)), 'pre-push.sh');
const EMAIL = ['test', 'example.invalid'].join('@');
const OTHER_EMAIL = ['other', 'example.invalid'].join('@');
const SECRET = ['sk', 'ant', 'abcdef123456'].join('-');
const LOCAL_PATH = ['', 'Users', 'someone', 'project', 'notes.txt'].join('/');
const TRAILER = ['Co', 'authored', 'by: Someone'].join('-');
const PIN = 'a'.repeat(40);
const EXPRESSION = "${{ inputs.backend == 'real' && secrets.RISKLEX_API_URL || '' }}";
const CLEAN_CI = [
  'jobs:',
  '  package:',
  '    steps:',
  `      - uses: actions/checkout@${PIN}`,
  '      - env:',
  `          REAL_URL: ${EXPRESSION}`,
  '        run: echo "MAIN_VITE_RISKLEX_API_URL=$address" >> "$GITHUB_ENV"',
  '',
].join('\n');

let repository = '';

function identity(name: string, email: string) {
  return {
    GIT_AUTHOR_NAME: name,
    GIT_AUTHOR_EMAIL: email,
    GIT_COMMITTER_NAME: name,
    GIT_COMMITTER_EMAIL: email,
  };
}

function git(args: string[], env: Record<string, string> = identity('test', EMAIL)) {
  return execFileSync('git', args, {
    cwd: repository,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function commit(
  files: Record<string, string>,
  message = 'feat: change',
  env?: Record<string, string>,
) {
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(repository, name)), { recursive: true });
    writeFileSync(join(repository, name), content);
  }
  git(['add', '-A'], env);
  git(['commit', '-q', '-m', message], env);
}

function run() {
  return spawnSync('sh', [SCRIPT], { cwd: repository, encoding: 'utf8' });
}

beforeEach(() => {
  repository = mkdtempSync(join(tmpdir(), 'risklex-pre-push-'));
  git(['init', '-q']);
  commit(
    { '.github/workflows/ci.yml': CLEAN_CI, 'src/index.ts': 'export const value = 1;\n' },
    'chore: start',
  );
});

afterEach(() => {
  rmSync(repository, { recursive: true, force: true });
});

describe.skipIf(process.platform === 'win32')('pre-push.sh in a temporary repository', () => {
  it('passes a clean repository with one author', () => {
    const result = run();
    expect(result.stdout).toContain('PRE-PUSH OK');
    expect(result.stdout).not.toContain('FALLO');
    expect(result.status).toBe(0);
  });

  it('fails with uncommitted changes', () => {
    writeFileSync(join(repository, 'src/index.ts'), 'export const value = 2;\n');
    const result = run();
    expect(result.stdout).toMatch(/FALLO árbol de trabajo limpio \(1 cambios\)/u);
    expect(result.status).not.toBe(0);
  });

  it('fails with a second author without printing who it is', () => {
    commit(
      { 'src/other.ts': 'export const other = 1;\n' },
      'feat: other',
      identity('other', OTHER_EMAIL),
    );
    const result = run();
    expect(result.stdout).toMatch(/FALLO un único autor \(2 identidades\)/u);
    expect(result.stdout).not.toContain(OTHER_EMAIL);
    expect(result.status).not.toBe(0);
  });

  it('fails with a co-author trailer in a message', () => {
    commit({ 'src/a.ts': 'export const a = 1;\n' }, `feat: a\n\n${TRAILER}`);
    expect(run().stdout).toMatch(
      /FALLO mensajes sin coautorías, sesiones ni herramientas \(1 commits\)/u,
    );
  });

  it.each([
    ['claves', 'src/config.ts', `export const key = '${SECRET}';\n`, SECRET],
    ['rutas locales', 'docs/notes.md', `See ${LOCAL_PATH}\n`, LOCAL_PATH],
    ['correos', 'docs/contact.md', `Write to ${OTHER_EMAIL}\n`, OTHER_EMAIL],
  ])(
    'finds %s anywhere in the history and shows only the file name',
    (label, file, content, secret) => {
      commit({ [file]: content });
      commit({ [file]: 'removed\n' }, 'fix: remove it');
      const result = run();
      expect(result.stdout).toContain(`FALLO ${label} en el historial (1 archivos)`);
      expect(result.stdout).toContain(file);
      expect(result.stdout).not.toContain(secret);
      expect(result.status).not.toBe(0);
    },
  );

  it('ignores the lockfile, the notices and the hygiene tools', () => {
    commit({
      'package-lock.json': `{"author": "${OTHER_EMAIL}"}\n`,
      'apps/frontend/THIRD-PARTY-NOTICES.txt': `Contact ${OTHER_EMAIL}\n`,
      'tooling/hygiene/patterns.txt': `${SECRET}\n`,
    });
    expect(run().status).toBe(0);
  });

  it('fails with a schedule mention in a commit to push', () => {
    commit({ 'docs/plan.md': 'Plan\n' }, ['docs: add the dead', 'line'].join(''));
    expect(run().stdout).toMatch(
      /FALLO commits por subir sin plazos ni evaluadores \(1 mensajes, 0 archivos\)/u,
    );
  });

  it.each([
    ['vars.', CLEAN_CI.replace(EXPRESSION, '${{ vars.RISKLEX_API_URL }}'), 'ci.yml sin vars.'],
    ['--no-sandbox', `${CLEAN_CI}      - run: app --no-sandbox\n`, 'ci.yml sin --no-sandbox'],
    ['a tag', CLEAN_CI.replace(`@${PIN}`, '@v7'), 'ci.yml con acciones fijadas por hash'],
    [
      'the secret outside the expression',
      `${CLEAN_CI}          OTHER: \${{ secrets.RISKLEX_API_URL }}\n`,
      'ci.yml con RISKLEX_API_URL solo en la expresión de backend real',
    ],
  ])('fails when ci.yml uses %s', (_label, ci, check) => {
    commit({ '.github/workflows/ci.yml': ci });
    const result = run();
    expect(result.stdout).toContain(`FALLO ${check}`);
    expect(result.status).not.toBe(0);
  });
});
