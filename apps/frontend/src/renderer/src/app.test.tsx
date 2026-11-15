import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './app.tsx';
import './i18n/i18n.ts';

afterEach(cleanup);

describe('App', () => {
  it('renders the sidebar, the main area and the persistent legal notice', () => {
    render(<App />);
    expect(screen.getByRole('complementary', { name: 'Navegación principal' })).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Analizar' })).toBeTruthy();
    expect(screen.getByRole('note').textContent).toContain(
      'no reemplaza la asesoría de un abogado',
    );
  });
});
