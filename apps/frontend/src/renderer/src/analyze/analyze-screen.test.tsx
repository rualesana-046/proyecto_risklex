import { MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisOutcome, AnalysisStage } from '../../../common/analysis-vocabulary.ts';
import { resetConsentForTests } from '../consent/use-consent.ts';
import '../i18n/i18n.ts';
import { AnalyzeScreen } from './analyze-screen.tsx';

function simulateNativeDialog(): void {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (this.hasAttribute('open')) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    }
  };
}

const SUCCESS = {
  ok: true,
  analysis: {
    clauses: [],
    glossary: [],
    reliability: 'normal',
    totalClauses: 0,
    discardedClauses: 0,
    attempts: 1,
  },
} as unknown as AnalysisOutcome;

function fakeBridge(outcome: Promise<AnalysisOutcome> = Promise.resolve(SUCCESS)) {
  let emit: (stage: AnalysisStage) => void = () => undefined;
  return {
    bridge: {
      analyze: vi.fn(() => outcome),
      onProgress: vi.fn((listener: (stage: AnalysisStage) => void) => {
        emit = listener;
        return () => undefined;
      }),
      cancel: vi.fn(),
    },
    emit: (stage: AnalysisStage) => {
      emit(stage);
    },
  };
}

function setup(outcome?: Promise<AnalysisOutcome>) {
  const fake = fakeBridge(outcome);
  const onAnalysis = vi.fn();
  render(<AnalyzeScreen bridge={fake.bridge} onAnalysis={onAnalysis} />);
  const textArea = screen.getByLabelText('Texto del documento');
  const analyzeButton = screen.getByRole<HTMLButtonElement>('button', {
    name: 'Analizar documento',
  });
  return { ...fake, onAnalysis, textArea, analyzeButton, user: userEvent.setup() };
}

beforeAll(simulateNativeDialog);
beforeEach(resetConsentForTests);
afterEach(cleanup);

describe('AnalyzeScreen (simulated preload bridge and native dialog)', () => {
  it('keeps the analyze button disabled while the text is empty or too long', () => {
    const { textArea, analyzeButton } = setup();
    expect(analyzeButton.disabled).toBe(true);
    fireEvent.change(textArea, { target: { value: '   ' } });
    expect(analyzeButton.disabled).toBe(true);
    fireEvent.change(textArea, { target: { value: 'Términos del servicio' } });
    expect(analyzeButton.disabled).toBe(false);
    fireEvent.change(textArea, { target: { value: 'a'.repeat(MAX_DOCUMENT_CHARACTERS + 1) } });
    expect(analyzeButton.disabled).toBe(true);
  });

  it('sends nothing when the consent dialog is dismissed and returns the focus', async () => {
    const { textArea, analyzeButton, bridge, user } = setup();
    fireEvent.change(textArea, { target: { value: 'Términos del servicio' } });
    await user.click(analyzeButton);
    expect(screen.getByRole('dialog', { name: 'Antes de analizar' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(bridge.analyze).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(analyzeButton);
  });

  it('analyzes after consent and does not ask again in the same run', async () => {
    const { textArea, analyzeButton, bridge, onAnalysis, user } = setup();
    fireEvent.change(textArea, { target: { value: 'Términos del servicio' } });
    await user.click(analyzeButton);
    await user.click(screen.getByRole('button', { name: 'Aceptar y analizar' }));
    expect(bridge.analyze).toHaveBeenCalledWith({ text: 'Términos del servicio', language: 'es' });
    expect(onAnalysis).toHaveBeenCalledOnce();
    await user.click(analyzeButton);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(bridge.analyze).toHaveBeenCalledTimes(2);
  });

  it('shows real progress and lets the person cancel', async () => {
    let finish: (outcome: AnalysisOutcome) => void = () => undefined;
    const pending = new Promise<AnalysisOutcome>((resolve) => (finish = resolve));
    const { textArea, analyzeButton, bridge, emit, user } = setup(pending);
    fireEvent.change(textArea, { target: { value: 'Términos del servicio' } });
    await user.click(analyzeButton);
    await user.click(screen.getByRole('button', { name: 'Aceptar y analizar' }));
    act(() => {
      emit('waiting_for_analysis');
    });
    expect(screen.getByRole('status').textContent).toContain('Analizando');
    expect(analyzeButton.disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Cancelar análisis' }));
    expect(bridge.cancel).toHaveBeenCalledOnce();
    await act(async () => {
      finish({ ok: false, error: { code: 'cancelled', retryAfterSeconds: null } });
      await pending;
    });
    expect(screen.queryByRole('button', { name: 'Cancelar análisis' })).toBeNull();
    expect(document.activeElement).toBe(analyzeButton);
  });
});
