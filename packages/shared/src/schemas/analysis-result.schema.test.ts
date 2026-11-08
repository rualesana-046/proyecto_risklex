import { describe, expect, it } from 'vitest';
import { analysisResultSchema, clauseSchema } from './analysis-result.schema.ts';

const assessment = {
  severity: 'warning',
  meaning: 'The service can share your data with advertisers.',
  consequence: 'You may receive more targeted ads.',
};

function buildClause(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'clause-1',
    category: 'privacy',
    title: 'Shares data with advertisers',
    quote: 'We may share personal information with advertising partners.',
    evidenceStatus: 'supported',
    isAmbiguous: false,
    ambiguityReason: '',
    confidence: 'high',
    entities: [{ type: 'third_party', text: 'advertising partners' }],
    profiles: { free_user: assessment, subscriber: assessment, professional: assessment },
    ...overrides,
  };
}

describe('clauseSchema', () => {
  it('accepts a complete clause', () => {
    expect(clauseSchema.safeParse(buildClause()).success).toBe(true);
  });

  it('accepts party entities for the company and the user', () => {
    const clause = buildClause({
      entities: [
        { type: 'party', text: 'the Company' },
        { type: 'party', text: 'the user' },
      ],
    });
    expect(clauseSchema.safeParse(clause).success).toBe(true);
  });

  it('accepts an ambiguous clause with a reason', () => {
    const clause = buildClause({
      isAmbiguous: true,
      ambiguityReason: 'The term partners is vague.',
    });
    expect(clauseSchema.safeParse(clause).success).toBe(true);
  });

  it.each([
    ['an unknown category', { category: 'billing' }],
    [
      'an unknown severity',
      {
        profiles: {
          ...(buildClause().profiles as object),
          subscriber: { ...assessment, severity: 'critical' },
        },
      },
    ],
    ['a missing profile', { profiles: { free_user: assessment, subscriber: assessment } }],
    ['a quote shorter than 20 characters', { quote: 'Too short quote' }],
    ['a quote longer than 600 characters', { quote: 'a'.repeat(601) }],
    ['an empty title', { title: '   ' }],
    ['an unknown entity type', { entities: [{ type: 'company', text: 'Acme' }] }],
    ['an ambiguous clause without a reason', { isAmbiguous: true, ambiguityReason: ' ' }],
    ['an unknown confidence level', { confidence: 'certain' }],
  ])('rejects %s', (_label, overrides) => {
    expect(clauseSchema.safeParse(buildClause(overrides)).success).toBe(false);
  });

  it('ignores fields added by newer servers', () => {
    const parsed = clauseSchema.parse(buildClause({ futureField: 'value' }));
    expect(parsed).not.toHaveProperty('futureField');
  });
});

describe('analysisResultSchema', () => {
  it('accepts a result with clauses and glossary terms', () => {
    const result = {
      clauses: [buildClause()],
      glossary: [{ term: 'Sublicense', explanation: 'Allowing others to use your content.' }],
    };
    expect(analysisResultSchema.safeParse(result).success).toBe(true);
  });

  it('accepts an empty result', () => {
    expect(analysisResultSchema.safeParse({ clauses: [], glossary: [] }).success).toBe(true);
  });

  it('rejects more than twelve clauses', () => {
    const clauses = Array.from({ length: 13 }, (_, index) =>
      buildClause({ id: `clause-${String(index)}` }),
    );
    expect(analysisResultSchema.safeParse({ clauses, glossary: [] }).success).toBe(false);
  });
});
