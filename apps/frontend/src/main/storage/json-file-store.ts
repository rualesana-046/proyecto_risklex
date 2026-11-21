import * as fs from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import type * as z from 'zod';

export interface StoreFileSystem {
  readonly readFile: (path: string, encoding: 'utf8') => Promise<string>;
  readonly writeFile: (path: string, data: string, encoding: 'utf8') => Promise<void>;
  readonly rename: (from: string, to: string) => Promise<void>;
  readonly rm: (path: string, options: { force: boolean }) => Promise<void>;
  readonly mkdir: (path: string, options: { recursive: true }) => Promise<unknown>;
  readonly readdir: (path: string) => Promise<string[]>;
}

export interface JsonFileStoreOptions<T> {
  readonly path: string;
  readonly schema: z.ZodType<T>;
  readonly defaults: () => T;
  readonly fileSystem?: StoreFileSystem;
  readonly retryDelayMs?: number;
  readonly indent?: number;
}

export interface LoadedValue<T> {
  readonly value: T;
  readonly recovered: boolean;
}

export interface JsonFileStore<T> {
  load(): Promise<LoadedValue<T>>;
  save(value: T): Promise<void>;
  setAside(content: unknown): Promise<void>;
  removeSetAside(): Promise<void>;
}

const RENAME_ATTEMPTS = 4;
const DEFAULT_RETRY_DELAY_MS = 50;
const DEFAULT_INDENT = 2;
const RETRYABLE_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

type StoredRead<T> = { kind: 'missing' } | { kind: 'invalid' } | { kind: 'valid'; value: T };

function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

async function readStored<T>(
  files: StoreFileSystem,
  path: string,
  schema: z.ZodType<T>,
): Promise<StoredRead<T>> {
  let raw: string;
  try {
    raw = await files.readFile(path, 'utf8');
  } catch (error) {
    if (errorCode(error) === 'ENOENT') {
      return { kind: 'missing' };
    }
    throw error;
  }
  const parsed = schema.safeParse(parseJson(raw));
  return parsed.success ? { kind: 'valid', value: parsed.data } : { kind: 'invalid' };
}

async function renameWithRetry(
  files: StoreFileSystem,
  from: string,
  to: string,
  retryDelayMs: number,
): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await files.rename(from, to);
      return;
    } catch (error) {
      if (attempt >= RENAME_ATTEMPTS || !RETRYABLE_CODES.has(errorCode(error))) {
        throw error;
      }
      await delay(retryDelayMs * attempt);
    }
  }
}

async function atomicWrite(
  files: StoreFileSystem,
  path: string,
  content: string,
  retryDelayMs: number,
): Promise<void> {
  await files.mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${String(process.pid)}.${String(Date.now())}.tmp`;
  try {
    await files.writeFile(temporary, content, 'utf8');
    await renameWithRetry(files, temporary, path, retryDelayMs);
  } catch (error) {
    await files.rm(temporary, { force: true });
    throw error;
  }
}

async function removeMatching(files: StoreFileSystem, folder: string, prefix: string) {
  const names = await files.readdir(folder).catch(() => []);
  const matching = names.filter((name) => name.startsWith(prefix) && name.endsWith('.json'));
  await Promise.all(matching.map((name) => files.rm(join(folder, name), { force: true })));
}

export function createJsonFileStore<T>(options: JsonFileStoreOptions<T>): JsonFileStore<T> {
  const files = options.fileSystem ?? fs;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const folder = dirname(options.path);
  const setAsidePrefix = `${basename(options.path).replace(/\.json$/u, '')}.corrupt-`;
  let queue: Promise<void> = Promise.resolve();

  const load = async (): Promise<LoadedValue<T>> => {
    const stored = await readStored(files, options.path, options.schema);
    if (stored.kind === 'valid') {
      return { value: stored.value, recovered: false };
    }
    if (stored.kind === 'invalid') {
      const target = join(folder, `${setAsidePrefix}${String(Date.now())}.json`);
      await renameWithRetry(files, options.path, target, retryDelayMs);
    }
    return { value: options.defaults(), recovered: stored.kind === 'invalid' };
  };

  const enqueue = (path: string, content: string): Promise<void> => {
    const next = queue.then(() => atomicWrite(files, path, content, retryDelayMs));
    queue = next.catch(() => undefined);
    return next;
  };

  const save = (value: T): Promise<void> => {
    const indent = options.indent ?? DEFAULT_INDENT;
    return enqueue(options.path, `${JSON.stringify(options.schema.parse(value), null, indent)}\n`);
  };

  const setAside = (content: unknown): Promise<void> =>
    enqueue(join(folder, `${setAsidePrefix}${String(Date.now())}.json`), JSON.stringify(content));

  return {
    load,
    save,
    setAside,
    removeSetAside: () => removeMatching(files, folder, setAsidePrefix),
  };
}
