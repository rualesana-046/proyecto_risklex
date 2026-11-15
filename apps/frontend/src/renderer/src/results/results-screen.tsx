import type { UserProfile } from '@risklex/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VerifiedAnalysis } from '../../../common/analysis-vocabulary.ts';
import { CategoryFilter } from './category-filter.tsx';
import { ClauseCard } from './clause-card.tsx';
import { Essentials } from './essentials.tsx';
import { ProfileSelector } from './profile-selector.tsx';
import {
  presentCategories,
  visibleClauses,
  type CategoryFilter as Filter,
} from './results-view-model.ts';
import './results.css';

interface ClauseListProps {
  readonly analysis: VerifiedAnalysis;
  readonly profile: UserProfile;
}

function ClauseList({ analysis, profile }: ClauseListProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const visible = visibleClauses(analysis.clauses, profile, filter);
  const emptyText =
    analysis.clauses.length === 0 ? t('results.clauses.none') : t('results.clauses.empty');
  return (
    <section className="clause-section" aria-labelledby="clauses-title">
      <h2 id="clauses-title">{t('results.clauses.title')}</h2>
      <CategoryFilter
        categories={presentCategories(analysis.clauses)}
        value={filter}
        onChange={setFilter}
      />
      {visible.length === 0 ? <p className="clause-empty">{emptyText}</p> : null}
      <div className="clause-list">
        {visible.map((item) => (
          <ClauseCard key={item.clause.id} item={item} profile={profile} />
        ))}
      </div>
    </section>
  );
}

export function ResultsScreen({ analysis }: { readonly analysis: VerifiedAnalysis }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile>('free_user');
  return (
    <>
      <section className="results-head">
        <h1>{t('results.title')}</h1>
        <p>{t('results.summary', { total: analysis.clauses.length })}</p>
        <ProfileSelector value={profile} onChange={setProfile} />
      </section>
      <Essentials clauses={analysis.clauses} profile={profile} />
      <ClauseList analysis={analysis} profile={profile} />
    </>
  );
}
