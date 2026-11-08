import { resolveBurstLimiter } from './common/burst-limiter.ts';
import { createInMemoryBurstLimiter } from './common/in-memory-burst-limiter.ts';
import { createLogger, type Logger } from './common/logger.ts';
import type { BurstLimiters } from './common/rate-limit.middleware.ts';
import { RATE_LIMITS } from './config/limits.config.ts';
import {
  createAnalyzeDocument,
  type AnalyzeDocument,
} from './modules/analysis/application/analyze-document.use-case.ts';
import { PROMPT_VERSION } from './modules/analysis/infrastructure/analysis-prompt.ts';
import { createAnthropicLanguageModel } from './modules/analysis/infrastructure/anthropic-language-model.adapter.ts';

export const SERVICE_VERSION = '0.1.0';

const API_KEY_BINDING = 'ANTHROPIC_API_KEY';

export interface AppDependencies {
  readonly logger: Logger;
  readonly serviceVersion: string;
  readonly retryAfterSeconds: number;
  readonly resolveLimiters: (env: unknown) => BurstLimiters;
  readonly createAnalyzer: (env: unknown) => AnalyzeDocument | null;
}

function readSecret(env: unknown, name: string): string | null {
  if (typeof env !== 'object' || env === null || !(name in env)) {
    return null;
  }
  const value: unknown = Reflect.get(env, name);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function createDependencies(): AppDependencies {
  const fallback: BurstLimiters = {
    install: createInMemoryBurstLimiter(
      RATE_LIMITS.install.limit,
      RATE_LIMITS.install.periodSeconds,
    ),
    ip: createInMemoryBurstLimiter(RATE_LIMITS.ip.limit, RATE_LIMITS.ip.periodSeconds),
  };
  return {
    logger: createLogger(),
    serviceVersion: SERVICE_VERSION,
    retryAfterSeconds: RATE_LIMITS.install.periodSeconds,
    resolveLimiters: (env) => ({
      install: resolveBurstLimiter(env, RATE_LIMITS.install.bindingName, fallback.install),
      ip: resolveBurstLimiter(env, RATE_LIMITS.ip.bindingName, fallback.ip),
    }),
    createAnalyzer: (env) => {
      const apiKey = readSecret(env, API_KEY_BINDING);
      return apiKey === null
        ? null
        : createAnalyzeDocument(createAnthropicLanguageModel({ apiKey }), PROMPT_VERSION);
    },
  };
}
