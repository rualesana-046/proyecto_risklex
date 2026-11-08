import { z } from 'zod';
import {
  CLAUSE_CATEGORIES,
  CONFIDENCE_LEVELS,
  ENTITY_TYPES,
  EVIDENCE_STATUSES,
  SEVERITIES,
} from '../constants/analysis.constants.ts';
import {
  MAX_CLAUSES,
  MAX_QUOTE_CHARACTERS,
  MIN_QUOTE_CHARACTERS,
} from '../constants/limits.constants.ts';

const nonEmptyText = z.string().trim().min(1);

export const profileAssessmentSchema = z.object({
  severity: z.enum(SEVERITIES),
  meaning: nonEmptyText,
  consequence: nonEmptyText,
});

export const clauseEntitySchema = z.object({
  type: z.enum(ENTITY_TYPES),
  text: nonEmptyText,
});

export const clauseSchema = z
  .object({
    id: nonEmptyText,
    category: z.enum(CLAUSE_CATEGORIES),
    title: nonEmptyText,
    quote: z.string().min(MIN_QUOTE_CHARACTERS).max(MAX_QUOTE_CHARACTERS),
    evidenceStatus: z.enum(EVIDENCE_STATUSES),
    isAmbiguous: z.boolean(),
    ambiguityReason: z.string(),
    confidence: z.enum(CONFIDENCE_LEVELS),
    entities: z.array(clauseEntitySchema),
    profiles: z.object({
      free_user: profileAssessmentSchema,
      subscriber: profileAssessmentSchema,
      professional: profileAssessmentSchema,
    }),
  })
  .refine((clause) => !clause.isAmbiguous || clause.ambiguityReason.trim().length > 0, {
    message: 'An ambiguous clause needs an ambiguity reason',
    path: ['ambiguityReason'],
  });

export const glossaryTermSchema = z.object({
  term: nonEmptyText,
  explanation: nonEmptyText,
});

export const analysisResultSchema = z.object({
  clauses: z.array(clauseSchema).max(MAX_CLAUSES),
  glossary: z.array(glossaryTermSchema),
});

export type ProfileAssessment = z.infer<typeof profileAssessmentSchema>;
export type Clause = z.infer<typeof clauseSchema>;
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
