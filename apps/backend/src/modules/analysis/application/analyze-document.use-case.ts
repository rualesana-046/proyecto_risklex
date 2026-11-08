import {
  analysisResponseSchema,
  clauseSchema,
  glossaryTermSchema,
  MAX_CLAUSES,
  type AnalysisLanguage,
  type AnalysisResponse,
  type Clause,
  type GlossaryTerm,
} from '@risklex/shared';
import type { LanguageModel, ModelAnalysis } from '../domain/language-model.port.ts';

export interface AnalyzeDocumentInput {
  readonly text: string;
  readonly language: AnalysisLanguage;
}

export type AnalyzeDocument = (input: AnalyzeDocumentInput) => Promise<AnalysisResponse>;

function validClauses(analysis: ModelAnalysis): Clause[] {
  const clauses: Clause[] = [];
  for (const candidate of analysis.clauses) {
    const parsed = clauseSchema.safeParse({
      ...candidate,
      id: `clause-${String(clauses.length + 1)}`,
    });
    if (parsed.success) {
      clauses.push(parsed.data);
    }
  }
  return clauses;
}

function validGlossary(analysis: ModelAnalysis): GlossaryTerm[] {
  return analysis.glossary.flatMap((term) => {
    const parsed = glossaryTermSchema.safeParse(term);
    return parsed.success ? [parsed.data] : [];
  });
}

export function createAnalyzeDocument(
  model: LanguageModel,
  promptVersion: string,
): AnalyzeDocument {
  return async (input) => {
    const analysis = await model.analyze(input);
    const clauses = validClauses(analysis);
    return analysisResponseSchema.parse({
      result: { clauses: clauses.slice(0, MAX_CLAUSES), glossary: validGlossary(analysis) },
      meta: {
        promptVersion,
        model: analysis.model,
        language: input.language,
        moreClausesLikely: analysis.moreClausesLikely || clauses.length > MAX_CLAUSES,
        usage: analysis.usage,
      },
    });
  };
}
