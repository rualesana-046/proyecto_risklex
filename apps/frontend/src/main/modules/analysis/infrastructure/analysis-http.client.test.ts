import { API_ERROR_CODES, type AnalysisResponse } from '@risklex/shared';
import { describe, expect, it, vi } from 'vitest';
import { ClientAnalysisError } from '../domain/client-analysis-error.ts';
import { CLIENT_ATTEMPT_TIMEOUT_MS, createAnalysisHttpClient } from './analysis-http.client.ts';

const BASE_URL = 'https://example-api.example-account.workers.dev/';
const INSTALL_ID = '6f1d2c4e-8a3b-4c5d-9e7f-0a1b2c3d4e5f';
const REQUEST = {
  text: 'The service may share your email address with partners.',
  language: 'es',
} as const;

const assessment = {
  severity: 'warning',
  meaning: 'Meaning.',
  consequence: 'Consequence.',
} as const;

const VALID_RESPONSE: AnalysisResponse = {
  result: {
    clauses: [
      {
        id: 'clause-1',
        category: 'privacy',
        title: 'Sharing with partners',
        quote: 'may share your email address with partners',
        evidenceStatus: 'supported',
        isAmbiguous: false,
        ambiguityReason: '',
        confidence: 'high',
        entities: [],
        profiles: { free_user: assessment, subscriber: assessment, professional: assessment },
      },
    ],
    glossary: [],
  },
  meta: {
    promptVersion: '2026-11-14.1',
    model: 'claude-sonnet-5-5',
    language: 'es',
    moreClausesLikely: false,
    usage: { inputTokens: 100, outputTokens: 50 },
  },
};

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function clientWith(fetchImpl: typeof fetch, timeoutMs?: number) {
  return createAnalysisHttpClient({
    baseUrl: BASE_URL,
    installId: INSTALL_ID,
    appVersion: '0.1.0',
    fetch: fetchImpl,
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
}

function hangingFetch(): typeof fetch {
  return (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new Error('aborted'));
      });
    });
}

async function errorOf(promise: Promise<unknown>): Promise<ClientAnalysisError> {
  const error: unknown = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ClientAnalysisError);
  return error as ClientAnalysisError;
}

describe('analysis http client (simulated fetch)', () => {
  it('waits at least the provider timeout plus fifteen seconds per attempt', () => {
    expect(CLIENT_ATTEMPT_TIMEOUT_MS).toBe(135_000);
  });

  it('posts the request with the install and version headers', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(VALID_RESPONSE));
    const result = await clientWith(fetchMock).analyze(REQUEST, new AbortController().signal);
    expect(result).toEqual(VALID_RESPONSE);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toEqual(new URL(`${BASE_URL}v1/analyses`));
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'x-install-id': INSTALL_ID, 'x-app-version': '0.1.0' });
    expect(typeof init?.body === 'string' ? JSON.parse(init.body) : null).toEqual(REQUEST);
  });

  it.each([
    ['an out of schema body', jsonResponse({ result: {} })],
    ['a non json body', new Response('<html></html>', { status: 200 })],
  ])('rejects %s as an invalid response', async (_label, response) => {
    const error = await errorOf(
      clientWith(() => Promise.resolve(response)).analyze(REQUEST, new AbortController().signal),
    );
    expect(error.code).toBe('invalid_response');
  });

  it.each(API_ERROR_CODES)('maps the api error %s', async (code) => {
    const body = { error: { code, retryAfterSeconds: code === 'rate_limited' ? 30 : null } };
    const error = await errorOf(
      clientWith(() => Promise.resolve(jsonResponse(body, 400))).analyze(
        REQUEST,
        new AbortController().signal,
      ),
    );
    expect(error.code).toBe(code);
    expect(error.retryAfterSeconds).toBe(code === 'rate_limited' ? 30 : null);
  });

  it('reads Retry-After when a 429 has no api body', async () => {
    const response = new Response('busy', { status: 429, headers: { 'retry-after': '20' } });
    const error = await errorOf(
      clientWith(() => Promise.resolve(response)).analyze(REQUEST, new AbortController().signal),
    );
    expect(error.code).toBe('rate_limited');
    expect(error.retryAfterSeconds).toBe(20);
  });

  it('treats an unknown error page as unexpected', async () => {
    const response = new Response('<html>bad gateway</html>', { status: 502 });
    const error = await errorOf(
      clientWith(() => Promise.resolve(response)).analyze(REQUEST, new AbortController().signal),
    );
    expect(error.code).toBe('unexpected');
  });

  it('reports a network failure', async () => {
    const error = await errorOf(
      clientWith(() => Promise.reject(new TypeError('fetch failed'))).analyze(
        REQUEST,
        new AbortController().signal,
      ),
    );
    expect(error.code).toBe('network_unavailable');
  });

  it('reports a timeout when the attempt takes too long', async () => {
    const error = await errorOf(
      clientWith(hangingFetch(), 20).analyze(REQUEST, new AbortController().signal),
    );
    expect(error.code).toBe('timeout');
  });

  it('reports a cancellation', async () => {
    const controller = new AbortController();
    const pending = clientWith(hangingFetch()).analyze(REQUEST, controller.signal);
    controller.abort();
    const error = await errorOf(pending);
    expect(error.code).toBe('cancelled');
  });
});
