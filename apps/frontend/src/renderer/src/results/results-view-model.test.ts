import type { Clause, ClauseCategory, ConfidenceLevel, Severity } from '@risklex/shared';
import { describe, expect, it } from 'vitest';
import type { VerifiedClauseResult } from '../../../common/analysis-vocabulary.ts';
import {
  essentials,
  presentCategories,
  rankClauses,
  severityCounts,
  visibleClauses,
} from './results-view-model.ts';

interface Spec {
  readonly id: string;
  readonly start: number;
  readonly category: ClauseCategory;
  readonly confidence: ConfidenceLevel;
  readonly free: Severity;
  readonly subscriber: Severity;
  readonly professional: Severity;
}

function assessment(severity: Severity) {
  return { severity, meaning: 'Significado.', consequence: 'Consecuencia.' };
}

function item(spec: Spec): VerifiedClauseResult {
  const clause: Clause = {
    id: spec.id,
    category: spec.category,
    title: spec.id,
    quote: 'una cita literal del contrato sintetico',
    evidenceStatus: 'supported',
    isAmbiguous: false,
    ambiguityReason: '',
    confidence: spec.confidence,
    entities: [],
    profiles: {
      free_user: assessment(spec.free),
      subscriber: assessment(spec.subscriber),
      professional: assessment(spec.professional),
    },
  };
  return { clause, span: { start: spec.start, end: spec.start + 10 }, originalText: 'texto' };
}

const CLAUSES = [
  item({
    id: 'a',
    start: 50,
    category: 'privacy',
    confidence: 'medium',
    free: 'high_risk',
    subscriber: 'warning',
    professional: 'neutral',
  }),
  item({
    id: 'b',
    start: 10,
    category: 'tracking',
    confidence: 'high',
    free: 'high_risk',
    subscriber: 'neutral',
    professional: 'high_risk',
  }),
  item({
    id: 'c',
    start: 30,
    category: 'privacy',
    confidence: 'high',
    free: 'high_risk',
    subscriber: 'high_risk',
    professional: 'warning',
  }),
  item({
    id: 'd',
    start: 20,
    category: 'cancellation',
    confidence: 'low',
    free: 'warning',
    subscriber: 'high_risk',
    professional: 'warning',
  }),
  item({
    id: 'e',
    start: 40,
    category: 'hidden_costs',
    confidence: 'high',
    free: 'neutral',
    subscriber: 'warning',
    professional: 'high_risk',
  }),
];

function ids(list: readonly VerifiedClauseResult[]): string[] {
  return list.map((entry) => entry.clause.id);
}

describe('results view model', () => {
  it('ranks by severity, then confidence, then document order', () => {
    expect(ids(rankClauses(CLAUSES, 'free_user'))).toEqual(['b', 'c', 'a', 'd', 'e']);
  });

  it('picks up to three of the most severe clauses for each profile', () => {
    expect(ids(essentials(CLAUSES, 'free_user'))).toEqual(['b', 'c', 'a']);
    expect(ids(essentials(CLAUSES, 'subscriber'))).toEqual(['c', 'd', 'e']);
    expect(ids(essentials(CLAUSES, 'professional'))).toEqual(['b', 'e', 'c']);
  });

  it('never includes a clause that is neutral for the chosen profile', () => {
    const twoRiskyOneNeutral = [CLAUSES[0], CLAUSES[3], CLAUSES[4]].filter(
      (entry) => entry !== undefined,
    );
    expect(ids(essentials(twoRiskyOneNeutral, 'free_user'))).toEqual(['a', 'd']);
    expect(ids(essentials(twoRiskyOneNeutral, 'subscriber'))).toEqual(['d', 'e', 'a']);
  });

  it('returns no essentials when everything is neutral or there are no clauses', () => {
    const neutralForFree = CLAUSES.filter((entry) => entry.clause.id === 'e');
    expect(essentials(neutralForFree, 'free_user')).toEqual([]);
    expect(essentials([], 'free_user')).toEqual([]);
  });

  it('counts severities per profile', () => {
    expect(severityCounts(CLAUSES, 'free_user')).toEqual({ high_risk: 3, warning: 1, neutral: 1 });
    expect(severityCounts(CLAUSES, 'subscriber')).toEqual({ high_risk: 2, warning: 2, neutral: 1 });
    expect(severityCounts([], 'professional')).toEqual({ high_risk: 0, warning: 0, neutral: 0 });
  });

  it('lists only the categories present, in the canonical order', () => {
    expect(presentCategories(CLAUSES)).toEqual([
      'privacy',
      'tracking',
      'hidden_costs',
      'cancellation',
    ]);
  });

  it('filters by category and keeps the profile ranking', () => {
    expect(ids(visibleClauses(CLAUSES, 'professional', 'privacy'))).toEqual(['c', 'a']);
    expect(ids(visibleClauses(CLAUSES, 'professional', 'all'))).toEqual(['b', 'e', 'c', 'd', 'a']);
    expect(visibleClauses(CLAUSES, 'free_user', 'content_license')).toEqual([]);
  });

  it('never mutates the analysis it receives', () => {
    const before = ids(CLAUSES);
    rankClauses(CLAUSES, 'subscriber');
    expect(ids(CLAUSES)).toEqual(before);
  });
});
