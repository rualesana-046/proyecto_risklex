import { SEVERITIES } from '@risklex/shared';
import { useTranslation } from 'react-i18next';
import type { HistorySummary } from '../../../common/history-vocabulary.ts';
import { useSavedDate } from '../shell/use-saved-date.ts';

interface HistoryEntryCardProps {
  readonly entry: HistorySummary;
  readonly onOpen: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

export function useSourceLabel() {
  const { t } = useTranslation();
  return (entry: HistorySummary): string =>
    entry.source.name === null
      ? t('history.source.pasted')
      : t(`history.source.${entry.source.kind === 'link' ? 'link' : 'pdf'}`, {
          name: entry.source.name,
        });
}

interface EntryActionsProps {
  readonly source: string;
  readonly onOpen: () => void;
  readonly onDelete: () => void;
}

function EntryActions({ source, onOpen, onDelete }: EntryActionsProps) {
  const { t } = useTranslation();
  return (
    <div className="history-entry-actions">
      <button
        type="button"
        className="button-primary"
        aria-label={t('history.openLabel', { source })}
        onClick={() => {
          onOpen();
        }}
      >
        {t('history.open')}
      </button>
      <button
        type="button"
        className="button-secondary"
        aria-label={t('history.deleteLabel', { source })}
        onClick={() => {
          onDelete();
        }}
      >
        {t('history.delete')}
      </button>
    </div>
  );
}

export function HistoryEntryCard({ entry, onOpen, onDelete }: HistoryEntryCardProps) {
  const { t } = useTranslation();
  const source = useSourceLabel()(entry);
  const date = useSavedDate()(entry.savedAt);
  return (
    <li className="history-entry">
      <h2 className="history-entry-source">{source}</h2>
      <p className="history-entry-meta">
        {date} · {t(`history.language.${entry.language}`)} ·{' '}
        {t('history.characters', { count: entry.characters })}
      </p>
      <ul className="history-entry-counts" aria-label={t('history.countsLabel')}>
        {SEVERITIES.map((severity) => (
          <li key={severity} className={`history-count history-count-${severity}`}>
            {t(`severity.${severity}`)}: {entry.counts[severity]}
          </li>
        ))}
      </ul>
      <EntryActions
        source={source}
        onOpen={() => {
          onOpen(entry.id);
        }}
        onDelete={() => {
          onDelete(entry.id);
        }}
      />
    </li>
  );
}
