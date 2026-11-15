import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type { AnalysisErrorCode, AnalysisOutcome } from '../../common/analysis-vocabulary.ts';
import { IPC_CHANNELS } from '../../common/ipc-channels.ts';
import { analyzeInputSchema } from '../../common/ipc-schemas.ts';
import { isAppUrl } from '../app/window-security.ts';
import { runAnalysis } from '../modules/analysis/application/run-analysis.use-case.ts';
import { ClientAnalysisError } from '../modules/analysis/domain/client-analysis-error.ts';
import type { AnalysisClient } from '../modules/analysis/infrastructure/analysis-http.client.ts';

export interface AnalysisIpcDependencies {
  readonly ipc: Pick<IpcMain, 'handle' | 'on'>;
  readonly appUrl: string;
  readonly client: AnalysisClient | null;
}

interface SenderFrameEvent {
  readonly senderFrame: { readonly url: string } | null;
}

function failure(
  code: AnalysisErrorCode,
  retryAfterSeconds: number | null = null,
): AnalysisOutcome {
  return { ok: false, error: { code, retryAfterSeconds } };
}

function toFailure(error: unknown): AnalysisOutcome {
  if (error instanceof ClientAnalysisError) {
    return failure(error.code, error.retryAfterSeconds);
  }
  return failure('unexpected');
}

interface AnalysisState {
  running: AbortController | null;
}

async function analyzeTrusted(
  dependencies: AnalysisIpcDependencies,
  state: AnalysisState,
  event: IpcMainInvokeEvent,
  payload: unknown,
): Promise<AnalysisOutcome> {
  const input = analyzeInputSchema.safeParse(payload);
  if (!input.success) {
    return failure('invalid_request');
  }
  if (state.running !== null) {
    return failure('unexpected');
  }
  const controller = new AbortController();
  state.running = controller;
  try {
    const analysis = await runAnalysis(
      dependencies.client,
      input.data,
      controller.signal,
      (stage) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(IPC_CHANNELS.progress, stage);
        }
      },
    );
    return { ok: true, analysis };
  } catch (error) {
    return toFailure(error);
  } finally {
    state.running = null;
  }
}

export function registerAnalysisIpc(dependencies: AnalysisIpcDependencies): void {
  const state: AnalysisState = { running: null };
  const isTrusted = (event: SenderFrameEvent): boolean =>
    event.senderFrame !== null && isAppUrl(event.senderFrame.url, dependencies.appUrl);

  dependencies.ipc.handle(IPC_CHANNELS.analyze, (event, payload: unknown) =>
    isTrusted(event)
      ? analyzeTrusted(dependencies, state, event, payload)
      : Promise.resolve(failure('unexpected')),
  );

  dependencies.ipc.on(IPC_CHANNELS.cancel, (event) => {
    if (isTrusted(event)) {
      state.running?.abort();
    }
  });
}
