import type { IpcMain } from 'electron';
import {
  historyEntryViewSchema,
  historyIdSchema,
  historyListSchema,
} from '../../common/history-schemas.ts';
import type { HistoryEntryView, HistorySummary } from '../../common/history-vocabulary.ts';
import { IPC_CHANNELS } from '../../common/ipc-channels.ts';
import { isAppUrl } from '../app/window-security.ts';
import type { HistoryService } from '../modules/history/application/history.service.ts';

export interface HistoryIpcDependencies {
  readonly ipc: Pick<IpcMain, 'handle'>;
  readonly appUrl: string;
  readonly history: Pick<HistoryService, 'list' | 'get' | 'remove' | 'clear'>;
}

interface SenderFrameEvent {
  readonly senderFrame: { readonly url: string } | null;
}

const UNTRUSTED = 'Untrusted sender';
const INVALID_ID = 'Invalid history id';

export function registerHistoryIpc(dependencies: HistoryIpcDependencies): void {
  const { history } = dependencies;
  const guard = (event: SenderFrameEvent): void => {
    if (event.senderFrame === null || !isAppUrl(event.senderFrame.url, dependencies.appUrl)) {
      throw new Error(UNTRUSTED);
    }
  };
  const idFrom = (payload: unknown): string => {
    const id = historyIdSchema.safeParse(payload);
    if (!id.success) {
      throw new Error(INVALID_ID);
    }
    return id.data;
  };

  dependencies.ipc.handle(IPC_CHANNELS.historyList, async (event): Promise<HistorySummary[]> => {
    guard(event);
    return historyListSchema.parse(await history.list());
  });
  dependencies.ipc.handle(
    IPC_CHANNELS.historyGet,
    async (event, payload: unknown): Promise<HistoryEntryView | null> => {
      guard(event);
      const entry = await history.get(idFrom(payload));
      return entry === null ? null : historyEntryViewSchema.parse(entry);
    },
  );
  dependencies.ipc.handle(IPC_CHANNELS.historyDelete, async (event, payload: unknown) => {
    guard(event);
    await history.remove(idFrom(payload));
  });
  dependencies.ipc.handle(IPC_CHANNELS.historyClear, async (event) => {
    guard(event);
    await history.clear();
  });
}
