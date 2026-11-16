const retained = [];
const REPORT_EVERY = 8;

for (;;) {
  retained.push(new Array(1_000_000).fill(retained.length));
  if (retained.length % REPORT_EVERY === 0) {
    process.parentPort.postMessage({
      heapMb: Math.round(process.memoryUsage().heapUsed / 1_048_576),
    });
  }
}
