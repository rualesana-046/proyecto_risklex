import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { HistoryEntryView, HistorySummary } from '../../../common/history-vocabulary.ts';
import '../i18n/i18n.ts';
import { HistoryScreen } from './history-screen.tsx';
import type { HistoryBridge } from './use-history.ts';

const HOSTILE = '<img src=x onerror="alert(1)"><script>alert(2)</script>';

function summary(id: string, overrides: Partial<HistorySummary> = {}): HistorySummary {
  return {
    id,
    savedAt: '2026-11-21T10:00:00.000Z',
    source: { kind: 'pdf', name: 'contrato.pdf' },
    characters: 2221,
    language: 'es',
    counts: { high_risk: 2, warning: 5, neutral: 3 },
    ...overrides,
  };
}

const ENTRIES = [
  summary('6f1c1e9e-3b0a-4c47-9d61-000000000001'),
  summary('6f1c1e9e-3b0a-4c47-9d61-000000000002', {
    source: { kind: 'link', name: 'ejemplo.com' },
    language: 'en',
  }),
  summary('6f1c1e9e-3b0a-4c47-9d61-000000000003', { source: { kind: 'pasted', name: null } }),
];

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

afterEach(cleanup);

function bridge(entries: HistorySummary[] = ENTRIES) {
  let current = entries;
  const fake = {
    listHistory: vi.fn(() => Promise.resolve(current)),
    getHistory: vi.fn<HistoryBridge['getHistory']>(() => Promise.resolve(null)),
    deleteHistory: vi.fn((id: string) => {
      current = current.filter((entry) => entry.id !== id);
      return Promise.resolve();
    }),
    clearHistory: vi.fn(() => {
      current = [];
      return Promise.resolve();
    }),
  };
  return fake;
}

function renderScreen(fake = bridge(), enabled = true) {
  const onOpen = vi.fn<(entry: HistoryEntryView) => void>();
  render(<HistoryScreen bridge={fake} historyEnabled={enabled} onOpen={onOpen} />);
  return { fake, onOpen };
}

describe('HistoryScreen (simulated bridge)', () => {
  it('lists each entry with its source, language and counts by level', async () => {
    renderScreen();
    const items = await screen.findAllByRole('heading', { level: 2 });
    expect(items.map((item) => item.textContent)).toEqual([
      'PDF: contrato.pdf',
      'Enlace: ejemplo.com',
      'Texto pegado',
    ]);
    const first = screen
      .getAllByRole('listitem')
      .find((item) => item.textContent.includes('contrato.pdf'));
    expect(first?.textContent).toContain('Español');
    expect(first?.textContent).toContain('Alto riesgo: 2');
    expect(screen.getByText(/Cada uno se queda en el idioma en que se analizó/u)).toBeTruthy();
  });

  it('shows plain text for a hostile source name and never creates elements from it', async () => {
    renderScreen(
      bridge([
        summary('6f1c1e9e-3b0a-4c47-9d61-000000000009', { source: { kind: 'pdf', name: HOSTILE } }),
      ]),
    );
    const heading = await screen.findByRole('heading', { level: 2 });
    expect(heading.textContent).toBe(`PDF: ${HOSTILE}`);
    expect(document.querySelector('img, script')).toBeNull();
  });

  it('says when there is nothing saved and when the history is turned off', async () => {
    renderScreen(bridge([]), false);
    expect(await screen.findByText('Todavía no hay análisis guardados.')).toBeTruthy();
    expect(screen.getByText(/El historial está desactivado en Ajustes/u)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Borrar todo el historial' })).toBeNull();
  });

  it('opens an entry and reports one that no longer exists', async () => {
    const user = userEvent.setup();
    const fake = bridge();
    const view: HistoryEntryView = {
      summary: ENTRIES[0] ?? summary('x'),
      analysis: {
        clauses: [],
        glossary: [],
        meta: {
          promptVersion: 'p',
          model: 'm',
          language: 'es',
          moreClausesLikely: false,
          usage: { inputTokens: 1, outputTokens: 1 },
        },
        reliability: 'normal',
        totalClauses: 0,
        discardedClauses: 0,
        attempts: 1,
      },
    };
    fake.getHistory.mockResolvedValueOnce(view).mockResolvedValueOnce(null);
    const { onOpen } = renderScreen(fake);
    await user.click(
      await screen.findByRole('button', { name: 'Abrir el análisis de PDF: contrato.pdf' }),
    );
    expect(onOpen).toHaveBeenCalledWith(view);
    await user.click(
      screen.getByRole('button', { name: 'Abrir el análisis de Enlace: ejemplo.com' }),
    );
    expect(await screen.findByText(/No pudimos abrir ese análisis/u)).toBeTruthy();
  });

  it('deletes one entry and announces it', async () => {
    const user = userEvent.setup();
    const { fake } = renderScreen();
    await user.click(
      await screen.findByRole('button', { name: 'Borrar el análisis de Texto pegado' }),
    );
    expect(fake.deleteHistory).toHaveBeenCalledWith('6f1c1e9e-3b0a-4c47-9d61-000000000003');
    expect(await screen.findByText('Análisis borrado.')).toBeTruthy();
    expect(screen.queryByText('Texto pegado')).toBeNull();
  });

  it('clears everything only after the confirmation', async () => {
    const user = userEvent.setup();
    const { fake } = renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Borrar todo el historial' }));
    const dialog = screen.getByRole('dialog', { name: '¿Borrar todo el historial?' });
    expect(dialog.textContent).toContain('copias apartadas por estar dañadas');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(fake.clearHistory).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Borrar todo el historial' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Borrar todo' }),
    );
    expect(fake.clearHistory).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Historial borrado.')).toBeTruthy();
  });

  it('explains when the history cannot be read', async () => {
    const fake = bridge();
    fake.listHistory.mockRejectedValue(new Error('broken'));
    renderScreen(fake);
    expect(await screen.findByText('No pudimos leer el historial de este equipo.')).toBeTruthy();
  });
});
