import { randomUUID } from 'node:crypto';
import { appVersionSchema } from '@risklex/shared';
import { app, ipcMain } from 'electron';
import { readApiConfig } from './app/api-config.ts';
import { registerAnalysisIpc } from './ipc/analysis.ipc.ts';
import { createAnalysisHttpClient } from './modules/analysis/infrastructure/analysis-http.client.ts';

const FALLBACK_APP_VERSION = '0.0.0';

function appVersion(): string {
  const version = app.getVersion();
  return appVersionSchema.safeParse(version).success ? version : FALLBACK_APP_VERSION;
}

export function composeApplication(appUrl: string): void {
  const config = readApiConfig(app.isPackaged);
  const client =
    config.status === 'ready'
      ? createAnalysisHttpClient({
          baseUrl: config.baseUrl,
          installId: randomUUID(),
          appVersion: appVersion(),
        })
      : null;
  registerAnalysisIpc({ ipc: ipcMain, appUrl, client });
}
