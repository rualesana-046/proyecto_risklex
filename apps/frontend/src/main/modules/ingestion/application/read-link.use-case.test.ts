import { MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import { describe, expect, it, vi } from 'vitest';
import type { PdfReader } from '../infrastructure/pdf-reader.client.ts';
import type { FetchedDocument } from '../infrastructure/safe-fetch.ts';
import { readLinkDocument } from './read-link.use-case.ts';

const LONG_PARAGRAPH = 'Podremos compartir tu correo con socios comerciales y anunciantes. '.repeat(
  6,
);

function page(
  body: string,
  kind: 'html' | 'text' | 'pdf' = 'html',
  host = 'example.com',
): FetchedDocument {
  return {
    ok: true,
    kind,
    body: new Uint8Array(Buffer.from(body, 'utf8')),
    charset: 'utf-8',
    host,
  };
}

const NO_PDF: PdfReader = { read: () => Promise.reject(new Error('not used')) };

function read(fetched: FetchedDocument, reader: PdfReader = NO_PDF) {
  return readLinkDocument(
    { fetch: () => Promise.resolve(fetched), reader },
    'https://example.com/terms?ref=private',
    new AbortController().signal,
  );
}

describe('readLinkDocument (simulated fetch and pdf reader)', () => {
  it('extracts the page text and shows only the host, never the path or query', async () => {
    const outcome = await read(
      page(`<html><body><h1>Términos</h1><p>${LONG_PARAGRAPH}</p></body></html>`),
    );
    expect(outcome).toMatchObject({ ok: true, source: { kind: 'link', name: 'example.com' } });
    expect(JSON.stringify(outcome)).not.toMatch(/terms|ref=private/u);
  });

  it('shows an international domain in its readable form', async () => {
    const outcome = await read(page(`<p>${LONG_PARAGRAPH}</p>`, 'html', 'xn--ejmplo-cva.com.'));
    expect(outcome).toMatchObject({ ok: true, source: { name: 'ejémplo.com' } });
  });

  it('reads plain text pages', async () => {
    expect(await read(page(LONG_PARAGRAPH, 'text'))).toMatchObject({
      ok: true,
      text: LONG_PARAGRAPH.trim(),
    });
  });

  it('reads a linked pdf through the isolated reader', async () => {
    const reader = {
      read: vi.fn<PdfReader['read']>(() =>
        Promise.resolve({ ok: true, text: LONG_PARAGRAPH, pages: 2 }),
      ),
    };
    expect(await read(page('%PDF-1.4', 'pdf'), reader)).toMatchObject({
      ok: true,
      characters: LONG_PARAGRAPH.length,
    });
    expect(reader.read).toHaveBeenCalledOnce();
  });

  it('passes pdf reader errors through', async () => {
    const reader: PdfReader = { read: () => Promise.resolve({ ok: false, code: 'pdf_encrypted' }) };
    expect(await read(page('%PDF-1.4', 'pdf'), reader)).toEqual({
      ok: false,
      error: { code: 'pdf_encrypted', characters: null },
    });
  });

  it.each([
    ['<html><body><nav>Menú</nav></body></html>', 'link_no_text'],
    [
      '<html><body><div id="root"></div><script src="app.js"></script></body></html>',
      'link_needs_javascript',
    ],
  ])('explains a page without readable text: %s', async (html, code) => {
    expect(await read(page(html))).toEqual({ ok: false, error: { code, characters: null } });
  });

  it('passes fetch errors through', async () => {
    expect(await read({ ok: false, code: 'link_blocked' })).toEqual({
      ok: false,
      error: { code: 'link_blocked', characters: null },
    });
  });

  it('rejects a page over the analysis limit with its length', async () => {
    const text = 'a'.repeat(MAX_DOCUMENT_CHARACTERS + 1);
    expect(await read(page(text, 'text'))).toEqual({
      ok: false,
      error: { code: 'document_too_long', characters: text.length },
    });
  });
});
