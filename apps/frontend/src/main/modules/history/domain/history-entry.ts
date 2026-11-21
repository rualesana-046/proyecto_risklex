import type { VerifiedAnalysis } from '../../../../common/analysis-vocabulary.ts';
import type { HistorySource, HistorySummary } from '../../../../common/history-vocabulary.ts';

export const COUNTED_PROFILE = 'free_user';

export interface HistoryEntry {
  readonly id: string;
  readonly savedAt: string;
  readonly source: HistorySource;
  readonly characters: number;
  readonly language: HistorySummary['language'];
  readonly fingerprint: string;
  readonly analysis: VerifiedAnalysis;
}

export function summarize(entry: HistoryEntry): HistorySummary {
  const counts = { high_risk: 0, warning: 0, neutral: 0 };
  for (const item of entry.analysis.clauses) {
    counts[item.clause.profiles[COUNTED_PROFILE].severity] += 1;
  }
  return {
    id: entry.id,
    savedAt: entry.savedAt,
    source: entry.source,
    characters: entry.characters,
    language: entry.language,
    counts,
  };
}

export function addNewest(
  entries: readonly HistoryEntry[],
  entry: HistoryEntry,
  limit: number,
): HistoryEntry[] {
  return [entry, ...entries].slice(0, limit);
}
