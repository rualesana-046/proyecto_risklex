import { readFileSync } from 'node:fs';
import { app, utilityProcess } from 'electron';

const HARNESS_TIMEOUT_MS = 60_000;
const [mode, modulePath, pdfPath, heapMb] = process.argv.slice(-4);

function run() {
  return new Promise((resolve) => {
    const started = Date.now();
    const elapsed = () => Date.now() - started;
    const child = utilityProcess.fork(modulePath, [], {
      execArgv: [`--max-old-space-size=${heapMb}`],
      serviceName: 'RiskLex test harness',
      stdio: 'ignore',
    });
    const timer = setTimeout(() => {
      child.kill();
      resolve({ kind: 'timeout', ms: elapsed() });
    }, HARNESS_TIMEOUT_MS);
    child.on('message', (message) => {
      clearTimeout(timer);
      child.kill();
      resolve({ kind: 'message', message, ms: elapsed() });
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ kind: 'exit', code, ms: elapsed() });
    });
    if (mode === 'pdf') {
      child.postMessage({ bytes: new Uint8Array(readFileSync(pdfPath)), maxPages: 300 });
    }
  });
}

app.dock?.hide();
void app
  .whenReady()
  .then(run)
  .then(
    (result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
      app.exit(0);
    },
    () => {
      app.exit(1);
    },
  );
