import { randomUUID } from 'node:crypto';
import { appVersionSchema } from '@risklex/shared';
import { app, ipcMain } from 'electron';
import { readApiConfig } from './app/api-config.ts';
import { createFixtureAnalysisClient } from './dev/fixture-analysis.client.ts';
import { registerAnalysisIpc } from './ipc/analysis.ipc.ts';
import {
  createAnalysisHttpClient,
  type AnalysisClient,
} from './modules/analysis/infrastructure/analysis-http.client.ts';

const FALLBACK_APP_VERSION = '0.0.0';

function appVersion(): string {
  const version = app.getVersion();
  return appVersionSchema.safeParse(version).success ? version : FALLBACK_APP_VERSION;
}

function createClient(): AnalysisClient | null {
  if (import.meta.env.DEV && import.meta.env.MAIN_VITE_RISKLEX_FIXTURE === 'sample') {
    return createFixtureAnalysisClient();
  }
  const config = readApiConfig(app.isPackaged);
  if (config.status !== 'ready') {
    return null;
  }
  return createAnalysisHttpClient({
    baseUrl: config.baseUrl,
    installId: randomUUID(),
    appVersion: appVersion(),
  });
}

export function composeApplication(appUrl: string): void {
  registerAnalysisIpc({ ipc: ipcMain, appUrl, client: createClient() });
}
