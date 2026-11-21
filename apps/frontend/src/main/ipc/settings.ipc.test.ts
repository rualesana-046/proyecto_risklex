import type { IpcMainInvokeEvent } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS } from '../../common/ipc-channels.ts';
import type { PublicSettings, SettingsUpdate } from '../../common/settings-vocabulary.ts';
import { registerSettingsIpc } from './settings.ipc.ts';

const APP_URL = 'http://localhost:5173';
const CURRENT: PublicSettings = {
  language: 'es',
  theme: 'system',
  textSize: 'normal',
  welcomeSeen: false,
  historyEnabled: true,
  consentGranted: false,
};

type Handler = (event: IpcMainInvokeEvent, payload?: unknown) => Promise<PublicSettings>;

function setup() {
  const handlers = new Map<string, Handler>();
  const ipc = {
    handle: vi.fn((channel: string, handler: Handler) => {
      handlers.set(channel, handler);
    }),
  };
  const update = vi.fn(({ consent, ...rest }: SettingsUpdate) =>
    Promise.resolve({ ...CURRENT, ...rest, consentGranted: consent === 'granted' }),
  );
  registerSettingsIpc({
    ipc,
    appUrl: APP_URL,
    settings: { current: () => CURRENT, update },
  });
  const event = (url: string | null) =>
    ({ senderFrame: url === null ? null : { url } }) as unknown as IpcMainInvokeEvent;
  const call = (channel: string, url: string | null, payload?: unknown) => {
    const handler = handlers.get(channel);
    if (handler === undefined) {
      throw new Error(`no handler for ${channel}`);
    }
    return handler(event(url), payload);
  };
  return { call, update };
}

describe('settings ipc', () => {
  it('returns the public settings to the app window', async () => {
    const { call } = setup();
    expect(await call(IPC_CHANNELS.settingsGet, `${APP_URL}/`)).toEqual(CURRENT);
  });

  it('applies a valid change', async () => {
    const { call, update } = setup();
    const result = await call(IPC_CHANNELS.settingsUpdate, `${APP_URL}/`, {
      theme: 'dark',
      consent: 'granted',
    });
    expect(update).toHaveBeenCalledWith({ theme: 'dark', consent: 'granted' });
    expect(result).toMatchObject({ theme: 'dark', consentGranted: true });
  });

  it.each([
    ['an unknown key', { installId: '6f1c1e9e-3b0a-4c47-9d61-0f6d8f3b2a10' }],
    ['an unknown theme', { theme: 'neon' }],
    ['an unknown language', { language: 'fr' }],
    ['a forged consent record', { consent: { version: 1, acceptedAt: '2026-01-01T00:00:00Z' } }],
    ['no object', 'dark'],
  ])('rejects %s without saving', async (_label, payload) => {
    const { call, update } = setup();
    await expect(call(IPC_CHANNELS.settingsUpdate, `${APP_URL}/`, payload)).rejects.toThrow(
      'Invalid settings change',
    );
    expect(update).not.toHaveBeenCalled();
  });

  it.each([null, 'https://example.com/'])('refuses a sender outside the app (%s)', async (url) => {
    const { call, update } = setup();
    await expect(call(IPC_CHANNELS.settingsGet, url)).rejects.toThrow('Untrusted sender');
    await expect(call(IPC_CHANNELS.settingsUpdate, url, { theme: 'dark' })).rejects.toThrow(
      'Untrusted sender',
    );
    expect(update).not.toHaveBeenCalled();
  });
});
