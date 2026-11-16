import { readFileSync, writeFileSync } from 'node:fs';
import { app, BrowserWindow, session } from 'electron';

const SIZE = 1024;
const PAINT_TIMEOUT_MS = 15_000;
const [source, target] = process.argv.slice(-2);

function blockEverythingButTheInlinePage() {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !details.url.startsWith('data:') });
  });
}

function firstPaint(contents) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('The icon was not painted in time'));
    }, PAINT_TIMEOUT_MS);
    contents.on('paint', (_event, _dirty, image) => {
      const size = image.getSize();
      if (size.width > 0 && size.height > 0) {
        clearTimeout(timer);
        resolve(image);
      }
    });
  });
}

async function render(svgPath, pngPath) {
  if (!svgPath.endsWith('.svg') || !pngPath.endsWith('.png')) {
    throw new Error('Usage: electron render-icon.js <icon.svg> <icon.png>');
  }
  blockEverythingButTheInlinePage();
  const window = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    frame: false,
    transparent: true,
    useContentSize: true,
    webPreferences: {
      offscreen: true,
      javascript: false,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const painted = firstPaint(window.webContents);
  const page = `<html><body style="margin:0;background:transparent">${readFileSync(svgPath, 'utf8')}</body></html>`;
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page)}`);
  const image = await painted;
  writeFileSync(pngPath, image.resize({ width: SIZE, height: SIZE, quality: 'best' }).toPNG());
}

let exitCode = 0;

void app
  .whenReady()
  .then(() => render(source ?? '', target ?? ''))
  .catch((error) => {
    exitCode = 1;
    process.stderr.write(`${error instanceof Error ? error.message : 'Icon rendering failed'}\n`);
  })
  .finally(() => {
    app.exit(exitCode);
  });
