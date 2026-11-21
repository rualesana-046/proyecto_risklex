import { ANALYSIS_LANGUAGES } from '@risklex/shared';
import { describe, expect, it } from 'vitest';
import {
  decodeInitialSettings,
  encodeInitialSettings,
  INITIAL_SETTINGS_PREFIX,
} from './initial-settings.ts';
import { INTERFACE_LANGUAGES, type PublicSettings } from './settings-vocabulary.ts';

const SETTINGS: PublicSettings = {
  language: 'en',
  theme: 'dark',
  textSize: 'larger',
  welcomeSeen: true,
  historyEnabled: false,
  consentGranted: true,
};

function argument(value: unknown): string {
  return `${INITIAL_SETTINGS_PREFIX}${encodeURIComponent(JSON.stringify(value))}`;
}

describe('initial settings argument', () => {
  it('accepts the same languages as the analysis contract', () => {
    expect(INTERFACE_LANGUAGES).toEqual(ANALYSIS_LANGUAGES);
  });

  it('round-trips the public settings through a command line argument', () => {
    const encoded = encodeInitialSettings(SETTINGS);
    expect(encoded).not.toMatch(/[\s"']/u);
    expect(decodeInitialSettings(['electron', '--flag', encoded])).toEqual(SETTINGS);
  });

  it('returns null when the argument is missing', () => {
    expect(decodeInitialSettings(['electron', '--flag'])).toBeNull();
  });

  it.each([
    ['broken encoding', `${INITIAL_SETTINGS_PREFIX}%E0%A4%A`],
    ['broken json', `${INITIAL_SETTINGS_PREFIX}${encodeURIComponent('{"theme":')}`],
    ['an unknown theme', argument({ ...SETTINGS, theme: 'neon' })],
    ['an unknown language', argument({ ...SETTINGS, language: 'fr' })],
    ['an unknown text size', argument({ ...SETTINGS, textSize: 'huge' })],
    ['a missing flag', argument({ ...SETTINGS, consentGranted: undefined })],
    ['an extra key', argument({ ...SETTINGS, installId: 'x' })],
    ['a list', argument([SETTINGS])],
  ])('rejects %s', (_label, value) => {
    expect(decodeInitialSettings([value])).toBeNull();
  });
});
