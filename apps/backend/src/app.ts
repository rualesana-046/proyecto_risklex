import { Hono } from 'hono';
import type { AppDependencies } from './composition-root.ts';
import { createHealthRoute } from './modules/health/health.route.ts';

export function createApp(dependencies: AppDependencies): Hono {
  const app = new Hono();
  app.route('/health', createHealthRoute(dependencies.serviceVersion));
  return app;
}
