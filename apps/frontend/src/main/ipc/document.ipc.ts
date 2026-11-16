import type { IpcMain } from 'electron';
import { documentReadOutcomeSchema, linkInputSchema } from '../../common/document-schemas.ts';
import type { DocumentReadOutcome } from '../../common/document-sources.ts';
import { IPC_CHANNELS } from '../../common/ipc-channels.ts';
import { isAppUrl } from '../app/window-security.ts';

type DocumentWork = (signal: AbortSignal) => Promise<DocumentReadOutcome>;

export interface DocumentIpcDependencies {
  readonly ipc: Pick<IpcMain, 'handle' | 'on'>;
  readonly appUrl: string;
  readonly readPdf: DocumentWork;
  readonly readLink: (url: string, signal: AbortSignal) => Promise<DocumentReadOutcome>;
}

interface SenderFrameEvent {
  readonly senderFrame: { readonly url: string } | null;
}

const UNEXPECTED: DocumentReadOutcome = {
  ok: false,
  error: { code: 'document_unexpected', characters: null },
};
const INVALID_LINK: DocumentReadOutcome = {
  ok: false,
  error: { code: 'link_invalid', characters: null },
};

function exclusiveRunner() {
  let running: AbortController | null = null;
  const run = async (work: DocumentWork): Promise<DocumentReadOutcome> => {
    if (running !== null) {
      return UNEXPECTED;
    }
    const controller = new AbortController();
    running = controller;
    try {
      const checked = documentReadOutcomeSchema.safeParse(await work(controller.signal));
      return checked.success ? checked.data : UNEXPECTED;
    } catch {
      return UNEXPECTED;
    } finally {
      running = null;
    }
  };
  const cancel = () => {
    running?.abort();
  };
  return { run, cancel };
}

export function registerDocumentIpc(dependencies: DocumentIpcDependencies): void {
  const runner = exclusiveRunner();
  const isTrusted = (event: SenderFrameEvent): boolean =>
    event.senderFrame !== null && isAppUrl(event.senderFrame.url, dependencies.appUrl);

  dependencies.ipc.handle(IPC_CHANNELS.pickPdf, (event) =>
    isTrusted(event) ? runner.run(dependencies.readPdf) : Promise.resolve(UNEXPECTED),
  );

  dependencies.ipc.handle(IPC_CHANNELS.readLink, (event, payload: unknown) => {
    if (!isTrusted(event)) {
      return Promise.resolve(UNEXPECTED);
    }
    const url = linkInputSchema.safeParse(payload);
    return url.success
      ? runner.run((signal) => dependencies.readLink(url.data, signal))
      : Promise.resolve(INVALID_LINK);
  });

  dependencies.ipc.on(IPC_CHANNELS.cancelDocument, (event) => {
    if (isTrusted(event)) {
      runner.cancel();
    }
  });
}
