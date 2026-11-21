import {
  INTERFACE_LANGUAGES,
  TEXT_SIZES,
  THEMES,
  type PublicSettings,
} from './settings-vocabulary.ts';

export const INITIAL_SETTINGS_PREFIX = '--risklex-initial-settings=';

const BOOLEAN_KEYS = ['welcomeSeen', 'historyEnabled', 'consentGranted'] as const;

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

function toSettings(value: unknown): PublicSettings | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const known = ['language', 'theme', 'textSize', ...BOOLEAN_KEYS];
  if (Object.keys(record).some((key) => !known.includes(key))) {
    return null;
  }
  const { language, theme, textSize } = record;
  if (
    !isOneOf(INTERFACE_LANGUAGES, language) ||
    !isOneOf(THEMES, theme) ||
    !isOneOf(TEXT_SIZES, textSize) ||
    BOOLEAN_KEYS.some((key) => typeof record[key] !== 'boolean')
  ) {
    return null;
  }
  return {
    language,
    theme,
    textSize,
    welcomeSeen: record['welcomeSeen'] === true,
    historyEnabled: record['historyEnabled'] === true,
    consentGranted: record['consentGranted'] === true,
  };
}

export function encodeInitialSettings(settings: PublicSettings): string {
  return `${INITIAL_SETTINGS_PREFIX}${encodeURIComponent(JSON.stringify(settings))}`;
}

export function decodeInitialSettings(argv: readonly string[]): PublicSettings | null {
  const argument = argv.find((value) => value.startsWith(INITIAL_SETTINGS_PREFIX));
  if (argument === undefined) {
    return null;
  }
  try {
    return toSettings(
      JSON.parse(decodeURIComponent(argument.slice(INITIAL_SETTINGS_PREFIX.length))),
    );
  } catch {
    return null;
  }
}
