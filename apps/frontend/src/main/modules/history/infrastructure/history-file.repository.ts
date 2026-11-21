import { HISTORY_LIMIT } from '../../../../common/history-vocabulary.ts';
import { historyFileSchema, storedHistoryEntrySchema } from '../../../../common/history-schemas.ts';
import { createJsonFileStore, type StoreFileSystem } from '../../../storage/json-file-store.ts';
import type { HistoryRepository } from '../application/history.service.ts';
import type { HistoryEntry } from '../domain/history-entry.ts';

export const HISTORY_FILE = 'history.json';

export interface HistoryFileRepositoryOptions {
  readonly path: string;
  readonly fileSystem?: StoreFileSystem;
}

function splitEntries(raw: readonly unknown[]) {
  const valid: HistoryEntry[] = [];
  const invalid: unknown[] = [];
  for (const candidate of raw) {
    const parsed = storedHistoryEntrySchema.safeParse(candidate);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      invalid.push(candidate);
    }
  }
  return { valid, invalid };
}

export function createHistoryFileRepository(
  options: HistoryFileRepositoryOptions,
): HistoryRepository {
  const store = createJsonFileStore({
    path: options.path,
    schema: historyFileSchema,
    defaults: () => ({ version: 1 as const, entries: [] }),
    fileSystem: options.fileSystem,
    indent: 0,
  });
  let cache: readonly HistoryEntry[] | null = null;

  const write = async (entries: readonly HistoryEntry[]): Promise<void> => {
    await store.save({ version: 1, entries: [...entries] });
    cache = entries;
  };

  const readFromDisk = async (): Promise<readonly HistoryEntry[]> => {
    const loaded = await store.load();
    const { valid, invalid } = splitEntries(loaded.value.entries);
    const kept = valid.slice(0, HISTORY_LIMIT);
    if (invalid.length > 0) {
      await store.setAside({ entries: invalid });
    }
    if (invalid.length > 0 || kept.length !== valid.length) {
      await write(kept);
    }
    return kept;
  };

  return {
    load: async () => {
      cache ??= await readFromDisk();
      return cache;
    },
    replace: write,
    clear: async () => {
      await write([]);
      await store.removeSetAside();
    },
  };
}
