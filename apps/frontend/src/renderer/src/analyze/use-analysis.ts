import type { AnalysisLanguage } from '@risklex/shared';
import { useCallback, useState } from 'react';
import type {
  AnalysisErrorCode,
  AnalysisStage,
  VerifiedAnalysis,
} from '../../../common/analysis-vocabulary.ts';

export interface AnalysisFailure {
  readonly code: AnalysisErrorCode;
  readonly retryAfterSeconds: number | null;
}

export type AnalysisState =
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly stage: AnalysisStage | null }
  | { readonly status: 'failed'; readonly error: AnalysisFailure }
  | { readonly status: 'succeeded'; readonly analysis: VerifiedAnalysis };

export type RisklexBridge = Window['risklex'];

const UNEXPECTED: AnalysisFailure = { code: 'unexpected', retryAfterSeconds: null };

export function useAnalysis(bridge: RisklexBridge) {
  const [state, setState] = useState<AnalysisState>({ status: 'idle' });

  const start = useCallback(
    async (text: string, language: AnalysisLanguage): Promise<AnalysisState> => {
      setState({ status: 'running', stage: null });
      const unsubscribe = bridge.onProgress((stage) => {
        setState({ status: 'running', stage });
      });
      let next: AnalysisState;
      try {
        const outcome = await bridge.analyze({ text, language });
        next = outcome.ok
          ? { status: 'succeeded', analysis: outcome.analysis }
          : { status: 'failed', error: outcome.error };
      } catch {
        next = { status: 'failed', error: UNEXPECTED };
      } finally {
        unsubscribe();
      }
      setState(next);
      return next;
    },
    [bridge],
  );

  const cancel = useCallback(() => {
    bridge.cancel();
  }, [bridge]);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return { state, start, cancel, reset };
}
