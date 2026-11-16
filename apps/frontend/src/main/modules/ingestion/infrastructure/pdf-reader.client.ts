import {
  PDF_MAX_PAGES,
  PDF_READ_TIMEOUT_MS,
  PDF_READER_MAX_HEAP_MB,
} from '../../../../common/document-sources.ts';
import { pdfWorkerResponseSchema, type PdfWorkerResponse } from './pdf-worker-protocol.ts';

export type PdfReadResult =
  PdfWorkerResponse | { readonly ok: false; readonly code: 'pdf_timeout' | 'document_cancelled' };

export interface WorkerHandle {
  postMessage(message: unknown): void;
  kill(): void;
  onMessage(listener: (message: unknown) => void): void;
  onExit(listener: () => void): void;
}

export interface WorkerOptions {
  readonly execArgv: readonly string[];
  readonly serviceName: string;
  readonly stdio: 'ignore';
}

export type ForkWorker = (modulePath: string, options: WorkerOptions) => WorkerHandle;

export interface PdfReaderOptions {
  readonly fork: ForkWorker;
  readonly workerPath: string;
  readonly timeoutMs?: number;
  readonly maxHeapMb?: number;
  readonly maxPages?: number;
}

export interface PdfReader {
  read(bytes: Uint8Array, signal: AbortSignal): Promise<PdfReadResult>;
}

const CANCELLED: PdfReadResult = { ok: false, code: 'document_cancelled' };
const TIMEOUT: PdfReadResult = { ok: false, code: 'pdf_timeout' };
const DAMAGED: PdfReadResult = { ok: false, code: 'pdf_damaged' };

function runWorker(options: PdfReaderOptions, bytes: Uint8Array, signal: AbortSignal) {
  return new Promise<PdfReadResult>((resolve) => {
    const child = options.fork(options.workerPath, {
      execArgv: [`--max-old-space-size=${String(options.maxHeapMb ?? PDF_READER_MAX_HEAP_MB)}`],
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
