import { Hono } from 'hono';
import { routePath } from 'hono/route';
import { errorResponse } from './common/http-error.ts';
import type { AppDependencies } from './composition-root.ts';
import { createHealthRoute } from './modules/health/health.route.ts';
import {
  ANALYSES_ROUTE,
  createAnalysisRoute,
} from './modules/analysis/presentation/analysis.route.ts';

export function createApp(dependencies: AppDependencies): Hono {
  const app = new Hono();
  app.route('/health', createHealthRoute(dependencies.serviceVersion));
  app.route(ANALYSES_ROUTE, createAnalysisRoute(dependencies));
  app.onError((_error, context) => {
    dependencies.logger.log({
      event: 'request_failed',
      route: routePath(context),
      status: 502,
      errorCode: 'provider_error',
      durationMs: 0,
      textLength: null,
      inputTokens: null,
      outputTokens: null,
      appVersion: null,
    });
    return errorResponse(context, 'provider_error');
  });
  return app;
}
