import { describe, expect, it, vi } from 'vitest';
import { syntheticAnalysis, syntheticEntry } from '../history.test-support.ts';
import type { HistoryEntry } from '../domain/history-entry.ts';
import { createHistoryService, type HistoryRepository } from './history.service.ts';

function memoryRepository(initial: readonly HistoryEntry[] = []) {
  let entries = initial;
  const replace = vi.fn((next: readonly HistoryEntry[]) => {
    entries = next;
    return Promise.resolve();
  });
  const repository: HistoryRepository = {
    load: vi.fn(() => Promise.resolve(entries)),
    replace,
    clear: vi.fn(() => {
      entries = [];
      return Promise.resolve();
    }),
  };
  return { repository, replace, current: () => entries };
}

const INPUT = {
  text: 'Texto completo del documento que nunca se guarda.',
  language: 'es' as const,
  source: { kind: 'link' as const, name: 'ejemplo.com' },
  analysis: syntheticAnalysis(2),
};

function service(repository: HistoryRepository, enabled = true, limit?: number) {
  let sequence = 0;
  return createHistoryService({
    repository,
    isEnabled: () => enabled,
    now: () => new Date('2026-11-21T10:00:00.000Z'),
    newId: () => {
      sequence += 1;
      return `6f1c1e9e-3b0a-4c47-9d61-${sequence.toString(16).padStart(12, '0')}`;
    },
    fingerprint: (text) => `hash-of-${String(text.length)}`,
    limit,
  });
}

describe('history service (in-memory repository)', () => {
  it('saves the result with its source, length, language and fingerprint but not the text', async () => {
    const { repository, current } = memoryRepository();
    expect(await service(repository).record(INPUT)).toBe('saved');
    const [entry] = current();
    expect(entry).toMatchObject({
      source: INPUT.source,
      characters: INPUT.text.length,
      language: 'es',
      fingerprint: `hash-of-${String(INPUT.text.length)}`,
      savedAt: '2026-11-21T10:00:00.000Z',
    });
    expect(JSON.stringify(current())).not.toContain(INPUT.text);
  });

  it('saves nothing when the history is turned off', async () => {
    const { repository, replace } = memoryRepository();
    expect(await service(repository, false).record(INPUT)).toBe('off');
    expect(replace).not.toHaveBeenCalled();
  });

  it('reports a failed save without throwing', async () => {
    const { repository } = memoryRepository();
    repository.replace = () => Promise.reject(new Error('disk full'));
    expect(await service(repository).record(INPUT)).toBe('failed');
  });

  it('keeps only the newest entries up to the limit', async () => {
    const { repository, current } = memoryRepository([syntheticEntry(2), syntheticEntry(1)]);
    await service(repository, true, 2).record(INPUT);
    expect(current().map((entry) => entry.id)).toEqual([
      '6f1c1e9e-3b0a-4c47-9d61-000000000001',
      syntheticEntry(2).id,
    ]);
  });

  it('lists summaries, opens one entry, deletes one and clears all', async () => {
    const { repository, current } = memoryRepository([syntheticEntry(2), syntheticEntry(1)]);
    const history = service(repository);
    expect((await history.list()).map((summary) => summary.id)).toEqual([
      syntheticEntry(2).id,
      syntheticEntry(1).id,
    ]);
    expect((await history.get(syntheticEntry(1).id))?.analysis.clauses).toHaveLength(10);
    expect(await history.get('6f1c1e9e-3b0a-4c47-9d61-ffffffffffff')).toBeNull();
    await history.remove(syntheticEntry(2).id);
    expect(current().map((entry) => entry.id)).toEqual([syntheticEntry(1).id]);
    await history.clear();
    expect(current()).toEqual([]);
  });
});
