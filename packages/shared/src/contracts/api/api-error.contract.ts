import { z } from 'zod';

export const API_ERROR_CODES = [
  'invalid_request',
  'document_too_large',
  'rate_limited',
  'provider_error',
  'provider_refusal',
  'output_truncated',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const API_ERROR_HTTP_STATUS = {
  invalid_request: 400,
  document_too_large: 413,
  rate_limited: 429,
  provider_error: 502,
  provider_refusal: 422,
  output_truncated: 502,
} as const satisfies Record<ApiErrorCode, number>;

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    retryAfterSeconds: z.number().int().positive().nullable(),
  }),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
