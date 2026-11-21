import type { AnalysisLanguage, Severity } from '@risklex/shared';
import type { VerifiedAnalysis } from './analysis-vocabulary.ts';

export const HISTORY_LIMIT = 100;
export const HISTORY_SOURCE_KINDS = ['pdf', 'link', 'pasted'] as const;
export type HistorySourceKind = (typeof HISTORY_SOURCE_KINDS)[number];

export interface HistorySource {
  readonly kind: HistorySourceKind;
  readonly name: string | null;
}

export interface HistorySummary {
  readonly id: string;
  readonly savedAt: string;
  readonly source: HistorySource;
  readonly characters: number;
  readonly language: AnalysisLanguage;
  readonly counts: Readonly<Record<Severity, number>>;
}

export interface HistoryEntryView {
  readonly summary: HistorySummary;
  readonly analysis: VerifiedAnalysis;
}

export type HistorySaveStatus = 'saved' | 'off' | 'failed';
