import type { VerifiedAnalysis } from '../../../../common/analysis-vocabulary.ts';
import {
  HISTORY_LIMIT,
  type HistoryEntryView,
  type HistorySaveStatus,
  type HistorySource,
  type HistorySummary,
} from '../../../../common/history-vocabulary.ts';
import { addNewest, summarize, type HistoryEntry } from '../domain/history-entry.ts';

export interface HistoryRepository {
  load(): Promise<readonly HistoryEntry[]>;
  replace(entries: readonly HistoryEntry[]): Promise<void>;
  clear(): Promise<void>;
}

export interface RecordAnalysisInput {
  readonly text: string;
  readonly language: HistoryEntry['language'];
  readonly source: HistorySource;
  readonly analysis: VerifiedAnalysis;
}

export interface HistoryServiceDependencies {
  readonly repository: HistoryRepository;
  readonly isEnabled: () => boolean;
  readonly now: () => Date;
  readonly newId: () => string;
  readonly fingerprint: (text: string) => string;
  readonly limit?: number;
}

export interface HistoryService {
  record(input: RecordAnalysisInput): Promise<HistorySaveStatus>;
  list(): Promise<HistorySummary[]>;
  get(id: string): Promise<HistoryEntryView | null>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export function createHistoryService(dependencies: HistoryServiceDependencies): HistoryService {
  const limit = dependencies.limit ?? HISTORY_LIMIT;
  const { repository } = dependencies;
  const toEntry = (input: RecordAnalysisInput): HistoryEntry => ({
    id: dependencies.newId(),
    savedAt: dependencies.now().toISOString(),
    source: input.source,
    characters: input.text.length,
    language: input.language,
    fingerprint: dependencies.fingerprint(input.text),
    analysis: input.analysis,
  });
  return {
    record: async (input) => {
      if (!dependencies.isEnabled()) {
        return 'off';
      }
      try {
        await repository.replace(addNewest(await repository.load(), toEntry(input), limit));
        return 'saved';
      } catch {
        return 'failed';
      }
    },
    list: async () => (await repository.load()).map(summarize),
    get: async (id) => {
      const entry = (await repository.load()).find((candidate) => candidate.id === id);
      return entry === undefined ? null : { summary: summarize(entry), analysis: entry.analysis };
    },
    remove: async (id) => {
      const entries = await repository.load();
      await repository.replace(entries.filter((entry) => entry.id !== id));
    },
    clear: () => repository.clear(),
  };
}
