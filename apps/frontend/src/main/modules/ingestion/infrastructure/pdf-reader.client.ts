import { PDF_MAX_PAGES, PDF_READ_TIMEOUT_MS } from '../../../../common/document-sources.ts';
import { pdfWorkerResponseSchema, type PdfWorkerResponse } from './pdf-worker-protocol.ts';

export type PdfReadResult =
  PdfWorkerResponse | { readonly ok: false; readonly code: 'pdf_timeout' | 'document_cancelled' };

export interface WorkerHandle {
  readonly pid: number | undefined;
  postMessage(message: unknown): void;
  kill(): void;
  onMessage(listener: (message: unknown) => void): void;
  onExit(listener: () => void): void;
}

export interface WorkerOptions {
  readonly serviceName: string;
  readonly stdio: 'ignore';
}

export type ForkWorker = (modulePath: string, options: WorkerOptions) => WorkerHandle;

export interface MemoryWatch {
  readonly usageKb: (pid: number) => number | null;
  readonly limitKb: number;
  readonly intervalMs: number;
}

export interface PdfReaderOptions {
  readonly fork: ForkWorker;
  readonly memory?: MemoryWatch;
  readonly workerPath: string;
  readonly timeoutMs?: number;
  readonly maxPages?: number;
}

export interface PdfReader {
  read(bytes: Uint8Array, signal: AbortSignal): Promise<PdfReadResult>;
}

const CANCELLED: PdfReadResult = { ok: false, code: 'document_cancelled' };
const TIMEOUT: PdfReadResult = { ok: false, code: 'pdf_timeout' };
const DAMAGED: PdfReadResult = { ok: false, code: 'pdf_damaged' };
const DEFAULT_WATCH_INTERVAL_MS = 100;

function watchMemory(
  child: WorkerHandle,
  memory: MemoryWatch | undefined,
  onExceeded: () => void,
): ReturnType<typeof setInterval> {
  return setInterval(() => {
    const usage =
      child.pid === undefined || memory === undefined ? null : memory.usageKb(child.pid);
    if (usage !== null && memory !== undefined && usage > memory.limitKb) {
      onExceeded();
    }
  }, memory?.intervalMs ?? DEFAULT_WATCH_INTERVAL_MS);
}

function runWorker(options: PdfReaderOptions, bytes: Uint8Array, signal: AbortSignal) {
  return new Promise<PdfReadResult>((resolve) => {
    const child = options.fork(options.workerPath, {
      serviceName: 'RiskLex PDF reader',
      stdio: 'ignore',
    });
    let settled = false;
    const finish = (result: PdfReadResult) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      clearInterval(watcher);
      signal.removeEventListener('abort', onAbort);
      child.kill();
      resolve(result);
    };
    const onAbort = () => {
      finish(CANCELLED);
    };
    const timer = setTimeout(() => {
      finish(TIMEOUT);
    }, options.timeoutMs ?? PDF_READ_TIMEOUT_MS);
    const watcher = watchMemory(child, options.memory, () => {
      finish(TIMEOUT);
    });
    signal.addEventListener('abort', onAbort, { once: true });
    child.onMessage((message) => {
      const parsed = pdfWorkerResponseSchema.safeParse(message);
      finish(parsed.success ? parsed.data : DAMAGED);
    });
    child.onExit(() => {
      finish(TIMEOUT);
    });
    child.postMessage({ bytes, maxPages: options.maxPages ?? PDF_MAX_PAGES });
  });
}

export function createPdfReader(options: PdfReaderOptions): PdfReader {
  return {
    read: (bytes, signal) =>
      signal.aborted ? Promise.resolve(CANCELLED) : runWorker(options, bytes, signal),
  };
}
