import { INSTALL_ID_HEADER, installIdSchema } from '@risklex/shared';
import { createMiddleware } from 'hono/factory';
import type { BurstLimiter } from './burst-limiter.ts';
import { errorResponse } from './http-error.ts';

export interface BurstLimiters {
  readonly install: BurstLimiter;
  readonly ip: BurstLimiter;
}

export interface RateLimitOptions {
  readonly resolveLimiters: (env: unknown) => BurstLimiters;
  readonly retryAfterSeconds: number;
}

const CLIENT_IP_HEADER = 'cf-connecting-ip';

export function rateLimit(options: RateLimitOptions) {
  return createMiddleware(async (context, next) => {
    const installId = installIdSchema.safeParse(context.req.header(INSTALL_ID_HEADER));
    if (!installId.success) {
      return errorResponse(context, 'invalid_request');
    }
    const limiters = options.resolveLimiters(context.env);
    const clientIp = context.req.header(CLIENT_IP_HEADER) ?? 'unknown';
    const allowed =
      (await limiters.ip.tryConsume(`ip:${clientIp}`)) &&
      (await limiters.install.tryConsume(`install:${installId.data}`));
    if (!allowed) {
      return errorResponse(context, 'rate_limited', options.retryAfterSeconds);
    }
    await next();
    return undefined;
  });
}
