import { describe, expect, it } from 'vitest';
import {
  API_ERROR_CODES,
  API_ERROR_HTTP_STATUS,
  apiErrorResponseSchema,
} from './api-error.contract.ts';

describe('apiErrorResponseSchema', () => {
  it.each(API_ERROR_CODES)('accepts the %s code', (code) => {
    const response = { error: { code, retryAfterSeconds: null } };
    expect(apiErrorResponseSchema.safeParse(response).success).toBe(true);
  });

  it('accepts a retry delay for rate limiting', () => {
    const response = { error: { code: 'rate_limited', retryAfterSeconds: 60 } };
    expect(apiErrorResponseSchema.parse(response).error.retryAfterSeconds).toBe(60);
  });

  it('tolerates fields added by newer servers', () => {
    const response = { error: { code: 'provider_error', retryAfterSeconds: null, hint: 'x' } };
    expect(apiErrorResponseSchema.parse(response).error).not.toHaveProperty('hint');
  });

  it.each([
    ['an unknown code', { error: { code: 'teapot', retryAfterSeconds: null } }],
    ['a missing retry delay', { error: { code: 'provider_error' } }],
    ['a zero retry delay', { error: { code: 'rate_limited', retryAfterSeconds: 0 } }],
    ['a missing error object', { code: 'provider_error' }],
  ])('rejects %s', (_label, response) => {
    expect(apiErrorResponseSchema.safeParse(response).success).toBe(false);
  });
});

describe('API_ERROR_HTTP_STATUS', () => {
  it('maps every code to a client or server error status', () => {
    for (const code of API_ERROR_CODES) {
      expect(API_ERROR_HTTP_STATUS[code]).toBeGreaterThanOrEqual(400);
      expect(API_ERROR_HTTP_STATUS[code]).toBeLessThan(600);
    }
  });

  it('uses 429 for rate limiting and 413 for large documents', () => {
    expect(API_ERROR_HTTP_STATUS.rate_limited).toBe(429);
    expect(API_ERROR_HTTP_STATUS.document_too_large).toBe(413);
  });
});
