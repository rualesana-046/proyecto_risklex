import type { AnalysisLanguage } from '@risklex/shared';

export const CONSENT_VERSION = 1;
export const SETTINGS_VERSION = 1;

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const TEXT_SIZES = ['normal', 'large', 'larger'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export interface PublicSettings {
  readonly language: AnalysisLanguage;
  readonly theme: Theme;
  readonly textSize: TextSize;
  readonly welcomeSeen: boolean;
  readonly historyEnabled: boolean;
  readonly consentGranted: boolean;
}

export interface SettingsUpdate {
  readonly language?: AnalysisLanguage;
  readonly theme?: Theme;
  readonly textSize?: TextSize;
  readonly welcomeSeen?: boolean;
  readonly historyEnabled?: boolean;
  readonly consent?: 'granted' | 'revoked';
}
