import { MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import { extractText, getDocumentProxy } from 'unpdf';
import { MIN_USEFUL_CHARACTERS, PDF_MAX_PAGES } from '../../../../common/document-sources.ts';

export type PdfExtraction =
  | { readonly ok: true; readonly text: string; readonly pages: number }
  | {
      readonly ok: false;
      readonly code:
        'pdf_not_pdf' | 'pdf_too_many_pages' | 'pdf_encrypted' | 'pdf_damaged' | 'pdf_no_text';
    };

const PDF_SIGNATURE = '%PDF-';

const SAFE_OPTIONS = {
  enableXfa: false,
  disableFontFace: true,
  useSystemFonts: false,
  stopAtErrors: true,
  maxImageSize: 0,
  verbosity: 0,
} as const;

function hasPdfSignature(bytes: Uint8Array): boolean {
  const head = Buffer.from(bytes.subarray(0, 1024)).toString('latin1');
  return head.includes(PDF_SIGNATURE);
}

function normalize(text: string): string {
  return text
    .replace(/[ \t\u00a0]+/gu, ' ')
    .replace(/ *\n */gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}

function openingError(error: unknown): PdfExtraction {
  const name = error instanceof Error ? error.name : '';
  return { ok: false, code: name === 'PasswordException' ? 'pdf_encrypted' : 'pdf_damaged' };
}

export async function extractPdfText(
  bytes: Uint8Array,
  maxPages = PDF_MAX_PAGES,
): Promise<PdfExtraction> {
  if (!hasPdfSignature(bytes)) {
    return { ok: false, code: 'pdf_not_pdf' };
  }
  let document: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    document = await getDocumentProxy(new Uint8Array(bytes), SAFE_OPTIONS);
  } catch (error) {
    return openingError(error);
  }
  try {
    if (document.numPages > maxPages) {
      return { ok: false, code: 'pdf_too_many_pages' };
    }
    const { text, totalPages } = await extractText(document, { mergePages: true });
    const normalized = normalize(text);
    if (normalized.replace(/\s/gu, '').length < MIN_USEFUL_CHARACTERS) {
      return { ok: false, code: 'pdf_no_text' };
    }
    return { ok: true, text: normalized.slice(0, MAX_DOCUMENT_CHARACTERS * 4), pages: totalPages };
  } catch {
    return { ok: false, code: 'pdf_damaged' };
  } finally {
    await document.cleanup();
  }
}
