import { z } from 'zod';
import { analysisResultSchema } from '../../schemas/analysis-result.schema.ts';

const tokenCount = z.number().int().nonnegative();

export const analysisMetaSchema = z.object({
  promptVersion: z.string().min(1),
  model: z.string().min(1),
  moreClausesLikely: z.boolean(),
  usage: z.object({
    inputTokens: tokenCount,
    outputTokens: tokenCount,
  }),
});

export const analysisResponseSchema = z.object({
  result: analysisResultSchema,
  meta: analysisMetaSchema,
});

export type AnalysisMeta = z.infer<typeof analysisMetaSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
