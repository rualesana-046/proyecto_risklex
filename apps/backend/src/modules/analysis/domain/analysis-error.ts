import type { ApiErrorCode } from '@risklex/shared';

export type AnalysisErrorCode = Extract<
  ApiErrorCode,
  'provider_error' | 'provider_refusal' | 'output_truncated'
>;

export class AnalysisError extends Error {
  readonly code: AnalysisErrorCode;

  constructor(code: AnalysisErrorCode) {
    super(code);
    this.name = 'AnalysisError';
    this.code = code;
  }
}

export function isAnalysisError(error: unknown): error is AnalysisError {
  return error instanceof AnalysisError;
}
