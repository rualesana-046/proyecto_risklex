import { useSyncExternalStore } from 'react';
import type { PublicSettings, SettingsUpdate } from '../../../common/settings-vocabulary.ts';
import { i18n } from '../i18n/i18n.ts';
import {
  applyAppearance,
  DEFAULT_SETTINGS,
  systemPrefersDark,
  watchSystemTheme,
} from './appearance.ts';

export interface SettingsBridge {
  updateSettings(change: SettingsUpdate): Promise<PublicSettings>;
}

type AppearanceChange = Omit<SettingsUpdate, 'consent'>;

let current: PublicSettings = DEFAULT_SETTINGS;
let bridge: SettingsBridge | null = null;
let prefersDark = false;
let stopWatching: () => void = () => undefined;
const listeners = new Set<() => void>();

function publish(next: PublicSettings): void {
  current = next;
  applyAppearance(document.documentElement, current, prefersDark);
  if (i18n.language !== current.language) {
    void i18n.changeLanguage(current.language);
  }
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function initializeSettings(initial: PublicSettings, settingsBridge: SettingsBridge): void {
  bridge = settingsBridge;
  prefersDark = systemPrefersDark();
  stopWatching();
  stopWatching = watchSystemTheme((dark) => {
    prefersDark = dark;
    publish(current);
  });
  publish(initial);
}

export async function changeSettings(change: AppearanceChange): Promise<boolean> {
  publish({ ...current, ...change });
  if (bridge === null) {
    return false;
  }
  try {
    publish(await bridge.updateSettings(change));
    return true;
  } catch {
    return false;
  }
}

export function resetSettingsForTests(): void {
  stopWatching();
  stopWatching = () => undefined;
  bridge = null;
  prefersDark = false;
  publish(DEFAULT_SETTINGS);
}

export function useSettings(): PublicSettings {
  return useSyncExternalStore(subscribe, () => current);
}
