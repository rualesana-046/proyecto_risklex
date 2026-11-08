import { describe, expect, it } from 'vitest';
import { analysisResponseSchema } from './analysis-response.contract.ts';

function buildResponse(metaOverrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    result: { clauses: [], glossary: [] },
    meta: {
      promptVersion: '2026-11-07.1',
      model: 'model-id',
      language: 'es',
      moreClausesLikely: false,
      verification: { totalClauses: 0, discardedClauses: 0, reliability: 'normal' },
      usage: { inputTokens: 1200, outputTokens: 800 },
      ...metaOverrides,
    },
  };
}

describe('analysisResponseSchema', () => {
  it('accepts a complete response', () => {
    expect(analysisResponseSchema.safeParse(buildResponse()).success).toBe(true);
  });

  it('accepts a low reliability response that may have more clauses', () => {
    const response = buildResponse({
      moreClausesLikely: true,
      verification: { totalClauses: 10, discardedClauses: 4, reliability: 'low' },
    });
    expect(analysisResponseSchema.safeParse(response).success).toBe(true);
  });

  it('tolerates fields added by newer servers', () => {
    const response = { ...buildResponse({ newMetric: 3 }), extra: true };
    const parsed = analysisResponseSchema.parse(response);
    expect(parsed).not.toHaveProperty('extra');
    expect(parsed.meta).not.toHaveProperty('newMetric');
  });

  it.each([
    ['a missing moreClausesLikely flag', { moreClausesLikely: undefined }],
    [
      'an unknown reliability',
      { verification: { totalClauses: 1, discardedClauses: 0, reliability: 'medium' } },
    ],
    ['negative token usage', { usage: { inputTokens: -1, outputTokens: 0 } }],
    ['fractional token usage', { usage: { inputTokens: 1.5, outputTokens: 0 } }],
    ['an unsupported language', { language: 'fr' }],
    ['an empty prompt version', { promptVersion: '' }],
  ])('rejects %s', (_label, metaOverrides) => {
    expect(analysisResponseSchema.safeParse(buildResponse(metaOverrides)).success).toBe(false);
  });
});
