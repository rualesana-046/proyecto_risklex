import { join } from 'node:path';
import { app, BrowserWindow } from 'electron';
import { encodeInitialSettings } from '../../common/initial-settings.ts';
import type { PublicSettings } from '../../common/settings-vocabulary.ts';
import { rendererUrl, restrictNavigation, secureWebPreferences } from './window-security.ts';

const DEVELOPMENT_RENDERER_URL_VARIABLE = 'ELECTRON_RENDERER_URL';

export function resolveRendererUrl(): string {
  return rendererUrl(
    app.isPackaged,
    process.env[DEVELOPMENT_RENDERER_URL_VARIABLE],
    join(import.meta.dirname, '../renderer/index.html'),
  );
}

export async function createMainWindow(
  url: string,
  settings: PublicSettings,
): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      ...secureWebPreferences(join(import.meta.dirname, '../preload/index.cjs'), app.isPackaged),
      additionalArguments: [encodeInitialSettings(settings)],
    },
  });
  restrictNavigation(window.webContents, url);
  window.once('ready-to-show', () => {
    window.show();
  });
  await window.loadURL(url);
  return window;
}
