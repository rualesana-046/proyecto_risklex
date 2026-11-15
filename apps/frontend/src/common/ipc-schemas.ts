import { ANALYSIS_LANGUAGES, MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import * as z from 'zod';

export const MAX_IPC_TEXT_CHARACTERS = MAX_DOCUMENT_CHARACTERS * 2;

export const analyzeInputSchema = z.strictObject({
  text: z.string().max(MAX_IPC_TEXT_CHARACTERS),
  language: z.enum(ANALYSIS_LANGUAGES),
});

export type AnalyzeInput = z.infer<typeof analyzeInputSchema>;
