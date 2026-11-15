import type { Severity } from '@risklex/shared';
import { useTranslation } from 'react-i18next';

const CENTER = 16;
const ARC_RADIUS = 11;
const NEEDLE_RADIUS = 9;
const ARCS: readonly (readonly [number, number])[] = [
  [176, 124],
  [116, 64],
  [56, 4],
];
const LEVELS: Readonly<Record<Severity, { readonly angle: number; readonly arc: number }>> = {
  neutral: { angle: 150, arc: 0 },
  warning: { angle: 90, arc: 1 },
  high_risk: { angle: 30, arc: 2 },
};

export function gaugePoint(degrees: number, radius: number): readonly [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [CENTER + radius * Math.cos(radians), CENTER - radius * Math.sin(radians)];
}

function format(value: number): string {
  return value.toFixed(1);
}

function arcPath(from: number, to: number): string {
  const [x1, y1] = gaugePoint(from, ARC_RADIUS);
  const [x2, y2] = gaugePoint(to, ARC_RADIUS);
  return `M${format(x1)} ${format(y1)}A${String(ARC_RADIUS)} ${String(ARC_RADIUS)} 0 0 1 ${format(x2)} ${format(y2)}`;
}

interface SeverityGaugeProps {
  readonly severity: Severity;
  readonly size?: number;
}

export function SeverityGauge({ severity, size = 20 }: SeverityGaugeProps) {
  const { t } = useTranslation();
  const level = LEVELS[severity];
  const [needleX, needleY] = gaugePoint(level.angle, NEEDLE_RADIUS);
  return (
    <svg
      className="severity-gauge"
      viewBox="0 0 32 20"
      width={size}
      height={(size * 20) / 32}
      role="img"
      aria-label={t(`severity.${severity}`)}
      fill="none"
      stroke="currentColor"
    >
      {ARCS.map(([from, to], index) => (
        <path
          key={from}
          data-arc={index}
          d={arcPath(from, to)}
          strokeWidth={3.2}
          strokeOpacity={index === level.arc ? 1 : 0.38}
        />
      ))}
      <path
        data-needle=""
        d={`M16 16L${format(needleX)} ${format(needleY)}`}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
