import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type {
  AnalysisOutcome,
  AnalysisStage,
  VerifiedAnalysis,
} from '../../../common/analysis-vocabulary.ts';
import type { DocumentReadOutcome } from '../../../common/document-sources.ts';
import { AnalyzeScreen } from './analyze-screen.tsx';

export function simulateNativeDialog(): void {
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

function fakeBridge(
  outcome: Promise<AnalysisOutcome> = Promise.resolve(SUCCESS),
  pdf: Promise<DocumentReadOutcome> = new Promise(() => undefined),
  link: Promise<DocumentReadOutcome> = pdf,
) {
  let emit: (stage: AnalysisStage) => void = () => undefined;
  return {
    bridge: {
      pickPdf: vi.fn<() => Promise<DocumentReadOutcome>>(() => pdf),
      readLink: vi.fn<(url: string) => Promise<DocumentReadOutcome>>(() => link),
      cancelDocumentRead: vi.fn<() => void>(),
      analyze: vi.fn<() => Promise<AnalysisOutcome>>(() => outcome),
      onProgress: vi.fn((listener: (stage: AnalysisStage) => void) => {
        emit = listener;
        return () => undefined;
      }),
      cancel: vi.fn<() => void>(),
    },
    emit: (stage: AnalysisStage) => {
      emit(stage);
    },
  };
}

export function setup(
  outcome?: Promise<AnalysisOutcome>,
  pdf?: Promise<DocumentReadOutcome>,
  link?: Promise<DocumentReadOutcome>,
) {
  const fake = fakeBridge(outcome, pdf, link);
  const onAnalysis = vi.fn<(analysis: VerifiedAnalysis) => void>();
  render(<AnalyzeScreen bridge={fake.bridge} onAnalysis={onAnalysis} />);
  const textArea = screen.getByLabelText('Texto del documento');
  const analyzeButton = screen.getByRole<HTMLButtonElement>('button', {
    name: 'Analizar documento',
  });
  return { ...fake, onAnalysis, textArea, analyzeButton, user: userEvent.setup() };
}
