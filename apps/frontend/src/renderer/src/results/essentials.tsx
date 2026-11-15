import { SEVERITIES, type UserProfile } from '@risklex/shared';
import { useTranslation } from 'react-i18next';
import type { VerifiedClauseResult } from '../../../common/analysis-vocabulary.ts';
import { essentials, severityCounts, severityFor } from './results-view-model.ts';
import { SeverityGauge } from './severity-gauge.tsx';

interface EssentialsProps {
  readonly clauses: readonly VerifiedClauseResult[];
  readonly profile: UserProfile;
}

function SeverityCounters({ clauses, profile }: EssentialsProps) {
  const { t } = useTranslation();
  const counts = severityCounts(clauses, profile);
  return (
    <ul className="severity-counters" aria-label={t('results.essentials.counters')}>
      {SEVERITIES.map((severity) => (
        <li key={severity} className={`severity-counter severity-${severity}`}>
          <SeverityGauge severity={severity} decorative />
          <span>{t(`severity.${severity}`)}</span>
          <strong>{counts[severity]}</strong>
        </li>
      ))}
    </ul>
  );
}

export function Essentials({ clauses, profile }: EssentialsProps) {
  const { t } = useTranslation();
  const selected = essentials(clauses, profile);
  return (
    <section className="essentials" aria-labelledby="essentials-title">
      <h2 id="essentials-title">{t('results.essentials.title')}</h2>
      <SeverityCounters clauses={clauses} profile={profile} />
      {selected.length === 0 ? (
        <p className="essentials-empty">{t('results.essentialsEmpty')}</p>
      ) : (
        <ol className="essentials-list">
          {selected.map((item) => {
            const severity = severityFor(item, profile);
            return (
              <li key={item.clause.id}>
                <span className={`severity-badge severity-${severity}`}>
                  <SeverityGauge severity={severity} decorative />
                  {t(`severity.${severity}`)}
                </span>
                <strong>{item.clause.title}</strong>
                <span>{item.clause.profiles[profile].meaning}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
