import type { AnalysisLanguage, Clause, GlossaryTerm } from '@risklex/shared';

export interface ModelAnalysisRequest {
  readonly text: string;
  readonly language: AnalysisLanguage;
}

export type ModelClause = Omit<Clause, 'id'>;

export interface ModelAnalysis {
  readonly model: string;
  readonly clauses: readonly ModelClause[];
  readonly glossary: readonly GlossaryTerm[];
  readonly moreClausesLikely: boolean;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
}

export interface LanguageModel {
  analyze(request: ModelAnalysisRequest): Promise<ModelAnalysis>;
}
