import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-500.css';
import '@fontsource/atkinson-hyperlegible-next/latin-700.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { i18n } from './i18n/i18n.ts';

function App() {
  const { t } = useTranslation();
  return (
    <main style={{ minHeight: '100%', display: 'grid', placeItems: 'center' }}>
      <h1>{t('app.name')}</h1>
    </main>
  );
}

const container = document.getElementById('root');
if (container === null) {
  throw new Error('The root element is missing');
}

createRoot(container).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>,
);
