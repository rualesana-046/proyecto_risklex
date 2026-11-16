import { MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import * as z from 'zod';
import {
  DOCUMENT_READ_ERROR_CODES,
  DOCUMENT_SOURCE_KINDS,
  MAX_LINK_CHARACTERS,
  MAX_SOURCE_NAME_CHARACTERS,
} from './document-sources.ts';

const count = z.number().int().nonnegative();

export const documentReadOutcomeSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      text: z.string().min(1).max(MAX_DOCUMENT_CHARACTERS),
      source: z
        .object({
          kind: z.enum(DOCUMENT_SOURCE_KINDS),
          name: z.string().min(1).max(MAX_SOURCE_NAME_CHARACTERS),
        })
        .readonly(),
      characters: count,
    })
    .readonly(),
  z
    .object({
      ok: z.literal(false),
      error: z
        .object({ code: z.enum(DOCUMENT_READ_ERROR_CODES), characters: count.nullable() })
        .readonly(),
    })
    .readonly(),
]);

export const linkInputSchema = z.string().trim().min(1).max(MAX_LINK_CHARACTERS);
