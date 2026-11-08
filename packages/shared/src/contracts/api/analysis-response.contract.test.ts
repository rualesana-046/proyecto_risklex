import { describe, expect, it } from 'vitest';
import { analysisResponseSchema } from './analysis-response.contract.ts';

function buildResponse(metaOverrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    result: { clauses: [], glossary: [] },
    meta: {
      promptVersion: '2026-11-07.1',
      model: 'model-id',
      moreClausesLikely: false,
      usage: { inputTokens: 1200, outputTokens: 800 },
      ...metaOverrides,
    },
  };
}

describe('analysisResponseSchema', () => {
  it('accepts a complete response', () => {
    expect(analysisResponseSchema.safeParse(buildResponse()).success).toBe(true);
  });

  it('accepts a response that may have more clauses', () => {
    const response = buildResponse({ moreClausesLikely: true });
    expect(analysisResponseSchema.parse(response).meta.moreClausesLikely).toBe(true);
  });

  it('does not carry quote verification results', () => {
    const response = buildResponse({
      verification: { totalClauses: 10, discardedClauses: 4, reliability: 'low' },
    });
    expect(analysisResponseSchema.parse(response).meta).not.toHaveProperty('verification');
  });

  it('tolerates fields added by newer servers', () => {
    const response = { ...buildResponse({ newMetric: 3 }), extra: true };
    const parsed = analysisResponseSchema.parse(response);
    expect(parsed).not.toHaveProperty('extra');
    expect(parsed.meta).not.toHaveProperty('newMetric');
  });

  it.each([
    ['a missing moreClausesLikely flag', { moreClausesLikely: undefined }],
    ['missing token usage', { usage: undefined }],
    ['negative token usage', { usage: { inputTokens: -1, outputTokens: 0 } }],
    ['fractional token usage', { usage: { inputTokens: 1.5, outputTokens: 0 } }],
    ['an empty model', { model: '' }],
    ['an empty prompt version', { promptVersion: '' }],
  ])('rejects %s', (_label, metaOverrides) => {
    expect(analysisResponseSchema.safeParse(buildResponse(metaOverrides)).success).toBe(false);
  });
});
