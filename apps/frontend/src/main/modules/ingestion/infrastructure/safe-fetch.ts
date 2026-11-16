import { isIP } from 'node:net';
import { PDF_MAX_BYTES } from '../../../../common/document-sources.ts';
import { isPublicAddress, literalAddress, parseLinkTarget } from './address-policy.ts';
import {
  contentKind,
  FetchFailure,
  header,
  readLimited,
  type LinkFetchErrorCode,
  type TransportResponse,
} from './fetch-response.ts';

export type { LinkFetchErrorCode, TransportResponse } from './fetch-response.ts';

export interface ResolvedAddress {
  readonly address: string;
  readonly family: 4 | 6;
}

export type Resolve = (hostname: string) => Promise<readonly ResolvedAddress[]>;

export interface TransportRequest {
  readonly url: URL;
  readonly address: ResolvedAddress;
  readonly headers: Readonly<Record<string, string>>;
  readonly signal: AbortSignal;
}

export type Transport = (request: TransportRequest) => Promise<TransportResponse>;

export type FetchedDocument =
  | {
      readonly ok: true;
      readonly kind: 'html' | 'text' | 'pdf';
      readonly body: Uint8Array;
      readonly charset: string | null;
      readonly host: string;
    }
  | { readonly ok: false; readonly code: LinkFetchErrorCode };

export const LINK_MAX_REDIRECTS = 3;
export const LINK_TIMEOUT_MS = 20_000;
export const LINK_MAX_HTML_BYTES = 5 * 1024 * 1024;
export const LINK_USER_AGENT = 'RiskLex/0.1.0 (terms reader; no JavaScript)';

const REQUEST_HEADERS: Readonly<Record<string, string>> = {
  'user-agent': LINK_USER_AGENT,
  accept: 'text/html, application/xhtml+xml, text/plain;q=0.9, application/pdf;q=0.8',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'es, en;q=0.8',
};

async function resolvePublic(resolve: Resolve, hostname: string): Promise<ResolvedAddress> {
  const literal = literalAddress(hostname);
  if (literal !== null) {
    return { address: literal, family: isIP(literal) === 6 ? 6 : 4 };
  }
  let addresses: readonly ResolvedAddress[];
  try {
    addresses = await resolve(hostname);
  } catch {
    throw new FetchFailure('link_unreachable');
  }
  const [first] = addresses;
  if (first === undefined) {
    throw new FetchFailure('link_unreachable');
  }
  if (!addresses.every((entry) => isPublicAddress(entry.address))) {
    throw new FetchFailure('link_blocked');
  }
  return first;
}

function nextTarget(response: TransportResponse, current: URL): URL {
  response.body.destroy();
  const location = header(response, 'location');
  let next: URL;
  try {
    next = new URL(location, current);
  } catch {
    throw new FetchFailure('link_invalid');
  }
  const target = parseLinkTarget(next.href);
  if (!target.ok) {
    throw new FetchFailure(target.code);
  }
  return target.url;
}

async function request(
  transport: Transport,
  url: URL,
  address: ResolvedAddress,
  signal: AbortSignal,
) {
  try {
    return await transport({ url, address, headers: REQUEST_HEADERS, signal });
  } catch {
    throw new FetchFailure('link_unreachable');
  }
}

async function follow(raw: string, resolve: Resolve, transport: Transport, signal: AbortSignal) {
  const target = parseLinkTarget(raw);
  if (!target.ok) {
    throw new FetchFailure(target.code);
  }
  let url = target.url;
  for (let redirects = 0; ; redirects += 1) {
    const address = await resolvePublic(resolve, url.hostname);
    const response = await request(transport, url, address, signal);
    if (response.statusCode < 300 || response.statusCode >= 400) {
      return { url, response };
    }
    if (redirects >= LINK_MAX_REDIRECTS) {
      response.body.destroy();
      throw new FetchFailure('link_too_many_redirects');
    }
    url = nextTarget(response, url);
  }
}

async function fetchDocument(
  raw: string,
  resolve: Resolve,
  transport: Transport,
  signal: AbortSignal,
) {
  const { url, response } = await follow(raw, resolve, transport, signal);
  if (response.statusCode < 200 || response.statusCode >= 300) {
    response.body.destroy();
    throw new FetchFailure('link_http_error');
  }
  const { kind, charset } = contentKind(response);
  const body = await readLimited(response, kind === 'pdf' ? PDF_MAX_BYTES : LINK_MAX_HTML_BYTES);
  return { ok: true as const, kind, body, charset, host: url.hostname };
}

export async function safeFetch(
  raw: string,
  dependencies: { readonly resolve: Resolve; readonly transport: Transport },
  signal: AbortSignal,
  timeoutMs = LINK_TIMEOUT_MS,
): Promise<FetchedDocument> {
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  try {
    return await fetchDocument(raw, dependencies.resolve, dependencies.transport, deadline);
  } catch (error) {
    if (signal.aborted) {
      return { ok: false, code: 'document_cancelled' };
    }
    if (deadline.aborted) {
      return { ok: false, code: 'link_timeout' };
    }
    return { ok: false, code: error instanceof FetchFailure ? error.code : 'link_unreachable' };
  }
}
