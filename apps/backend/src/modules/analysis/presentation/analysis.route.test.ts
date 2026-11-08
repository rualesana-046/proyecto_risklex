import {
  analysisResponseSchema,
  apiErrorResponseSchema,
  APP_VERSION_HEADER,
  INSTALL_ID_HEADER,
  type AnalysisResponse,
} from '@risklex/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../../app.ts';
import type { BurstLimiter } from '../../../common/burst-limiter.ts';
import type { LogEntry } from '../../../common/logger.ts';
import type { AnalyzeDocument } from '../application/analyze-document.use-case.ts';
import { AnalysisError } from '../domain/analysis-error.ts';

const INSTALL_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const allowAll: BurstLimiter = { tryConsume: () => Promise.resolve(true) };

const cannedResponse: AnalysisResponse = {
  result: { clauses: [], glossary: [] },
  meta: {
    promptVersion: 'v1',
    model: 'claude-sonnet-5-5',
    language: 'es',
    moreClausesLikely: false,
    usage: { inputTokens: 1200, outputTokens: 600 },
  },
};

function buildApp(createAnalyzer: () => AnalyzeDocument | null): {
  app: ReturnType<typeof createApp>;
  entries: LogEntry[];
} {
  const entries: LogEntry[] = [];
  const app = createApp({
    logger: { log: (entry) => entries.push(entry) },
    serviceVersion: '0.1.0',
    retryAfterSeconds: 60,
    resolveLimiters: () => ({ install: allowAll, ip: allowAll }),
    createAnalyzer,
  });
  return { app, entries };
}

function post(
  app: ReturnType<typeof createApp>,
  body: unknown,
  appVersion = '0.1.0',
): Promise<Response> {
  const text = JSON.stringify(body);
  return Promise.resolve(
    app.request('/v1/analyses', {
      method: 'POST',
      body: text,
      headers: {
        'content-type': 'application/json',
        'content-length': String(new TextEncoder().encode(text).byteLength),
        [INSTALL_ID_HEADER]: INSTALL_ID,
        [APP_VERSION_HEADER]: appVersion,
      },
    }),
  );
}

const validBody = { text: 'Términos del servicio de ejemplo.', language: 'es' };

describe('POST /v1/analyses (simulated analyzer)', () => {
  it('returns the analysis and logs only metadata', async () => {
    const { app, entries } = buildApp(() => () => Promise.resolve(cannedResponse));
    const response = await post(app, validBody);
    expect(response.status).toBe(200);
    expect(analysisResponseSchema.parse(await response.json())).toEqual(cannedResponse);
    expect(entries).toEqual([
      expect.objectContaining({
        event: 'request_completed',
        route: '/v1/analyses',
        status: 200,
        errorCode: null,
        textLength: validBody.text.length,
        inputTokens: 1200,
        outputTokens: 600,
        appVersion: '0.1.0',
      }),
    ]);
  });

  it.each([
    ['provider_refusal', 422],
    ['output_truncated', 502],
    ['provider_error', 502],
  ] as const)('maps %s from the analyzer to HTTP %i', async (code, status) => {
    const { app, entries } = buildApp(() => () => Promise.reject(new AnalysisError(code)));
    const response = await post(app, validBody);
    expect(response.status).toBe(status);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(code);
    expect(entries[0]).toMatchObject({ event: 'request_failed', errorCode: code, status });
  });

  it('answers provider_error when the API key is missing', async () => {
    const { app, entries } = buildApp(() => null);
    const response = await post(app, validBody);
    expect(response.status).toBe(502);
    expect(entries[0]).toMatchObject({ errorCode: 'provider_error' });
  });

  it('answers provider_error for unexpected analyzer failures', async () => {
    const { app } = buildApp(() => () => Promise.reject(new Error('boom')));
    const response = await post(app, validBody);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('provider_error');
  });

  it('uses the global error handler when composition fails', async () => {
    const { app, entries } = buildApp(() => {
      throw new Error('composition failed');
    });
    const response = await post(app, validBody);
    expect(response.status).toBe(502);
    expect(entries[0]).toMatchObject({ event: 'request_failed', errorCode: 'provider_error' });
  });

  it('records a null app version when the header is invalid', async () => {
    const { app, entries } = buildApp(() => () => Promise.resolve(cannedResponse));
    await post(app, validBody, 'latest');
    expect(entries[0]?.appVersion).toBeNull();
  });

  it('rejects an invalid body before calling the analyzer', async () => {
    let calls = 0;
    const { app } = buildApp(() => {
      calls += 1;
      return () => Promise.resolve(cannedResponse);
    });
    const response = await post(app, { text: 'x', language: 'fr' });
    expect(response.status).toBe(400);
    expect(calls).toBe(0);
  });
});
