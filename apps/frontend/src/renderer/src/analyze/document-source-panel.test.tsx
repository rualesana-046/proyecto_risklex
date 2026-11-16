import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DOCUMENT_READ_ERROR_CODES } from '../../../common/document-sources.ts';
import '../i18n/i18n.ts';
import { DocumentSourcePanel } from './document-source-panel.tsx';
import type { DocumentSourceState } from './use-document-source.ts';

afterEach(cleanup);

function renderPanel(state: DocumentSourceState, busy = false) {
  const onPickPdf = vi.fn();
  const onCancel = vi.fn();
  const onReadLink = vi.fn();
  render(
    <DocumentSourcePanel
      state={state}
      busy={busy}
      pdfButtonRef={null}
      linkInputRef={null}
      onPickPdf={onPickPdf}
      onReadLink={onReadLink}
      onCancel={onCancel}
    />,
  );
  return { onPickPdf, onCancel, onReadLink };
}

describe('DocumentSourcePanel', () => {
  it('offers the pdf button in a labelled group, reachable by keyboard', async () => {
    const { onPickPdf } = renderPanel({ status: 'idle' });
    expect(screen.getByRole('group', { name: 'Cómo añadir el documento' })).toBeTruthy();
    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Elegir un PDF…' }));
    await user.keyboard('{Enter}');
    expect(onPickPdf).toHaveBeenCalledOnce();
  });

  it('disables the pdf button while an analysis runs', () => {
    renderPanel({ status: 'idle' }, true);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Elegir un PDF…' }).disabled).toBe(
      true,
    );
  });

  it('shows the reading state with a cancel button', async () => {
    const { onCancel } = renderPanel({ status: 'reading', kind: 'pdf' });
    expect(screen.getByRole('status').textContent).toBe('Leyendo el PDF…');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancelar lectura' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows only the file name and the character count', () => {
    renderPanel({
      status: 'loaded',
      source: { kind: 'pdf', name: 'contrato.pdf' },
      characters: 12345,
    });
    expect(screen.getByRole('status').textContent).toBe(
      'Texto extraído de contrato.pdf · 12.345 caracteres',
    );
  });

  it.each(
    DOCUMENT_READ_ERROR_CODES.filter(
      (code) => code !== 'document_cancelled' && code !== 'document_dismissed',
    ),
  )('explains %s with a next step', (code) => {
    renderPanel({ status: 'failed', kind: 'pdf', error: { code, characters: 210000 } });
    const [message, next] = screen.getByRole('alert').querySelectorAll('p');
    expect(message?.textContent.trim()).not.toBe('');
    expect(next?.textContent.trim()).not.toBe('');
    expect(screen.getByRole('alert').textContent).not.toMatch(/documentErrors\.|\{\{/u);
  });

  it('gives the real numbers for a document that is too long', () => {
    renderPanel({
      status: 'failed',
      kind: 'pdf',
      error: { code: 'document_too_long', characters: 210000 },
    });
    expect(screen.getByRole('alert').textContent).toContain(
      'El documento tiene 210.000 caracteres y el límite es 150.000.',
    );
  });

  it('reports a cancelled read calmly', () => {
    renderPanel({
      status: 'failed',
      kind: 'pdf',
      error: { code: 'document_cancelled', characters: null },
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Cancelaste la lectura');
  });

  it('opens the link form from its toggle and closes it with Escape, returning the focus', async () => {
    const { onReadLink } = renderPanel({ status: 'idle' });
    const user = userEvent.setup();
    const toggle = screen.getByRole('button', { name: 'Leer un enlace' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await user.type(screen.getByLabelText('Dirección del enlace'), 'https://example.com{Enter}');
    expect(onReadLink).toHaveBeenCalledWith('https://example.com');
    await user.keyboard('{Escape}');
    expect(screen.queryByLabelText('Dirección del enlace')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it('shows that a page is being downloaded', () => {
    renderPanel({ status: 'reading', kind: 'link' });
    expect(screen.getByRole('status').textContent).toBe('Descargando la página…');
  });

  it('shows only the domain of a read link', () => {
    renderPanel({
      status: 'loaded',
      source: { kind: 'link', name: 'example.com' },
      characters: 900,
    });
    expect(screen.getByRole('status').textContent).toBe(
      'Texto extraído de example.com · 900 caracteres',
    );
  });
});
