import { BlockList, isIP } from 'node:net';

const MAX_URL_CHARACTERS = 2048;
const HTTPS_PORT = '443';

const BLOCKED_IPV4: readonly (readonly [string, number])[] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

const GLOBAL_UNICAST_IPV6: readonly [string, number] = ['2000::', 3];

const RESERVED_GLOBAL_IPV6: readonly (readonly [string, number])[] = [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
];

function subnets(
  ranges: readonly (readonly [string, number])[],
  family: 'ipv4' | 'ipv6',
): BlockList {
  const list = new BlockList();
  for (const [prefix, length] of ranges) {
    list.addSubnet(prefix, length, family);
  }
  return list;
}

const blockedIpv4 = subnets(BLOCKED_IPV4, 'ipv4');
const globalUnicastIpv6 = subnets([GLOBAL_UNICAST_IPV6], 'ipv6');
const reservedGlobalIpv6 = subnets(RESERVED_GLOBAL_IPV6, 'ipv6');

function expandIpv6(address: string): number[] {
  const [head = '', tail = ''] = address.split('::');
  const toHextets = (part: string): number[] =>
    part === ''
      ? []
      : part.split(':').flatMap((group) => {
          if (group.includes('.')) {
            const [a = 0, b = 0, c = 0, d = 0] = group.split('.').map(Number);
            return [(a << 8) | b, (c << 8) | d];
          }
          return [Number.parseInt(group, 16)];
        });
  const left = toHextets(head);
  const right = toHextets(tail);
  const fill = address.includes('::') ? 8 - left.length - right.length : 0;
  return [...left, ...new Array<number>(fill).fill(0), ...right];
}

function embeddedIpv4(address: string): string | null {
  const hextets = expandIpv6(address);
  const zeros = (from: number, to: number) => hextets.slice(from, to).every((value) => value === 0);
  const mapped = zeros(0, 5) && hextets[5] === 0xffff;
  const nat64 = hextets[0] === 0x64 && hextets[1] === 0xff9b && zeros(2, 6);
  if (!mapped && !nat64) {
    return null;
  }
  const high = hextets[6] ?? 0;
  const low = hextets[7] ?? 0;
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    return address !== '255.255.255.255' && !blockedIpv4.check(address, 'ipv4');
  }
  if (family !== 6) {
    return false;
  }
  const inner = embeddedIpv4(address);
  if (inner !== null) {
    return isPublicAddress(inner);
  }
  return globalUnicastIpv6.check(address, 'ipv6') && !reservedGlobalIpv6.check(address, 'ipv6');
}

export type LinkTarget =
  | { readonly ok: true; readonly url: URL }
  | { readonly ok: false; readonly code: 'link_invalid' | 'link_blocked' };

function withScheme(raw: string): string {
  return /^[a-z][a-z0-9+.-]*:/iu.test(raw) ? raw : `https://${raw}`;
}

function parseUrl(raw: string): URL | null {
  try {
    return new URL(withScheme(raw.trim()));
  } catch {
    return null;
  }
}

export function literalAddress(hostname: string): string | null {
  const bare = hostname.startsWith('[') ? hostname.slice(1, -1) : hostname;
  return isIP(bare) === 0 ? null : bare;
}

function hasForbiddenParts(url: URL): boolean {
  const credentials = url.username !== '' || url.password !== '';
  const port = url.port !== '' && url.port !== HTTPS_PORT;
  return credentials || port || url.hostname === '';
}

export function parseLinkTarget(raw: string): LinkTarget {
  const url = raw.length > MAX_URL_CHARACTERS ? null : parseUrl(raw);
  if (url === null || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    return { ok: false, code: 'link_invalid' };
  }
  url.protocol = 'https:';
  if (hasForbiddenParts(url)) {
    return { ok: false, code: 'link_invalid' };
  }
  url.hash = '';
  const literal = literalAddress(url.hostname);
  if (literal !== null && !isPublicAddress(literal)) {
    return { ok: false, code: 'link_blocked' };
  }
  return { ok: true, url };
}
