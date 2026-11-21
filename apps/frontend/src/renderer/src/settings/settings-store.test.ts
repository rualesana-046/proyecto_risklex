import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicSettings, SettingsUpdate } from '../../../common/settings-vocabulary.ts';
import { i18n } from '../i18n/i18n.ts';
import { DEFAULT_SETTINGS } from './appearance.ts';
import {
  changeSettings,
  initializeSettings,
  resetSettingsForTests,
  useSettings,
} from './settings-store.ts';

const root = document.documentElement;

function savingBridge() {
  return {
    updateSettings: vi.fn(({ consent, ...rest }: SettingsUpdate) =>
      Promise.resolve<PublicSettings>({
        ...DEFAULT_SETTINGS,
        ...rest,
        consentGranted: consent === 'granted',
      }),
    ),
  };
}

afterEach(() => {
  resetSettingsForTests();
  vi.unstubAllGlobals();
});

describe('settings store (simulated bridge)', () => {
  it('applies the initial theme, text size and language', () => {
    initializeSettings(
      { ...DEFAULT_SETTINGS, theme: 'dark', textSize: 'large', language: 'en' },
      savingBridge(),
    );
    expect(root.dataset['theme']).toBe('dark');
    expect(root.dataset['textSize']).toBe('large');
    expect(root.lang).toBe('en');
    expect(i18n.language).toBe('en');
  });

  it('applies a change at once and saves it', async () => {
    const bridge = savingBridge();
    initializeSettings(DEFAULT_SETTINGS, bridge);
    const { result } = renderHook(() => useSettings());
    let saved = false;
    await act(async () => {
      saved = await changeSettings({ textSize: 'larger' });
    });
    expect(saved).toBe(true);
    expect(bridge.updateSettings).toHaveBeenCalledWith({ textSize: 'larger' });
    expect(result.current.textSize).toBe('larger');
    expect(root.dataset['textSize']).toBe('larger');
  });

  it('keeps the change for this run and reports when it cannot be saved', async () => {
    initializeSettings(DEFAULT_SETTINGS, {
      updateSettings: () => Promise.reject(new Error('disk full')),
    });
    let saved = true;
    await act(async () => {
      saved = await changeSettings({ theme: 'dark' });
    });
    expect(saved).toBe(false);
    expect(root.dataset['theme']).toBe('dark');
  });

  it('follows the system theme only while the theme is "system"', async () => {
    const listeners: ((event: { matches: boolean }) => void)[] = [];
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
        listeners.push(listener);
      },
      removeEventListener: () => undefined,
    }));
    initializeSettings(DEFAULT_SETTINGS, savingBridge());
    expect(root.dataset['theme']).toBe('light');
    act(() => {
      listeners.forEach((listener) => {
        listener({ matches: true });
      });
    });
    expect(root.dataset['theme']).toBe('dark');
    await act(async () => {
      await changeSettings({ theme: 'light' });
    });
    expect(root.dataset['theme']).toBe('light');
  });
});
