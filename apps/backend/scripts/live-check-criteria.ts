import { SEVERITIES, type Severity } from '@risklex/shared';
import type { LiveEvaluation } from './live-check-evaluation.ts';

export interface CriteriaCheck {
  readonly severityRate: number;
  readonly bestBaseline: Severity;
  readonly bestBaselineRate: number;
  readonly severityPass: boolean;
  readonly ambiguityPass: boolean;
  readonly forbiddenPass: boolean;
}

export function checkCriteria(result: LiveEvaluation): CriteriaCheck {
  const total = Math.max(result.severityTotal, 1);
  const bestBaseline = SEVERITIES.reduce((best, level) =>
    result.baselines[level] > result.baselines[best] ? level : best,
  );
  const severityRate = result.severityHits / total;
  const bestBaselineRate = result.baselines[bestBaseline] / total;
  return {
    severityRate,
    bestBaseline,
    bestBaselineRate,
    severityPass: severityRate >= 0.75 && severityRate - bestBaselineRate >= 0.25,
    ambiguityPass:
      result.ambiguousFound === result.ambiguousReal && result.ambiguousFalsePositives <= 1,
    forbiddenPass: result.forbidden === 0,
  };
}
