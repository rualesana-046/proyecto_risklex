import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VerifiedAnalysis } from '../../common/analysis-vocabulary.ts';
import { AnalyzeScreen } from './analyze/analyze-screen.tsx';
import { AppShell } from './shell/app-shell.tsx';
import type { AppView } from './shell/sidebar.tsx';

export function App() {
  const { t } = useTranslation();
  const [view, setView] = useState<AppView>('analyze');
  const [analysis, setAnalysis] = useState<VerifiedAnalysis | null>(null);
  const showResults = (result: VerifiedAnalysis) => {
    setAnalysis(result);
    setView('results');
  };
  return (
    <AppShell view={view} hasResults={analysis !== null} onNavigate={setView}>
      <div hidden={view !== 'analyze'} className="app-view">
        <AnalyzeScreen bridge={window.risklex} onAnalysis={showResults} />
      </div>
      {view === 'results' ? <h1>{t('nav.results')}</h1> : null}
    </AppShell>
  );
}
