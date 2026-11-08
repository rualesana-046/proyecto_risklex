import {
  CLAUSE_CATEGORIES,
  CONFIDENCE_LEVELS,
  ENTITY_TYPES,
  EVIDENCE_STATUSES,
  SEVERITIES,
} from '@risklex/shared';
import { z } from 'zod';

const modelAssessmentSchema = z.strictObject({
  severity: z.enum(SEVERITIES),
  meaning: z.string(),
  consequence: z.string(),
});

const modelClauseSchema = z.strictObject({
  category: z.enum(CLAUSE_CATEGORIES),
  title: z.string(),
  quote: z.string(),
  evidenceStatus: z.enum(EVIDENCE_STATUSES),
  isAmbiguous: z.boolean(),
  ambiguityReason: z.string(),
  confidence: z.enum(CONFIDENCE_LEVELS),
  entities: z.array(z.strictObject({ type: z.enum(ENTITY_TYPES), text: z.string() })),
  profiles: z.strictObject({
    free_user: modelAssessmentSchema,
    subscriber: modelAssessmentSchema,
    professional: modelAssessmentSchema,
  }),
});

export const modelOutputSchema = z.strictObject({
  clauses: z.array(modelClauseSchema),
  glossary: z.array(z.strictObject({ term: z.string(), explanation: z.string() })),
  moreClausesLikely: z.boolean(),
});

export type ModelOutput = z.infer<typeof modelOutputSchema>;

export function buildModelJsonSchema(): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    ...z.toJSONSchema(modelOutputSchema, { target: 'draft-2020-12' }),
  };
  delete schema.$schema;
  return schema;
}
