import type { Clause, Severity } from '@risklex/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { VerifiedClauseResult } from '../../../common/analysis-vocabulary.ts';
import '../i18n/i18n.ts';
import { Essentials } from './essentials.tsx';

afterEach(cleanup);

function item(
  id: string,
  start: number,
  free: Severity,
  professional: Severity,
): VerifiedClauseResult {
  const clause: Clause = {
    id,
    category: 'privacy',
    title: `Título ${id}`,
    quote: 'una cita literal del contrato sintetico',
    evidenceStatus: 'supported',
    isAmbiguous: false,
    ambiguityReason: '',
    confidence: 'high',
    entities: [],
    profiles: {
      free_user: { severity: free, meaning: `Para ti ${id}`, consequence: 'c' },
      subscriber: { severity: free, meaning: `Para ti ${id}`, consequence: 'c' },
      professional: { severity: professional, meaning: `Trabajo ${id}`, consequence: 'c' },
    },
  };
  return { clause, span: { start, end: start + 5 }, originalText: 'texto' };
}

const CLAUSES = [
  item('a', 10, 'warning', 'neutral'),
  item('b', 20, 'high_risk', 'neutral'),
  item('c', 30, 'neutral', 'neutral'),
  item('d', 40, 'warning', 'neutral'),
  item('e', 50, 'high_risk', 'neutral'),
];

describe('Essentials', () => {
  it('lists up to three non neutral clauses for the profile, most severe first', () => {
    render(<Essentials clauses={CLAUSES} profile="free_user" />);
    const items = [...document.querySelectorAll('.essentials-list > li')];
    expect(items.map((entry) => entry.querySelector('strong')?.textContent)).toEqual([
      'Título b',
      'Título e',
      'Título a',
    ]);
  });

  it('counts every severity for the chosen profile', () => {
    render(<Essentials clauses={CLAUSES} profile="free_user" />);
    const counters = screen.getByRole('list', { name: 'Resumen por gravedad' });
    expect(counters.textContent).toBe('Alto riesgo2Advertencia2Neutro1');
  });

  it('says so when nothing needs special attention for the profile', () => {
    render(<Essentials clauses={CLAUSES} profile="professional" />);
    expect(
      screen.getByText('No encontramos nada que requiera atención especial para este perfil.'),
    ).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Resumen por gravedad' }).textContent).toContain(
      'Neutro5',
    );
  });
});
