import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPdf, paginate, wrapText } from '../../../../../test/support/pdf-builder.ts';
import { extractPdfText } from './pdf-text-extractor.ts';

const SAMPLE = readFileSync(
  new URL('../../../../../../../docs/ai-evaluation/synthetic-terms-es.md', import.meta.url),
  'utf8',
);

function samplePdf(): Uint8Array {
  return buildPdf({ pages: paginate(wrapText(SAMPLE)) });
}

describe('extractPdfText (real unpdf on synthetic PDFs)', () => {
  it('extracts the synthetic terms, accents included', async () => {
    const result = await extractPdfText(samplePdf());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text.replace(/\s+/gu, ' ')).toContain('socios comerciales y anunciantes');
      expect(result.text).toContain('Términos');
      expect(result.pages).toBeGreaterThanOrEqual(1);
    }
  });

  it('reports a scanned looking pdf without text', async () => {
    expect(await extractPdfText(buildPdf({ pages: [[]] }))).toEqual({
      ok: false,
      code: 'pdf_no_text',
    });
  });

  it('reports a password protected pdf', async () => {
    const result = await extractPdfText(
      buildPdf({ pages: [['Texto protegido']], encrypted: true }),
    );
    expect(result).toEqual({ ok: false, code: 'pdf_encrypted' });
  });

  it('reports a damaged pdf', async () => {
    const bytes = samplePdf();
    const damaged = new Uint8Array([...bytes.subarray(0, 40), ...new Uint8Array(200).fill(0x41)]);
    expect(await extractPdfText(damaged)).toEqual({ ok: false, code: 'pdf_damaged' });
  });

  it('refuses a file that is not a pdf', async () => {
    const notPdf = new TextEncoder().encode('<html><body>No soy un PDF</body></html>');
    expect(await extractPdfText(notPdf)).toEqual({ ok: false, code: 'pdf_not_pdf' });
  });

  it('refuses a pdf with more pages than allowed', async () => {
    const pages = Array.from({ length: 4 }, (_page, index) => [
      `Página ${String(index + 1)} con texto suficiente`,
    ]);
    expect(await extractPdfText(buildPdf({ pages }), 3)).toEqual({
      ok: false,
      code: 'pdf_too_many_pages',
    });
  });
});
