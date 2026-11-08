import type { ApiErrorCode } from '@risklex/shared';
import { createMiddleware } from 'hono/factory';
import type { z } from 'zod';
import { errorResponse } from './http-error.ts';

const DIGITS_ONLY = /^\d+$/u;

function declaredLength(header: string | undefined): number | null {
  return header !== undefined && DIGITS_ONLY.test(header) ? Number(header) : null;
}

function isJsonContentType(header: string | undefined): boolean {
  return header?.toLowerCase().startsWith('application/json') ?? false;
}

function parseJson(raw: ArrayBuffer): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return undefined;
  }
}

function schemaErrorCode(error: z.ZodError): ApiErrorCode {
  const textTooLong = error.issues.some(
    (issue) => issue.code === 'too_big' && issue.path[0] === 'text',
  );
  return textTooLong ? 'document_too_large' : 'invalid_request';
}

export function validateJsonBody<Schema extends z.ZodType>(schema: Schema, maxBytes: number) {
  return createMiddleware<{ Variables: { body: z.infer<Schema> } }>(async (context, next) => {
    const length = declaredLength(context.req.header('content-length'));
    if (length === null || !isJsonContentType(context.req.header('content-type'))) {
      return errorResponse(context, 'invalid_request');
    }
    if (length > maxBytes) {
      return errorResponse(context, 'document_too_large');
    }
    const raw = await context.req.arrayBuffer();
    if (raw.byteLength > maxBytes) {
      return errorResponse(context, 'document_too_large');
    }
    const parsed = schema.safeParse(parseJson(raw));
    if (!parsed.success) {
      return errorResponse(context, schemaErrorCode(parsed.error));
    }
    context.set('body', parsed.data);
    await next();
    return undefined;
  });
}
