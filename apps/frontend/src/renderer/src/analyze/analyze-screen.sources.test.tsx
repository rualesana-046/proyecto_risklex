import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DocumentReadOutcome } from '../../../common/document-sources.ts';
import { resetConsentForTests } from '../consent/use-consent.ts';
import '../i18n/i18n.ts';
import { setup, simulateNativeDialog } from './analyze-screen.test-support.tsx';

beforeAll(simulateNativeDialog);
beforeEach(resetConsentForTests);
afterEach(cleanup);

describe('pdf source on the analyze screen (simulated preload bridge)', () => {
  it('fills the text area from a pdf without sending anything', async () => {
    const pdf = Promise.resolve<DocumentReadOutcome>({
      ok: true,
      text: 'Términos extraídos del PDF',
      source: { kind: 'pdf', name: 'contrato.pdf' },
      characters: 26,
    });
    const { textArea, bridge, user } = setup(undefined, pdf);
    await user.click(screen.getByRole('button', { name: 'Elegir un PDF…' }));
    expect((textArea as HTMLTextAreaElement).value).toBe('Términos extraídos del PDF');
    expect(screen.getByText('Texto extraído de contrato.pdf · 26 caracteres')).toBeTruthy();
    expect(bridge.analyze).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the existing text when the pdf cannot be read and returns the focus', async () => {
    const pdf = Promise.resolve<DocumentReadOutcome>({
      ok: false,
      error: { code: 'pdf_no_text', characters: null },
    });
    const { textArea, user } = setup(undefined, pdf);
    fireEvent.change(textArea, { target: { value: 'Texto que ya estaba' } });
    await user.click(screen.getByRole('button', { name: 'Elegir un PDF…' }));
    expect((textArea as HTMLTextAreaElement).value).toBe('Texto que ya estaba');
    expect(screen.getByRole('alert').textContent).toContain('imagen escaneada');
    const lastButton = screen.getByRole('button', { name: 'Leer un enlace' });
    expect(
      lastButton.compareDocumentPosition(screen.getByRole('alert')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Elegir un PDF…' }));
  });

  it('blocks analyzing while a pdf is being read and lets the person cancel', async () => {
    const { textArea, analyzeButton, bridge, user } = setup();
    fireEvent.change(textArea, { target: { value: 'Texto' } });
    await user.click(screen.getByRole('button', { name: 'Elegir un PDF…' }));
    expect(analyzeButton.disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Cancelar lectura' }));
    expect(bridge.cancelDocumentRead).toHaveBeenCalledOnce();
  });

  it('closing the dialog changes nothing, shows no message and returns the focus', async () => {
    const pdf = Promise.resolve<DocumentReadOutcome>({
      ok: false,
      error: { code: 'document_dismissed', characters: null },
    });
    const { textArea, user } = setup(undefined, pdf);
    fireEvent.change(textArea, { target: { value: 'Texto que ya estaba' } });
    await user.click(screen.getByRole('button', { name: 'Elegir un PDF…' }));
    expect((textArea as HTMLTextAreaElement).value).toBe('Texto que ya estaba');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Elegir un PDF…' }));
  });
});

describe('link source on the analyze screen (simulated preload bridge)', () => {
  it('fills the text from a link, shows only the domain and sends nothing', async () => {
    const link = Promise.resolve<DocumentReadOutcome>({
      ok: true,
      text: 'Términos de la página',
      source: { kind: 'link', name: 'example.com' },
      characters: 21,
    });
    const { textArea, bridge, user } = setup(undefined, undefined, link);
    await user.click(screen.getByRole('button', { name: 'Leer un enlace' }));
    await user.type(
      screen.getByLabelText('Dirección del enlace'),
      'https://example.com/terms?x=1{Enter}',
    );
    expect(bridge.readLink).toHaveBeenCalledWith('https://example.com/terms?x=1');
    expect((textArea as HTMLTextAreaElement).value).toBe('Términos de la página');
    expect(screen.getByText('Texto extraído de example.com · 21 caracteres')).toBeTruthy();
    expect(document.body.textContent).not.toContain('/terms');
    expect(bridge.analyze).not.toHaveBeenCalled();
  });

  it('keeps the text and returns the focus to the link field when the page cannot be read', async () => {
    const link = Promise.resolve<DocumentReadOutcome>({
      ok: false,
      error: { code: 'link_unreachable', characters: null },
    });
    const { textArea, user } = setup(undefined, undefined, link);
    fireEvent.change(textArea, { target: { value: 'Texto que ya estaba' } });
    await user.click(screen.getByRole('button', { name: 'Leer un enlace' }));
    await user.type(screen.getByLabelText('Dirección del enlace'), 'https://example.com{Enter}');
    expect((textArea as HTMLTextAreaElement).value).toBe('Texto que ya estaba');
    expect(screen.getByRole('alert').textContent).toContain('No pudimos conectar con esa página.');
    expect(screen.getByRole('alert').textContent).not.toContain('example.com');
    expect(document.activeElement).toBe(screen.getByLabelText('Dirección del enlace'));
  });
});
