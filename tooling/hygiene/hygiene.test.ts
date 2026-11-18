import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const HYGIENE = join(HERE, 'hygiene.sh');
const COMMIT_GATE = join(HERE, 'commit-gate.sh');
const GIT_IDENTITY = [
  '-c',
  'user.name=test',
  '-c',
  `user.email=${['test', 'example.invalid'].join('@')}`,
];

let repository = '';

function git(...args: string[]): string {
  return execFileSync('git', [...GIT_IDENTITY, ...args], { cwd: repository, encoding: 'utf8' });
}

function write(name: string, content: string): void {
  writeFileSync(join(repository, name), content);
}

function run(script: string, args: readonly string[] = []) {
  return spawnSync('sh', [script, ...args], { cwd: repository, encoding: 'utf8' });
}

function packageWithValidate(command: string): void {
  write(
    'package.json',
    JSON.stringify({ name: 'gate-test', private: true, scripts: { validate: command } }),
  );
  git('add', 'package.json');
  git('commit', '-q', '-m', 'base');
}

beforeEach(() => {
  repository = mkdtempSync(join(tmpdir(), 'risklex-hygiene-'));
  git('init', '-q');
});

afterEach(() => {
  rmSync(repository, { recursive: true, force: true });
});

const SECRET = ['sk', 'ant', 'abc123'].join('-');
const LOCAL_PATH = ['', 'Users', 'someone', 'project', 'file.ts'].join('/');
const EMAIL = ['person', 'example.org'].join('@');
const TOOL = ['Generated', 'with', 'Claude', 'Code'].join(' ');
const COMMENT = ['/', '/ note'].join('');

describe.skipIf(process.platform === 'win32')('hygiene.sh on staged changes', () => {
  it('accepts a clean change', () => {
    write('clean.ts', 'export const value = 1;\n');
    git('add', 'clean.ts');
    expect(run(HYGIENE).status).toBe(0);
  });

  it.each([
    ['a secret', `const key = '${SECRET}';\n`],
    ['a local path', `const path = '${LOCAL_PATH}';\n`],
    ['an email', `const mail = '${EMAIL}';\n`],
    ['a tool mention', `${TOOL}\n`],
    ['a comment', `${COMMENT}\n`],
  ])('fails on %s', (_label, content) => {
    write('change.ts', content);
    git('add', 'change.ts');
    expect(run(HYGIENE).status).not.toBe(0);
  });

  it('fails on a staged env file', () => {
    write('.env.local', 'VALUE=1\n');
    git('add', '-f', '.env.local');
    expect(run(HYGIENE).status).not.toBe(0);
  });

  it('checks every commit message in a range', () => {
    write('clean.ts', 'export const value = 1;\n');
    git('add', 'clean.ts');
    git('commit', '-q', '-m', `feat: change\n\n${TOOL}`);
    expect(run(HYGIENE, ['--range', 'HEAD']).status).not.toBe(0);
  });
});

describe.skipIf(process.platform === 'win32')('commit-gate.sh', () => {
  it('commits exactly the listed files when validate and hygiene pass', () => {
    packageWithValidate('exit 0');
    write('clean.ts', 'export const value = 1;\n');
    expect(run(COMMIT_GATE, ['feat: add value', 'clean.ts']).status).toBe(0);
    expect(git('log', '--format=%s', '-1').trim()).toBe('feat: add value');
  });

  it.each([
    ['plan numbers in the message', 'feat: add value (13)', 'exit 0', ['clean.ts']],
    ['more than six files', 'feat: add values', 'exit 0', ['a', 'b', 'c', 'd', 'e', 'f', 'g']],
    ['a failing validate', 'feat: add value', 'exit 1', ['clean.ts']],
  ])('refuses to commit with %s', (_label, message, validate, files) => {
    packageWithValidate(validate);
    write('clean.ts', 'export const value = 1;\n');
    const before = git('rev-parse', 'HEAD');
    expect(run(COMMIT_GATE, [message, ...files]).status).not.toBe(0);
    expect(git('rev-parse', 'HEAD')).toBe(before);
  });

  it('refuses to commit and unstages when hygiene fails', () => {
    packageWithValidate('exit 0');
    write('secret.ts', `const key = '${SECRET}';\n`);
    const before = git('rev-parse', 'HEAD');
    expect(run(COMMIT_GATE, ['feat: add key', 'secret.ts']).status).not.toBe(0);
    expect(git('rev-parse', 'HEAD')).toBe(before);
    expect(git('diff', '--cached', '--name-only').trim()).toBe('');
  });

  it('refuses to commit when other files changed', () => {
    packageWithValidate('exit 0');
    write('clean.ts', 'export const value = 1;\n');
    write('other.ts', 'export const other = 2;\n');
    const before = git('rev-parse', 'HEAD');
    expect(run(COMMIT_GATE, ['feat: add value', 'clean.ts']).status).not.toBe(0);
    expect(git('rev-parse', 'HEAD')).toBe(before);
  });
});
