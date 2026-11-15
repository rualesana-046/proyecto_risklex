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
  totalClauses: 9,
  discardedClauses: 0,
  attempts: 1,
};

function noticeIds(): (string | null)[] {
  return [...document.querySelectorAll('[data-notice]')].map((notice) =>
    notice.getAttribute('data-notice'),
  );
}

describe('AnalysisNotices', () => {
  it('stays silent for a complete, reliable analysis with no discarded quotes', () => {
    const { container } = render(<AnalysisNotices analysis={BASE} />);
    expect(container.textContent).toBe('');
  });

  it('reports a single discarded quote without any retry, with the right counts', () => {
    render(<AnalysisNotices analysis={{ ...BASE, discardedClauses: 1 }} />);
    expect(screen.getByRole('status').textContent).toBe(
      'Quitamos 1 de 9 puntos porque no pudimos comprobar su texto original en tu documento.',
    );
    expect(noticeIds()).toEqual(['discarded']);
  });

  it('keeps the discard count and the low reliability warning as separate notices', () => {
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
    expect(screen.getByRole('status').textContent).toContain('Quitamos 3 de 6 puntos');
    expect(screen.getByRole('note').textContent).toContain('menos fiable de lo habitual');
    expect(screen.getByRole('note').textContent).not.toContain('Quitamos');
  });

  it('warns that a truncated analysis is not complete', () => {
    render(
      <AnalysisNotices analysis={{ ...BASE, meta: { ...BASE.meta, moreClausesLikely: true } }} />,
    );
    expect(screen.getByRole('note').textContent).toContain('Este análisis no es completo');
  });

  it('shows every applicable notice together on the results screen', () => {
    const all: VerifiedAnalysis = {
      ...BASE,
      reliability: 'low',
      totalClauses: 4,
      discardedClauses: 2,
      meta: { ...BASE.meta, moreClausesLikely: true },
    };
    render(<ResultsScreen analysis={all} />);
    expect(noticeIds()).toEqual(['discarded', 'low-reliability', 'truncated']);
  });

  it('renders the notices as plain text', () => {
    render(<AnalysisNotices analysis={{ ...BASE, discardedClauses: 2 }} />);
    const notice = screen.getByRole('status');
    expect(notice.children).toHaveLength(0);
    expect(notice.textContent).toContain('Quitamos 2 de 9 puntos');
  });

  it('always labels a development fixture result, with no way to hide the label', () => {
    render(<AnalysisNotices analysis={{ ...BASE, meta: { ...BASE.meta, model: 'fixture' } }} />);
    expect(screen.getByRole('note').textContent).toBe(
      'Resultado de prueba, no es un análisis real.',
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('does not label a real model result as a fixture', () => {
    render(
      <ResultsScreen analysis={{ ...BASE, meta: { ...BASE.meta, moreClausesLikely: true } }} />,
    );
    expect(screen.queryByText('Resultado de prueba, no es un análisis real.')).toBeNull();
  });
});
