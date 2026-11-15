import { describe, expect, expectTypeOf, it } from 'vitest';
import type * as z from 'zod';
import type { VerifiedAnalysis } from './analysis-vocabulary.ts';
import { verifiedAnalysisSchema } from './ipc-schemas.ts';

const assessment = {
  severity: 'neutral',
  meaning: 'Significado.',
  consequence: 'Consecuencia.',
} as const;

const ANALYSIS: VerifiedAnalysis = {
  clauses: [
    {
      clause: {
        id: 'clause-1',
        category: 'privacy',
        title: 'Datos compartidos',
        quote: 'con socios comerciales y anunciantes',
        evidenceStatus: 'supported',
        isAmbiguous: false,
        ambiguityReason: '',
        confidence: 'high',
        entities: [],
        profiles: { free_user: assessment, subscriber: assessment, professional: assessment },
      },
      span: { start: 10, end: 46 },
      originalText: 'con socios comerciales y anunciantes',
    },
  ],
  glossary: [],
  meta: {
    promptVersion: '2026-11-14.1',
    model: 'claude-sonnet-5-5',
    language: 'es',
    moreClausesLikely: false,
    usage: { inputTokens: 10, outputTokens: 5 },
  },
  reliability: 'normal',
  totalClauses: 1,
  discardedClauses: 0,
  attempts: 1,
};

describe('verifiedAnalysisSchema', () => {
  it('matches the VerifiedAnalysis type exactly', () => {
    expectTypeOf<z.infer<typeof verifiedAnalysisSchema>>().toEqualTypeOf<VerifiedAnalysis>();
  });

  it('accepts a verified analysis', () => {
    expect(verifiedAnalysisSchema.parse(ANALYSIS)).toEqual(ANALYSIS);
  });

  it('strips fields that are not part of the contract', () => {
    const polluted = { ...ANALYSIS, rawBody: 'secret', meta: { ...ANALYSIS.meta, stack: 'trace' } };
    const parsed = verifiedAnalysisSchema.parse(polluted);
    expect(JSON.stringify(parsed)).not.toMatch(/secret|trace/u);
  });

  it.each([
    ['an unknown reliability', { ...ANALYSIS, reliability: 'perfect' }],
    ['three attempts', { ...ANALYSIS, attempts: 3 }],
    [
      'an empty original text',
      { ...ANALYSIS, clauses: [{ ...ANALYSIS.clauses[0], originalText: '' }] },
    ],
  ])('rejects %s', (_label, value) => {
    expect(verifiedAnalysisSchema.safeParse(value).success).toBe(false);
  });
});
