import { describe, expect, it } from 'vitest';
import { isPublicAddress, parseLinkTarget } from './address-policy.ts';

describe('isPublicAddress', () => {
  it.each([
    ['0.0.0.0', 'unspecified'],
    ['10.1.2.3', 'private 10/8'],
    ['100.64.0.1', 'carrier grade nat'],
    ['127.0.0.1', 'loopback'],
    ['169.254.169.254', 'cloud metadata'],
    ['172.16.5.5', 'private 172.16/12'],
    ['172.31.255.255', 'private 172.16/12 end'],
    ['192.0.0.8', 'ietf protocol assignments'],
    ['192.0.2.10', 'documentation'],
    ['192.88.99.1', '6to4 relay'],
    ['192.168.1.1', 'private 192.168/16'],
    ['198.18.0.1', 'benchmarking'],
    ['198.51.100.7', 'documentation'],
    ['203.0.113.9', 'documentation'],
    ['224.0.0.1', 'multicast'],
    ['240.0.0.1', 'reserved'],
    ['255.255.255.255', 'broadcast'],
    ['::', 'ipv6 unspecified'],
    ['::1', 'ipv6 loopback'],
    ['::ffff:127.0.0.1', 'ipv4 mapped loopback'],
    ['::ffff:7f00:1', 'ipv4 mapped loopback in hex'],
    ['::ffff:169.254.169.254', 'ipv4 mapped metadata'],
    ['64:ff9b::a00:1', 'nat64 private'],
    ['100::1', 'discard only'],
    ['2001::1', 'teredo'],
    ['2001:db8::1', 'documentation'],
    ['2002:7f00:1::1', '6to4'],
    ['fc00::1', 'unique local'],
    ['fd00:ec2::254', 'cloud metadata ipv6'],
    ['fe80::1', 'link local'],
    ['fec0::1', 'site local'],
    ['ff02::1', 'multicast'],
    ['not an address', 'garbage'],
  ])('blocks %s (%s)', (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each([
    '93.184.215.14',
    '8.8.8.8',
    '172.32.0.1',
    '2606:4700:4700::1111',
    '::ffff:93.184.215.14',
    '64:ff9b::808:808',
  ])('allows the public address %s', (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });
});

const USER_NAME = 'user';
const CREDENTIALS = `${USER_NAME}:secret`;

describe('parseLinkTarget', () => {
  it.each([
    ['https://127.1/terms', 'shortened loopback'],
    ['https://0x7f.1/terms', 'hexadecimal loopback'],
    ['https://2130706433/terms', 'decimal loopback'],
    ['https://[::1]/terms', 'ipv6 loopback'],
    ['https://[::ffff:127.0.0.1]/terms', 'ipv4 mapped loopback'],
    ['https://169.254.169.254/latest/meta-data', 'cloud metadata'],
    ['https://192.168.1.1/', 'router'],
  ])('blocks %s (%s)', (raw) => {
    expect(parseLinkTarget(raw)).toEqual({ ok: false, code: 'link_blocked' });
  });

  it.each([
    [`https://${CREDENTIALS}@example.com/terms`, 'credentials'],
    [`https://${USER_NAME}@example.com/terms`, 'user name'],
    ['https://example.com:8443/terms', 'non https port'],
    ['ftp://example.com/terms', 'another scheme'],
    ['file:///etc/passwd', 'local file'],
    ['javascript:alert(1)', 'script url'],
    ['https://', 'no host'],
    [`https://example.com/${'a'.repeat(2100)}`, 'too long'],
  ])('rejects %s (%s)', (raw) => {
    expect(parseLinkTarget(raw)).toEqual({ ok: false, code: 'link_invalid' });
  });

  it.each([
    ['http://example.com/terms', 'https://example.com/terms'],
    ['example.com/terms', 'https://example.com/terms'],
    ['HTTPS://EXAMPLE.COM/Terms', 'https://example.com/Terms'],
    ['https://example.com./terms', 'https://example.com./terms'],
    ['https://example.com:443/terms#section', 'https://example.com/terms'],
    ['https://ejémplo.com/términos', 'https://xn--ejmplo-cva.com/t%C3%A9rminos'],
    ['https://93.184.215.14/terms', 'https://93.184.215.14/terms'],
  ])('normalizes %s to an https target', (raw, expected) => {
    const target = parseLinkTarget(raw);
    expect(target.ok).toBe(true);
    expect(target.ok ? target.url.href : '').toBe(expected);
  });
});
