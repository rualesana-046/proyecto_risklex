import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from './health.contract';

describe('healthResponseSchema', () => {
  it('accepts a healthy response', () => {
    const response = { status: 'ok', version: '0.1.0' };
    expect(healthResponseSchema.parse(response)).toEqual(response);
  });

  it.each([
    ['a missing version', { status: 'ok' }],
    ['an empty version', { status: 'ok', version: '' }],
    ['an unknown status', { status: 'degraded', version: '0.1.0' }],
    ['a non string version', { status: 'ok', version: 1 }],
    ['an unexpected field', { status: 'ok', version: '0.1.0', detail: 'extra' }],
    ['a non object value', 'ok'],
  ])('rejects %s', (_label, response) => {
    expect(healthResponseSchema.safeParse(response).success).toBe(false);
  });
});
