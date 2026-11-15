import { SEVERITIES } from '@risklex/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../i18n/i18n.ts';
import { gaugePoint, SeverityGauge } from './severity-gauge.tsx';

afterEach(cleanup);

const EXPECTED = {
  neutral: { label: 'Neutro', angle: 150, arc: 0 },
  warning: { label: 'Advertencia', angle: 90, arc: 1 },
  high_risk: { label: 'Alto riesgo', angle: 30, arc: 2 },
} as const;

describe('SeverityGauge', () => {
  it.each(SEVERITIES)('draws the prototype geometry for %s', (severity) => {
    const expected = EXPECTED[severity];
    render(<SeverityGauge severity={severity} />);
    const gauge = screen.getByRole('img', { name: expected.label });
    expect(gauge.getAttribute('viewBox')).toBe('0 0 32 20');
    const arcs = [...gauge.querySelectorAll('path[data-arc]')];
    expect(arcs.map((arc) => arc.getAttribute('stroke-opacity'))).toEqual(
      [0, 1, 2].map((index) => (index === expected.arc ? '1' : '0.38')),
    );
    const [x, y] = gaugePoint(expected.angle, 9);
    expect(gauge.querySelector('path[data-needle]')?.getAttribute('d')).toBe(
      `M16 16L${x.toFixed(1)} ${y.toFixed(1)}`,
    );
    expect(gauge.querySelector('circle')?.getAttribute('r')).toBe('2.2');
  });

  it('starts the first arc at 176 degrees on a radius of 11', () => {
    render(<SeverityGauge severity="neutral" />);
    const [x, y] = gaugePoint(176, 11);
    const first = screen.getByRole('img').querySelector('path[data-arc="0"]');
    expect(first?.getAttribute('d')?.startsWith(`M${x.toFixed(1)} ${y.toFixed(1)}A11 11`)).toBe(
      true,
    );
  });

  it('keeps the 32 by 20 proportion at any size', () => {
    render(<SeverityGauge severity="warning" size={32} />);
    expect(screen.getByRole('img').getAttribute('height')).toBe('20');
  });
});
