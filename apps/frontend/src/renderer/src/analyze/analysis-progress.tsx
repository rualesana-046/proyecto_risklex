import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnalysisStage } from '../../../common/analysis-vocabulary.ts';

type VisibleStep = Exclude<AnalysisStage, 'done'>;
type StepStatus = 'done' | 'current' | 'pending';

const BASE_STEPS: readonly VisibleStep[] = [
  'validating',
  'waiting_for_analysis',
  'verifying_quotes',
];
const RETRY_STEPS: readonly VisibleStep[] = [...BASE_STEPS, 'retrying'];

function currentIndex(
  steps: readonly VisibleStep[],
  stage: AnalysisStage | null,
  retried: boolean,
) {
  if (stage === 'done') {
    return steps.length;
  }
  if (retried && stage === 'verifying_quotes') {
    return steps.indexOf('retrying');
  }
  return steps.indexOf(stage ?? 'validating');
}

function statusOf(index: number, current: number): StepStatus {
  if (index < current) {
    return 'done';
  }
  return index === current ? 'current' : 'pending';
}

export function AnalysisProgress({ stage }: { readonly stage: AnalysisStage | null }) {
  const { t } = useTranslation();
  const [retried, setRetried] = useState(false);
  if (stage === 'retrying' && !retried) {
    setRetried(true);
  }
  const steps = retried ? RETRY_STEPS : BASE_STEPS;
  const current = currentIndex(steps, stage, retried);
  return (
    <section className="analysis-progress" aria-labelledby="progress-title">
      <h2 id="progress-title">{t('analyze.progress.title')}</h2>
      <ol className="progress-steps">
        {steps.map((step, index) => {
          const status = statusOf(index, current);
          return (
            <li
              key={step}
              data-status={status}
              aria-current={status === 'current' ? 'step' : undefined}
            >
              <span className="visually-hidden">{t(`analyze.progress.status.${status}`)} </span>
              {t(`analyze.progress.steps.${step}`)}
            </li>
          );
        })}
      </ol>
      <p role="status" className="visually-hidden">
        {current < steps.length
          ? t(`analyze.progress.steps.${steps[current] ?? 'validating'}`)
          : ''}
      </p>
    </section>
  );
}
