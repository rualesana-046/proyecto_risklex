import { healthResponseSchema } from '@risklex/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.ts';
import type { LogEntry } from '../../common/logger.ts';

function buildApp(): ReturnType<typeof createApp> {
  const entries: LogEntry[] = [];
  return createApp({
    logger: { log: (entry) => entries.push(entry) },
    serviceVersion: '9.9.9',
  });
}

describe('GET /health', () => {
  it('returns a valid health response with the service version', async () => {
    const response = await buildApp().request('/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    const body = healthResponseSchema.parse(await response.json());
    expect(body).toEqual({ status: 'ok', version: '9.9.9' });
  });

  it('does not expose cross origin headers', async () => {
    const response = await buildApp().request('/health', {
      headers: { origin: 'https://example.com' },
    });
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns 404 for unknown routes', async () => {
    const response = await buildApp().request('/unknown');
    expect(response.status).toBe(404);
  });
});
