import { PROVIDER_TIMEOUT_SECONDS } from '@risklex/shared';

export const AI_PROVIDER_CONFIG = {
  messagesUrl: 'https://api.anthropic.com/v1/messages',
  apiVersion: '2026-10-21',
  model: 'claude-sonnet-5-5',
  thinking: { type: 'adaptive' },
  effort: 'medium',
  maxTokens: 20_000,
  timeoutSeconds: PROVIDER_TIMEOUT_SECONDS,
  pricing: {
    inputUsdPerMillionTokens: 2,
    outputUsdPerMillionTokens: 10,
  },
} as const;
