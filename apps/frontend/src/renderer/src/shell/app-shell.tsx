import type { ReactNode } from 'react';
import { LegalNotice } from './legal-notice.tsx';
import { Sidebar, type AppView } from './sidebar.tsx';
import './shell.css';

interface AppShellProps {
  readonly view: AppView;
  readonly hasResults: boolean;
  readonly onNavigate: (view: AppView) => void;
  readonly inert?: boolean;
  readonly children: ReactNode;
}

export function AppShell({ view, hasResults, onNavigate, inert, children }: AppShellProps) {
  return (
    <div className="app-shell" inert={inert}>
      <Sidebar view={view} hasResults={hasResults} onNavigate={onNavigate} />
      <div className="app-content">
        <main className="app-main" tabIndex={-1}>
          {children}
        </main>
        <LegalNotice />
      </div>
    </div>
  );
}
