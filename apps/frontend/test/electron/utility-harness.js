import { readFileSync } from 'node:fs';
import { app, utilityProcess } from 'electron';

const HARNESS_TIMEOUT_MS = 60_000;
const WATCH_INTERVAL_MS = 100;
const [mode, modulePath, pdfPath, limitMb] = process.argv.slice(-4);

function usageKb(pid) {
  return app.getAppMetrics().find((metric) => metric.pid === pid)?.memory.workingSetSize ?? null;
}

function watchMemory(child, onExceeded) {
  return setInterval(() => {
    const usage = child.pid === undefined ? null : usageKb(child.pid);
    if (mode === 'memory' && usage !== null && usage > Number(limitMb) * 1024) {
      onExceeded(usage);
    }
  }, WATCH_INTERVAL_MS);
}

function run() {
  return new Promise((resolve) => {
    const started = Date.now();
    const elapsed = () => Date.now() - started;
    const child = utilityProcess.fork(modulePath, [], {
      serviceName: 'RiskLex test harness',
      stdio: 'ignore',
    });
    let lastReport = null;
    const finish = (result) => {
      clearTimeout(timer);
      clearInterval(watcher);
      resolve({ ...result, lastReport, ms: elapsed() });
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ kind: 'timeout' });
    }, HARNESS_TIMEOUT_MS);
    const watcher = watchMemory(child, (usage) => {
      child.kill();
      finish({ kind: 'killed', usageMb: Math.round(usage / 1024) });
    });
    child.on('message', (message) => {
      if (mode === 'memory') {
        lastReport = message;
        return;
      }
      child.kill();
      finish({ kind: 'message', message });
    });
    child.on('exit', (code) => {
      finish({ kind: 'exit', code });
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
