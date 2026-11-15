import { StrictMode, useEffect, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const THEMES = {
  light: { background: '#F6EFE5', text: '#26332D' },
  dark: { background: '#10232A', text: '#F1EAE3' },
} as const;

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

function prefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

function App() {
  const theme = useSyncExternalStore(subscribe, prefersDark) ? THEMES.dark : THEMES.light;
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.background = theme.background;
    document.body.style.color = theme.text;
    document.body.style.fontFamily = 'system-ui, sans-serif';
  }, [theme]);
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <h1>RiskLex</h1>
    </main>
  );
}

const container = document.getElementById('root');
if (container === null) {
  throw new Error('The root element is missing');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
