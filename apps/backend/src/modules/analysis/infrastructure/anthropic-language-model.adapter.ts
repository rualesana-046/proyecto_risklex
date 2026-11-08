import { AI_PROVIDER_CONFIG } from '../../../config/ai-provider.config.ts';
import { AnalysisError } from '../domain/analysis-error.ts';
import type {
  LanguageModel,
  ModelAnalysis,
  ModelAnalysisRequest,
} from '../domain/language-model.port.ts';
import { buildMessagesHeaders, buildMessagesRequestBody } from './anthropic-request.ts';
import { parseMessagesResponse } from './anthropic-response.ts';

export type FetchFunction = (input: string, init: RequestInit) => Promise<Response>;

export interface AnthropicLanguageModelOptions {
  readonly apiKey: string;
  readonly fetchFunction?: FetchFunction;
  readonly timeoutMs?: number;
}

async function send(options: AnthropicLanguageModelOptions, body: string): Promise<Response> {
  const fetchFunction = options.fetchFunction ?? fetch;
  try {
    return await fetchFunction(AI_PROVIDER_CONFIG.messagesUrl, {
      method: 'POST',
      headers: buildMessagesHeaders(options.apiKey),
      body,
      signal: AbortSignal.timeout(options.timeoutMs ?? AI_PROVIDER_CONFIG.timeoutSeconds * 1000),
    });
  } catch {
    throw new AnalysisError('provider_error');
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new AnalysisError('provider_error');
  }
}

export function createAnthropicLanguageModel(
  options: AnthropicLanguageModelOptions,
): LanguageModel {
  return {
    async analyze(request: ModelAnalysisRequest): Promise<ModelAnalysis> {
      const response = await send(options, JSON.stringify(buildMessagesRequestBody(request)));
      if (!response.ok) {
        throw new AnalysisError('provider_error');
      }
      return parseMessagesResponse(await readJson(response));
    },
  };
}
