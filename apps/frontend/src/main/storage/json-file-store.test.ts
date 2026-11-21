import * as fs from 'node:fs/promises';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import { createJsonFileStore, type StoreFileSystem } from './json-file-store.ts';

const schema = z.object({ version: z.literal(1), count: z.number().int() });
type Value = z.infer<typeof schema>;
const defaults = (): Value => ({ version: 1, count: 0 });

let folder = '';
let path = '';

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'risklex-store-'));
  path = join(folder, 'data', 'settings.json');
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

function store(fileSystem?: StoreFileSystem) {
  return createJsonFileStore({ path, schema, defaults, fileSystem, retryDelayMs: 1 });
}

function filesIn(directory: string): string[] {
  return readdirSync(directory).sort();
}

describe('json file store (real temporary folder)', () => {
  it('returns the defaults when the file does not exist yet', async () => {
    expect(await store().load()).toEqual({ value: defaults(), recovered: false });
  });

  it('saves and loads a value, creating the folder and leaving no temporary files', async () => {
    await store().save({ version: 1, count: 3 });
    expect(await store().load()).toEqual({ value: { version: 1, count: 3 }, recovered: false });
    expect(filesIn(join(folder, 'data'))).toEqual(['settings.json']);
  });

  it.each([
    ['broken json', '{"version": 1, "count":'],
    ['an unknown version', '{"version": 2, "count": 1}'],
    ['a wrong type', '{"version": 1, "count": "many"}'],
  ])('sets aside a file with %s and starts from the defaults', async (_label, content) => {
    await fs.mkdir(join(folder, 'data'));
    writeFileSync(path, content);
    expect(await store().load()).toEqual({ value: defaults(), recovered: true });
    const names = filesIn(join(folder, 'data'));
    expect(names).toHaveLength(1);
    expect(names[0]).toMatch(/^settings\.corrupt-\d+\.json$/u);
    expect(readFileSync(join(folder, 'data', names[0] ?? ''), 'utf8')).toBe(content);
  });

  it('removes the set aside files and nothing else', async () => {
    await fs.mkdir(join(folder, 'data'));
    writeFileSync(join(folder, 'data', 'settings.corrupt-1.json'), 'x');
    writeFileSync(join(folder, 'data', 'history.corrupt-1.json'), 'x');
    await store().save(defaults());
    await store().removeSetAside();
    expect(filesIn(join(folder, 'data'))).toEqual(['history.corrupt-1.json', 'settings.json']);
  });

  it('keeps the order of concurrent saves', async () => {
    const target = store();
    await Promise.all([1, 2, 3, 4, 5].map((count) => target.save({ version: 1, count })));
    expect((await target.load()).value.count).toBe(5);
  });

  it('refuses to save an invalid value without touching the file', async () => {
    const target = store();
    await target.save({ version: 1, count: 1 });
    expect(() => target.save({ version: 1, count: 1.5 })).toThrow();
    expect((await target.load()).value.count).toBe(1);
  });
});

describe('json file store (simulated rename failures)', () => {
  function flakyRename(codes: readonly string[]): StoreFileSystem {
    let failures = [...codes];
    const rename = vi.fn(async (from: string, to: string) => {
      const [code, ...rest] = failures;
      if (code !== undefined) {
        failures = rest;
        throw Object.assign(new Error(code), { code });
      }
      await fs.rename(from, to);
    });
    return { ...fs, rename };
  }

  it('retries a rename blocked by another program', async () => {
    await store(flakyRename(['EPERM', 'EBUSY'])).save({ version: 1, count: 7 });
    expect((await store().load()).value.count).toBe(7);
  });

  it('gives up after repeated failures and removes the temporary file', async () => {
    const failing = store(flakyRename(['EPERM', 'EPERM', 'EPERM', 'EPERM']));
    await expect(failing.save({ version: 1, count: 7 })).rejects.toThrow('EPERM');
    expect(filesIn(join(folder, 'data'))).toEqual([]);
    await store().save({ version: 1, count: 8 });
    expect((await store().load()).value.count).toBe(8);
  });

  it('does not retry an error that a retry cannot fix', async () => {
    await expect(store(flakyRename(['ENOSPC'])).save(defaults())).rejects.toThrow('ENOSPC');
  });
});
