import { storedSettingsSchema, type StoredSettings } from '../../common/settings-schemas.ts';
import {
  CONSENT_VERSION,
  SETTINGS_VERSION,
  type PublicSettings,
  type SettingsUpdate,
} from '../../common/settings-vocabulary.ts';
import { createJsonFileStore, type StoreFileSystem } from '../storage/json-file-store.ts';

export const SETTINGS_FILE = 'settings.json';

export interface SettingsServiceOptions {
  readonly path: string;
  readonly newInstallId: () => string;
  readonly now: () => Date;
  readonly fileSystem?: StoreFileSystem;
}

export interface SettingsService {
  readonly installId: string;
  readonly recovered: boolean;
  current(): PublicSettings;
  update(change: SettingsUpdate): Promise<PublicSettings>;
}

export function defaultSettings(installId: string): StoredSettings {
  return {
    version: SETTINGS_VERSION,
    installId,
    language: 'es',
    theme: 'system',
    textSize: 'normal',
    welcomeSeen: false,
    historyEnabled: true,
    consent: null,
  };
}

function toPublic(settings: StoredSettings): PublicSettings {
  return {
    language: settings.language,
    theme: settings.theme,
    textSize: settings.textSize,
    welcomeSeen: settings.welcomeSeen,
    historyEnabled: settings.historyEnabled,
    consentGranted: settings.consent?.version === CONSENT_VERSION,
  };
}

function applyChange(settings: StoredSettings, change: SettingsUpdate, now: Date): StoredSettings {
  const { consent, ...rest } = change;
  const next: StoredSettings = { ...settings, ...rest };
  if (consent === 'granted') {
    return { ...next, consent: { version: CONSENT_VERSION, acceptedAt: now.toISOString() } };
  }
  return consent === 'revoked' ? { ...next, consent: null } : next;
}

export async function loadSettingsService(
  options: SettingsServiceOptions,
): Promise<SettingsService> {
  const store = createJsonFileStore({
    path: options.path,
    schema: storedSettingsSchema,
    defaults: () => defaultSettings(options.newInstallId()),
    fileSystem: options.fileSystem,
  });
  const loaded = await store.load();
  let settings = loaded.value;
  await store.save(settings).catch(() => undefined);
  return {
    installId: settings.installId,
    recovered: loaded.recovered,
    current: () => toPublic(settings),
    update: async (change) => {
      const next = applyChange(settings, change, options.now());
      await store.save(next);
      settings = next;
      return toPublic(settings);
    },
  };
}
