import { z } from 'zod';
import { ANALYSIS_LANGUAGES } from '../../constants/analysis.constants.ts';
import { MAX_DOCUMENT_CHARACTERS } from '../../constants/limits.constants.ts';

export const INSTALL_ID_HEADER = 'x-install-id';
export const APP_VERSION_HEADER = 'x-app-version';

export const analysisRequestSchema = z.strictObject({
  text: z
    .string()
    .max(MAX_DOCUMENT_CHARACTERS)
    .refine((text) => text.trim().length > 0, { message: 'The document text is empty' }),
  language: z.enum(ANALYSIS_LANGUAGES),
});

export const installIdSchema = z.uuid();

export const appVersionSchema = z.string().regex(/^\d{1,4}\.\d{1,4}\.\d{1,4}$/u);

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
