import type { Clause } from '@risklex/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { VerifiedAnalysis } from '../../../common/analysis-vocabulary.ts';
import '../i18n/i18n.ts';
import { ResultsScreen } from './results-screen.tsx';

const HOSTILE = '<img src=x onerror="alert(1)"><script>alert(2)</script>';

afterEach(cleanup);

function hostileAnalysis(): VerifiedAnalysis {
  const assessment = {
    severity: 'high_risk' as const,
    meaning: `Significa ${HOSTILE}`,
    consequence: `Consecuencia ${HOSTILE}`,
  };
  const clause: Clause = {
    id: 'h1',
    category: 'privacy',
    title: `Título ${HOSTILE}`,
    quote: `Cita guardada ${HOSTILE}`,
    evidenceStatus: 'supported',
    isAmbiguous: true,
    ambiguityReason: `Motivo ${HOSTILE}`,
    confidence: 'high',
    entities: [],
    profiles: { free_user: assessment, subscriber: assessment, professional: assessment },
  };
  return {
    clauses: [{ clause, span: { start: 0, end: 10 }, originalText: `Original ${HOSTILE}` }],
    glossary: [{ term: `Término ${HOSTILE}`, explanation: `Explicación ${HOSTILE}` }],
    meta: {
      promptVersion: 'p',
      model: 'm',
      language: 'es',
      moreClausesLikely: false,
      usage: { inputTokens: 1, outputTokens: 1 },
    },
    reliability: 'normal',
    totalClauses: 1,
    discardedClauses: 0,
    attempts: 1,
  };
}

describe('results opened from the history (rendered from stored data)', () => {
  it('shows every stored text as plain text and creates no elements from it', () => {
    const { container } = render(
      <ResultsScreen
        analysis={hostileAnalysis()}
        origin={{ kind: 'history', savedAt: '2026-11-21T10:00:00.000Z' }}
      />,
    );
    expect(container.querySelector('img, script, iframe')).toBeNull();
    expect(container.textContent).toContain(`Título ${HOSTILE}`);
    expect(container.textContent).toContain(`Original ${HOSTILE}`);
    expect(container.textContent).toContain(`Motivo ${HOSTILE}`);
  });

  it('says when the analysis was saved', () => {
    render(
      <ResultsScreen
        analysis={hostileAnalysis()}
        origin={{ kind: 'history', savedAt: '2026-11-21T10:00:00.000Z' }}
      />,
    );
    expect(screen.getByText(/^Análisis guardado el /u)).toBeTruthy();
  });
});

describe('results of a new analysis', () => {
  it('warns when it could not be saved to the history but keeps the result', () => {
    render(
      <ResultsScreen analysis={hostileAnalysis()} origin={{ kind: 'new', saveFailed: true }} />,
    );
    expect(screen.getByRole('status').textContent).toContain('No pudimos guardar este análisis');
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('adds nothing when it was saved or the history is off', () => {
    render(
      <ResultsScreen analysis={hostileAnalysis()} origin={{ kind: 'new', saveFailed: false }} />,
    );
    expect(screen.queryByText(/historial/u)).toBeNull();
  });
});
