import { app, BrowserWindow } from 'electron';

const HARNESS_TIMEOUT_MS = 60_000;
const [preloadPath, indexHtmlPath, initialArgument] = process.argv.slice(-3);
const READ_PAGE = `JSON.stringify({
  theme: document.documentElement.dataset.theme ?? null,
  textSize: document.documentElement.dataset.textSize ?? null,
  lang: document.documentElement.lang,
  rootFontSize: getComputedStyle(document.documentElement).fontSize,
  background: getComputedStyle(document.body).backgroundColor,
  rendered: document.getElementById('root')?.childElementCount ?? 0,
})`;

function finish(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  app.exit(0);
}

app.enableSandbox();
setTimeout(() => {
  finish({ kind: 'timeout' });
}, HARNESS_TIMEOUT_MS);

void app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      additionalArguments: [initialArgument],
    },
  });
  window.once('ready-to-show', () => {
    void window.webContents.executeJavaScript(READ_PAGE).then((page) => {
      finish({ kind: 'page', page: JSON.parse(page) });
    });
  });
  await window.loadFile(indexHtmlPath);
});
