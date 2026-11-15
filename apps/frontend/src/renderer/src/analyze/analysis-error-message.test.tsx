import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ANALYSIS_ERROR_CODES } from '../../../common/analysis-vocabulary.ts';
import '../i18n/i18n.ts';
import { AnalysisErrorMessage } from './analysis-error-message.tsx';

afterEach(cleanup);

describe('AnalysisErrorMessage', () => {
  it.each(ANALYSIS_ERROR_CODES.filter((code) => code !== 'cancelled'))(
    'explains %s in plain words with a next step',
    (code) => {
      render(<AnalysisErrorMessage error={{ code, retryAfterSeconds: null }} />);
      const [message, next] = screen.getByRole('alert').querySelectorAll('p');
      expect(message?.textContent.trim()).not.toBe('');
      expect(next?.textContent.trim()).not.toBe('');
      expect(screen.getByRole('alert').textContent).not.toMatch(/errors\.|\{\{|_/u);
    },
  );

  it('tells how long to wait when the backend says so', () => {
    render(<AnalysisErrorMessage error={{ code: 'rate_limited', retryAfterSeconds: 30 }} />);
    expect(screen.getByRole('alert').textContent).toContain('Espera 30 segundos');
  });

  it('includes the shared character limit for a document that is too large', () => {
    render(
      <AnalysisErrorMessage error={{ code: 'document_too_large', retryAfterSeconds: null }} />,
    );
    expect(screen.getByRole('alert').textContent).toContain('150.000');
  });

  it('reports a cancellation calmly, as a status and not an alert', () => {
    render(<AnalysisErrorMessage error={{ code: 'cancelled', retryAfterSeconds: null }} />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Cancelaste el análisis.');
  });
});
