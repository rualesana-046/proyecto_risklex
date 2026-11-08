import { apiErrorResponseSchema, INSTALL_ID_HEADER } from '@risklex/shared';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { createInMemoryBurstLimiter } from './in-memory-burst-limiter.ts';
import { rateLimit, type BurstLimiters } from './rate-limit.middleware.ts';

const INSTALL_A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const INSTALL_B = '9b2f1c7e-1d2a-4c3b-8e4f-5a6b7c8d9e0f';

function buildApp(limiters: BurstLimiters): Hono {
  return new Hono().post(
    '/analyses',
    rateLimit({ resolveLimiters: () => limiters, retryAfterSeconds: 60 }),
    (context) => context.json({ ok: true }),
  );
}

function freshLimiters(installLimit = 3, ipLimit = 5): BurstLimiters {
  return {
    install: createInMemoryBurstLimiter(installLimit, 60),
    ip: createInMemoryBurstLimiter(ipLimit, 60),
  };
}

function send(app: Hono, installId: string | null, ip = '203.0.113.7'): Promise<Response> {
  const headers = new Headers({ 'cf-connecting-ip': ip });
  if (installId !== null) {
    headers.set(INSTALL_ID_HEADER, installId);
  }
  return Promise.resolve(app.request('/analyses', { method: 'POST', headers }));
}

async function statuses(
  app: Hono,
  installId: string,
  times: number,
  ip?: string,
): Promise<number[]> {
  const result: number[] = [];
  for (let index = 0; index < times; index += 1) {
    result.push((await send(app, installId, ip)).status);
  }
  return result;
}

describe('rateLimit', () => {
  it('allows three analyses per minute for one installation', async () => {
    const app = buildApp(freshLimiters());
    expect(await statuses(app, INSTALL_A, 4)).toEqual([200, 200, 200, 429]);
  });

  it('allows five analyses per minute for one IP across installations', async () => {
    const app = buildApp(freshLimiters(10, 5));
    const first = await statuses(app, INSTALL_A, 3);
    const second = await statuses(app, INSTALL_B, 3);
    expect([...first, ...second]).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it('keeps separate counters for different IPs', async () => {
    const app = buildApp(freshLimiters(10, 1));
    expect((await send(app, INSTALL_A, '203.0.113.1')).status).toBe(200);
    expect((await send(app, INSTALL_A, '203.0.113.2')).status).toBe(200);
  });

  it('answers 429 with a typed body and a Retry-After header', async () => {
    const app = buildApp(freshLimiters(1, 5));
    await send(app, INSTALL_A);
    const response = await send(app, INSTALL_A);
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(apiErrorResponseSchema.parse(await response.json()).error).toEqual({
      code: 'rate_limited',
      retryAfterSeconds: 60,
    });
  });

  it.each([
    ['a missing install id', null],
    ['an install id that is not a uuid', 'my-computer'],
  ])('rejects %s before counting', async (_label, installId) => {
    const app = buildApp(freshLimiters());
    const response = await send(app, installId);
    expect(response.status).toBe(400);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('invalid_request');
  });
});
