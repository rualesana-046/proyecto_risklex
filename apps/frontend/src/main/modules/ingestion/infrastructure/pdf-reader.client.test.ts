import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPdfReader, type ForkWorker, type WorkerOptions } from './pdf-reader.client.ts';

class FakeWorker {
  readonly pid = 4242;
  readonly posted: unknown[] = [];
  killed = 0;
  private messageListener: (message: unknown) => void = () => undefined;
  private exitListener: () => void = () => undefined;

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  kill(): void {
    this.killed += 1;
  }

  onMessage(listener: (message: unknown) => void): void {
    this.messageListener = listener;
  }

  onExit(listener: () => void): void {
    this.exitListener = listener;
  }

  reply(message: unknown): void {
    this.messageListener(message);
  }

  crash(): void {
    this.exitListener();
  }
}

function setup(timeoutMs = 1000, usageKb: (pid: number) => number | null = () => null) {
  const worker = new FakeWorker();
  const calls: { path: string; options: WorkerOptions }[] = [];
  const fork: ForkWorker = (path, options) => {
    calls.push({ path, options });
    return worker;
  };
  const reader = createPdfReader({
    fork,
    workerPath: '/app/out/main/pdf-text.worker.js',
    timeoutMs,
    maxPages: 300,
    memory: { usageKb, limitKb: 512 * 1024, intervalMs: 100 },
  });
  return { worker, calls, reader };
}

const BYTES = new Uint8Array([1, 2, 3]);

afterEach(() => {
  vi.useRealTimers();
});

describe('pdf reader client (simulated utility process)', () => {
  it('forks the isolated reader and sends the bytes', async () => {
    const { worker, calls, reader } = setup();
    const pending = reader.read(BYTES, new AbortController().signal);
    expect(calls[0]?.path).toBe('/app/out/main/pdf-text.worker.js');
    expect(calls[0]?.options).toEqual({
      serviceName: 'RiskLex PDF reader',
      stdio: 'ignore',
    });
    expect(worker.posted).toEqual([{ bytes: BYTES, maxPages: 300 }]);
    worker.reply({ ok: true, text: 'Texto', pages: 1 });
    expect(await pending).toEqual({ ok: true, text: 'Texto', pages: 1 });
    expect(worker.killed).toBe(1);
  });

  it('treats a malformed reply as a damaged pdf', async () => {
    const { worker, reader } = setup();
    const pending = reader.read(BYTES, new AbortController().signal);
    worker.reply({ ok: true, text: 42 });
    expect(await pending).toEqual({ ok: false, code: 'pdf_damaged' });
  });

  it('kills the reader when it takes too long', async () => {
    vi.useFakeTimers();
    const { worker, reader } = setup(30_000);
    const pending = reader.read(BYTES, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await pending).toEqual({ ok: false, code: 'pdf_timeout' });
    expect(worker.killed).toBe(1);
  });

  it('kills the reader when the person cancels', async () => {
    const { worker, reader } = setup();
    const controller = new AbortController();
    const pending = reader.read(BYTES, controller.signal);
    controller.abort();
    expect(await pending).toEqual({ ok: false, code: 'document_cancelled' });
    expect(worker.killed).toBe(1);
  });

  it('reports a crash, such as running out of memory, without hanging', async () => {
    const { worker, reader } = setup();
    const pending = reader.read(BYTES, new AbortController().signal);
    worker.crash();
    expect(await pending).toEqual({ ok: false, code: 'pdf_timeout' });
  });

  it('does not start a reader for an already cancelled read', async () => {
    const { calls, reader } = setup();
    const controller = new AbortController();
    controller.abort();
    expect(await reader.read(BYTES, controller.signal)).toEqual({
      ok: false,
      code: 'document_cancelled',
    });
    expect(calls).toHaveLength(0);
  });

  it('ignores anything that arrives after the result', async () => {
    const { worker, reader } = setup();
    const pending = reader.read(BYTES, new AbortController().signal);
    worker.reply({ ok: false, code: 'pdf_no_text' });
    worker.crash();
    expect(await pending).toEqual({ ok: false, code: 'pdf_no_text' });
    expect(worker.killed).toBe(1);
  });

  it('kills the reader when its memory goes over the limit', async () => {
    vi.useFakeTimers();
    let usage = 100 * 1024;
    const seen: number[] = [];
    const { worker, reader } = setup(30_000, (pid) => {
      seen.push(pid);
      return usage;
    });
    const pending = reader.read(BYTES, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(300);
    expect(worker.killed).toBe(0);
    usage = 600 * 1024;
    await vi.advanceTimersByTimeAsync(100);
    expect(await pending).toEqual({ ok: false, code: 'pdf_timeout' });
    expect(worker.killed).toBe(1);
    expect(seen.every((pid) => pid === 4242)).toBe(true);
  });
});
