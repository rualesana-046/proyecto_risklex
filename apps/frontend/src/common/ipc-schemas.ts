import {
  ANALYSIS_LANGUAGES,
  analysisMetaSchema,
  clauseSchema,
  glossaryTermSchema,
  MAX_DOCUMENT_CHARACTERS,
  RELIABILITY_LEVELS,
} from '@risklex/shared';
import * as z from 'zod';

export const MAX_IPC_TEXT_CHARACTERS = MAX_DOCUMENT_CHARACTERS * 2;

export const analyzeInputSchema = z.strictObject({
  text: z.string().max(MAX_IPC_TEXT_CHARACTERS),
  language: z.enum(ANALYSIS_LANGUAGES),
});

export type AnalyzeInput = z.infer<typeof analyzeInputSchema>;

const count = z.number().int().nonnegative();

export const verifiedAnalysisSchema = z
  .object({
    clauses: z
      .array(
        z
          .object({
            clause: clauseSchema,
            span: z.object({ start: count, end: count }).readonly(),
            originalText: z.string().min(1),
          })
          .readonly(),
      )
      .readonly(),
    glossary: z.array(glossaryTermSchema).readonly(),
    meta: analysisMetaSchema,
    reliability: z.enum(RELIABILITY_LEVELS),
    totalClauses: count,
    discardedClauses: count,
    attempts: z.number().int().min(1).max(2),
  })
  .readonly();
