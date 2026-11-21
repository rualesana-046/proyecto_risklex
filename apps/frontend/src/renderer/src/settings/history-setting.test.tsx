import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PublicSettings, SettingsUpdate } from '../../../common/settings-vocabulary.ts';
import '../i18n/i18n.ts';
import { DEFAULT_SETTINGS } from './appearance.ts';
import { SettingsScreen } from './settings-screen.tsx';
import { initializeSettings, resetSettingsForTests } from './settings-store.ts';

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

afterEach(() => {
  cleanup();
  act(() => {
    resetSettingsForTests();
  });
});

function renderScreen(clearHistory = vi.fn(() => Promise.resolve())) {
  const updateSettings = vi.fn(({ consent, ...rest }: SettingsUpdate) =>
    Promise.resolve<PublicSettings>({
      ...DEFAULT_SETTINGS,
      ...rest,
      consentGranted: consent === 'granted',
    }),
  );
  act(() => {
    initializeSettings(DEFAULT_SETTINGS, { updateSettings });
  });
  render(<SettingsScreen bridge={{ clearHistory }} onShowWelcome={() => undefined} />);
  return { updateSettings, clearHistory };
}

describe('history setting (simulated bridge)', () => {
  it('saves the history on this computer by default', () => {
    renderScreen();
    expect(
      screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'Guardar el historial en este equipo',
      }).checked,
    ).toBe(true);
    expect(screen.getByText(/nunca el documento completo/u)).toBeTruthy();
  });

  it('turns it off, saves the choice and offers to delete what is already saved', async () => {
    const user = userEvent.setup();
    const { updateSettings, clearHistory } = renderScreen();
    await user.click(screen.getByRole('checkbox', { name: 'Guardar el historial en este equipo' }));
    expect(updateSettings).toHaveBeenLastCalledWith({ historyEnabled: false });
    await user.click(screen.getByRole('button', { name: 'Borrar el historial guardado' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Borrar todo' }),
    );
    expect(clearHistory).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Historial borrado.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Borrar el historial guardado' })).toBeNull();
  });

  it('keeps the history when the deletion is cancelled and reports a failed deletion', async () => {
    const user = userEvent.setup();
    const { clearHistory } = renderScreen(vi.fn(() => Promise.reject(new Error('busy'))));
    await user.click(screen.getByRole('checkbox', { name: 'Guardar el historial en este equipo' }));
    await user.click(screen.getByRole('button', { name: 'Borrar el historial guardado' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(clearHistory).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Borrar el historial guardado' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Borrar todo' }),
    );
    expect(
      await screen.findByText('No pudimos borrar el historial. Inténtalo de nuevo.'),
    ).toBeTruthy();
  });
});
