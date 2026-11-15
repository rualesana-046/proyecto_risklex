import { useTranslation } from 'react-i18next';

export type AppView = 'analyze' | 'results';

interface SidebarProps {
  readonly view: AppView;
  readonly hasResults: boolean;
  readonly onNavigate: (view: AppView) => void;
}

function BrandMark() {
  return (
    <svg className="sidebar-brand-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" />
    </svg>
  );
}

export function Sidebar({ view, hasResults, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const items: readonly { view: AppView; label: string; disabled: boolean }[] = [
    { view: 'analyze', label: t('nav.analyze'), disabled: false },
    { view: 'results', label: t('nav.results'), disabled: !hasResults },
  ];
  return (
    <aside className="sidebar" aria-label={t('nav.label')}>
      <p className="sidebar-brand">
        <BrandMark />
        {t('app.name')}
      </p>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.view}
            type="button"
            aria-current={item.view === view ? 'page' : undefined}
            disabled={item.disabled}
            onClick={() => {
              onNavigate(item.view);
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
