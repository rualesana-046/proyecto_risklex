import { describe, expect, it } from 'vitest';
import { normalizeText } from './normalize-text.ts';
import { verifyClauses } from './verify-clauses.ts';

const SENTENCES = Array.from(
  { length: 10 },
  (_, index) => `Cláusula número ${String(index)}: el servicio conserva los datos durante un año.`,
);
const SOURCE = SENTENCES.join('\n');
const document = normalizeText(SOURCE);

const real = (index: number): { id: string; quote: string } => ({
  id: `real-${String(index)}`,
  quote: SENTENCES[index] ?? '',
});

const invented = (index: number): { id: string; quote: string } => ({
  id: `invented-${String(index)}`,
  quote: `Cláusula inventada ${String(index)} que no aparece en el documento.`,
});

describe('verifyClauses', () => {
  it('keeps every clause when all quotes are verified', () => {
    const summary = verifyClauses(document, [real(0), real(1), real(2)]);
    expect(summary.verified).toHaveLength(3);
    expect(summary.discardedClauses).toBe(0);
    expect(summary.discardedRatio).toBe(0);
    expect(summary.exceedsDiscardThreshold).toBe(false);
  });

  it('discards unverified clauses and keeps the original order', () => {
    const summary = verifyClauses(document, [real(3), invented(1), real(4)]);
    expect(summary.verified.map((item) => item.clause.id)).toEqual(['real-3', 'real-4']);
    expect(summary.totalClauses).toBe(3);
    expect(summary.discardedClauses).toBe(1);
  });

  it('returns spans that point at the original quote', () => {
    const [item] = verifyClauses(document, [real(5)]).verified;
    expect(item && SOURCE.slice(item.span.start, item.span.end)).toBe(SENTENCES[5]);
  });

  it('does not exceed the threshold at exactly 30 percent discarded', () => {
    const clauses = [...[0, 1, 2, 3, 4, 5, 6].map(real), ...[0, 1, 2].map(invented)];
    const summary = verifyClauses(document, clauses);
    expect(summary.discardedRatio).toBeCloseTo(0.3);
    expect(summary.exceedsDiscardThreshold).toBe(false);
  });

  it('exceeds the threshold above 30 percent discarded', () => {
    const summary = verifyClauses(document, [real(0), real(1), invented(0)]);
    expect(summary.exceedsDiscardThreshold).toBe(true);
  });

  it('reports a full discard when no quote is verified', () => {
    const summary = verifyClauses(document, [invented(0), invented(1)]);
    expect(summary.verified).toHaveLength(0);
    expect(summary.discardedRatio).toBe(1);
    expect(summary.exceedsDiscardThreshold).toBe(true);
  });

  it('handles an empty clause list', () => {
    const summary = verifyClauses(document, []);
    expect(summary).toMatchObject({ totalClauses: 0, discardedClauses: 0, discardedRatio: 0 });
    expect(summary.exceedsDiscardThreshold).toBe(false);
  });

  it('keeps the extra fields of each clause', () => {
    const [item] = verifyClauses(document, [{ ...real(6), category: 'privacy' }]).verified;
    expect(item?.clause.category).toBe('privacy');
  });
});
