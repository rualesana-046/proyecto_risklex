import type { IpcMainInvokeEvent } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS } from '../../common/ipc-channels.ts';
import { summarize } from '../modules/history/domain/history-entry.ts';
import { syntheticEntry } from '../modules/history/history.test-support.ts';
import { registerHistoryIpc } from './history.ipc.ts';

const APP_URL = 'http://localhost:5173';
const ENTRY = syntheticEntry(1);

type Handler = (event: IpcMainInvokeEvent, payload?: unknown) => Promise<unknown>;

function setup() {
  const handlers = new Map<string, Handler>();
  const ipc = {
    handle: vi.fn((channel: string, handler: Handler) => {
      handlers.set(channel, handler);
    }),
  };
  const history = {
    list: vi.fn(() => Promise.resolve([summarize(ENTRY)])),
    get: vi.fn((id: string) =>
      Promise.resolve(
        id === ENTRY.id ? { summary: summarize(ENTRY), analysis: ENTRY.analysis } : null,
      ),
    ),
    remove: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
  };
  registerHistoryIpc({ ipc, appUrl: APP_URL, history });
  const call = (channel: string, url: string | null, payload?: unknown) => {
    const handler = handlers.get(channel);
    if (handler === undefined) {
      throw new Error(`no handler for ${channel}`);
    }
    const event = { senderFrame: url === null ? null : { url } } as unknown as IpcMainInvokeEvent;
    return handler(event, payload);
  };
  return { call, history };
}

const TRUSTED = `${APP_URL}/`;

describe('history ipc (simulated electron and history)', () => {
  it('lists summaries without the analysis or the fingerprint', async () => {
    const { call } = setup();
    const list = (await call(IPC_CHANNELS.historyList, TRUSTED)) as unknown[];
    expect(list).toHaveLength(1);
    expect(JSON.stringify(list)).not.toContain(ENTRY.fingerprint);
    expect(JSON.stringify(list)).not.toContain('"clauses"');
  });

  it('opens one entry and returns null for an unknown one', async () => {
    const { call } = setup();
    expect(await call(IPC_CHANNELS.historyGet, TRUSTED, ENTRY.id)).toMatchObject({
      summary: { id: ENTRY.id },
      analysis: { totalClauses: 10 },
    });
    expect(
      await call(IPC_CHANNELS.historyGet, TRUSTED, '6f1c1e9e-3b0a-4c47-9d61-ffffffffffff'),
    ).toBeNull();
  });

  it('deletes one entry and clears all', async () => {
    const { call, history } = setup();
    await call(IPC_CHANNELS.historyDelete, TRUSTED, ENTRY.id);
    await call(IPC_CHANNELS.historyClear, TRUSTED);
    expect(history.remove).toHaveBeenCalledWith(ENTRY.id);
    expect(history.clear).toHaveBeenCalledTimes(1);
  });

  it.each([['../settings.json'], [42], [{ id: ENTRY.id }]])('rejects the id %j', async (id) => {
    const { call, history } = setup();
    await expect(call(IPC_CHANNELS.historyGet, TRUSTED, id)).rejects.toThrow('Invalid history id');
    await expect(call(IPC_CHANNELS.historyDelete, TRUSTED, id)).rejects.toThrow(
      'Invalid history id',
    );
    expect(history.get).not.toHaveBeenCalled();
    expect(history.remove).not.toHaveBeenCalled();
  });

  it.each([null, 'https://example.com/'])('refuses a sender outside the app (%s)', async (url) => {
    const { call, history } = setup();
    for (const channel of [
      IPC_CHANNELS.historyList,
      IPC_CHANNELS.historyGet,
      IPC_CHANNELS.historyDelete,
      IPC_CHANNELS.historyClear,
    ]) {
      await expect(call(channel, url, ENTRY.id)).rejects.toThrow('Untrusted sender');
    }
    expect(history.list).not.toHaveBeenCalled();
    expect(history.clear).not.toHaveBeenCalled();
  });
});
