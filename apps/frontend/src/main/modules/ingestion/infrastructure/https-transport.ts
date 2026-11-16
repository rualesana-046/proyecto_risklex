import type { LookupAddress, LookupOptions } from 'node:dns';
import { request } from 'node:https';
import { isIP } from 'node:net';
import type { ResolvedAddress, Transport } from './safe-fetch.ts';

export const LINK_CONNECT_TIMEOUT_MS = 10_000;

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

export function pinnedLookup(pinned: ResolvedAddress) {
  return (_hostname: string, options: LookupOptions, callback: LookupCallback): void => {
    if (options.all === true) {
      callback(null, [{ address: pinned.address, family: pinned.family }]);
      return;
    }
    callback(null, pinned.address, pinned.family);
  };
}

function serverName(hostname: string): string | undefined {
  const bare = hostname.replace(/\.$/u, '');
  return isIP(bare.replace(/^\[|\]$/gu, '')) === 0 ? bare : undefined;
}

export const httpsTransport: Transport = ({ url, address, headers, signal }) =>
  new Promise((resolve, reject) => {
    const outgoing = request({
      protocol: 'https:',
      hostname: url.hostname,
      port: 443,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers,
      lookup: pinnedLookup(address),
      servername: serverName(url.hostname),
      agent: false,
      signal,
      timeout: LINK_CONNECT_TIMEOUT_MS,
    });
    outgoing.on('response', (response) => {
      resolve({ statusCode: response.statusCode ?? 0, headers: response.headers, body: response });
    });
    outgoing.on('timeout', () => {
      outgoing.destroy(new Error('connect timeout'));
    });
    outgoing.on('error', reject);
    outgoing.end();
  });
