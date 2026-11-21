import { createHash, randomUUID } from 'node:crypto';
import { appVersionSchema } from '@risklex/shared';
import { lookup } from 'node:dns/promises';
import { join } from 'node:path';
import { app, ipcMain, utilityProcess } from 'electron';
import { PDF_READER_MAX_HEAP_MB } from '../common/document-sources.ts';
import { readApiConfig } from './app/api-config.ts';
import { createFixtureAnalysisClient } from './dev/fixture-analysis.client.ts';
import { registerAnalysisIpc } from './ipc/analysis.ipc.ts';
import { registerDocumentIpc } from './ipc/document.ipc.ts';
import { registerHistoryIpc } from './ipc/history.ipc.ts';
import { registerSettingsIpc } from './ipc/settings.ipc.ts';
import { readLinkDocument } from './modules/ingestion/application/read-link.use-case.ts';
import { readPdfDocument } from './modules/ingestion/application/read-pdf.use-case.ts';
import { createHistoryService } from './modules/history/application/history.service.ts';
import {
  createHistoryFileRepository,
  HISTORY_FILE,
} from './modules/history/infrastructure/history-file.repository.ts';
import { httpsTransport } from './modules/ingestion/infrastructure/https-transport.ts';
import { pickPdfFile } from './modules/ingestion/infrastructure/native-pdf-picker.ts';
import {
  createPdfReader,
  type ForkWorker,
} from './modules/ingestion/infrastructure/pdf-reader.client.ts';
import { PDF_WORKER_FILE } from './modules/ingestion/infrastructure/pdf-worker-protocol.ts';
import { safeFetch, type Resolve } from './modules/ingestion/infrastructure/safe-fetch.ts';
import {
  loadSettingsService,
  SETTINGS_FILE,
  type SettingsService,
} from './settings/settings.service.ts';
import {
  createAnalysisHttpClient,
  type AnalysisClient,
} from './modules/analysis/infrastructure/analysis-http.client.ts';

const FALLBACK_APP_VERSION = '0.0.0';

function appVersion(): string {
  const version = app.getVersion();
  return appVersionSchema.safeParse(version).success ? version : FALLBACK_APP_VERSION;
}

function createClient(installId: string): AnalysisClient | null {
  if (import.meta.env.DEV && import.meta.env.MAIN_VITE_RISKLEX_FIXTURE === 'sample') {
    return createFixtureAnalysisClient();
  }
  const config = readApiConfig(app.isPackaged);
  if (config.status !== 'ready') {
    return null;
  }
  return createAnalysisHttpClient({
    baseUrl: config.baseUrl,
    installId,
    appVersion: appVersion(),
  });
}

const forkUtility: ForkWorker = (modulePath, options) => {
  const child = utilityProcess.fork(modulePath, [], options);
  return {
    get pid() {
      return child.pid;
    },
    postMessage: (message) => {
      child.postMessage(message);
    },
    kill: () => {
      child.kill();
    },
    onMessage: (listener) => {
      child.on('message', listener);
    },
    onExit: (listener) => {
      child.on('exit', () => {
        listener();
      });
    },
  };
};

function memoryUsageKb(pid: number): number | null {
  return app.getAppMetrics().find((metric) => metric.pid === pid)?.memory.workingSetSize ?? null;
}

function createPdfReaderForApp() {
  return createPdfReader({
    fork: forkUtility,
    workerPath: join(import.meta.dirname, PDF_WORKER_FILE),
    memory: { usageKb: memoryUsageKb, limitKb: PDF_READER_MAX_HEAP_MB * 1024, intervalMs: 100 },
  });
}

const resolveAll: Resolve = async (hostname) => {
  const addresses = await lookup(hostname, { all: true, order: 'verbatim' });
  return addresses.map((entry) => ({ address: entry.address, family: entry.family === 6 ? 6 : 4 }));
};

export async function composeApplication(appUrl: string): Promise<SettingsService> {
  const settings = await loadSettingsService({
    path: join(app.getPath('userData'), SETTINGS_FILE),
    newInstallId: randomUUID,
    now: () => new Date(),
  });
  registerSettingsIpc({ ipc: ipcMain, appUrl, settings });
  const history = createHistoryService({
    repository: createHistoryFileRepository({ path: join(app.getPath('userData'), HISTORY_FILE) }),
    isEnabled: () => settings.current().historyEnabled,
    now: () => new Date(),
    newId: randomUUID,
    fingerprint: (text) => createHash('sha256').update(text, 'utf8').digest('hex'),
  });
  registerHistoryIpc({ ipc: ipcMain, appUrl, history });
  registerAnalysisIpc({
    ipc: ipcMain,
    appUrl,
    client: createClient(settings.installId),
    recordAnalysis: (record) => history.record(record),
  });
  const reader = createPdfReaderForApp();
  registerDocumentIpc({
    ipc: ipcMain,
    appUrl,
    readPdf: (signal) => readPdfDocument({ pick: pickPdfFile, reader }, signal),
    readLink: (url, signal) =>
      readLinkDocument(
        {
          fetch: (raw, s) => safeFetch(raw, { resolve: resolveAll, transport: httpsTransport }, s),
          reader,
        },
        url,
        signal,
      ),
  });
  return settings;
}
