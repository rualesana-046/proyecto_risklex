import { describe, expect, it } from 'vitest';
import { assertReleaseEnvironment, RELEASE_URL_ERROR } from './release-environment.ts';

const EXAMPLE_URL = 'https://example-api.example-account.workers.dev';

function errorMessage(mode: string, url: string | undefined): string | null {
  try {
    assertReleaseEnvironment(mode, { MAIN_VITE_RISKLEX_API_URL: url });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'unknown';
  }
}

describe('assertReleaseEnvironment', () => {
  it('accepts an https workers address in release mode', () => {
    expect(errorMessage('release', EXAMPLE_URL)).toBeNull();
  });

  it.each([undefined, '', '   ', 'http://localhost:8787', 'https://example.com', 'not a url'])(
    'rejects %j in release mode without echoing the value',
    (url) => {
      const message = errorMessage('release', url);
      expect(message).toBe(RELEASE_URL_ERROR);
      if (url !== undefined && url.trim() !== '') {
        expect(message).not.toContain(url.trim());
      }
    },
  );

  it.each(['production', 'development', ''])('does not require the url in %j mode', (mode) => {
    expect(errorMessage(mode, undefined)).toBeNull();
  });
});
