import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicSettings, SettingsUpdate } from '../../../common/settings-vocabulary.ts';
import '../i18n/i18n.ts';
import { DEFAULT_SETTINGS } from './appearance.ts';
import { SettingsScreen } from './settings-screen.tsx';
import { initializeSettings, resetSettingsForTests } from './settings-store.ts';

afterEach(() => {
  cleanup();
  act(() => {
    resetSettingsForTests();
  });
});

function renderScreen(update?: (change: SettingsUpdate) => Promise<PublicSettings>) {
  const updateSettings = vi.fn(
    update ??
      (({ consent, ...rest }: SettingsUpdate) =>
        Promise.resolve<PublicSettings>({
          ...DEFAULT_SETTINGS,
          ...rest,
          consentGranted: consent === 'granted',
        })),
  );
  act(() => {
    initializeSettings(DEFAULT_SETTINGS, { updateSettings });
  });
  render(<SettingsScreen />);
  return { updateSettings };
}

describe('SettingsScreen (simulated bridge)', () => {
  it('shows language, theme and text size as labelled groups with the current values', () => {
    renderScreen();
    expect(screen.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeTruthy();
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Español' }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Como el sistema' }).checked).toBe(
      true,
    );
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Normal' }).checked).toBe(true);
    expect(screen.getByRole('group', { name: 'Tamaño del texto' })).toBeTruthy();
    expect(screen.getByText('English').getAttribute('lang')).toBe('en');
  });

  it('switches to the dark theme with the keyboard and saves it', async () => {
    const user = userEvent.setup();
    const { updateSettings } = renderScreen();
    await user.click(screen.getByRole('radio', { name: 'Como el sistema' }));
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Oscuro' }).checked).toBe(true);
    expect(updateSettings).toHaveBeenLastCalledWith({ theme: 'dark' });
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('changes the interface language at once', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('radio', { name: 'English' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('en');
  });

  it('says so when a change cannot be saved', async () => {
    const user = userEvent.setup();
    renderScreen(() => Promise.reject(new Error('disk full')));
    await user.click(screen.getByRole('radio', { name: 'Muy grande' }));
    expect((await screen.findByRole('status')).textContent).toContain(
      'No pudimos guardar el cambio',
    );
    expect(document.documentElement.dataset['textSize']).toBe('larger');
  });
});
