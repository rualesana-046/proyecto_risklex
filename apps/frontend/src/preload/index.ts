import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { AnalysisOutcome, AnalysisStage } from '../common/analysis-vocabulary.ts';
import type { DocumentReadOutcome } from '../common/document-sources.ts';
import { IPC_CHANNELS } from '../common/ipc-channels.ts';
import type { RisklexApi } from './risklex-api.d.ts';

const api: RisklexApi = {
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
  cancelDocumentRead: () => {
    ipcRenderer.send(IPC_CHANNELS.cancelDocument);
  },
};

contextBridge.exposeInMainWorld('risklex', api);
