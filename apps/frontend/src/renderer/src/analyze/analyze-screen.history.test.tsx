import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DocumentReadOutcome } from '../../../common/document-sources.ts';
import { resetConsentForTests } from '../consent/use-consent.ts';
import '../i18n/i18n.ts';
import { setup, simulateNativeDialog } from './analyze-screen.test-support.tsx';

beforeAll(simulateNativeDialog);
beforeEach(resetConsentForTests);
afterEach(cleanup);

const PDF_TEXT = 'Términos extraídos del PDF con suficientes palabras para analizar.';

function loadedPdf() {
  return Promise.resolve<DocumentReadOutcome>({
    ok: true,
    text: PDF_TEXT,
    source: { kind: 'pdf', name: 'contrato.pdf' },
    characters: PDF_TEXT.length,
  });
}

describe('document source sent with the analysis (simulated preload bridge)', () => {
  it('sends the pdf name when the text is exactly what was read', async () => {
    const { bridge, analyzeButton, user } = setup(undefined, loadedPdf());
    await user.click(screen.getByRole('button', { name: 'Elegir un PDF…' }));
    await user.click(analyzeButton);
    await user.click(screen.getByRole('button', { name: 'Aceptar y analizar' }));
    expect(bridge.analyze).toHaveBeenCalledWith({
      text: PDF_TEXT,
      language: 'es',
      source: { kind: 'pdf', name: 'contrato.pdf' },
    });
  });

  it('treats the text as pasted once it was edited after reading', async () => {
    const { bridge, textArea, analyzeButton, user } = setup(undefined, loadedPdf());
    await user.click(screen.getByRole('button', { name: 'Elegir un PDF…' }));
    fireEvent.change(textArea, { target: { value: `${PDF_TEXT} Con un cambio.` } });
    await user.click(analyzeButton);
    await user.click(screen.getByRole('button', { name: 'Aceptar y analizar' }));
    expect(bridge.analyze).toHaveBeenCalledWith({
      text: `${PDF_TEXT} Con un cambio.`,
      language: 'es',
    });
  });
});
