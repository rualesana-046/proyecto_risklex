import { useTranslation } from 'react-i18next';
import { useSavedDate } from '../shell/use-saved-date.ts';

export type ResultsOrigin =
  | { readonly kind: 'new'; readonly saveFailed: boolean }
  | { readonly kind: 'history'; readonly savedAt: string };

export function ResultsOriginNotice({ origin }: { readonly origin: ResultsOrigin }) {
  const { t } = useTranslation();
  const formatDate = useSavedDate();
  if (origin.kind === 'history') {
    return (
      <p className="results-origin">
        {t('results.origin.saved', { date: formatDate(origin.savedAt) })}
      </p>
    );
  }
  return origin.saveFailed ? (
    <p className="results-origin results-origin-warning" role="status">
      {t('results.origin.saveFailed')}
    </p>
  ) : null;
}
