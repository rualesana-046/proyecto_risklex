import { MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import { describe, expect, it, vi } from 'vitest';
import { PDF_MAX_BYTES } from '../../../../common/document-sources.ts';
import type { PdfReader, PdfReadResult } from '../infrastructure/pdf-reader.client.ts';
import { readPdfDocument, type PickedFile } from './read-pdf.use-case.ts';

function file(overrides: Partial<PickedFile> = {}): PickedFile {
  return {
    name: 'contrato.pdf',
    sizeBytes: 1000,
    read: () => Promise.resolve(new Uint8Array([1, 2, 3])),
    ...overrides,
  };
}

function readerReturning(result: PdfReadResult): PdfReader {
  return { read: () => Promise.resolve(result) };
}

function run(picked: PickedFile | null, reader: PdfReader, signal = new AbortController().signal) {
  return readPdfDocument({ pick: () => Promise.resolve(picked), reader }, signal);
}

describe('readPdfDocument (simulated dialog and reader)', () => {
  it('returns the text with only the file base name and the character count', async () => {
    const outcome = await run(
      file(),
      readerReturning({ ok: true, text: 'Texto del contrato', pages: 1 }),
    );
    expect(outcome).toEqual({
      ok: true,
      text: 'Texto del contrato',
      source: { kind: 'pdf', name: 'contrato.pdf' },
      characters: 18,
    });
  });

  it('reports a closed dialog as dismissed without reading anything', async () => {
    const read = vi.fn<PdfReader['read']>();
    expect(await run(null, { read })).toEqual({
      ok: false,
      error: { code: 'document_dismissed', characters: null },
    });
    expect(read).not.toHaveBeenCalled();
  });

  it('refuses a file over the size limit before reading it', async () => {
    const read = vi.fn(() => Promise.resolve(new Uint8Array()));
    const reader = readerReturning({ ok: true, text: 'x', pages: 1 });
    const outcome = await run(file({ sizeBytes: PDF_MAX_BYTES + 1, read }), reader);
    expect(outcome).toEqual({ ok: false, error: { code: 'pdf_too_large', characters: null } });
    expect(read).not.toHaveBeenCalled();
  });

  it('rejects a document over the analysis limit with its length', async () => {
    const text = 'a'.repeat(MAX_DOCUMENT_CHARACTERS + 5);
    const outcome = await run(file(), readerReturning({ ok: true, text, pages: 9 }));
    expect(outcome).toEqual({
      ok: false,
      error: { code: 'document_too_long', characters: text.length },
    });
  });

  it.each([
    'pdf_encrypted',
    'pdf_no_text',
    'pdf_damaged',
    'pdf_timeout',
    'document_cancelled',
  ] as const)('passes the %s error through', async (code) => {
    expect(await run(file(), readerReturning({ ok: false, code }))).toEqual({
      ok: false,
      error: { code, characters: null },
    });
  });

  it('reports an unreadable file without its path', async () => {
    const read = () => Promise.reject(new Error('EACCES: /Volumes/Datos/privado/contrato.pdf'));
    const outcome = await run(file({ read }), readerReturning({ ok: true, text: 'x', pages: 1 }));
    expect(outcome).toEqual({
      ok: false,
      error: { code: 'document_unexpected', characters: null },
    });
    expect(JSON.stringify(outcome)).not.toContain('/Volumes');
  });
});
