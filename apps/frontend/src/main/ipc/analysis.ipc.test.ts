import type { AnalysisResponse } from '@risklex/shared';
import { describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS } from '../../common/ipc-channels.ts';
import { ClientAnalysisError } from '../modules/analysis/domain/client-analysis-error.ts';
import type { AnalysisClient } from '../modules/analysis/infrastructure/analysis-http.client.ts';
import {
  clientReturning,
  EMPTY_RESPONSE,
  hangingClient,
  setup,
  VALID_INPUT,
} from './analysis.ipc.test-support.ts';

describe('analysis ipc (simulated electron and client)', () => {
  it('registers the analyze and cancel channels', () => {
    const { ipc } = setup(null);
    expect(ipc.handle).toHaveBeenCalledWith(IPC_CHANNELS.analyze, expect.any(Function));
    expect(ipc.on).toHaveBeenCalledWith(IPC_CHANNELS.cancel, expect.any(Function));
  });

  it('runs the analysis for the app window and streams real stages', async () => {
    const client = clientReturning(EMPTY_RESPONSE);
    const { invoke, send } = setup(client);
    const outcome = await invoke(VALID_INPUT);
    expect(outcome).toMatchObject({ ok: true, analysis: { reliability: 'normal', attempts: 1 } });
    expect(send.mock.calls.map(([, stage]: unknown[]) => stage)).toEqual([
      'validating',
      'waiting_for_analysis',
      'verifying_quotes',
      'done',
    ]);
  });

  it.each([
    ['an external page', 'https://example.com/'],
    ['a missing frame', null],
  ])('refuses requests from %s without calling the backend', async (_label, url) => {
    const client = clientReturning(EMPTY_RESPONSE);
    const { invoke } = setup(client);
    expect(await invoke(VALID_INPUT, url)).toEqual({
      ok: false,
      error: { code: 'unexpected', retryAfterSeconds: null },
    });
    expect(client.analyze).not.toHaveBeenCalled();
  });

  it.each([
    ['an extra field', { ...VALID_INPUT, admin: true }],
    ['a missing language', { text: VALID_INPUT.text }],
    ['an unknown language', { ...VALID_INPUT, language: 'fr' }],
    ['a non object', 'text'],
  ])('rejects %s as an invalid request', async (_label, payload) => {
    const client = clientReturning(EMPTY_RESPONSE);
    const { invoke } = setup(client);
    expect(await invoke(payload)).toMatchObject({ ok: false, error: { code: 'invalid_request' } });
    expect(client.analyze).not.toHaveBeenCalled();
  });

  it('returns typed errors with their retry delay', async () => {
    const client = {
      analyze: vi
        .fn<AnalysisClient['analyze']>()
        .mockRejectedValue(new ClientAnalysisError('rate_limited', 30)),
    };
    const { invoke } = setup(client);
    expect(await invoke(VALID_INPUT)).toEqual({
      ok: false,
      error: { code: 'rate_limited', retryAfterSeconds: 30 },
    });
  });

  it('reports a missing backend url as a configuration error', async () => {
    const { invoke } = setup(null);
    expect(await invoke(VALID_INPUT)).toMatchObject({
      ok: false,
      error: { code: 'configuration_missing' },
    });
  });

  it('cancels the running analysis from the app window only', async () => {
    const client = hangingClient();
    const { invoke, cancel } = setup(client);
    const pending = invoke(VALID_INPUT);
    await Promise.resolve();
    cancel('https://example.com/');
    expect(client.analyze.mock.calls[0]?.[1].aborted).toBe(false);
    cancel();
    expect(await pending).toMatchObject({ ok: false, error: { code: 'cancelled' } });
  });

  it('refuses a second analysis while one is running', async () => {
    const client = hangingClient();
    const { invoke, cancel } = setup(client);
    const first = invoke(VALID_INPUT);
    await Promise.resolve();
    expect(await invoke(VALID_INPUT)).toEqual({
      ok: false,
      error: { code: 'analysis_in_progress', retryAfterSeconds: null },
    });
    expect(client.analyze).toHaveBeenCalledOnce();
    cancel();
    await first;
  });

  it('never forwards raw backend fields or error traces to the renderer', async () => {
    const polluted = {
      ...EMPTY_RESPONSE,
      rawBody: 'raw-secret-body',
      meta: { ...EMPTY_RESPONSE.meta, debug: 'raw-secret-body' },
    } as AnalysisResponse;
    const success = await setup(clientReturning(polluted)).invoke(VALID_INPUT);
    expect(success.ok).toBe(true);
    expect(JSON.stringify(success)).not.toContain('raw-secret-body');

    const crash = new Error('raw-secret-body');
    const client = { analyze: vi.fn<AnalysisClient['analyze']>().mockRejectedValue(crash) };
    const failed = await setup(client).invoke(VALID_INPUT);
    expect(failed).toEqual({ ok: false, error: { code: 'unexpected', retryAfterSeconds: null } });
    expect(JSON.stringify(failed)).not.toMatch(/raw-secret-body|stack|Error/u);
  });
});
