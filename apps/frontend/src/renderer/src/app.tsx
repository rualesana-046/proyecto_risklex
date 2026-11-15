import { useState } from 'react';
import type { VerifiedAnalysis } from '../../common/analysis-vocabulary.ts';
import { AnalyzeScreen } from './analyze/analyze-screen.tsx';
import { ResultsScreen } from './results/results-screen.tsx';
import { AppShell } from './shell/app-shell.tsx';
import type { AppView } from './shell/sidebar.tsx';

interface ShownAnalysis {
  readonly id: number;
  readonly analysis: VerifiedAnalysis;
}

export function App() {
  const [view, setView] = useState<AppView>('analyze');
  const [shown, setShown] = useState<ShownAnalysis | null>(null);
  const showResults = (analysis: VerifiedAnalysis) => {
    setShown((previous) => ({ id: (previous?.id ?? 0) + 1, analysis }));
    setView('results');
  };
  return (
    <AppShell view={view} hasResults={shown !== null} onNavigate={setView}>
      <div hidden={view !== 'analyze'} className="app-view">
        <AnalyzeScreen bridge={window.risklex} onAnalysis={showResults} />
      </div>
      {shown === null ? null : (
        <div hidden={view !== 'results'} className="app-view">
          <ResultsScreen key={shown.id} analysis={shown.analysis} />
        </div>
      )}
    </AppShell>
  );
}
