import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n/i18n.ts';
import { LegalNotice } from './legal-notice.tsx';
import { Sidebar } from './sidebar.tsx';

afterEach(cleanup);

describe('Sidebar', () => {
  it('marks the current view and names the navigation', () => {
    render(<Sidebar view="analyze" hasResults={false} onNavigate={vi.fn()} />);
    expect(screen.getByRole('complementary', { name: 'Navegación principal' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Analizar' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      screen.getByRole('button', { name: 'Resultados' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('keeps results unavailable until there is an analysis', () => {
    render(<Sidebar view="analyze" hasResults={false} onNavigate={vi.fn()} />);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Resultados' }).disabled).toBe(
      true,
    );
  });

  it('navigates with the keyboard', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<Sidebar view="analyze" hasResults onNavigate={onNavigate} />);
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Resultados' }));
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith('results');
  });
});

describe('LegalNotice', () => {
  it('states that RiskLex is not legal advice', () => {
    render(<LegalNotice />);
    expect(screen.getByRole('note').textContent).toBe(
      'RiskLex es informativo y no reemplaza la asesoría de un abogado.',
    );
  });
});
