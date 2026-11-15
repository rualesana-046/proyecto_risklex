import { pathToFileURL } from 'node:url';
import type { Session, WebContents, WebPreferences } from 'electron';

export function secureWebPreferences(preloadPath: string, isPackaged: boolean): WebPreferences {
  return {
    preload: preloadPath,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    spellcheck: false,
    devTools: !isPackaged,
  };
}

export function rendererUrl(
  isPackaged: boolean,
  developmentUrl: string | undefined,
  indexHtmlPath: string,
): string {
  if (!isPackaged && developmentUrl !== undefined && developmentUrl !== '') {
    return developmentUrl;
  }
  return pathToFileURL(indexHtmlPath).href;
}

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function isAppUrl(candidate: string, appUrl: string): boolean {
  const target = parseUrl(candidate);
  const app = parseUrl(appUrl);
  if (target === null || app === null) {
    return false;
  }
  if (app.protocol === 'file:') {
    return target.protocol === 'file:' && target.pathname === app.pathname;
  }
  return target.origin === app.origin;
}

export function denyNewWindowsAndWebviews(contents: WebContents): void {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
}

export function restrictNavigation(contents: WebContents, appUrl: string): void {
  contents.on('will-navigate', (details) => {
    if (!isAppUrl(details.url, appUrl)) {
      details.preventDefault();
    }
  });
  contents.on('will-redirect', (details) => {
    if (!isAppUrl(details.url, appUrl)) {
      details.preventDefault();
    }
  });
}

export function denyAllPermissions(session: Session): void {
  session.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  session.setPermissionCheckHandler(() => false);
}
