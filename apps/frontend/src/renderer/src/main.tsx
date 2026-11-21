import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-500.css';
import '@fontsource/atkinson-hyperlegible-next/latin-700.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { App } from './app.tsx';
import { initializeConsent } from './consent/use-consent.ts';
import {
  applyAppearance,
  DEFAULT_SETTINGS,
  systemPrefersDark,
  watchSystemTheme,
} from './settings/appearance.ts';
import { i18n } from './i18n/i18n.ts';

function start(container: HTMLElement): void {
  const settings = window.risklex.initialSettings ?? DEFAULT_SETTINGS;
  const root = document.documentElement;
  applyAppearance(root, settings, systemPrefersDark());
  watchSystemTheme((prefersDark) => {
    applyAppearance(root, settings, prefersDark);
  });
  void i18n.changeLanguage(settings.language);
  initializeConsent(settings.consentGranted, () =>
    window.risklex.updateSettings({ consent: 'granted' }),
  );
  createRoot(container).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </StrictMode>,
  );
}

const container = document.getElementById('root');
if (container === null) {
  throw new Error('The root element is missing');
}
start(container);
