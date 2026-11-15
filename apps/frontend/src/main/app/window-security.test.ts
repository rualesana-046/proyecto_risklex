import { EventEmitter } from 'node:events';
import type { Session, WebContents } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import {
  denyAllPermissions,
  denyNewWindowsAndWebviews,
  isAppUrl,
  rendererUrl,
  restrictNavigation,
  secureWebPreferences,
} from './window-security.ts';

class FakeContents extends EventEmitter {
  openHandler: (() => { action: string }) | undefined;

  setWindowOpenHandler(handler: () => { action: string }): void {
    this.openHandler = handler;
  }
}

function navigationEvent(url: string) {
  return { url, preventDefault: vi.fn() };
}

function asContents(fake: FakeContents): WebContents {
  return fake as unknown as WebContents;
}

const DEV_URL = 'http://localhost:5173';
const FILE_URL = 'file:///Applications/RiskLex.app/Contents/Resources/out/renderer/index.html';

describe('secureWebPreferences', () => {
  it('isolates and sandboxes the renderer without node access', () => {
    const preferences = secureWebPreferences('/app/out/preload/index.cjs', true);
    expect(preferences).toMatchObject({
      preload: '/app/out/preload/index.cjs',
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    });
  });

  it('enables developer tools only when the app is not packaged', () => {
    expect(secureWebPreferences('preload.cjs', false).devTools).toBe(true);
    expect(secureWebPreferences('preload.cjs', true).devTools).toBe(false);
  });
});

describe('rendererUrl', () => {
  const indexHtml = '/app/out/renderer/index.html';

  it('uses the development server only when the app is not packaged', () => {
    expect(rendererUrl(false, DEV_URL, indexHtml)).toBe(DEV_URL);
  });

  it('ignores the development variable in the packaged app', () => {
    expect(rendererUrl(true, 'https://example.com', indexHtml)).toBe(`file://${indexHtml}`);
  });

  it('falls back to the bundled file without a development server', () => {
    expect(rendererUrl(false, undefined, indexHtml)).toBe(`file://${indexHtml}`);
    expect(rendererUrl(false, '', indexHtml)).toBe(`file://${indexHtml}`);
  });
});

describe('isAppUrl', () => {
  it.each([
    [`${DEV_URL}/`, DEV_URL],
    [`${DEV_URL}/#results`, DEV_URL],
    [`${FILE_URL}#results`, FILE_URL],
  ])('accepts %s for %s', (candidate, appUrl) => {
    expect(isAppUrl(candidate, appUrl)).toBe(true);
  });

  it.each([
    ['https://example.com', DEV_URL],
    ['http://localhost:5174/', DEV_URL],
    ['file:///etc/passwd', FILE_URL],
    ['https://example.com', FILE_URL],
    ['not a url', DEV_URL],
  ])('rejects %s for %s', (candidate, appUrl) => {
    expect(isAppUrl(candidate, appUrl)).toBe(false);
  });
});

describe('web contents hardening', () => {
  it('denies every new window and webview', () => {
    const contents = new FakeContents();
    denyNewWindowsAndWebviews(asContents(contents));
    expect(contents.openHandler?.()).toEqual({ action: 'deny' });
    const webview = { preventDefault: vi.fn() };
    contents.emit('will-attach-webview', webview);
    expect(webview.preventDefault).toHaveBeenCalledOnce();
  });

  it.each(['will-navigate', 'will-redirect'])('blocks external targets on %s', (name) => {
    const contents = new FakeContents();
    restrictNavigation(asContents(contents), DEV_URL);
    const external = navigationEvent('https://example.com');
    const internal = navigationEvent(`${DEV_URL}/#results`);
    contents.emit(name, external);
    contents.emit(name, internal);
    expect(external.preventDefault).toHaveBeenCalledOnce();
    expect(internal.preventDefault).not.toHaveBeenCalled();
  });
});

describe('denyAllPermissions', () => {
  it('rejects permission requests and checks', () => {
    const fake = {
      setPermissionRequestHandler: vi.fn(),
      setPermissionCheckHandler: vi.fn(),
    };
    denyAllPermissions(fake as unknown as Session);
    const [requestHandler] = fake.setPermissionRequestHandler.mock.calls[0] as [
      (contents: unknown, permission: string, callback: (granted: boolean) => void) => void,
    ];
    const [checkHandler] = fake.setPermissionCheckHandler.mock.calls[0] as [() => boolean];
    const callback = vi.fn();
    requestHandler(null, 'media', callback);
    expect(callback).toHaveBeenCalledWith(false);
    expect(checkHandler()).toBe(false);
  });
});
