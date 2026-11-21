import type { AnalysisResponse } from '@risklex/shared';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { vi, type Mock } from 'vitest';
import type { AnalysisOutcome } from '../../common/analysis-vocabulary.ts';
import { ClientAnalysisError } from '../modules/analysis/domain/client-analysis-error.ts';
import type { AnalysisClient } from '../modules/analysis/infrastructure/analysis-http.client.ts';
import { registerAnalysisIpc, type AnalysisIpcDependencies } from './analysis.ipc.ts';

export const APP_URL = 'http://localhost:5173';
export const VALID_INPUT = { text: 'Texto de un contrato sintetico.', language: 'es' };

export const EMPTY_RESPONSE: AnalysisResponse = {
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

export interface AnalysisIpcHarness {
  readonly ipc: {
    readonly handle: Mock<(channel: string, handler: InvokeHandler) => void>;
    readonly on: Mock<(channel: string, handler: CancelHandler) => void>;
  };
  readonly invoke: (payload: unknown, url?: string | null) => Promise<AnalysisOutcome>;
  readonly cancel: (url?: string | null) => void;
  readonly send: Mock;
}

export function setup(
  client: AnalysisClient | null,
  recordAnalysis?: AnalysisIpcDependencies['recordAnalysis'],
): AnalysisIpcHarness {
  const handlers: { invoke?: InvokeHandler; cancel?: CancelHandler } = {};
  const ipc = {
    handle: vi.fn((_channel: string, handler: InvokeHandler) => {
      handlers.invoke = handler;
    }),
    on: vi.fn((_channel: string, handler: CancelHandler) => {
      handlers.cancel = handler;
    }),
  };
  registerAnalysisIpc({ ipc: ipc as never, appUrl: APP_URL, client, recordAnalysis });
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

export function clientReturning(response: AnalysisResponse): Pick<AnalysisClient, 'analyze'> & {
  readonly analyze: Mock<AnalysisClient['analyze']>;
} {
  return { analyze: vi.fn<AnalysisClient['analyze']>().mockResolvedValue(response) };
}

export function hangingClient() {
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
