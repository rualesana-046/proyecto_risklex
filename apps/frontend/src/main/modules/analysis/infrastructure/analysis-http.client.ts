import {
  analysisResponseSchema,
  apiErrorResponseSchema,
  APP_VERSION_HEADER,
  INSTALL_ID_HEADER,
  PROVIDER_TIMEOUT_SECONDS,
  type AnalysisRequest,
  type AnalysisResponse,
} from '@risklex/shared';
import { ClientAnalysisError } from '../domain/client-analysis-error.ts';

export const CLIENT_ATTEMPT_TIMEOUT_MS = (PROVIDER_TIMEOUT_SECONDS + 15) * 1000;
export const ANALYSES_PATH = '/v1/analyses';

export interface AnalysisClient {
  analyze(request: AnalysisRequest, signal: AbortSignal): Promise<AnalysisResponse>;
}

export interface AnalysisHttpClientOptions {
  readonly baseUrl: string;
  readonly installId: string;
  readonly appVersion: string;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
}

interface Signals {
  readonly cancel: AbortSignal;
  readonly timeout: AbortSignal;
}

function abortError(signals: Signals): ClientAnalysisError | null {
  if (signals.cancel.aborted) {
    return new ClientAnalysisError('cancelled');
  }
  if (signals.timeout.aborted) {
    return new ClientAnalysisError('timeout');
  }
  return null;
}

async function readJson(response: Response, signals: Signals): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    const aborted = abortError(signals);
    if (aborted !== null) {
      throw aborted;
    }
    return undefined;
  }
}

function retryAfter(response: Response): number | null {
  const seconds = Number(response.headers.get('retry-after'));
  return Number.isInteger(seconds) && seconds > 0 ? seconds : null;
}

function errorFromBody(response: Response, body: unknown): ClientAnalysisError {
  const parsed = apiErrorResponseSchema.safeParse(body);
  if (parsed.success) {
    return new ClientAnalysisError(parsed.data.error.code, parsed.data.error.retryAfterSeconds);
  }
  if (response.status === 429) {
    return new ClientAnalysisError('rate_limited', retryAfter(response));
  }
  return new ClientAnalysisError('unexpected');
}

async function send(
  options: AnalysisHttpClientOptions,
  request: AnalysisRequest,
  signals: Signals,
): Promise<Response> {
  try {
    return await (options.fetch ?? fetch)(new URL(ANALYSES_PATH, options.baseUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [INSTALL_ID_HEADER]: options.installId,
        [APP_VERSION_HEADER]: options.appVersion,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.any([signals.cancel, signals.timeout]),
    });
  } catch {
    throw abortError(signals) ?? new ClientAnalysisError('network_unavailable');
  }
}

async function postAnalysis(
  options: AnalysisHttpClientOptions,
  request: AnalysisRequest,
  cancel: AbortSignal,
): Promise<AnalysisResponse> {
  const signals = {
    cancel,
    timeout: AbortSignal.timeout(options.timeoutMs ?? CLIENT_ATTEMPT_TIMEOUT_MS),
  };
  const response = await send(options, request, signals);
  const body = await readJson(response, signals);
  if (!response.ok) {
    throw errorFromBody(response, body);
  }
  const parsed = analysisResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ClientAnalysisError('invalid_response');
  }
  return parsed.data;
}

export function createAnalysisHttpClient(options: AnalysisHttpClientOptions): AnalysisClient {
  return {
    analyze: (request, signal) => postAnalysis(options, request, signal),
  };
}
