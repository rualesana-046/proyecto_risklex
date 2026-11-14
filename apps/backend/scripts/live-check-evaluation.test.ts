import type { AnalysisResponse, Clause } from '@risklex/shared';
import { describe, expect, it } from 'vitest';
import {
  contains,
  describeClauses,
  evaluate,
  expectedSchema,
  type Expected,
} from './live-check-evaluation.ts';

const TEXT = [
  'Podremos compartir sus datos personales con socios comerciales y anunciantes.',
  'La suscripción se renovará automáticamente cada año al precio vigente.',
  'Conservaremos sus datos durante el tiempo que sea necesario para fines legítimos.',
].join('\n');

function assessment(severity: 'high_risk' | 'warning' | 'neutral') {
  return { severity, meaning: 'Meaning.', consequence: 'Consequence.' };
}

function clause(overrides: Partial<Clause>): Clause {
  return {
    id: 'clause-1',
    category: 'privacy',
    title: 'Comparte datos',
    quote: 'compartir sus datos personales con socios comerciales y anunciantes',
    evidenceStatus: 'supported',
    isAmbiguous: false,
    ambiguityReason: '',
    confidence: 'high',
    entities: [],
    profiles: {
      free_user: assessment('high_risk'),
      subscriber: assessment('warning'),
      professional: assessment('high_risk'),
    },
    ...overrides,
  };
}

function response(clauses: Clause[]): AnalysisResponse {
  return {
    result: { clauses, glossary: [] },
    meta: {
      promptVersion: 'v1',
      model: 'model',
      language: 'es',
      moreClausesLikely: false,
      usage: { inputTokens: 1, outputTokens: 1 },
    },
  };
}

const expected: Expected = expectedSchema.parse({
  language: 'es',
  clauses: [
    {
      category: 'privacy',
      keyPhrase: 'socios comerciales y anunciantes',
      isAmbiguous: false,
      expectedSeverity: {
        free_user: 'high_risk',
        subscriber: 'warning',
        professional: 'high_risk',
      },
    },
    {
      category: 'hidden_costs',
      keyPhrase: 'se renovará automáticamente',
      isAmbiguous: false,
      expectedSeverity: {
        free_user: 'neutral',
        subscriber: 'high_risk',
        professional: 'high_risk',
      },
    },
    {
      category: 'privacy',
      keyPhrase: 'el tiempo que sea necesario',
      isAmbiguous: true,
      expectedSeverity: { free_user: 'warning', subscriber: 'warning', professional: 'warning' },
    },
  ],
  forbiddenPhrases: ['cancelar gratis en cualquier momento'],
});

describe('contains', () => {
  it('compares normalized text', () => {
    expect(
      contains('Socios   COMERCIALES y “anunciantes”', 'socios comerciales y "anunciantes"'),
    ).toBe(true);
    expect(contains('socios comerciales', 'anunciantes')).toBe(false);
  });
});

describe('evaluate', () => {
  it('counts a verified clause that matches a planted clause and its severities', () => {
    const result = evaluate(response([clause({})]), TEXT, expected);
    expect(result).toMatchObject({
      returned: 1,
      verified: 1,
      planted: 3,
      detected: 1,
      severityHits: 3,
    });
  });

  it('counts only the severities that match', () => {
    const profiles = {
      free_user: assessment('neutral'),
      subscriber: assessment('warning'),
      professional: assessment('warning'),
    };
    expect(evaluate(response([clause({ profiles })]), TEXT, expected).severityHits).toBe(1);
  });

  it('does not count a planted clause found under another category', () => {
    const result = evaluate(response([clause({ category: 'tracking' })]), TEXT, expected);
    expect(result.detected).toBe(0);
  });

  it('reports how many severities each trivial answer would match', () => {
    const result = evaluate(response([clause({})]), TEXT, expected);
    expect(result.severityTotal).toBe(3);
    expect(result.baselines).toEqual({ high_risk: 2, warning: 1, neutral: 0 });
  });

  it('separates ambiguity coverage from false positives', () => {
    const realFound = clause({
      quote: 'Conservaremos sus datos durante el tiempo que sea necesario',
      isAmbiguous: true,
      ambiguityReason: 'Vague period.',
    });
    const falsePositive = clause({ isAmbiguous: true, ambiguityReason: 'Who are partners?' });
    const missed = clause({ quote: realFound.quote });
    expect(evaluate(response([missed]), TEXT, expected).ambiguousFound).toBe(0);
    const result = evaluate(response([realFound, falsePositive]), TEXT, expected);
    expect(result).toMatchObject({
      ambiguousReal: 1,
      ambiguousFound: 1,
      ambiguousFalsePositives: 1,
    });
  });

  it('discards invented quotes and reports the reasons', () => {
    const invented = clause({ quote: 'Vendemos sus datos a cualquier empresa interesada.' });
    const ellipsis = clause({ quote: 'Podremos compartir... con socios comerciales' });
    const result = evaluate(response([invented, ellipsis]), TEXT, expected);
    expect(result).toMatchObject({ returned: 2, verified: 0, detected: 0 });
    expect(result.reasons).toEqual(['not_found', 'ellipsis']);
  });

  it('counts clauses built from forbidden phrases in the quote or the title', () => {
    const inQuote = clause({ quote: 'El usuario puede cancelar gratis en cualquier momento.' });
    const inTitle = clause({ title: 'Puede cancelar gratis en cualquier momento' });
    expect(evaluate(response([inQuote, inTitle]), TEXT, expected).forbidden).toBe(2);
  });
});

describe('describeClauses', () => {
  it('pairs a planted clause with the obtained severities and ambiguity', () => {
    const [detail] = describeClauses(response([clause({})]), TEXT, expected);
    expect(detail).toEqual({
      category: 'privacy',
      keyPhrase: 'socios comerciales y anunciantes',
      verified: true,
      expectedSeverity: {
        free_user: 'high_risk',
        subscriber: 'warning',
        professional: 'high_risk',
      },
      obtainedSeverity: {
        free_user: 'high_risk',
        subscriber: 'warning',
        professional: 'high_risk',
      },
      expectedAmbiguous: false,
      obtainedAmbiguous: false,
      evidenceStatus: 'supported',
      confidence: 'high',
    });
    expect(JSON.stringify(detail)).not.toContain('Comparte datos');
    expect(JSON.stringify(detail)).not.toContain('Meaning.');
  });

  it('reports a clause that matches no planted clause', () => {
    const extra = clause({
      category: 'tracking',
      confidence: 'low',
      evidenceStatus: 'insufficient_evidence',
    });
    const [detail] = describeClauses(response([extra]), TEXT, expected);
    expect(detail).toMatchObject({
      keyPhrase: null,
      expectedSeverity: null,
      expectedAmbiguous: null,
      confidence: 'low',
      evidenceStatus: 'insufficient_evidence',
    });
  });

  it('marks invented quotes as not verified', () => {
    const invented = clause({ quote: 'Vendemos sus datos a cualquier empresa interesada.' });
    expect(describeClauses(response([invented]), TEXT, expected)[0]?.verified).toBe(false);
  });
});

describe('expectedSchema', () => {
  it('requires a severity for every profile', () => {
    const incomplete = {
      ...expected,
      clauses: [{ ...expected.clauses[0], expectedSeverity: { free_user: 'warning' } }],
    };
    expect(expectedSchema.safeParse(incomplete).success).toBe(false);
  });
});
