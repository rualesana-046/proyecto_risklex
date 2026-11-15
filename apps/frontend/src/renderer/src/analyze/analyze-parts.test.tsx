import { MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n/i18n.ts';
import { AnalysisProgress } from './analysis-progress.tsx';
import { DocumentInput, isAnalyzable } from './document-input.tsx';

afterEach(cleanup);

describe('DocumentInput', () => {
  it('labels the text area and counts characters against the shared limit', () => {
    render(<DocumentInput value="Hola" disabled={false} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Texto del documento')).toBeTruthy();
    expect(screen.getByText('4 de 150.000 caracteres')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('warns when the text exceeds the limit', () => {
    const tooLong = 'a'.repeat(MAX_DOCUMENT_CHARACTERS + 1);
    render(<DocumentInput value={tooLong} disabled={false} onChange={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('150.000');
    expect(screen.getByLabelText('Texto del documento').getAttribute('aria-invalid')).toBe('true');
  });

  it('passes typed text up', async () => {
    const onChange = vi.fn();
    render(<DocumentInput value="" disabled={false} onChange={onChange} />);
    await userEvent.setup().type(screen.getByLabelText('Texto del documento'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it.each([
    ['', false],
    ['   \n ', false],
    ['Texto', true],
    ['a'.repeat(MAX_DOCUMENT_CHARACTERS), true],
    ['a'.repeat(MAX_DOCUMENT_CHARACTERS + 1), false],
  ])('decides whether %j can be analyzed', (text, expected) => {
    expect(isAnalyzable(text)).toBe(expected);
  });
});

function statuses(): (string | null)[] {
  return screen.getAllByRole('listitem').map((item) => item.getAttribute('data-status'));
}

describe('AnalysisProgress', () => {
  it('shows the real stages without percentages', () => {
    render(<AnalysisProgress stage="waiting_for_analysis" />);
    expect(statuses()).toEqual(['done', 'current', 'pending']);
    expect(screen.getByRole('status').textContent).toContain('Analizando');
    expect(document.body.textContent).not.toMatch(/%/u);
  });

  it('adds the retry step only when the retry really happens', () => {
    const { rerender } = render(<AnalysisProgress stage="verifying_quotes" />);
    expect(statuses()).toHaveLength(3);
    rerender(<AnalysisProgress stage="retrying" />);
    expect(statuses()).toEqual(['done', 'done', 'done', 'current']);
    rerender(<AnalysisProgress stage="verifying_quotes" />);
    expect(statuses()).toEqual(['done', 'done', 'done', 'current']);
    rerender(<AnalysisProgress stage="done" />);
    expect(statuses()).toEqual(['done', 'done', 'done', 'done']);
  });
});
