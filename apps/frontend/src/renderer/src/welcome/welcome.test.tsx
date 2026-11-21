import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicSettings, SettingsUpdate } from '../../../common/settings-vocabulary.ts';
import { App } from '../app.tsx';
import '../i18n/i18n.ts';
import { DEFAULT_SETTINGS } from '../settings/appearance.ts';
import { initializeSettings, resetSettingsForTests } from '../settings/settings-store.ts';

afterEach(() => {
  cleanup();
  act(() => {
    resetSettingsForTests();
  });
});

function start(welcomeSeen: boolean) {
  const updateSettings = vi.fn(({ consent, ...rest }: SettingsUpdate) =>
    Promise.resolve<PublicSettings>({
      ...DEFAULT_SETTINGS,
      welcomeSeen,
      ...rest,
      consentGranted: consent === 'granted',
    }),
  );
  Object.defineProperty(window, 'risklex', {
    configurable: true,
    value: {
      analyze: vi.fn(),
      onProgress: vi.fn(() => () => undefined),
      cancel: vi.fn(),
      listHistory: () => Promise.resolve([]),
      clearHistory: () => Promise.resolve(),
      updateSettings,
    },
  });
  act(() => {
    initializeSettings({ ...DEFAULT_SETTINGS, welcomeSeen }, { updateSettings });
  });
  const { container } = render(<App />);
  const shell = container.querySelector('.app-shell');
  return { updateSettings, shell, user: userEvent.setup() };
}

describe('welcome screen (simulated preload bridge)', () => {
  it('opens on the first launch over an inert app, with the focus on its title', () => {
    const { shell } = start(false);
    const dialog = screen.getByRole('dialog', { name: 'Te damos la bienvenida a RiskLex' });
    expect(dialog.textContent).toContain('Leemos por ti los documentos largos');
    expect(dialog.textContent).toContain('Todo explicado en palabras simples');
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Te damos la bienvenida a RiskLex' }),
    );
    expect(shell?.hasAttribute('inert')).toBe(true);
  });

  it.each([
    ['Comenzar', 'click'],
    ['Saltar', 'click'],
    ['Escape', 'key'],
  ])('closes with %s, remembers it and returns the focus to the app', async (name, how) => {
    const { shell, updateSettings, user } = start(false);
    if (how === 'key') {
      await user.keyboard('{Escape}');
    } else {
      await user.click(screen.getByRole('button', { name }));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(shell?.hasAttribute('inert')).toBe(false);
    expect(updateSettings).toHaveBeenCalledWith({ welcomeSeen: true });
    expect(document.activeElement).toBe(document.querySelector('.app-main'));
  });

  it('does not open once it was seen', () => {
    const { shell } = start(true);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(shell?.hasAttribute('inert')).toBe(false);
  });
});
