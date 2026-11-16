import type { LookupAddress } from 'node:dns';
import { describe, expect, it, vi } from 'vitest';
import { pinnedLookup } from './https-transport.ts';

describe('pinnedLookup', () => {
  const lookup = pinnedLookup({ address: '93.184.215.14', family: 4 });

  it('answers a single lookup with the validated address only', () => {
    const callback = vi.fn();
    lookup('example.com', {}, callback);
    expect(callback).toHaveBeenCalledWith(null, '93.184.215.14', 4);
  });

  it('answers lookups with all: true, as autoSelectFamily asks, with only the validated address', () => {
    const callback = vi.fn<(error: unknown, addresses: string | LookupAddress[]) => void>();
    lookup('example.com', { all: true }, callback);
    expect(callback).toHaveBeenCalledWith(null, [{ address: '93.184.215.14', family: 4 }]);
  });

  it('never resolves the host name again, so rebinding cannot change the target', () => {
    const callback = vi.fn();
    lookup('attacker.example', { all: false }, callback);
    lookup('attacker.example', { all: false }, callback);
    expect(callback.mock.calls.map(([, address]: unknown[]) => address)).toEqual([
      '93.184.215.14',
      '93.184.215.14',
    ]);
  });
});
