import type { AnalysisResponse } from '@risklex/shared';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import type { AnalysisOutcome } from '../../common/analysis-vocabulary.ts';
import { IPC_CHANNELS } from '../../common/ipc-channels.ts';
import { ClientAnalysisError } from '../modules/analysis/domain/client-analysis-error.ts';
import type { AnalysisClient } from '../modules/analysis/infrastructure/analysis-http.client.ts';
import { registerAnalysisIpc } from './analysis.ipc.ts';

const APP_URL = 'http://localhost:5173';
const VALID_INPUT = { text: 'Texto de un contrato sintetico.', language: 'es' };

const EMPTY_RESPONSE: AnalysisResponse = {
  result: { clauses: [], glossary: [] },
  meta: {
    promptVersion: '2026-11-14.1',
    model: 'claude-sonnet-5-5',
    language: 'es',
    moreClausesLikely: false,
    usage: { inputTokens: 10, outputTokens: 5 },
  },
};

type InvokeHandler = (event: IpcMainInvokeEvent, payload: unknown) => Promise<AnalysisOutcome>;
type CancelHandler = (event: IpcMainEvent) => void;

function setup(client: AnalysisClient | null) {
  const handlers: { invoke?: InvokeHandler; cancel?: CancelHandler } = {};
  const ipc = {
    handle: vi.fn((_channel: string, handler: InvokeHandler) => {
      handlers.invoke = handler;
    }),
    on: vi.fn((_channel: string, handler: CancelHandler) => {
      handlers.cancel = handler;
    }),
  };
  registerAnalysisIpc({ ipc: ipc as never, appUrl: APP_URL, client });
  const send = vi.fn();
  const event = (url: string | null) =>
    ({
      senderFrame: url === null ? null : { url },
      sender: { send, isDestroyed: () => false },
    }) as unknown as IpcMainInvokeEvent & IpcMainEvent;
  const invoke = (payload: unknown, url: string | null = `${APP_URL}/`) => {
    if (handlers.invoke === undefined) {
      throw new Error('The analyze handler was not registered');
    }
    return handlers.invoke(event(url), payload);
  };
  const cancel = (url: string | null = `${APP_URL}/`) => {
    handlers.cancel?.(event(url));
  };
  return { ipc, invoke, cancel, send };
}

function clientReturning(response: AnalysisResponse) {
  return { analyze: vi.fn<AnalysisClient['analyze']>().mockResolvedValue(response) };
}

function hangingClient() {
  return {
    analyze: vi.fn<AnalysisClient['analyze']>(
      (_request, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new ClientAnalysisError('cancelled'));
          });
        }),
    ),
  };
}

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
    expect(await invoke(VALID_INPUT)).toMatchObject({ ok: false, error: { code: 'unexpected' } });
    expect(client.analyze).toHaveBeenCalledOnce();
    cancel();
    await first;
  });
});
