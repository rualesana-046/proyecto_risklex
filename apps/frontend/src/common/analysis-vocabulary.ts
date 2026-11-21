import {
  API_ERROR_CODES,
  type AnalysisMeta,
  type Clause,
  type GlossaryTerm,
  type QuoteSpan,
  type ReliabilityLevel,
} from '@risklex/shared';
import type { HistorySaveStatus } from './history-vocabulary.ts';

export const CLIENT_ONLY_ERROR_CODES = [
  'network_unavailable',
  'timeout',
  'cancelled',
  'invalid_response',
  'low_reliability',
  'configuration_missing',
  'analysis_in_progress',
  'unexpected',
] as const;

export const ANALYSIS_ERROR_CODES = [...API_ERROR_CODES, ...CLIENT_ONLY_ERROR_CODES] as const;
export type AnalysisErrorCode = (typeof ANALYSIS_ERROR_CODES)[number];

export const ANALYSIS_STAGES = [
  'validating',
  'waiting_for_analysis',
  'verifying_quotes',
  'retrying',
  'done',
] as const;
export type AnalysisStage = (typeof ANALYSIS_STAGES)[number];

export interface VerifiedClauseResult {
  readonly clause: Clause;
  readonly span: QuoteSpan;
  readonly originalText: string;
}

export interface VerifiedAnalysis {
  readonly clauses: readonly VerifiedClauseResult[];
  readonly glossary: readonly GlossaryTerm[];
  readonly meta: AnalysisMeta;
  readonly reliability: ReliabilityLevel;
  readonly totalClauses: number;
  readonly discardedClauses: number;
  readonly attempts: number;
}

export type AnalysisOutcome =
  | {
      readonly ok: true;
      readonly analysis: VerifiedAnalysis;
      readonly history?: HistorySaveStatus;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: AnalysisErrorCode;
        readonly retryAfterSeconds: number | null;
      };
    };
