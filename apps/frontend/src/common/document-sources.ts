export const PDF_MAX_BYTES = 20 * 1024 * 1024;
export const PDF_MAX_PAGES = 300;
export const PDF_READ_TIMEOUT_MS = 30_000;
export const PDF_READER_MAX_HEAP_MB = 512;
export const MIN_USEFUL_CHARACTERS = 200;
export const MAX_SOURCE_NAME_CHARACTERS = 255;

export const DOCUMENT_SOURCE_KINDS = ['pdf'] as const;
export type DocumentSourceKind = (typeof DOCUMENT_SOURCE_KINDS)[number];

export const DOCUMENT_READ_ERROR_CODES = [
  'pdf_not_pdf',
  'pdf_too_large',
  'pdf_too_many_pages',
  'pdf_encrypted',
  'pdf_damaged',
  'pdf_no_text',
  'pdf_timeout',
  'document_too_long',
  'document_cancelled',
  'document_dismissed',
  'document_unexpected',
] as const;
export type DocumentReadErrorCode = (typeof DOCUMENT_READ_ERROR_CODES)[number];

export interface DocumentSource {
  readonly kind: DocumentSourceKind;
  readonly name: string;
}

export type DocumentReadOutcome =
  | {
      readonly ok: true;
      readonly text: string;
      readonly source: DocumentSource;
      readonly characters: number;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: DocumentReadErrorCode;
        readonly characters: number | null;
      };
    };
