import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { VerifiedAnalysis } from '../../../common/analysis-vocabulary.ts';
import '../i18n/i18n.ts';
import { AnalysisNotices } from './analysis-notices.tsx';
import { ResultsScreen } from './results-screen.tsx';

afterEach(cleanup);

const BASE: VerifiedAnalysis = {
  clauses: [],
  glossary: [],
  meta: {
    promptVersion: '2026-11-14.1',
    model: 'claude-sonnet-5-5',
    language: 'es',
    moreClausesLikely: false,
    usage: { inputTokens: 1, outputTokens: 1 },
  },
  reliability: 'normal',
  totalClauses: 0,
  discardedClauses: 0,
  attempts: 1,
};

describe('AnalysisNotices', () => {
  it('stays silent for a complete and reliable analysis', () => {
    const { container } = render(<AnalysisNotices analysis={BASE} />);
    expect(container.textContent).toBe('');
  });

  it('warns about low reliability with the real discard counts', () => {
    render(
      <AnalysisNotices
        analysis={{
          ...BASE,
          reliability: 'low',
          totalClauses: 6,
          discardedClauses: 3,
          attempts: 2,
        }}
      />,
    );
    expect(screen.getByRole('note').textContent).toContain('Quitamos 3 de 6 puntos');
  });

  it('warns that a truncated analysis is not complete', () => {
    render(
      <AnalysisNotices analysis={{ ...BASE, meta: { ...BASE.meta, moreClausesLikely: true } }} />,
    );
    expect(screen.getByRole('note').textContent).toContain('Este análisis no es completo');
  });

  it('shows both notices on the results screen when both apply', () => {
    const both: VerifiedAnalysis = {
      ...BASE,
      reliability: 'low',
      totalClauses: 4,
      discardedClauses: 2,
      meta: { ...BASE.meta, moreClausesLikely: true },
    };
    render(<ResultsScreen analysis={both} />);
    expect(screen.getAllByRole('note')).toHaveLength(2);
  });
});
