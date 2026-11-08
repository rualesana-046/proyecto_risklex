import { describe, expect, it } from 'vitest';
import { createLogger, type LogEntry } from './logger.ts';

const entry: LogEntry = {
  event: 'request_completed',
  route: '/v1/analyses',
  status: 200,
  errorCode: null,
  durationMs: 1234,
  textLength: 5000,
  inputTokens: 2100,
  outputTokens: 900,
  appVersion: '0.1.0',
};

function capture(value: LogEntry): Record<string, unknown> {
  const lines: string[] = [];
  createLogger((line) => lines.push(line)).log(value);
  expect(lines).toHaveLength(1);
  return JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
}

describe('createLogger', () => {
  it('writes one JSON line with the metadata fields', () => {
    expect(capture(entry)).toEqual(entry);
  });

  it('drops any field that is not part of the metadata', () => {
    const leaked = { ...entry, text: 'SECRET DOCUMENT CONTENT', quote: 'a quoted clause' };
    const written = capture(leaked);
    expect(Object.keys(written).sort()).toEqual(Object.keys(entry).sort());
    expect(JSON.stringify(written)).not.toContain('SECRET DOCUMENT CONTENT');
    expect(JSON.stringify(written)).not.toContain('a quoted clause');
  });

  it('keeps error codes for failed requests', () => {
    const failed: LogEntry = {
      ...entry,
      event: 'request_failed',
      status: 429,
      errorCode: 'rate_limited',
    };
    expect(capture(failed)).toMatchObject({ status: 429, errorCode: 'rate_limited' });
  });
});
