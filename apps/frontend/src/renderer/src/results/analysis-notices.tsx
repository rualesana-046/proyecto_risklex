import { useTranslation } from 'react-i18next';
import type { VerifiedAnalysis } from '../../../common/analysis-vocabulary.ts';

const FIXTURE_MODEL = 'fixture';

export function AnalysisNotices({ analysis }: { readonly analysis: VerifiedAnalysis }) {
  const { t } = useTranslation();
  const lowReliability = analysis.reliability === 'low';
  const truncated = analysis.meta.moreClausesLikely;
  const fixture = analysis.meta.model === FIXTURE_MODEL;
  if (!lowReliability && !truncated && !fixture) {
    return null;
  }
  return (
    <div className="analysis-notices">
      {fixture ? (
        <p role="note" className="analysis-notice">
          {t('results.notices.fixture')}
        </p>
      ) : null}
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
