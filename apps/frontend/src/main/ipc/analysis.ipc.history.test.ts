import { describe, expect, it, vi } from 'vitest';
import { ClientAnalysisError } from '../modules/analysis/domain/client-analysis-error.ts';
import type { AnalysisClient } from '../modules/analysis/infrastructure/analysis-http.client.ts';
import {
  clientReturning,
  EMPTY_RESPONSE,
  setup,
  VALID_INPUT,
} from './analysis.ipc.test-support.ts';

describe('analysis ipc and the local history (simulated electron, client and history)', () => {
  it('records a successful analysis with the source the window gave', async () => {
    const recordAnalysis = vi.fn(() => Promise.resolve('saved' as const));
    const { invoke } = setup(clientReturning(EMPTY_RESPONSE), recordAnalysis);
    const source = { kind: 'link', name: 'ejemplo.com' };
    expect(await invoke({ ...VALID_INPUT, source })).toMatchObject({ ok: true, history: 'saved' });
    expect(recordAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ text: VALID_INPUT.text, language: 'es', source }),
    );
  });

  it('records pasted text without a source name', async () => {
    const recordAnalysis = vi.fn(() => Promise.resolve('saved' as const));
    const { invoke } = setup(clientReturning(EMPTY_RESPONSE), recordAnalysis);
    await invoke(VALID_INPUT);
    expect(recordAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ source: { kind: 'pasted', name: null } }),
    );
  });

  it('still returns the analysis when saving it to the history fails', async () => {
    const recordAnalysis = vi.fn(() => Promise.reject(new Error('disk full')));
    const { invoke } = setup(clientReturning(EMPTY_RESPONSE), recordAnalysis);
    expect(await invoke(VALID_INPUT)).toMatchObject({ ok: true, history: 'failed' });
  });

  it.each([
    ['a full path as name', { kind: 'pdf', name: 'a'.repeat(300) }],
    ['an unknown kind', { kind: 'pasted', name: 'x' }],
    ['an extra field', { kind: 'pdf', name: 'contrato.pdf', path: '/tmp/contrato.pdf' }],
  ])('rejects a source with %s', async (_label, source) => {
    const recordAnalysis = vi.fn(() => Promise.resolve('saved' as const));
    const { invoke } = setup(clientReturning(EMPTY_RESPONSE), recordAnalysis);
    expect(await invoke({ ...VALID_INPUT, source })).toMatchObject({
      ok: false,
      error: { code: 'invalid_request' },
    });
    expect(recordAnalysis).not.toHaveBeenCalled();
  });

  it('does not record a failed analysis', async () => {
    const recordAnalysis = vi.fn(() => Promise.resolve('saved' as const));
    const client = {
      analyze: vi
        .fn<AnalysisClient['analyze']>()
        .mockRejectedValue(new ClientAnalysisError('timeout')),
    };
    const { invoke } = setup(client, recordAnalysis);
    expect(await invoke(VALID_INPUT)).toMatchObject({ ok: false });
    expect(recordAnalysis).not.toHaveBeenCalled();
  });
});
