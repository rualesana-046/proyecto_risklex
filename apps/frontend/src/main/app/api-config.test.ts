import { describe, expect, it } from 'vitest';
import { resolveApiConfig } from './api-config.ts';

const WORKERS_URL = 'https://example-api.example-account.workers.dev';

describe('resolveApiConfig', () => {
  it('accepts a workers address in the packaged app', () => {
    expect(resolveApiConfig(WORKERS_URL, true)).toEqual({
      status: 'ready',
      baseUrl: `${WORKERS_URL}/`,
    });
  });

  it('trims surrounding whitespace', () => {
    expect(resolveApiConfig(`  ${WORKERS_URL}\n`, true)).toEqual({
      status: 'ready',
      baseUrl: `${WORKERS_URL}/`,
    });
  });

  it('accepts a local backend only while the app is not packaged', () => {
    expect(resolveApiConfig('http://localhost:8787', false)).toEqual({
      status: 'ready',
      baseUrl: 'http://localhost:8787/',
    });
    expect(resolveApiConfig('http://localhost:8787', true)).toEqual({ status: 'missing' });
  });

  it.each([undefined, '', '   '])('reports a missing value for %j', (raw) => {
    expect(resolveApiConfig(raw, false)).toEqual({ status: 'missing' });
  });

  it.each(['https://example.com', 'http://example-api.example-account.workers.dev', 'not a url'])(
    'treats the unsafe value %s as missing',
    (raw) => {
      expect(resolveApiConfig(raw, false)).toEqual({ status: 'missing' });
    },
  );
});
