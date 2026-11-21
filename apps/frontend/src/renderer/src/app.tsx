import { useState } from 'react';
import type { VerifiedAnalysis } from '../../common/analysis-vocabulary.ts';
import type { HistoryEntryView, HistorySaveStatus } from '../../common/history-vocabulary.ts';
import { AnalyzeScreen } from './analyze/analyze-screen.tsx';
import { HistoryScreen } from './history/history-screen.tsx';
import type { ResultsOrigin } from './results/results-origin.tsx';
import { ResultsScreen } from './results/results-screen.tsx';
import { SettingsScreen } from './settings/settings-screen.tsx';
import { useSettings } from './settings/settings-store.ts';
import { AppShell } from './shell/app-shell.tsx';
import type { AppView } from './shell/sidebar.tsx';
import { useWelcome } from './welcome/use-welcome.ts';
import { WelcomeScreen } from './welcome/welcome-screen.tsx';

interface ShownAnalysis {
  readonly id: number;
  readonly analysis: VerifiedAnalysis;
  readonly origin: ResultsOrigin;
}

function useShownAnalysis(setView: (view: AppView) => void) {
  const [shown, setShown] = useState<ShownAnalysis | null>(null);
  const show = (analysis: VerifiedAnalysis, origin: ResultsOrigin) => {
    setShown((previous) => ({ id: (previous?.id ?? 0) + 1, analysis, origin }));
    setView('results');
  };
  const showNew = (analysis: VerifiedAnalysis, history: HistorySaveStatus) => {
    show(analysis, { kind: 'new', saveFailed: history === 'failed' });
  };
  const showSaved = (entry: HistoryEntryView) => {
    show(entry.analysis, { kind: 'history', savedAt: entry.summary.savedAt });
  };
  return { shown, showNew, showSaved };
}

export function App() {
  const [view, setView] = useState<AppView>('analyze');
  const { shown, showNew, showSaved } = useShownAnalysis(setView);
  const settings = useSettings();
  const welcome = useWelcome();
  return (
    <>
      <AppShell view={view} hasResults={shown !== null} onNavigate={setView} inert={welcome.open}>
        <div hidden={view !== 'analyze'} className="app-view">
          <AnalyzeScreen bridge={window.risklex} onAnalysis={showNew} />
        </div>
        {shown === null ? null : (
          <div hidden={view !== 'results'} className="app-view">
            <ResultsScreen key={shown.id} analysis={shown.analysis} origin={shown.origin} />
          </div>
        )}
        {view === 'history' ? (
          <div className="app-view">
            <HistoryScreen
              bridge={window.risklex}
              historyEnabled={settings.historyEnabled}
              onOpen={showSaved}
            />
          </div>
        ) : null}
        {view === 'settings' ? (
          <div className="app-view">
            <SettingsScreen bridge={window.risklex} onShowWelcome={welcome.show} />
          </div>
        ) : null}
      </AppShell>
      {welcome.open ? <WelcomeScreen onClose={welcome.close} /> : null}
    </>
  );
}
