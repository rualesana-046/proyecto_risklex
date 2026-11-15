import { app, BrowserWindow, session } from 'electron';
import { createMainWindow, resolveRendererUrl } from './app/create-window.ts';
import { denyAllPermissions, denyNewWindowsAndWebviews } from './app/window-security.ts';
import { composeApplication } from './composition-root.ts';

app.enableSandbox();

app.on('web-contents-created', (_event, contents) => {
  denyNewWindowsAndWebviews(contents);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createMainWindow(resolveRendererUrl());
  }
});

void app.whenReady().then(async () => {
  denyAllPermissions(session.defaultSession);
  const url = resolveRendererUrl();
  composeApplication(url);
  await createMainWindow(url);
});
