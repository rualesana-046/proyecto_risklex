import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../i18n/i18n.ts';
import { Glossary } from './glossary.tsx';

afterEach(cleanup);

describe('Glossary', () => {
  it('lists each term with its plain explanation', () => {
    render(
      <Glossary
        terms={[
          { term: 'Sublicencia', explanation: 'Permitir que otros usen tu contenido.' },
          { term: 'Arbitraje', explanation: 'Resolver un conflicto fuera de los tribunales.' },
        ]}
      />,
    );
    const section = screen.getByRole('region', { name: 'Palabras que conviene entender' });
    expect(
      within(section)
        .getAllByRole('term')
        .map((term) => term.textContent),
    ).toEqual(['Sublicencia', 'Arbitraje']);
    expect(within(section).getAllByRole('definition')[0]?.textContent).toBe(
      'Permitir que otros usen tu contenido.',
    );
  });

  it('shows nothing when the analysis has no terms', () => {
    const { container } = render(<Glossary terms={[]} />);
    expect(container.textContent).toBe('');
  });

  it('shows a hostile term as plain text', () => {
    const hostile = '<img src=x onerror="alert(1)">';
    const { container } = render(<Glossary terms={[{ term: hostile, explanation: hostile }]} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('term').textContent).toBe(hostile);
  });
});
