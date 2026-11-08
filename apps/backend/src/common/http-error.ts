import { API_ERROR_HTTP_STATUS, type ApiErrorCode, type ApiErrorResponse } from '@risklex/shared';
import type { Context } from 'hono';

export function errorResponse(
  context: Context,
  code: ApiErrorCode,
  retryAfterSeconds: number | null = null,
): Response {
  const body: ApiErrorResponse = { error: { code, retryAfterSeconds } };
  if (retryAfterSeconds !== null) {
    context.header('Retry-After', String(retryAfterSeconds));
  }
  return context.json(body, API_ERROR_HTTP_STATUS[code]);
}
