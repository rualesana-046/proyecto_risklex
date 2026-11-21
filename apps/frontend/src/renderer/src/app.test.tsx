import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisOutcome, VerifiedAnalysis } from '../../common/analysis-vocabulary.ts';
import { App } from './app.tsx';
import { resetConsentForTests } from './consent/use-consent.ts';
import './i18n/i18n.ts';

const ANALYSIS: VerifiedAnalysis = {
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

const SUCCESS: AnalysisOutcome = { ok: true, analysis: ANALYSIS };

const analyze = vi.fn<Window['risklex']['analyze']>();
const SAVED = {
  id: '6f1c1e9e-3b0a-4c47-9d61-000000000001',
  savedAt: '2026-11-21T10:00:00.000Z',
  source: { kind: 'link' as const, name: 'ejemplo.com' },
  characters: 2221,
  language: 'es' as const,
  counts: { high_risk: 0, warning: 0, neutral: 0 },
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (this.hasAttribute('open')) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    }
  };
});

beforeEach(() => {
  resetConsentForTests();
  analyze.mockReset();
  analyze.mockResolvedValue(SUCCESS);
  Object.defineProperty(window, 'risklex', {
    configurable: true,
    value: {
      analyze,
      onProgress: vi.fn(() => () => undefined),
      cancel: vi.fn(),
      listHistory: () => Promise.resolve([SAVED]),
      getHistory: () => Promise.resolve({ summary: SAVED, analysis: ANALYSIS }),
      deleteHistory: () => Promise.resolve(),
      clearHistory: () => Promise.resolve(),
    },
  });
});

afterEach(cleanup);

describe('App (simulated preload bridge)', () => {
  it('opens on the analyze screen with the sidebar and the persistent legal notice', () => {
    render(<App />);
    expect(screen.getByRole('complementary', { name: 'Navegación principal' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: '¿Qué vas a aceptar hoy?' })).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Resultados' }).disabled).toBe(
      true,
    );
    expect(screen.getByRole('note').textContent).toContain(
      'no reemplaza la asesoría de un abogado',
    );
    expect(analyze).not.toHaveBeenCalled();
  });

  it('shows the results after an analysis and keeps the legal notice', async () => {
    const user = userEvent.setup();
    render(<App />);
    fireEvent.change(screen.getByLabelText('Texto del documento'), {
      target: { value: 'Términos' },
    });
    await user.click(screen.getByRole('button', { name: 'Analizar documento' }));
    await user.click(screen.getByRole('button', { name: 'Aceptar y analizar' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Resultados del análisis' })).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Resultados' }).disabled).toBe(
      false,
    );
    expect(screen.getByRole('note').textContent).toContain(
      'no reemplaza la asesoría de un abogado',
    );
    await user.click(screen.getByRole('button', { name: 'Analizar' }));
    expect(screen.getByLabelText<HTMLTextAreaElement>('Texto del documento').value).toBe(
      'Términos',
    );
  });

  it('opens the settings from the sidebar and keeps the text being written', async () => {
    const user = userEvent.setup();
    render(<App />);
    fireEvent.change(screen.getByLabelText('Texto del documento'), {
      target: { value: 'Términos' },
    });
    await user.click(screen.getByRole('button', { name: 'Ajustes' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ajustes' }).getAttribute('aria-current')).toBe(
      'page',
    );
    await user.click(screen.getByRole('button', { name: 'Analizar' }));
    expect(screen.getByLabelText<HTMLTextAreaElement>('Texto del documento').value).toBe(
      'Términos',
    );
  });

  it('opens a saved analysis from the history in the results', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Historial' }));
    await user.click(
      await screen.findByRole('button', { name: 'Abrir el análisis de Enlace: ejemplo.com' }),
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Resultados del análisis' })).toBeTruthy();
    expect(screen.getByText(/^Análisis guardado el /u)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Resultados' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });
});
