import type { ClauseCategory } from '@risklex/shared';
import { useTranslation } from 'react-i18next';
import type { CategoryFilter as Filter } from './results-view-model.ts';

interface CategoryFilterProps {
  readonly categories: readonly ClauseCategory[];
  readonly value: Filter;
  readonly onChange: (filter: Filter) => void;
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  const { t } = useTranslation();
  const options: readonly Filter[] = ['all', ...categories];
  return (
    <div className="category-filter" role="group" aria-label={t('results.filter.label')}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`filter-chip filter-${option}`}
          aria-pressed={option === value}
          onClick={() => {
            onChange(option);
          }}
        >
          {option === 'all' ? t('results.filter.all') : t(`categories.${option}`)}
        </button>
      ))}
    </div>
  );
}
