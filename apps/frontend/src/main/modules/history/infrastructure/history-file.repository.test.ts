import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HISTORY_LIMIT } from '../../../../common/history-vocabulary.ts';
import { syntheticAnalysis, syntheticEntry } from '../history.test-support.ts';
import { createHistoryFileRepository, HISTORY_FILE } from './history-file.repository.ts';

const FIVE_MEGABYTES = 5 * 1024 * 1024;

let folder = '';
let path = '';

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'risklex-history-'));
  path = join(folder, HISTORY_FILE);
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

function repository() {
  return createHistoryFileRepository({ path });
}

function setAsideFiles(): string[] {
  return readdirSync(folder).filter((name) => name.startsWith('history.corrupt-'));
}

describe('history file repository (real temporary folder)', () => {
  it('starts empty and reads back what it saved', async () => {
    expect(await repository().load()).toEqual([]);
    await repository().replace([syntheticEntry(1)]);
    expect(await repository().load()).toEqual([syntheticEntry(1)]);
  });

  it('keeps the valid entries and sets aside the invalid ones of an edited file', async () => {
    const broken = { ...syntheticEntry(2), analysis: { clauses: 'not a list' } };
    const forged = { ...syntheticEntry(3), source: { kind: 'pdf', name: null } };
    writeFileSync(
      path,
      JSON.stringify({ version: 1, entries: [syntheticEntry(1), broken, forged, 7] }),
    );
    expect(await repository().load()).toEqual([syntheticEntry(1)]);
    expect(setAsideFiles()).toHaveLength(1);
    const reloaded = JSON.parse(readFileSync(path, 'utf8')) as { entries: unknown[] };
    expect(reloaded.entries).toHaveLength(1);
  });

  it('sets aside a damaged file and starts empty', async () => {
    writeFileSync(path, '{"version": 1, "entries": [');
    expect(await repository().load()).toEqual([]);
    expect(setAsideFiles()).toHaveLength(1);
  });

  it('keeps at most the limit even if the file was edited to hold more', async () => {
    const entries = Array.from({ length: HISTORY_LIMIT + 5 }, (_, index) =>
      syntheticEntry(index, syntheticAnalysis(1)),
    );
    writeFileSync(path, JSON.stringify({ version: 1, entries }));
    expect(await repository().load()).toHaveLength(HISTORY_LIMIT);
  });

  it('clears the entries and the set aside files', async () => {
    writeFileSync(path, '{ broken');
    const target = repository();
    await target.load();
    await target.clear();
    expect(await repository().load()).toEqual([]);
    expect(setAsideFiles()).toEqual([]);
  });

  it.each([
    ['typical quotes', 280],
    ['the longest quotes', 600],
  ])('stays under 5 MB with 100 results of 10 clauses and %s', async (_label, quoteLength) => {
    const analysis = syntheticAnalysis(10, quoteLength);
    const entries = Array.from({ length: HISTORY_LIMIT }, (_, index) =>
      syntheticEntry(index, analysis),
    );
    await repository().replace(entries);
    expect(statSync(path).size).toBeLessThan(FIVE_MEGABYTES);
    expect(await repository().load()).toHaveLength(HISTORY_LIMIT);
  });
});
