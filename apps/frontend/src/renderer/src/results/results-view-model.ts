import {
  CLAUSE_CATEGORIES,
  SEVERITIES,
  type ClauseCategory,
  type ConfidenceLevel,
  type Severity,
  type UserProfile,
} from '@risklex/shared';
import type { VerifiedClauseResult } from '../../../common/analysis-vocabulary.ts';

export const ESSENTIALS_COUNT = 3;

export type CategoryFilter = ClauseCategory | 'all';

const SEVERITY_RANK: Readonly<Record<Severity, number>> = { high_risk: 3, warning: 2, neutral: 1 };
const CONFIDENCE_RANK: Readonly<Record<ConfidenceLevel, number>> = { high: 3, medium: 2, low: 1 };

export function severityFor(item: VerifiedClauseResult, profile: UserProfile): Severity {
  return item.clause.profiles[profile].severity;
}

function compareForProfile(profile: UserProfile) {
  return (first: VerifiedClauseResult, second: VerifiedClauseResult): number =>
    SEVERITY_RANK[severityFor(second, profile)] - SEVERITY_RANK[severityFor(first, profile)] ||
    CONFIDENCE_RANK[second.clause.confidence] - CONFIDENCE_RANK[first.clause.confidence] ||
    first.span.start - second.span.start;
}

export function rankClauses(
  clauses: readonly VerifiedClauseResult[],
  profile: UserProfile,
): VerifiedClauseResult[] {
  return [...clauses].sort(compareForProfile(profile));
}

export function essentials(
  clauses: readonly VerifiedClauseResult[],
  profile: UserProfile,
): VerifiedClauseResult[] {
  return rankClauses(clauses, profile)
    .filter((item) => severityFor(item, profile) !== 'neutral')
    .slice(0, ESSENTIALS_COUNT);
}

export function severityCounts(
  clauses: readonly VerifiedClauseResult[],
  profile: UserProfile,
): Record<Severity, number> {
  const counts = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0])) as Record<
    Severity,
    number
  >;
  for (const item of clauses) {
    counts[severityFor(item, profile)] += 1;
  }
  return counts;
}

export function presentCategories(clauses: readonly VerifiedClauseResult[]): ClauseCategory[] {
  const present = new Set(clauses.map((item) => item.clause.category));
  return CLAUSE_CATEGORIES.filter((category) => present.has(category));
}

export function visibleClauses(
  clauses: readonly VerifiedClauseResult[],
  profile: UserProfile,
  filter: CategoryFilter,
): VerifiedClauseResult[] {
  const ranked = rankClauses(clauses, profile);
  return filter === 'all' ? ranked : ranked.filter((item) => item.clause.category === filter);
}
