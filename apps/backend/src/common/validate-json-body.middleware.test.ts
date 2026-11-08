import {
  analysisRequestSchema,
  apiErrorResponseSchema,
  MAX_DOCUMENT_CHARACTERS,
  MAX_REQUEST_BYTES,
} from '@risklex/shared';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { validateJsonBody } from './validate-json-body.middleware.ts';

const app = new Hono().post(
  '/analyses',
  validateJsonBody(analysisRequestSchema, MAX_REQUEST_BYTES),
  (context) => context.json({ length: context.get('body').text.length }),
);

interface SendOptions {
  readonly contentLength?: string | null;
  readonly contentType?: string;
}

function send(body: string, options: SendOptions = {}): Promise<Response> {
  const headers = new Headers({ 'content-type': options.contentType ?? 'application/json' });
  const contentLength =
    options.contentLength === undefined
      ? String(new TextEncoder().encode(body).byteLength)
      : options.contentLength;
  if (contentLength !== null) {
    headers.set('content-length', contentLength);
  }
  return Promise.resolve(app.request('/analyses', { method: 'POST', headers, body }));
}

async function errorCodeOf(response: Response): Promise<string> {
  return apiErrorResponseSchema.parse(await response.json()).error.code;
}

const validBody = JSON.stringify({ text: 'Terms of service text.', language: 'en' });

describe('validateJsonBody', () => {
  it('passes a valid body to the handler', async () => {
    const response = await send(validBody);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ length: 22 });
  });

  it('accepts a document at the maximum length', async () => {
    const body = JSON.stringify({ text: 'a'.repeat(MAX_DOCUMENT_CHARACTERS), language: 'es' });
    expect((await send(body)).status).toBe(200);
  });

  it('rejects a declared length over the limit before reading the body', async () => {
    const response = await send(validBody, { contentLength: String(MAX_REQUEST_BYTES + 1) });
    expect(response.status).toBe(413);
    expect(await errorCodeOf(response)).toBe('document_too_large');
  });

  it('rejects a document longer than the maximum characters', async () => {
    const body = JSON.stringify({ text: 'a'.repeat(MAX_DOCUMENT_CHARACTERS + 1), language: 'es' });
    const response = await send(body);
    expect(response.status).toBe(413);
    expect(await errorCodeOf(response)).toBe('document_too_large');
  });

  it.each([
    ['a missing content length', validBody, { contentLength: null }],
    ['a non numeric content length', validBody, { contentLength: 'abc' }],
    ['a non json content type', validBody, { contentType: 'text/plain' }],
    ['malformed json', '{"text": "Terms', {}],
    ['an unsupported language', JSON.stringify({ text: 'Terms.', language: 'fr' }), {}],
    ['an unexpected field', JSON.stringify({ text: 'T.', language: 'es', url: 'x' }), {}],
    ['empty text', JSON.stringify({ text: '   ', language: 'es' }), {}],
  ])('rejects %s as an invalid request', async (_label, body, options: SendOptions) => {
    const response = await send(body, options);
    expect(response.status).toBe(400);
    expect(await errorCodeOf(response)).toBe('invalid_request');
  });

  it('returns errors with a null retry delay and no retry header', async () => {
    const response = await send('{', {});
    expect(response.headers.get('retry-after')).toBeNull();
    expect(apiErrorResponseSchema.parse(await response.json()).error.retryAfterSeconds).toBeNull();
  });
});
