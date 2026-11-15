import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app.tsx';
import './i18n/i18n.ts';

const analyze = vi.fn();

beforeEach(() => {
  analyze.mockReset();
  Object.defineProperty(window, 'risklex', {
    configurable: true,
    value: { analyze, onProgress: vi.fn(() => () => undefined), cancel: vi.fn() },
  });
});

afterEach(cleanup);

describe('App (simulated preload bridge)', () => {
  it('opens on the analyze screen with the sidebar and the persistent legal notice', () => {
    render(<App />);
    expect(screen.getByRole('complementary', { name: 'Navegación principal' })).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: '¿Qué vas a aceptar hoy?' })).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Resultados' }).disabled).toBe(
      true,
    );
    expect(screen.getByRole('note').textContent).toContain(
      'no reemplaza la asesoría de un abogado',
    );
  });

  it('never calls the backend just by opening', () => {
    render(<App />);
    expect(analyze).not.toHaveBeenCalled();
  });
});
