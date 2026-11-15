import { MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import { useTranslation } from 'react-i18next';
import type { AnalysisFailure } from './use-analysis.ts';

export function AnalysisErrorMessage({ error }: { readonly error: AnalysisFailure }) {
  const { t, i18n } = useTranslation();
  const max = new Intl.NumberFormat(i18n.language).format(MAX_DOCUMENT_CHARACTERS);
  const next =
    error.code === 'rate_limited' && error.retryAfterSeconds !== null
      ? t('errors.rate_limited.nextWithDelay', { seconds: error.retryAfterSeconds })
      : t(`errors.${error.code}.next`, { max });
  const cancelled = error.code === 'cancelled';
  return (
    <div
      role={cancelled ? 'status' : 'alert'}
      className={cancelled ? 'analysis-message analysis-message-neutral' : 'analysis-message'}
    >
      <p className="analysis-message-title">{t(`errors.${error.code}.message`)}</p>
      <p>{next}</p>
    </div>
  );
}
