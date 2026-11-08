import {
  analysisRequestSchema,
  API_ERROR_HTTP_STATUS,
  APP_VERSION_HEADER,
  appVersionSchema,
  MAX_REQUEST_BYTES,
  type AnalysisRequest,
  type AnalysisResponse,
} from '@risklex/shared';
import { Hono } from 'hono';
import { errorResponse } from '../../../common/http-error.ts';
import type { LogEntry } from '../../../common/logger.ts';
import { rateLimit } from '../../../common/rate-limit.middleware.ts';
import { validateJsonBody } from '../../../common/validate-json-body.middleware.ts';
import type { AppDependencies } from '../../../composition-root.ts';
import type { AnalyzeDocument } from '../application/analyze-document.use-case.ts';
import { isAnalysisError, type AnalysisErrorCode } from '../domain/analysis-error.ts';

export const ANALYSES_ROUTE = '/v1/analyses';

type Outcome =
  | { readonly ok: true; readonly response: AnalysisResponse }
  | { readonly ok: false; readonly code: AnalysisErrorCode };

async function runAnalysis(
  analyze: AnalyzeDocument | null,
  body: AnalysisRequest,
): Promise<Outcome> {
  if (analyze === null) {
    return { ok: false, code: 'provider_error' };
  }
  try {
    return { ok: true, response: await analyze(body) };
  } catch (error) {
    return { ok: false, code: isAnalysisError(error) ? error.code : 'provider_error' };
  }
}

function logEntry(
  outcome: Outcome,
  textLength: number,
  appVersion: string | null,
  durationMs: number,
): LogEntry {
  return {
    event: outcome.ok ? 'request_completed' : 'request_failed',
    route: ANALYSES_ROUTE,
    status: outcome.ok ? 200 : API_ERROR_HTTP_STATUS[outcome.code],
    errorCode: outcome.ok ? null : outcome.code,
    durationMs,
    textLength,
    inputTokens: outcome.ok ? outcome.response.meta.usage.inputTokens : null,
    outputTokens: outcome.ok ? outcome.response.meta.usage.outputTokens : null,
    appVersion,
  };
}

export function createAnalysisRoute(dependencies: AppDependencies): Hono {
  const route = new Hono();
  route.post(
    '/',
    rateLimit({
      resolveLimiters: dependencies.resolveLimiters,
      retryAfterSeconds: dependencies.retryAfterSeconds,
    }),
    validateJsonBody(analysisRequestSchema, MAX_REQUEST_BYTES),
    async (context) => {
      const startedAt = Date.now();
      const body = context.get('body');
      const appVersion = appVersionSchema.safeParse(context.req.header(APP_VERSION_HEADER));
      const outcome = await runAnalysis(dependencies.createAnalyzer(context.env), body);
      const version = appVersion.success ? appVersion.data : null;
      dependencies.logger.log(logEntry(outcome, body.text.length, version, Date.now() - startedAt));
      return outcome.ok ? context.json(outcome.response) : errorResponse(context, outcome.code);
    },
  );
  return route;
}
