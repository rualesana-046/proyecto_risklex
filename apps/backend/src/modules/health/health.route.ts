import type { HealthResponse } from '@risklex/shared';
import { Hono } from 'hono';

export function createHealthRoute(serviceVersion: string): Hono {
  const route = new Hono();
  route.get('/', (context) => {
    const body: HealthResponse = { status: 'ok', version: serviceVersion };
    return context.json(body);
  });
  return route;
}
