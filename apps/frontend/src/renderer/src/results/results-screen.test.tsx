import type { Clause, ClauseCategory, Severity } from '@risklex/shared';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  VerifiedAnalysis,
  VerifiedClauseResult,
} from '../../../common/analysis-vocabulary.ts';
import '../i18n/i18n.ts';
import { ResultsScreen } from './results-screen.tsx';

afterEach(cleanup);

function item(
  id: string,
  category: ClauseCategory,
  free: Severity,
  professional: Severity,
): VerifiedClauseResult {
  const assessment = (severity: Severity, who: string) => ({
    severity,
    meaning: `${who} ${id}`,
    consequence: 'c',
  });
  const clause: Clause = {
    id,
    category,
    title: `Cláusula ${id}`,
    quote: 'una cita literal del contrato sintetico',
    evidenceStatus: 'supported',
    isAmbiguous: false,
    ambiguityReason: '',
    confidence: 'high',
    entities: [],
    profiles: {
      free_user: assessment(free, 'Gratis'),
      subscriber: assessment(free, 'Suscripción'),
      professional: assessment(professional, 'Trabajo'),
    },
  };
  return {
    clause,
    span: { start: id.charCodeAt(0), end: id.charCodeAt(0) + 5 },
    originalText: `Original ${id}`,
  };
}

const ANALYSIS: VerifiedAnalysis = {
  clauses: [
    item('a', 'privacy', 'high_risk', 'neutral'),
    item('b', 'tracking', 'warning', 'high_risk'),
    item('c', 'cancellation', 'neutral', 'neutral'),
  ],
  glossary: [],
  meta: {
    promptVersion: '2026-11-14.1',
    model: 'claude-sonnet-5-5',
    language: 'es',
    moreClausesLikely: false,
    usage: { inputTokens: 1, outputTokens: 1 },
  },
  reliability: 'normal',
  totalClauses: 3,
  discardedClauses: 0,
  attempts: 1,
};

function cardTitles(): (string | null)[] {
  return screen
    .getAllByRole('article')
    .map((card) => card.querySelector('h3')?.textContent ?? null);
}

describe('ResultsScreen', () => {
  it('shows the essentials, counters and every card for the default profile', () => {
    render(<ResultsScreen analysis={ANALYSIS} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Resultados del análisis' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Lo uso gratis' })).toHaveProperty('checked', true);
    expect(cardTitles()).toEqual(['Cláusula a', 'Cláusula b', 'Cláusula c']);
    expect(screen.getByRole('list', { name: 'Resumen por gravedad' }).textContent).toBe(
      'Alto riesgo1Advertencia1Neutro1',
    );
  });

  it('switches the profile instantly from local data', async () => {
    const user = userEvent.setup();
    render(<ResultsScreen analysis={ANALYSIS} />);
    await user.click(screen.getByRole('radio', { name: 'Lo uso para trabajar' }));
    expect(cardTitles()).toEqual(['Cláusula b', 'Cláusula a', 'Cláusula c']);
    expect(screen.getAllByText('Trabajo b').length).toBeGreaterThan(0);
    expect(screen.queryByText('Gratis b')).toBeNull();
  });

  it('filters the cards by category without touching the essentials', async () => {
    const user = userEvent.setup();
    render(<ResultsScreen analysis={ANALYSIS} />);
    await user.click(screen.getByRole('button', { name: 'Seguimiento' }));
    expect(cardTitles()).toEqual(['Cláusula b']);
    expect(document.querySelectorAll('.essentials-list > li')).toHaveLength(2);
  });

  it('explains when the document has no relevant clauses', () => {
    render(<ResultsScreen analysis={{ ...ANALYSIS, clauses: [], totalClauses: 0 }} />);
    expect(screen.getByText('No encontramos cláusulas relevantes en este documento.')).toBeTruthy();
  });
});
