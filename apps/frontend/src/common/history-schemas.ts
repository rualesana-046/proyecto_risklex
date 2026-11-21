import { ANALYSIS_LANGUAGES } from '@risklex/shared';
import * as z from 'zod';
import { MAX_SOURCE_NAME_CHARACTERS } from './document-sources.ts';
import { HISTORY_LIMIT, HISTORY_SOURCE_KINDS } from './history-vocabulary.ts';
import { verifiedAnalysisSchema } from './ipc-schemas.ts';

const count = z.number().int().nonnegative();

export const historyIdSchema = z.uuid();

export const historySourceSchema = z
  .object({
    kind: z.enum(HISTORY_SOURCE_KINDS),
    name: z.string().min(1).max(MAX_SOURCE_NAME_CHARACTERS).nullable(),
  })
  .strict()
  .refine((source) => (source.kind === 'pasted') === (source.name === null), {
    message: 'Only pasted text has no source name',
  });

export const storedHistoryEntrySchema = z
  .object({
    id: historyIdSchema,
    savedAt: z.iso.datetime(),
    source: historySourceSchema,
    characters: count,
    language: z.enum(ANALYSIS_LANGUAGES),
    fingerprint: z.string().regex(/^[0-9a-f]{64}$/u),
    analysis: verifiedAnalysisSchema,
  })
  .strict();

export type StoredHistoryEntry = z.infer<typeof storedHistoryEntrySchema>;

export const historyFileSchema = z
  .object({ version: z.literal(1), entries: z.array(z.unknown()).max(HISTORY_LIMIT * 2) })
  .strict();

export const historySummarySchema = z
  .object({
    id: historyIdSchema,
    savedAt: z.iso.datetime(),
    source: historySourceSchema,
    characters: count,
    language: z.enum(ANALYSIS_LANGUAGES),
    counts: z.object({ high_risk: count, warning: count, neutral: count }).strict(),
  })
  .strict();

export const historyListSchema = z.array(historySummarySchema).max(HISTORY_LIMIT);

export const historyEntryViewSchema = z
  .object({ summary: historySummarySchema, analysis: verifiedAnalysisSchema })
  .strict();
