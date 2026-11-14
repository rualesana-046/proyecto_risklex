import { describe, expect, it } from 'vitest';
import { checkCriteria } from './live-check-criteria.ts';
import type { LiveEvaluation } from './live-check-evaluation.ts';

function evaluation(overrides: Partial<LiveEvaluation>): LiveEvaluation {
  return {
    returned: 4,
    verified: 4,
    reasons: [],
    planted: 4,
    detected: 4,
    severityHits: 9,
    severityTotal: 12,
    baselines: { high_risk: 4, warning: 4, neutral: 4 },
    ambiguousReal: 2,
    ambiguousFound: 2,
    ambiguousFalsePositives: 1,
    forbidden: 0,
    ...overrides,
  };
}

describe('checkCriteria', () => {
  it('passes at 75 % with a 25 point margin, full coverage and one false positive', () => {
    expect(checkCriteria(evaluation({}))).toMatchObject({
      severityRate: 0.75,
      bestBaselineRate: 4 / 12,
      severityPass: true,
      ambiguityPass: true,
      forbiddenPass: true,
    });
  });

  it('fails severity below 75 %', () => {
    expect(checkCriteria(evaluation({ severityHits: 8 })).severityPass).toBe(false);
  });

  it('fails severity when a trivial answer is within 25 points', () => {
    const result = checkCriteria(
      evaluation({ baselines: { high_risk: 7, warning: 3, neutral: 2 } }),
    );
    expect(result).toMatchObject({ bestBaseline: 'high_risk', severityPass: false });
  });

  it.each([
    ['a missed real ambiguity', { ambiguousFound: 1 }],
    ['two false positives', { ambiguousFalsePositives: 2 }],
  ])('fails ambiguity with %s', (_label, overrides) => {
    expect(checkCriteria(evaluation(overrides)).ambiguityPass).toBe(false);
  });

  it('fails when a clause comes from a forbidden phrase', () => {
    expect(checkCriteria(evaluation({ forbidden: 1 })).forbiddenPass).toBe(false);
  });
});
