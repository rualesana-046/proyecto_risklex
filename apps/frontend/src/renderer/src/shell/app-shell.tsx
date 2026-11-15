import type { ReactNode } from 'react';
import { LegalNotice } from './legal-notice.tsx';
import { Sidebar, type AppView } from './sidebar.tsx';
import './shell.css';

interface AppShellProps {
  readonly view: AppView;
  readonly hasResults: boolean;
  readonly onNavigate: (view: AppView) => void;
  readonly children: ReactNode;
}

export function AppShell({ view, hasResults, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar view={view} hasResults={hasResults} onNavigate={onNavigate} />
      <div className="app-content">
        <main className="app-main">{children}</main>
        <LegalNotice />
      </div>
    </div>
  );
}
