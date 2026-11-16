import { MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import {
  MAX_SOURCE_NAME_CHARACTERS,
  PDF_MAX_BYTES,
  type DocumentReadErrorCode,
  type DocumentReadOutcome,
} from '../../../../common/document-sources.ts';
import type { PdfReader } from '../infrastructure/pdf-reader.client.ts';

export interface PickedFile {
  readonly name: string;
  readonly sizeBytes: number;
  readonly read: () => Promise<Uint8Array>;
}

export interface ReadPdfDependencies {
  readonly pick: () => Promise<PickedFile | null>;
  readonly reader: PdfReader;
}

function failure(
  code: DocumentReadErrorCode,
  characters: number | null = null,
): DocumentReadOutcome {
  return { ok: false, error: { code, characters } };
}

async function readBytes(file: PickedFile): Promise<Uint8Array | null> {
  try {
    return await file.read();
  } catch {
    return null;
  }
}

export async function readPdfDocument(
  dependencies: ReadPdfDependencies,
  signal: AbortSignal,
): Promise<DocumentReadOutcome> {
  const file = await dependencies.pick();
  if (file === null || signal.aborted) {
    return failure('document_cancelled');
  }
  if (file.sizeBytes > PDF_MAX_BYTES) {
    return failure('pdf_too_large');
  }
  const bytes = await readBytes(file);
  if (bytes === null) {
    return failure('document_unexpected');
  }
  const result = await dependencies.reader.read(bytes, signal);
  if (!result.ok) {
    return failure(result.code);
  }
  if (result.text.length > MAX_DOCUMENT_CHARACTERS) {
    return failure('document_too_long', result.text.length);
  }
  return {
    ok: true,
    text: result.text,
    source: { kind: 'pdf', name: file.name.slice(0, MAX_SOURCE_NAME_CHARACTERS) },
    characters: result.text.length,
  };
}
