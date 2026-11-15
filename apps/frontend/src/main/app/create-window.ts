import { join } from 'node:path';
import { app, BrowserWindow } from 'electron';
import { rendererUrl, restrictNavigation, secureWebPreferences } from './window-security.ts';

const DEVELOPMENT_RENDERER_URL_VARIABLE = 'ELECTRON_RENDERER_URL';

export async function createMainWindow(): Promise<BrowserWindow> {
  const url = rendererUrl(
    app.isPackaged,
    process.env[DEVELOPMENT_RENDERER_URL_VARIABLE],
    join(import.meta.dirname, '../renderer/index.html'),
  );
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: secureWebPreferences(
      join(import.meta.dirname, '../preload/index.cjs'),
      app.isPackaged,
    ),
  });
  restrictNavigation(window.webContents, url);
  window.once('ready-to-show', () => {
    window.show();
  });
  await window.loadURL(url);
  return window;
}
