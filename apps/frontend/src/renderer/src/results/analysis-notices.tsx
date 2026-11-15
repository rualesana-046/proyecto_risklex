import { useTranslation } from 'react-i18next';
import type { VerifiedAnalysis } from '../../../common/analysis-vocabulary.ts';

const FIXTURE_MODEL = 'fixture';

interface Notice {
  readonly id: string;
  readonly role: 'note' | 'status';
  readonly text: string;
}

export function AnalysisNotices({ analysis }: { readonly analysis: VerifiedAnalysis }) {
  const { t } = useTranslation();
  const candidates: readonly (Notice | null)[] = [
    analysis.meta.model === FIXTURE_MODEL
      ? { id: 'fixture', role: 'note', text: t('results.notices.fixture') }
      : null,
    analysis.discardedClauses > 0
      ? {
          id: 'discarded',
          role: 'status',
          text: t('results.notices.discarded', {
            discarded: analysis.discardedClauses,
            total: analysis.totalClauses,
          }),
        }
      : null,
    analysis.reliability === 'low'
      ? { id: 'low-reliability', role: 'note', text: t('results.notices.lowReliability') }
      : null,
    analysis.meta.moreClausesLikely
      ? { id: 'truncated', role: 'note', text: t('results.notices.truncated') }
      : null,
  ];
  const notices = candidates.filter((notice) => notice !== null);
  if (notices.length === 0) {
    return null;
  }
  return (
    <div className="analysis-notices">
      {notices.map((notice) => (
        <p key={notice.id} role={notice.role} className="analysis-notice" data-notice={notice.id}>
          {notice.text}
        </p>
      ))}
    </div>
  );
}
