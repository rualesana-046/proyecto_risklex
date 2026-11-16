import type { Readable } from 'node:stream';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';

export interface TransportResponse {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly body: Readable;
}

export type LinkFetchErrorCode =
  | 'link_invalid'
  | 'link_blocked'
  | 'link_unreachable'
  | 'link_timeout'
  | 'link_too_many_redirects'
  | 'link_forbidden'
  | 'link_not_found'
  | 'link_rate_limited'
  | 'link_server_error'
  | 'link_http_error'
  | 'link_unsupported_type'
  | 'link_too_large'
  | 'document_cancelled';

const CONTENT_KINDS: Readonly<Record<string, 'html' | 'text' | 'pdf'>> = {
  'text/html': 'html',
  'application/xhtml+xml': 'html',
  'text/plain': 'text',
  'application/pdf': 'pdf',
};

export class FetchFailure extends Error {
  readonly code: LinkFetchErrorCode;

  constructor(code: LinkFetchErrorCode) {
    super(code);
    this.code = code;
  }
}

export function header(response: TransportResponse, name: string): string {
  const value = response.headers[name];
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

function decoder(encoding: string, body: Readable): Readable {
  const name = encoding.trim().toLowerCase();
  if (name === '' || name === 'identity') {
    return body;
  }
  const streams: Readonly<Record<string, () => Readable>> = {
    gzip: () => body.pipe(createGunzip()),
    'x-gzip': () => body.pipe(createGunzip()),
    deflate: () => body.pipe(createInflate()),
    br: () => body.pipe(createBrotliDecompress()),
  };
  const create = streams[name];
  if (create === undefined) {
    throw new FetchFailure('link_unsupported_type');
  }
  return create();
}

export async function readLimited(response: TransportResponse, limit: number): Promise<Uint8Array> {
  if (Number(header(response, 'content-length')) > limit) {
    response.body.destroy();
    throw new FetchFailure('link_too_large');
  }
  const stream = decoder(header(response, 'content-encoding'), response.body);
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += buffer.length;
    if (total > limit) {
      stream.destroy();
      response.body.destroy();
      throw new FetchFailure('link_too_large');
    }
    chunks.push(buffer);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

export function contentKind(response: TransportResponse): {
  kind: 'html' | 'text' | 'pdf';
  charset: string | null;
} {
  const [type = '', ...parameters] = header(response, 'content-type').split(';');
  const kind = CONTENT_KINDS[type.trim().toLowerCase()];
  if (kind === undefined) {
    throw new FetchFailure('link_unsupported_type');
  }
  const charset = parameters
    .map((parameter) => parameter.trim().split('='))
    .find(([key]) => key?.toLowerCase() === 'charset')?.[1];
  return { kind, charset: charset?.replaceAll('"', '').trim() ?? null };
}
