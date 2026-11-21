import { useCallback, useEffect, useState } from 'react';
import type { HistoryEntryView, HistorySummary } from '../../../common/history-vocabulary.ts';

export type HistoryBridge = Pick<
  Window['risklex'],
  'listHistory' | 'getHistory' | 'deleteHistory' | 'clearHistory'
>;

export type HistoryListState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed' }
  | { readonly status: 'ready'; readonly entries: readonly HistorySummary[] };

export type HistoryAction = 'deleted' | 'cleared' | 'actionFailed' | 'openFailed' | null;

export function useHistory(bridge: HistoryBridge) {
  const [list, setList] = useState<HistoryListState>({ status: 'loading' });
  const [action, setAction] = useState<HistoryAction>(null);
  const refresh = useCallback(async () => {
    try {
      setList({ status: 'ready', entries: await bridge.listHistory() });
    } catch {
      setList({ status: 'failed' });
    }
  }, [bridge]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const run = async (work: () => Promise<void>, done: HistoryAction) => {
    try {
      await work();
      setAction(done);
    } catch {
      setAction('actionFailed');
    }
    await refresh();
  };
  const remove = (id: string) => run(() => bridge.deleteHistory(id), 'deleted');
  const clearAll = () => run(() => bridge.clearHistory(), 'cleared');
  const open = async (id: string): Promise<HistoryEntryView | null> => {
    const entry = await bridge.getHistory(id).catch(() => null);
    if (entry === null) {
      setAction('openFailed');
      await refresh();
    }
    return entry;
  };
  return { list, action, remove, clearAll, open };
}
