import type { AnalysisLanguage } from '@risklex/shared';
import type { AnalysisOutcome, AnalysisStage } from '../common/analysis-vocabulary.ts';
import type { DocumentReadOutcome } from '../common/document-sources.ts';
import type {
  HistoryEntryView,
  HistorySource,
  HistorySummary,
} from '../common/history-vocabulary.ts';
import type { PublicSettings, SettingsUpdate } from '../common/settings-vocabulary.ts';

export interface AnalyzeRequest {
  readonly text: string;
  readonly language: AnalysisLanguage;
  readonly source?: {
    readonly kind: Exclude<HistorySource['kind'], 'pasted'>;
    readonly name: string;
  };
}

export interface RisklexApi {
  readonly initialSettings: PublicSettings | null;
  analyze(request: AnalyzeRequest): Promise<AnalysisOutcome>;
  onProgress(listener: (stage: AnalysisStage) => void): () => void;
  cancel(): void;
  pickPdf(): Promise<DocumentReadOutcome>;
  readLink(url: string): Promise<DocumentReadOutcome>;
  cancelDocumentRead(): void;
  getSettings(): Promise<PublicSettings>;
  updateSettings(change: SettingsUpdate): Promise<PublicSettings>;
  listHistory(): Promise<HistorySummary[]>;
  getHistory(id: string): Promise<HistoryEntryView | null>;
  deleteHistory(id: string): Promise<void>;
  clearHistory(): Promise<void>;
}

declare global {
  interface Window {
    readonly risklex: RisklexApi;
  }
}
