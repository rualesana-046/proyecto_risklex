import { describe, expect, it } from 'vitest';
import {
  createBindingBurstLimiter,
  resolveBurstLimiter,
  type RateLimitBinding,
} from './burst-limiter.ts';
import { createInMemoryBurstLimiter } from './in-memory-burst-limiter.ts';

function clock(start = 0): { now: () => number; advance: (ms: number) => void } {
  let time = start;
  return {
    now: () => time,
    advance: (ms) => {
      time += ms;
    },
  };
}

async function consumeTimes(
  limiter: ReturnType<typeof createInMemoryBurstLimiter>,
  key: string,
  times: number,
): Promise<boolean[]> {
  const results: boolean[] = [];
  for (let index = 0; index < times; index += 1) {
    results.push(await limiter.tryConsume(key));
  }
  return results;
}

describe('createInMemoryBurstLimiter', () => {
  it('allows up to the limit inside one period', async () => {
    const limiter = createInMemoryBurstLimiter(3, 60, clock().now);
    expect(await consumeTimes(limiter, 'install:a', 4)).toEqual([true, true, true, false]);
  });

  it('counts each key separately', async () => {
    const limiter = createInMemoryBurstLimiter(1, 60, clock().now);
    expect(await limiter.tryConsume('install:a')).toBe(true);
    expect(await limiter.tryConsume('install:b')).toBe(true);
    expect(await limiter.tryConsume('install:a')).toBe(false);
  });

  it('starts a new window after the period ends', async () => {
    const time = clock();
    const limiter = createInMemoryBurstLimiter(1, 60, time.now);
    expect(await limiter.tryConsume('ip:1')).toBe(true);
    expect(await limiter.tryConsume('ip:1')).toBe(false);
    time.advance(60_000);
    expect(await limiter.tryConsume('ip:1')).toBe(true);
  });

  it('keeps working when many keys are tracked', async () => {
    const time = clock();
    const limiter = createInMemoryBurstLimiter(1, 60, time.now);
    for (let index = 0; index < 10_000; index += 1) {
      await limiter.tryConsume(`ip:${String(index)}`);
    }
    time.advance(60_000);
    expect(await limiter.tryConsume('ip:new')).toBe(true);
    expect(await limiter.tryConsume('ip:new')).toBe(false);
  });
});

describe('resolveBurstLimiter', () => {
  const fallback = createInMemoryBurstLimiter(1, 60, clock().now);
  const binding: RateLimitBinding = {
    limit: ({ key }) => Promise.resolve({ success: key !== 'blocked' }),
  };

  it.each([
    ['an undefined env', undefined],
    ['an env without the binding', { OTHER: 1 }],
    ['an env with an invalid binding', { INSTALL_RATE_LIMITER: { limit: 'no' } }],
  ])('uses the in-memory fallback for %s', (_label, env) => {
    expect(resolveBurstLimiter(env, 'INSTALL_RATE_LIMITER', fallback)).toBe(fallback);
  });

  it('uses the Workers binding when the env provides it', async () => {
    const limiter = resolveBurstLimiter(
      { INSTALL_RATE_LIMITER: binding },
      'INSTALL_RATE_LIMITER',
      fallback,
    );
    expect(limiter).not.toBe(fallback);
    expect(await limiter.tryConsume('allowed')).toBe(true);
    expect(await limiter.tryConsume('blocked')).toBe(false);
  });

  it('lets requests through when the binding fails', async () => {
    const failing: RateLimitBinding = { limit: () => Promise.reject(new Error('unavailable')) };
    expect(await createBindingBurstLimiter(failing).tryConsume('any')).toBe(true);
  });
});
