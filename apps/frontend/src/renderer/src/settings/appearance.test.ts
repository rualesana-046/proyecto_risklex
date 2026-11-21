import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyAppearance,
  resolveTheme,
  systemPrefersDark,
  watchSystemTheme,
} from './appearance.ts';

function fakeView(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const query = {
    matches,
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    }),
  };
  const view = { matchMedia: vi.fn(() => query as unknown as MediaQueryList) };
  const emit = (value: boolean) => {
    for (const listener of listeners) {
      listener({ matches: value } as MediaQueryListEvent);
    }
  };
  return { view, emit, listeners };
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-text-size');
  document.documentElement.lang = 'es';
});

describe('appearance', () => {
  it.each([
    ['system', false, 'light'],
    ['system', true, 'dark'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
  ] as const)('resolves the %s theme (system dark: %s) to %s', (theme, dark, expected) => {
    expect(resolveTheme(theme, dark)).toBe(expected);
  });

  it('writes the theme, text size and language on the root element', () => {
    const root = document.documentElement;
    applyAppearance(root, { theme: 'system', textSize: 'larger', language: 'en' }, true);
    expect(root.dataset['theme']).toBe('dark');
    expect(root.dataset['textSize']).toBe('larger');
    expect(root.lang).toBe('en');
  });

  it('reads the system preference and treats a missing matchMedia as light', () => {
    expect(systemPrefersDark(fakeView(true).view)).toBe(true);
    expect(systemPrefersDark({} as Pick<Window, 'matchMedia'>)).toBe(false);
  });

  it('follows system theme changes until it is stopped', () => {
    const { view, emit, listeners } = fakeView(false);
    const onChange = vi.fn();
    const stop = watchSystemTheme(onChange, view);
    emit(true);
    expect(onChange).toHaveBeenCalledWith(true);
    stop();
    expect(listeners.size).toBe(0);
  });
});
