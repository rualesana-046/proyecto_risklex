import type { IpcMain } from 'electron';
import { publicSettingsSchema, settingsUpdateSchema } from '../../common/settings-schemas.ts';
import type { PublicSettings } from '../../common/settings-vocabulary.ts';
import { IPC_CHANNELS } from '../../common/ipc-channels.ts';
import { isAppUrl } from '../app/window-security.ts';
import type { SettingsService } from '../settings/settings.service.ts';

export interface SettingsIpcDependencies {
  readonly ipc: Pick<IpcMain, 'handle'>;
  readonly appUrl: string;
  readonly settings: Pick<SettingsService, 'current' | 'update'>;
}

interface SenderFrameEvent {
  readonly senderFrame: { readonly url: string } | null;
}

const UNTRUSTED = 'Untrusted sender';
const INVALID = 'Invalid settings change';

export function registerSettingsIpc(dependencies: SettingsIpcDependencies): void {
  const isTrusted = (event: SenderFrameEvent): boolean =>
    event.senderFrame !== null && isAppUrl(event.senderFrame.url, dependencies.appUrl);

  dependencies.ipc.handle(IPC_CHANNELS.settingsGet, (event): Promise<PublicSettings> => {
    if (!isTrusted(event)) {
      return Promise.reject(new Error(UNTRUSTED));
    }
    return Promise.resolve(publicSettingsSchema.parse(dependencies.settings.current()));
  });

  dependencies.ipc.handle(
    IPC_CHANNELS.settingsUpdate,
    async (event, payload: unknown): Promise<PublicSettings> => {
      if (!isTrusted(event)) {
        throw new Error(UNTRUSTED);
      }
      const change = settingsUpdateSchema.safeParse(payload);
      if (!change.success) {
        throw new Error(INVALID);
      }
      return publicSettingsSchema.parse(await dependencies.settings.update(change.data));
    },
  );
}
