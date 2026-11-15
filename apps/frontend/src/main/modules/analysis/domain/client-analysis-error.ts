import type { AnalysisErrorCode } from '../../../../common/analysis-vocabulary.ts';

export class ClientAnalysisError extends Error {
  readonly code: AnalysisErrorCode;
  readonly retryAfterSeconds: number | null;

  constructor(code: AnalysisErrorCode, retryAfterSeconds: number | null = null) {
    super(code);
    this.name = 'ClientAnalysisError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
