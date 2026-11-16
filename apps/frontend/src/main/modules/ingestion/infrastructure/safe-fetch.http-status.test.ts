import { createServer, request as httpRequest, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { safeFetch, type Resolve, type Transport } from './safe-fetch.ts';

let server: Server;
let port = 0;

beforeAll(async () => {
  server = createServer((incoming, response) => {
    const status = Number(/^\/(\d{3})$/u.exec(incoming.url ?? '')?.[1] ?? 500);
    response.writeHead(status, { 'content-type': 'text/html' });
    response.end('error');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as { port: number }).port;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

const fakeResolver: Resolve = () => Promise.resolve([{ address: '93.184.215.14', family: 4 }]);

const localServerTransport: Transport = (outgoing) =>
  new Promise((resolve, reject) => {
    const request = httpRequest(
      { host: '127.0.0.1', port, path: outgoing.url.pathname, signal: outgoing.signal },
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

describe('safeFetch http errors (local test server, injected resolver and transport)', () => {
  it.each([
    [401, 'link_forbidden'],
    [403, 'link_forbidden'],
    [404, 'link_not_found'],
    [410, 'link_not_found'],
    [429, 'link_rate_limited'],
    [500, 'link_server_error'],
    [503, 'link_server_error'],
    [418, 'link_http_error'],
  ])('maps status %i to %s', async (status, code) => {
    const outcome = await safeFetch(
      `https://example.test/${String(status)}`,
      { resolve: fakeResolver, transport: localServerTransport },
      new AbortController().signal,
    );
    expect(outcome).toEqual({ ok: false, code });
  });
});
