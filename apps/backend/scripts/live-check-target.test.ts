import { describe, expect, it } from 'vitest';
import { UnsafeTargetError, validateBaseUrl } from './live-check-target.ts';

describe('validateBaseUrl', () => {
  it.each([
    'http://localhost:8787',
    'http://127.0.0.1:8787',
    'http://localhost',
    'https://example-api.example-account.workers.dev',
    'https://EXAMPLE-API.EXAMPLE-ACCOUNT.WORKERS.DEV',
  ])('accepts %s', (raw) => {
    expect(validateBaseUrl(raw)).toBeInstanceOf(URL);
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
    expect(() => validateBaseUrl(raw)).toThrow(UnsafeTargetError);
  });

  it('rejects credentials in an otherwise allowed address and explains why', () => {
    const url = new URL('https://example-api.example-account.workers.dev');
    url.username = 'user';
    url.password = 'secret';
    expect(() => validateBaseUrl(url.href)).toThrow(
      'Refusing to send the document: the base URL must not contain credentials.',
    );
  });
});
