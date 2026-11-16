import { createServer, request as httpRequest, type Server, type ServerResponse } from 'node:http';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  LINK_USER_AGENT,
  safeFetch,
  type Resolve,
  type Transport,
  type TransportRequest,
} from './safe-fetch.ts';

const HTML = '<html><body><h1>Términos</h1><p>Texto del contrato.</p></body></html>';
const SIX_MB = 6 * 1024 * 1024;

type Route = readonly [number, Record<string, string | number>, string | Buffer];

const HTML_TYPE = { 'content-type': 'text/html' };
const ROUTES: Record<string, Route | undefined> = {
  '/terms': [200, { 'content-type': 'text/html; charset=utf-8' }, HTML],
  '/gzip': [200, { ...HTML_TYPE, 'content-encoding': 'gzip' }, gzipSync(HTML)],
  '/br': [200, { ...HTML_TYPE, 'content-encoding': 'br' }, brotliCompressSync(HTML)],
  '/plain': [200, { 'content-type': 'text/plain; charset="iso-8859-1"' }, 'texto'],
  '/pdf': [200, { 'content-type': 'application/pdf' }, '%PDF-1.4'],
  '/image': [200, { 'content-type': 'image/png' }, 'png'],
  '/missing': [404, HTML_TYPE, 'no'],
  '/redirect-other': [302, { location: 'https://other.test/terms' }, ''],
  '/redirect-relative': [301, { location: '/terms' }, ''],
  '/redirect-private': [302, { location: 'https://internal.test/admin' }, ''],
  '/redirect-literal': [302, { location: 'https://127.0.0.1/admin' }, ''],
  '/redirect-http': [302, { location: 'http://other.test/terms' }, ''],
  '/redirect-port': [302, { location: 'https://other.test:8443/terms' }, ''],
  '/loop': [302, { location: '/loop' }, ''],
  '/rebind': [302, { location: 'https://rebind.test/terms' }, ''],
  '/big': [200, HTML_TYPE, Buffer.alloc(SIX_MB, 0x61)],
  '/bomb': [
    200,
    { ...HTML_TYPE, 'content-encoding': 'gzip' },
    gzipSync(Buffer.alloc(SIX_MB, 0x61)),
  ],
  '/declared-big': [200, { ...HTML_TYPE, 'content-length': SIX_MB }, ''],
};

function serve(path: string, response: ServerResponse): void {
  if (path === '/slow') {
    return;
  }
  const [status, headers, body] = ROUTES[path] ?? [404, {}, ''];
  response.writeHead(status, headers);
  response.end(body);
}

let server: Server;
let port = 0;

beforeAll(async () => {
  server = createServer((incoming, response) => {
    serve(new URL(incoming.url ?? '/', 'http://local').pathname, response);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as { port: number }).port;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

const PUBLIC = { address: '93.184.215.14', family: 4 } as const;

function fakeResolver(): Resolve & { calls: string[] } {
  let rebindCalls = 0;
  const table: Record<string, () => { address: string; family: 4 | 6 }[]> = {
    'example.test': () => [PUBLIC],
    'other.test': () => [{ address: '93.184.216.1', family: 4 }],
    'internal.test': () => [{ address: '10.0.0.5', family: 4 }],
    'mixed.test': () => [PUBLIC, { address: '::1', family: 6 }],
    'rebind.test': () => {
      rebindCalls += 1;
      return [rebindCalls === 1 ? PUBLIC : { address: '127.0.0.1', family: 4 }];
    },
  };
  const calls: string[] = [];
  const resolve = (hostname: string) => {
    calls.push(hostname);
    const entry = table[hostname];
    return entry === undefined ? Promise.reject(new Error('ENOTFOUND')) : Promise.resolve(entry());
  };
  return Object.assign(resolve, { calls });
}

function localServerTransport(): Transport & { requests: TransportRequest[] } {
  const requests: TransportRequest[] = [];
  const transport: Transport = (outgoing) =>
    new Promise((resolve, reject) => {
      requests.push(outgoing);
      const request = httpRequest(
        {
          host: '127.0.0.1',
          port,
          path: `${outgoing.url.pathname}${outgoing.url.search}`,
          headers: outgoing.headers,
          signal: outgoing.signal,
        },
        (response) => {
          resolve({
            statusCode: response.statusCode ?? 0,
            headers: response.headers,
            body: response,
          });
        },
      );
      request.on('error', reject);
      request.end();
    });
  return Object.assign(transport, { requests });
}

function fetchWith(raw: string, timeoutMs?: number, signal = new AbortController().signal) {
  const resolve = fakeResolver();
  const transport = localServerTransport();
  return { resolve, transport, result: safeFetch(raw, { resolve, transport }, signal, timeoutMs) };
}

describe('safeFetch (local test server, injected resolver and transport)', () => {
  it('reads a page through the validated address with honest headers only', async () => {
    const { result, transport } = fetchWith('https://example.test/terms');
    const outcome = await result;
    expect(outcome).toMatchObject({
      ok: true,
      kind: 'html',
      charset: 'utf-8',
      host: 'example.test',
    });
    expect(outcome.ok ? new TextDecoder().decode(outcome.body) : '').toBe(HTML);
    const [sent] = transport.requests;
    expect(sent?.address).toEqual(PUBLIC);
    expect(sent?.url.protocol).toBe('https:');
    expect(sent?.headers['user-agent']).toBe(LINK_USER_AGENT);
    expect(Object.keys(sent?.headers ?? {}).map((name) => name.toLowerCase())).not.toEqual(
      expect.arrayContaining(['cookie', 'authorization', 'referer']),
    );
  });

  it('upgrades http links to https', async () => {
    const { result, transport } = fetchWith('http://example.test/terms');
    expect((await result).ok).toBe(true);
    expect(transport.requests[0]?.url.href).toBe('https://example.test/terms');
  });

  it.each([
    ['/gzip', 'gzip'],
    ['/br', 'brotli'],
  ])('decodes %s responses (%s)', async (path) => {
    const outcome = await fetchWith(`https://example.test${path}`).result;
    expect(outcome.ok ? new TextDecoder().decode(outcome.body) : '').toBe(HTML);
  });

  it.each([
    ['/plain', 'text', 'iso-8859-1'],
    ['/pdf', 'pdf', null],
  ])('accepts %s as %s', async (path, kind, charset) => {
    expect(await fetchWith(`https://example.test${path}`).result).toMatchObject({
      ok: true,
      kind,
      charset,
    });
  });

  it.each([
    ['https://internal.test/terms', 'link_blocked', 'a host that resolves to a private address'],
    ['https://mixed.test/terms', 'link_blocked', 'a host with a public and a private address'],
    ['https://127.0.0.1/terms', 'link_blocked', 'a loopback literal'],
    ['https://missing.test/terms', 'link_unreachable', 'a host that does not resolve'],
    ['https://example.test/image', 'link_unsupported_type', 'an image'],
    ['https://example.test/missing', 'link_http_error', 'a missing page'],
    ['https://example.test/big', 'link_too_large', 'a body over the limit'],
    ['https://example.test/bomb', 'link_too_large', 'a compression bomb'],
    ['https://example.test/declared-big', 'link_too_large', 'a declared length over the limit'],
    ['https://example.test/loop', 'link_too_many_redirects', 'a redirect loop'],
    ['https://example.test/redirect-private', 'link_blocked', 'a redirect to a private host'],
    ['https://example.test/redirect-literal', 'link_blocked', 'a redirect to a loopback literal'],
    ['https://example.test/redirect-port', 'link_invalid', 'a redirect to another port'],
    ['https://rebind.test/rebind', 'link_blocked', 'dns rebinding between redirects'],
    ['ftp://example.test/terms', 'link_invalid', 'another scheme'],
  ])('refuses %s with %s (%s)', async (raw, code) => {
    expect(await fetchWith(raw).result).toEqual({ ok: false, code });
  });

  it('follows redirects, revalidating every target', async () => {
    const { result, resolve } = fetchWith('https://example.test/redirect-other');
    expect(await result).toMatchObject({ ok: true, host: 'other.test' });
    expect(resolve.calls).toEqual(['example.test', 'other.test']);
  });

  it.each(['/redirect-relative', '/redirect-http'])(
    'follows the redirect %s to https',
    async (path) => {
      expect(await fetchWith(`https://example.test${path}`).result).toMatchObject({
        ok: true,
        kind: 'html',
      });
    },
  );

  it('gives up after the time limit', async () => {
    expect(await fetchWith('https://example.test/slow', 200).result).toEqual({
      ok: false,
      code: 'link_timeout',
    });
  });

  it('stops when the person cancels', async () => {
    const controller = new AbortController();
    const { result } = fetchWith('https://example.test/slow', 10_000, controller.signal);
    setTimeout(() => {
      controller.abort();
    }, 50);
    expect(await result).toEqual({ ok: false, code: 'document_cancelled' });
  });
});
