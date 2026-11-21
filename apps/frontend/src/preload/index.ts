import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { AnalysisOutcome, AnalysisStage } from '../common/analysis-vocabulary.ts';
import type { DocumentReadOutcome } from '../common/document-sources.ts';
import type { HistoryEntryView, HistorySummary } from '../common/history-vocabulary.ts';
import { decodeInitialSettings } from '../common/initial-settings.ts';
import type { PublicSettings } from '../common/settings-vocabulary.ts';
import { IPC_CHANNELS } from '../common/ipc-channels.ts';
import type { RisklexApi } from './risklex-api.d.ts';

const api: RisklexApi = {
  initialSettings: decodeInitialSettings(process.argv),
  analyze: (request) =>
    ipcRenderer.invoke(IPC_CHANNELS.analyze, request) as Promise<AnalysisOutcome>,
  onProgress: (listener) => {
    const handler = (_event: IpcRendererEvent, stage: AnalysisStage) => {
      listener(stage);
    };
    ipcRenderer.on(IPC_CHANNELS.progress, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.progress, handler);
    };
  },
  cancel: () => {
    ipcRenderer.send(IPC_CHANNELS.cancel);
  },
  pickPdf: () => ipcRenderer.invoke(IPC_CHANNELS.pickPdf) as Promise<DocumentReadOutcome>,
  readLink: (url) => ipcRenderer.invoke(IPC_CHANNELS.readLink, url) as Promise<DocumentReadOutcome>,
  cancelDocumentRead: () => {
    ipcRenderer.send(IPC_CHANNELS.cancelDocument);
  },
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet) as Promise<PublicSettings>,
  updateSettings: (change) =>
    ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, change) as Promise<PublicSettings>,
  listHistory: () => ipcRenderer.invoke(IPC_CHANNELS.historyList) as Promise<HistorySummary[]>,
  getHistory: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.historyGet, id) as Promise<HistoryEntryView | null>,
  deleteHistory: (id) => ipcRenderer.invoke(IPC_CHANNELS.historyDelete, id) as Promise<void>,
  clearHistory: () => ipcRenderer.invoke(IPC_CHANNELS.historyClear) as Promise<void>,
};

contextBridge.exposeInMainWorld('risklex', api);
