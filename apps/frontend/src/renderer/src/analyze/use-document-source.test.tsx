import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentReadOutcome } from '../../../common/document-sources.ts';
import { useDocumentSource, type DocumentSourceBridge } from './use-document-source.ts';

function bridgeReturning(outcome: Promise<DocumentReadOutcome>) {
  const bridge = {
    pickPdf: vi.fn<DocumentSourceBridge['pickPdf']>(() => outcome),
    cancelDocumentRead: vi.fn(),
  };
  return bridge;
}

describe('useDocumentSource (simulated preload bridge)', () => {
  it('fills the text and remembers only the source name and length', async () => {
    const bridge = bridgeReturning(
      Promise.resolve({
        ok: true,
        text: 'Texto del contrato',
        source: { kind: 'pdf', name: 'contrato.pdf' },
        characters: 18,
      }),
    );
    const onText = vi.fn();
    const { result } = renderHook(() => useDocumentSource(bridge, onText));
    await act(async () => {
      await result.current.pickPdf();
    });
    expect(onText).toHaveBeenCalledWith('Texto del contrato');
    expect(result.current.state).toEqual({
      status: 'loaded',
      source: { kind: 'pdf', name: 'contrato.pdf' },
      characters: 18,
    });
  });

  it('keeps the text untouched when reading fails', async () => {
    const bridge = bridgeReturning(
      Promise.resolve({ ok: false, error: { code: 'pdf_encrypted', characters: null } }),
    );
    const onText = vi.fn();
    const { result } = renderHook(() => useDocumentSource(bridge, onText));
    await act(async () => {
      await result.current.pickPdf();
    });
    expect(onText).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({
      status: 'failed',
      error: { code: 'pdf_encrypted', characters: null },
    });
  });

  it('turns a broken bridge into an unexpected error', async () => {
    const bridge = bridgeReturning(Promise.reject(new Error('ipc broke')));
    const onText = vi.fn();
    const { result } = renderHook(() => useDocumentSource(bridge, onText));
    await act(async () => {
      await result.current.pickPdf();
    });
    expect(onText).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({
      status: 'failed',
      error: { code: 'document_unexpected' },
    });
  });

  it('shows the reading state and asks main to cancel', () => {
    const bridge = bridgeReturning(new Promise(() => undefined));
    const { result } = renderHook(() => useDocumentSource(bridge, vi.fn()));
    act(() => {
      void result.current.pickPdf();
    });
    expect(result.current.state).toEqual({ status: 'reading' });
    act(() => {
      result.current.cancel();
    });
    expect(bridge.cancelDocumentRead).toHaveBeenCalledOnce();
  });
});
