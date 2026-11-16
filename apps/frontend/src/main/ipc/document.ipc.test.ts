import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DocumentReadOutcome } from '../../common/document-sources.ts';
import { IPC_CHANNELS } from '../../common/ipc-channels.ts';
import { registerDocumentIpc } from './document.ipc.ts';

const APP_URL = 'http://localhost:5173';

type InvokeHandler = (event: IpcMainInvokeEvent, payload?: unknown) => Promise<DocumentReadOutcome>;
type CancelHandler = (event: IpcMainEvent) => void;

function setup(
  readPdf: (signal: AbortSignal) => Promise<DocumentReadOutcome>,
  readLink: (url: string, signal: AbortSignal) => Promise<DocumentReadOutcome> = () =>
    Promise.resolve(READ),
) {
  const handlers: { invoke?: InvokeHandler; link?: InvokeHandler; cancel?: CancelHandler } = {};
  const ipc = {
    handle: vi.fn((channel: string, handler: InvokeHandler) => {
      if (channel === IPC_CHANNELS.readLink) {
        handlers.link = handler;
      } else {
        handlers.invoke = handler;
      }
    }),
    on: vi.fn((_channel: string, handler: CancelHandler) => {
      handlers.cancel = handler;
    }),
  };
  registerDocumentIpc({ ipc: ipc as never, appUrl: APP_URL, readPdf, readLink });
  const event = (url: string | null) =>
    ({ senderFrame: url === null ? null : { url } }) as unknown as IpcMainInvokeEvent &
      IpcMainEvent;
  return {
    ipc,
    pick: (url: string | null = `${APP_URL}/`) => {
      if (handlers.invoke === undefined) {
        throw new Error('The pick handler was not registered');
      }
      return handlers.invoke(event(url));
    },
    link: (payload: unknown, url: string | null = `${APP_URL}/`) => {
      if (handlers.link === undefined) {
        throw new Error('The link handler was not registered');
      }
      return handlers.link(event(url), payload);
    },
    cancel: (url: string | null = `${APP_URL}/`) => {
      handlers.cancel?.(event(url));
    },
  };
}

const READ: DocumentReadOutcome = {
  ok: true,
  text: 'Texto del contrato',
  source: { kind: 'pdf', name: 'contrato.pdf' },
  characters: 18,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('document ipc (simulated electron)', () => {
  it('registers the pick and cancel channels', () => {
    const { ipc } = setup(() => Promise.resolve(READ));
    expect(ipc.handle).toHaveBeenCalledWith(IPC_CHANNELS.pickPdf, expect.any(Function));
    expect(ipc.handle).toHaveBeenCalledWith(IPC_CHANNELS.readLink, expect.any(Function));
    expect(ipc.on).toHaveBeenCalledWith(IPC_CHANNELS.cancelDocument, expect.any(Function));
  });

  it('returns the checked outcome without paths and logs nothing', async () => {
    const logs = [vi.spyOn(console, 'log'), vi.spyOn(console, 'error'), vi.spyOn(console, 'warn')];
    const polluted = {
      ...READ,
      source: { ...READ.source, path: '/Volumes/Datos/privado/contrato.pdf' },
    };
    const { pick } = setup(() => Promise.resolve(polluted as DocumentReadOutcome));
    const outcome = await pick();
    expect(outcome).toEqual(READ);
    expect(JSON.stringify(outcome)).not.toContain('/Volumes');
    for (const log of logs) {
      expect(log).not.toHaveBeenCalled();
    }
  });

  it.each([
    ['an external page', 'https://example.com/'],
    ['a missing frame', null],
  ])('refuses %s without opening the dialog', async (_label, url) => {
    const readPdf = vi.fn(() => Promise.resolve(READ));
    const { pick } = setup(readPdf);
    expect(await pick(url)).toEqual({
      ok: false,
      error: { code: 'document_unexpected', characters: null },
    });
    expect(readPdf).not.toHaveBeenCalled();
  });

  it('turns an unexpected failure into a typed error', async () => {
    const { pick } = setup(() => Promise.reject(new Error('/Volumes/Datos/privado/contrato.pdf')));
    expect(await pick()).toEqual({
      ok: false,
      error: { code: 'document_unexpected', characters: null },
    });
  });

  it('cancels the running read from the app window only', async () => {
    let seen: AbortSignal | null = null;
    const { pick, cancel } = setup(
      (signal) =>
        new Promise((resolve) => {
          seen = signal;
          signal.addEventListener('abort', () => {
            resolve({ ok: false, error: { code: 'document_cancelled', characters: null } });
          });
        }),
    );
    const pending = pick();
    cancel('https://example.com/');
    expect((seen as AbortSignal | null)?.aborted).toBe(false);
    cancel();
    expect(await pending).toEqual({
      ok: false,
      error: { code: 'document_cancelled', characters: null },
    });
  });

  it('reads a link given as a trimmed string', async () => {
    const readLink = vi.fn(() => Promise.resolve(READ));
    const { link } = setup(() => Promise.resolve(READ), readLink);
    expect(await link('  https://example.com/terms  ')).toEqual(READ);
    expect(readLink).toHaveBeenCalledWith('https://example.com/terms', expect.any(AbortSignal));
  });

  it.each([[42], [''], ['a'.repeat(2049)], [{ url: 'https://example.com' }]])(
    'rejects the link payload %j before any download',
    async (payload) => {
      const readLink = vi.fn(() => Promise.resolve(READ));
      const { link } = setup(() => Promise.resolve(READ), readLink);
      expect(await link(payload)).toEqual({
        ok: false,
        error: { code: 'link_invalid', characters: null },
      });
      expect(readLink).not.toHaveBeenCalled();
    },
  );

  it('refuses link requests from other pages', async () => {
    const readLink = vi.fn(() => Promise.resolve(READ));
    const { link } = setup(() => Promise.resolve(READ), readLink);
    expect(await link('https://example.com', 'https://example.com/')).toMatchObject({ ok: false });
    expect(readLink).not.toHaveBeenCalled();
  });

  it('runs one document read at a time', async () => {
    const { pick, link } = setup(() => new Promise(() => undefined));
    void pick();
    expect(await link('https://example.com')).toEqual({
      ok: false,
      error: { code: 'document_unexpected', characters: null },
    });
  });
});
