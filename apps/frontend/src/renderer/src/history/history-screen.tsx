import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HistoryEntryView } from '../../../common/history-vocabulary.ts';
import { ClearHistoryDialog } from './clear-history-dialog.tsx';
import { HistoryEntryCard } from './history-entry-card.tsx';
import { useHistory, type HistoryBridge, type HistoryListState } from './use-history.ts';
import './history.css';

interface HistoryScreenProps {
  readonly bridge: HistoryBridge;
  readonly historyEnabled: boolean;
  readonly onOpen: (entry: HistoryEntryView) => void;
}

interface HistoryListProps {
  readonly list: HistoryListState;
  readonly onOpen: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

function HistoryList({ list, onOpen, onDelete }: HistoryListProps) {
  const { t } = useTranslation();
  if (list.status !== 'ready') {
    return <p>{t(list.status === 'loading' ? 'history.loading' : 'history.loadFailed')}</p>;
  }
  if (list.entries.length === 0) {
    return <p className="history-empty">{t('history.empty')}</p>;
  }
  return (
    <ul className="history-list">
      {list.entries.map((entry) => (
        <HistoryEntryCard key={entry.id} entry={entry} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </ul>
  );
}

function ClearAll({ onClear }: { readonly onClear: () => void }) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <button
        type="button"
        className="button-secondary"
        onClick={() => {
          setConfirming(true);
        }}
      >
        {t('history.clearAll')}
      </button>
      <ClearHistoryDialog
        open={confirming}
        onConfirm={() => {
          setConfirming(false);
          onClear();
        }}
        onCancel={() => {
          setConfirming(false);
        }}
      />
    </>
  );
}

export function HistoryScreen({ bridge, historyEnabled, onOpen }: HistoryScreenProps) {
  const { t } = useTranslation();
  const history = useHistory(bridge);
  const hasEntries = history.list.status === 'ready' && history.list.entries.length > 0;
  const open = (id: string) => {
    void history.open(id).then((entry) => {
      if (entry !== null) {
        onOpen(entry);
      }
    });
  };
  return (
    <section className="history-screen" aria-labelledby="history-title">
      <h1 id="history-title">{t('history.title')}</h1>
      <p className="history-lead">{t('history.lead')}</p>
      {historyEnabled ? null : <p className="history-off">{t('history.off')}</p>}
      <p className="history-status" role="status">
        {history.action === null ? '' : t(`history.actions.${history.action}`)}
      </p>
      <HistoryList
        list={history.list}
        onOpen={open}
        onDelete={(id) => {
          void history.remove(id);
        }}
      />
      {hasEntries ? (
        <ClearAll
          onClear={() => {
            void history.clearAll();
          }}
        />
      ) : null}
    </section>
  );
}
