export interface BurstLimiter {
  tryConsume(key: string): Promise<boolean>;
}

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export function isRateLimitBinding(value: unknown): value is RateLimitBinding {
  return (
    typeof value === 'object' &&
    value !== null &&
    'limit' in value &&
    typeof value.limit === 'function'
  );
}

export function createBindingBurstLimiter(
  binding: RateLimitBinding,
  fallback: BurstLimiter,
): BurstLimiter {
  return {
    async tryConsume(key) {
      try {
        const outcome = await binding.limit({ key });
        return outcome.success;
      } catch {
        return fallback.tryConsume(key);
      }
    },
  };
}

export function resolveBurstLimiter(
  env: unknown,
  bindingName: string,
  fallback: BurstLimiter,
): BurstLimiter {
  if (typeof env !== 'object' || env === null || !(bindingName in env)) {
    return fallback;
  }
  const candidate: unknown = (env as Record<string, unknown>)[bindingName];
  return isRateLimitBinding(candidate) ? createBindingBurstLimiter(candidate, fallback) : fallback;
}
