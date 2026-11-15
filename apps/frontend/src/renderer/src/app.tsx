import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell } from './shell/app-shell.tsx';
import type { AppView } from './shell/sidebar.tsx';

export function App() {
  const { t } = useTranslation();
  const [view, setView] = useState<AppView>('analyze');
  return (
    <AppShell view={view} hasResults={false} onNavigate={setView}>
      <h1>{view === 'analyze' ? t('nav.analyze') : t('nav.results')}</h1>
    </AppShell>
  );
}
