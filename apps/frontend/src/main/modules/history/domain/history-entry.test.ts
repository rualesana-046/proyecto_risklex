import { describe, expect, it } from 'vitest';
import { syntheticEntry } from '../history.test-support.ts';
import { addNewest, summarize } from './history-entry.ts';

describe('history entry', () => {
  it('summarizes an entry with counts for the free version profile and no analysis text', () => {
    const summary = summarize(syntheticEntry(1));
    expect(summary.counts).toEqual({ high_risk: 5, warning: 5, neutral: 0 });
    expect(summary.source).toEqual({ kind: 'pdf', name: 'terminos-1.pdf' });
    expect(Object.keys(summary)).not.toContain('analysis');
    expect(Object.keys(summary)).not.toContain('fingerprint');
  });

  it('puts the newest entry first and drops the oldest past the limit', () => {
    const entries = [syntheticEntry(2), syntheticEntry(1)];
    expect(addNewest(entries, syntheticEntry(3), 2).map((entry) => entry.id)).toEqual([
      syntheticEntry(3).id,
      syntheticEntry(2).id,
    ]);
  });
});
