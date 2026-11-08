import { describe, expect, it } from 'vitest';
import { AnalysisError, isAnalysisError } from './analysis-error.ts';

describe('AnalysisError', () => {
  it.each(['provider_error', 'provider_refusal', 'output_truncated'] as const)(
    'carries only the %s code as its message',
    (code) => {
      const error = new AnalysisError(code);
      expect(error.code).toBe(code);
      expect(error.message).toBe(code);
      expect(error.name).toBe('AnalysisError');
    },
  );

  it('is recognised by isAnalysisError', () => {
    expect(isAnalysisError(new AnalysisError('provider_error'))).toBe(true);
  });

  it.each([new Error('provider_error'), 'provider_error', null, { code: 'provider_error' }])(
    'does not recognise other values',
    (value) => {
      expect(isAnalysisError(value)).toBe(false);
    },
  );
});
