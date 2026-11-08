import { describe, expect, it } from 'vitest';
import { MAX_DOCUMENT_CHARACTERS } from '../../constants/limits.constants.ts';
import {
  analysisRequestSchema,
  appVersionSchema,
  installIdSchema,
} from './analysis-request.contract.ts';

describe('analysisRequestSchema', () => {
  it('accepts text with a supported language', () => {
    const request = { text: 'Terms of service text.', language: 'es' };
    expect(analysisRequestSchema.parse(request)).toEqual(request);
  });

  it('accepts text at the maximum length', () => {
    const request = { text: 'a'.repeat(MAX_DOCUMENT_CHARACTERS), language: 'en' };
    expect(analysisRequestSchema.safeParse(request).success).toBe(true);
  });

  it.each([
    ['empty text', { text: '', language: 'es' }],
    ['whitespace only text', { text: ' \n\t ', language: 'es' }],
    ['text over the maximum', { text: 'a'.repeat(MAX_DOCUMENT_CHARACTERS + 1), language: 'es' }],
    ['an unsupported language', { text: 'Terms.', language: 'fr' }],
    ['a missing language', { text: 'Terms.' }],
    ['an unexpected field', { text: 'Terms.', language: 'es', url: 'https://example.com' }],
    ['a non object body', 'Terms.'],
  ])('rejects %s', (_label, request) => {
    expect(analysisRequestSchema.safeParse(request).success).toBe(false);
  });
});

describe('request headers', () => {
  it('accepts a random uuid install id', () => {
    expect(installIdSchema.safeParse('3f2504e0-4f89-41d3-9a0c-0305e82c3301').success).toBe(true);
  });

  it.each(['', 'not-a-uuid', '3f2504e0'])('rejects the install id %s', (value) => {
    expect(installIdSchema.safeParse(value).success).toBe(false);
  });

  it('accepts a semantic app version', () => {
    expect(appVersionSchema.safeParse('0.1.0').success).toBe(true);
  });

  it.each(['', '1.0', 'v1.0.0', '1.0.0-beta'])('rejects the app version %s', (value) => {
    expect(appVersionSchema.safeParse(value).success).toBe(false);
  });
});
