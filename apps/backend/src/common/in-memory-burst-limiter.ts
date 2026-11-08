import type { BurstLimiter } from './burst-limiter.ts';

interface Window {
  startedAt: number;
  count: number;
}

const MAX_TRACKED_KEYS = 10_000;

export function createInMemoryBurstLimiter(
  limit: number,
  periodSeconds: number,
  now: () => number = Date.now,
): BurstLimiter {
  const windows = new Map<string, Window>();
  const periodMs = periodSeconds * 1000;

  function forgetExpired(currentTime: number): void {
    for (const [key, window] of windows) {
      if (currentTime - window.startedAt >= periodMs) {
        windows.delete(key);
      }
    }
  }

  return {
    tryConsume(key) {
      const currentTime = now();
      if (windows.size >= MAX_TRACKED_KEYS) {
        forgetExpired(currentTime);
      }
      const window = windows.get(key);
      if (!window || currentTime - window.startedAt >= periodMs) {
        windows.set(key, { startedAt: currentTime, count: 1 });
        return Promise.resolve(true);
      }
      window.count += 1;
      return Promise.resolve(window.count <= limit);
    },
  };
}
