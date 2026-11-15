import { describe, expect, it } from 'vitest';
import { UnsafeApiBaseUrlError, validateApiBaseUrl } from './api-base-url.ts';

describe('validateApiBaseUrl', () => {
  it.each([
    'http://localhost:8787',
    'http://127.0.0.1:8787',
    'http://localhost',
    'https://example-api.example-account.workers.dev',
    'https://EXAMPLE-API.EXAMPLE-ACCOUNT.WORKERS.DEV',
  ])('accepts %s', (raw) => {
    expect(validateApiBaseUrl(raw).href).toBe(
      raw.toLowerCase().endsWith('/') ? raw.toLowerCase() : `${raw.toLowerCase()}/`,
    );
  });

  it.each([
    ['plain http to a workers address', 'http://example-api.example-account.workers.dev'],
    ['https to localhost', 'https://localhost:8787'],
    ['another domain', 'https://example.com'],
    ['the bare workers domain', 'https://workers.dev'],
    ['a look-alike suffix', 'https://example.workers.dev.attacker.test'],
    ['a look-alike local host', 'http://localhost.attacker.test'],
    ['a private address', 'http://192.168.1.10:8787'],
    ['an IPv6 loopback', 'http://[::1]:8787'],
    ['another scheme', 'ftp://localhost'],
    ['an invalid URL', 'not a url'],
  ])('rejects %s', (_label, raw) => {
    expect(() => validateApiBaseUrl(raw)).toThrow(UnsafeApiBaseUrlError);
  });

  it('rejects credentials in an otherwise allowed address and explains why', () => {
    const username = 'user';
    const password = 'secret';
    const raw = `https://${username}:${password}@example-api.example-account.workers.dev`;
    expect(() => validateApiBaseUrl(raw)).toThrow(
      'Refusing to send the document: the base URL must not contain credentials.',
    );
  });
});
