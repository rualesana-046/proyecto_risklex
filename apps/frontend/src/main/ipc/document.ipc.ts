import type { IpcMain } from 'electron';
import { documentReadOutcomeSchema } from '../../common/document-schemas.ts';
import type { DocumentReadOutcome } from '../../common/document-sources.ts';
import { IPC_CHANNELS } from '../../common/ipc-channels.ts';
import { isAppUrl } from '../app/window-security.ts';

export interface DocumentIpcDependencies {
  readonly ipc: Pick<IpcMain, 'handle' | 'on'>;
  readonly appUrl: string;
  readonly readPdf: (signal: AbortSignal) => Promise<DocumentReadOutcome>;
}

interface SenderFrameEvent {
  readonly senderFrame: { readonly url: string } | null;
}

const UNEXPECTED: DocumentReadOutcome = {
  ok: false,
  error: { code: 'document_unexpected', characters: null },
};

async function readChecked(
  read: (signal: AbortSignal) => Promise<DocumentReadOutcome>,
  signal: AbortSignal,
): Promise<DocumentReadOutcome> {
  try {
    const checked = documentReadOutcomeSchema.safeParse(await read(signal));
    return checked.success ? checked.data : UNEXPECTED;
  } catch {
    return UNEXPECTED;
  }
}

export function registerDocumentIpc(dependencies: DocumentIpcDependencies): void {
  let running: AbortController | null = null;
  const isTrusted = (event: SenderFrameEvent): boolean =>
    event.senderFrame !== null && isAppUrl(event.senderFrame.url, dependencies.appUrl);

  dependencies.ipc.handle(IPC_CHANNELS.pickPdf, async (event) => {
    if (!isTrusted(event) || running !== null) {
      return UNEXPECTED;
    }
    const controller = new AbortController();
    running = controller;
    try {
      return await readChecked(dependencies.readPdf, controller.signal);
    } finally {
      running = null;
    }
  });

  dependencies.ipc.on(IPC_CHANNELS.cancelDocument, (event) => {
    if (isTrusted(event)) {
      running?.abort();
    }
  });
}
