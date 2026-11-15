import type { UserProfile } from '@risklex/shared';
import { useTranslation } from 'react-i18next';
import type { VerifiedClauseResult } from '../../../common/analysis-vocabulary.ts';
import { SeverityGauge } from './severity-gauge.tsx';

interface ClauseCardProps {
  readonly item: VerifiedClauseResult;
  readonly profile: UserProfile;
}

function ClauseTags({ item, profile }: ClauseCardProps) {
  const { t } = useTranslation();
  const { clause } = item;
  const severity = clause.profiles[profile].severity;
  return (
    <p className="clause-tags">
      <span className={`severity-badge severity-${severity}`}>
        <SeverityGauge severity={severity} decorative />
        {t(`severity.${severity}`)}
      </span>
      <span className={`category-chip category-${clause.category}`}>
        {t(`categories.${clause.category}`)}
      </span>
      {clause.isAmbiguous ? (
        <span className="ambiguity-tag">{t('results.card.ambiguous')}</span>
      ) : null}
    </p>
  );
}

export function ClauseCard({ item, profile }: ClauseCardProps) {
  const { t } = useTranslation();
  const { clause } = item;
  const assessment = clause.profiles[profile];
  const titleId = `clause-${clause.id}-title`;
  return (
    <article className="clause-card" aria-labelledby={titleId}>
      <ClauseTags item={item} profile={profile} />
      <h3 id={titleId}>{clause.title}</h3>
      <h4>{t('results.card.meaning')}</h4>
      <p>{assessment.meaning}</p>
      <h4>{t('results.card.consequence')}</h4>
      <p>{assessment.consequence}</p>
      {clause.isAmbiguous ? (
        <p className="clause-note">
          {t('results.card.ambiguityReason')} {clause.ambiguityReason}
        </p>
      ) : null}
      {clause.evidenceStatus === 'insufficient_evidence' ? (
        <p className="clause-note">{t('results.card.insufficientEvidence')}</p>
      ) : null}
      <figure className="clause-original">
        <figcaption>{t('results.card.original')}</figcaption>
        <blockquote>{item.originalText}</blockquote>
      </figure>
      <p className="clause-confidence">
        {t('results.card.confidence', {
          level: t(`results.card.confidenceLevels.${clause.confidence}`),
        })}
      </p>
    </article>
  );
}
