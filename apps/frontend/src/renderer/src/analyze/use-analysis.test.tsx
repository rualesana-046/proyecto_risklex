import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AnalysisOutcome, AnalysisStage } from '../../../common/analysis-vocabulary.ts';
import { useAnalysis, type RisklexBridge } from './use-analysis.ts';

function fakeBridge(analyze: RisklexBridge['analyze']) {
  let emit: (stage: AnalysisStage) => void = () => undefined;
  const unsubscribe = vi.fn();
  const bridge = {
    analyze: vi.fn(analyze),
    onProgress: vi.fn((listener: (stage: AnalysisStage) => void) => {
      emit = listener;
      return unsubscribe;
    }),
    cancel: vi.fn(),
  };
  return {
    bridge,
    unsubscribe,
    emit: (stage: AnalysisStage) => {
      emit(stage);
    },
  };
}

const FAILURE: AnalysisOutcome = {
  ok: false,
  error: { code: 'rate_limited', retryAfterSeconds: 30 },
};

describe('useAnalysis (simulated preload bridge)', () => {
  it('follows the real stages and stops listening when it ends', async () => {
    let resolve: (outcome: AnalysisOutcome) => void = () => undefined;
    const fake = fakeBridge(() => new Promise((done) => (resolve = done)));
    const { result } = renderHook(() => useAnalysis(fake.bridge));
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.start('Texto', 'es');
    });
    expect(result.current.state).toEqual({ status: 'running', stage: null });
    act(() => {
      fake.emit('waiting_for_analysis');
    });
    expect(result.current.state).toEqual({ status: 'running', stage: 'waiting_for_analysis' });
    await act(async () => {
      resolve(FAILURE);
      await pending;
    });
    expect(fake.bridge.analyze).toHaveBeenCalledWith({ text: 'Texto', language: 'es' });
    expect(result.current.state).toEqual({ status: 'failed', error: FAILURE.error });
    expect(fake.unsubscribe).toHaveBeenCalledOnce();
  });

  it('reports an unexpected error when the bridge itself fails', async () => {
    const fake = fakeBridge(() => Promise.reject(new Error('ipc broke')));
    const { result } = renderHook(() => useAnalysis(fake.bridge));
    await act(async () => {
      await result.current.start('Texto', 'es');
    });
    expect(result.current.state).toEqual({
      status: 'failed',
      error: { code: 'unexpected', retryAfterSeconds: null },
    });
    expect(fake.unsubscribe).toHaveBeenCalledOnce();
  });

  it('asks the main process to cancel and can return to idle', () => {
    const fake = fakeBridge(() => Promise.resolve(FAILURE));
    const { result } = renderHook(() => useAnalysis(fake.bridge));
    act(() => {
      result.current.cancel();
      result.current.reset();
    });
    expect(fake.bridge.cancel).toHaveBeenCalledOnce();
    expect(result.current.state).toEqual({ status: 'idle' });
  });
});
