import { MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type * as z from 'zod';
import { documentReadOutcomeSchema } from './document-schemas.ts';
import type { DocumentReadOutcome } from './document-sources.ts';

describe('documentReadOutcomeSchema', () => {
  it('matches the DocumentReadOutcome type exactly', () => {
    expectTypeOf<z.infer<typeof documentReadOutcomeSchema>>().toEqualTypeOf<DocumentReadOutcome>();
  });

  it('accepts a read document and strips anything else', () => {
    const parsed = documentReadOutcomeSchema.parse({
      ok: true,
      text: 'Texto del contrato',
      source: { kind: 'pdf', name: 'contrato.pdf', path: '/private/contrato.pdf' },
      characters: 18,
    });
    expect(JSON.stringify(parsed)).not.toContain('/private');
  });

  it('accepts a typed failure with the character count', () => {
    expect(
      documentReadOutcomeSchema.safeParse({
        ok: false,
        error: { code: 'document_too_long', characters: 210_000 },
      }).success,
    ).toBe(true);
  });

  it.each([
    [
      'an empty text',
      { ok: true, text: '', source: { kind: 'pdf', name: 'a.pdf' }, characters: 0 },
    ],
    [
      'a text over the limit',
      {
        ok: true,
        text: 'a'.repeat(MAX_DOCUMENT_CHARACTERS + 1),
        source: { kind: 'pdf', name: 'a.pdf' },
        characters: MAX_DOCUMENT_CHARACTERS + 1,
      },
    ],
    [
      'an unknown source',
      { ok: true, text: 'x', source: { kind: 'disk', name: 'a' }, characters: 1 },
    ],
    ['an unknown error', { ok: false, error: { code: 'boom', characters: null } }],
  ])('rejects %s', (_label, value) => {
    expect(documentReadOutcomeSchema.safeParse(value).success).toBe(false);
  });
});
