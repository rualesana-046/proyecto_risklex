import { MAX_DISCARDED_CLAUSE_RATIO } from '../constants/limits.constants.ts';
import type { NormalizedText } from './normalize-text.ts';
import { verifyQuote } from './verify-quote.ts';

export interface QuoteSpan {
  readonly start: number;
  readonly end: number;
}

export interface VerifiedClause<T> {
  readonly clause: T;
  readonly span: QuoteSpan;
}

export interface ClauseVerificationSummary<T> {
  readonly verified: readonly VerifiedClause<T>[];
  readonly totalClauses: number;
  readonly discardedClauses: number;
  readonly discardedRatio: number;
  readonly exceedsDiscardThreshold: boolean;
}

export function verifyClauses<T extends { readonly quote: string }>(
  document: NormalizedText,
  clauses: readonly T[],
): ClauseVerificationSummary<T> {
  const verified: VerifiedClause<T>[] = [];
  for (const clause of clauses) {
    const result = verifyQuote(document, clause.quote);
    if (result.verified) {
      verified.push({ clause, span: { start: result.start, end: result.end } });
    }
  }
  const totalClauses = clauses.length;
  const discardedClauses = totalClauses - verified.length;
  const discardedRatio = totalClauses === 0 ? 0 : discardedClauses / totalClauses;
  return {
    verified,
    totalClauses,
    discardedClauses,
    discardedRatio,
    exceedsDiscardThreshold: discardedRatio > MAX_DISCARDED_CLAUSE_RATIO,
  };
}
