import type { Clause } from '@risklex/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { VerifiedClauseResult } from '../../../common/analysis-vocabulary.ts';
import '../i18n/i18n.ts';
import { ClauseCard } from './clause-card.tsx';

afterEach(cleanup);

const CLAUSE: Clause = {
  id: 'clause-1',
  category: 'privacy',
  title: 'Comparten tu correo',
  quote: 'con socios comerciales y anunciantes',
  evidenceStatus: 'supported',
  isAmbiguous: false,
  ambiguityReason: '',
  confidence: 'high',
  entities: [],
  profiles: {
    free_user: { severity: 'high_risk', meaning: 'Venden tu correo.', consequence: 'Más spam.' },
    subscriber: { severity: 'warning', meaning: 'Lo comparten.', consequence: 'Algo de spam.' },
    professional: { severity: 'neutral', meaning: 'Uso habitual.', consequence: 'Poco impacto.' },
  },
};

function item(
  overrides: Partial<Clause> = {},
  originalText = 'con Socios comerciales y anunciantes',
): VerifiedClauseResult {
  return { clause: { ...CLAUSE, ...overrides }, span: { start: 0, end: 36 }, originalText };
}

describe('ClauseCard', () => {
  it('shows the severity, meaning and consequence for the chosen profile', () => {
    const { rerender } = render(<ClauseCard item={item()} profile="free_user" />);
    expect(screen.getByRole('article', { name: 'Comparten tu correo' }).textContent).toContain(
      'Alto riesgo',
    );
    expect(screen.getByText('Venden tu correo.')).toBeTruthy();
    rerender(<ClauseCard item={item()} profile="professional" />);
    expect(screen.getByRole('article').textContent).toContain('Neutro');
    expect(screen.getByText('Uso habitual.')).toBeTruthy();
    expect(screen.getByText('Privacidad')).toBeTruthy();
  });

  it('quotes the verified text from the document, not the model quote', () => {
    render(<ClauseCard item={item()} profile="free_user" />);
    expect(screen.getByText('Texto original del contrato')).toBeTruthy();
    expect(document.querySelector('blockquote')?.textContent).toBe(
      'con Socios comerciales y anunciantes',
    );
  });

  it('renders untrusted text literally instead of as html', () => {
    const hostile = '<img src=x onerror="alert(1)"> <b>negrita</b>';
    render(<ClauseCard item={item({ title: hostile }, hostile)} profile="free_user" />);
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('b')).toBeNull();
    expect(document.querySelector('blockquote')?.textContent).toBe(hostile);
  });

  it('explains ambiguity and insufficient evidence', () => {
    const tricky = item({
      isAmbiguous: true,
      ambiguityReason: 'Dos lecturas posibles.',
      evidenceStatus: 'insufficient_evidence',
    });
    render(<ClauseCard item={tricky} profile="subscriber" />);
    expect(screen.getByText('Redacción ambigua')).toBeTruthy();
    expect(screen.getByRole('article').textContent).toContain('Dos lecturas posibles.');
    expect(screen.getByText('El texto no basta para sacar una conclusión firme.')).toBeTruthy();
  });

  it('keeps the badge gauge decorative so the severity is read once', () => {
    render(<ClauseCard item={item()} profile="free_user" />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
