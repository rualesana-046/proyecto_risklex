import { ANALYSIS_LANGUAGES, installIdSchema } from '@risklex/shared';
import * as z from 'zod';
import { SETTINGS_VERSION, TEXT_SIZES, THEMES } from './settings-vocabulary.ts';

export const storedSettingsSchema = z
  .object({
    version: z.literal(SETTINGS_VERSION),
    installId: installIdSchema,
    language: z.enum(ANALYSIS_LANGUAGES),
    theme: z.enum(THEMES),
    textSize: z.enum(TEXT_SIZES),
    welcomeSeen: z.boolean(),
    historyEnabled: z.boolean(),
    consent: z
      .object({ version: z.number().int().positive(), acceptedAt: z.iso.datetime() })
      .strict()
      .nullable(),
  })
  .strict();

export type StoredSettings = z.infer<typeof storedSettingsSchema>;

export const publicSettingsSchema = z
  .object({
    language: z.enum(ANALYSIS_LANGUAGES),
    theme: z.enum(THEMES),
    textSize: z.enum(TEXT_SIZES),
    welcomeSeen: z.boolean(),
    historyEnabled: z.boolean(),
    consentGranted: z.boolean(),
  })
  .strict()
  .readonly();

export const settingsUpdateSchema = z
  .object({
    language: z.enum(ANALYSIS_LANGUAGES).optional(),
    theme: z.enum(THEMES).optional(),
    textSize: z.enum(TEXT_SIZES).optional(),
    welcomeSeen: z.boolean().optional(),
    historyEnabled: z.boolean().optional(),
    consent: z.enum(['granted', 'revoked']).optional(),
  })
  .strict();
