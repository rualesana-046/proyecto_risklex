import { AI_PROVIDER_CONFIG } from '../../../config/ai-provider.config.ts';
import type { ModelAnalysisRequest } from '../domain/language-model.port.ts';
import { buildDocumentMessage, buildSystemPrompt } from './analysis-prompt.ts';
import modelOutputJsonSchema from './model-output.schema.json';

export interface MessagesRequestBody {
  readonly model: string;
  readonly max_tokens: number;
  readonly system: string;
  readonly messages: readonly [{ readonly role: 'user'; readonly content: string }];
  readonly thinking: { readonly type: string };
  readonly output_config: {
    readonly effort: string;
    readonly format: { readonly type: 'json_schema'; readonly schema: unknown };
  };
}

export function buildMessagesRequestBody(request: ModelAnalysisRequest): MessagesRequestBody {
  return {
    model: AI_PROVIDER_CONFIG.model,
    max_tokens: AI_PROVIDER_CONFIG.maxTokens,
    system: buildSystemPrompt(request.language),
    messages: [{ role: 'user', content: buildDocumentMessage(request.text) }],
    thinking: AI_PROVIDER_CONFIG.thinking,
    output_config: {
      effort: AI_PROVIDER_CONFIG.effort,
      format: { type: 'json_schema', schema: modelOutputJsonSchema },
    },
  };
}

export function buildMessagesHeaders(apiKey: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': AI_PROVIDER_CONFIG.apiVersion,
  };
}
