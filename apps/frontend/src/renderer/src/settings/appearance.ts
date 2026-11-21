import type { PublicSettings, Theme } from '../../../common/settings-vocabulary.ts';

export type ResolvedTheme = 'light' | 'dark';
export type Appearance = Pick<PublicSettings, 'theme' | 'textSize' | 'language'>;

const DARK_QUERY = '(prefers-color-scheme: dark)';

export const DEFAULT_SETTINGS: PublicSettings = {
  language: 'es',
  theme: 'system',
  textSize: 'normal',
  welcomeSeen: false,
  historyEnabled: true,
  consentGranted: false,
};

export function resolveTheme(theme: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return theme;
}

export function systemPrefersDark(view: Pick<Window, 'matchMedia'> = window): boolean {
  return typeof view.matchMedia === 'function' && view.matchMedia(DARK_QUERY).matches;
}

export function applyAppearance(
  root: HTMLElement,
  appearance: Appearance,
  prefersDark: boolean,
): void {
  root.dataset['theme'] = resolveTheme(appearance.theme, prefersDark);
  root.dataset['textSize'] = appearance.textSize;
  root.lang = appearance.language;
}

export function watchSystemTheme(
  onChange: (prefersDark: boolean) => void,
  view: Pick<Window, 'matchMedia'> = window,
): () => void {
  if (typeof view.matchMedia !== 'function') {
    return () => undefined;
  }
  const query = view.matchMedia(DARK_QUERY);
  const listener = (event: MediaQueryListEvent) => {
    onChange(event.matches);
  };
  query.addEventListener('change', listener);
  return () => {
    query.removeEventListener('change', listener);
  };
}
