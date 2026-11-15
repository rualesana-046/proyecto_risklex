import { useTranslation } from 'react-i18next';
import type { VerifiedAnalysis } from '../../../common/analysis-vocabulary.ts';

export function AnalysisNotices({ analysis }: { readonly analysis: VerifiedAnalysis }) {
  const { t } = useTranslation();
  const lowReliability = analysis.reliability === 'low';
  const truncated = analysis.meta.moreClausesLikely;
  if (!lowReliability && !truncated) {
    return null;
  }
  return (
    <div className="analysis-notices">
      {lowReliability ? (
        <p role="note" className="analysis-notice">
          {t('results.notices.lowReliability', {
            discarded: analysis.discardedClauses,
            total: analysis.totalClauses,
          })}
        </p>
      ) : null}
      {truncated ? (
        <p role="note" className="analysis-notice">
          {t('results.notices.truncated')}
        </p>
      ) : null}
    </div>
  );
}
