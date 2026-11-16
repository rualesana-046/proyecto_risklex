import { domainToUnicode } from 'node:url';
import { MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import {
  MAX_SOURCE_NAME_CHARACTERS,
  MIN_USEFUL_CHARACTERS,
  type DocumentReadErrorCode,
  type DocumentReadOutcome,
} from '../../../../common/document-sources.ts';
import { decodeDocument, htmlToText } from '../infrastructure/html-to-text.ts';
import type { PdfReader } from '../infrastructure/pdf-reader.client.ts';
import type { FetchedDocument } from '../infrastructure/safe-fetch.ts';

export interface ReadLinkDependencies {
  readonly fetch: (raw: string, signal: AbortSignal) => Promise<FetchedDocument>;
  readonly reader: PdfReader;
}

type Extracted = { readonly text: string } | { readonly code: DocumentReadErrorCode };
type Fetched = Extract<FetchedDocument, { ok: true }>;

function failure(
  code: DocumentReadErrorCode,
  characters: number | null = null,
): DocumentReadOutcome {
  return { ok: false, error: { code, characters } };
}

function usefulLength(text: string): number {
  return text.replace(/\s/gu, '').length;
}

function fromMarkup(fetched: Fetched): Extracted {
  if (fetched.kind === 'text') {
    const text = decodeDocument(fetched.body, fetched.charset, false).trim();
    return usefulLength(text) < MIN_USEFUL_CHARACTERS ? { code: 'link_no_text' } : { text };
  }
  const { text, looksLikeScriptApp } = htmlToText(
    decodeDocument(fetched.body, fetched.charset, true),
  );
  if (usefulLength(text) < MIN_USEFUL_CHARACTERS) {
    return { code: looksLikeScriptApp ? 'link_needs_javascript' : 'link_no_text' };
  }
  return { text };
}

async function extract(
  fetched: Fetched,
  reader: PdfReader,
  signal: AbortSignal,
): Promise<Extracted> {
  if (fetched.kind !== 'pdf') {
    return fromMarkup(fetched);
  }
  const result = await reader.read(fetched.body, signal);
  return result.ok ? { text: result.text } : { code: result.code };
}

function displayHost(host: string): string {
  const bare = host.replace(/\.$/u, '');
  return (domainToUnicode(bare) || bare).slice(0, MAX_SOURCE_NAME_CHARACTERS);
}

export async function readLinkDocument(
  dependencies: ReadLinkDependencies,
  raw: string,
  signal: AbortSignal,
): Promise<DocumentReadOutcome> {
  const fetched = await dependencies.fetch(raw, signal);
  if (!fetched.ok) {
    return failure(fetched.code);
  }
  const extracted = await extract(fetched, dependencies.reader, signal);
  if ('code' in extracted) {
    return failure(extracted.code);
  }
  if (extracted.text.length > MAX_DOCUMENT_CHARACTERS) {
    return failure('document_too_long', extracted.text.length);
  }
  return {
    ok: true,
    text: extracted.text,
    source: { kind: 'link', name: displayHost(fetched.host) },
    characters: extracted.text.length,
  };
}
