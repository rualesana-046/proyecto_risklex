import { useCallback, useState } from 'react';
import type { DocumentReadErrorCode, DocumentSource } from '../../../common/document-sources.ts';

export type DocumentSourceBridge = Pick<Window['risklex'], 'pickPdf' | 'cancelDocumentRead'>;

export interface DocumentReadFailure {
  readonly code: Exclude<DocumentReadErrorCode, 'document_dismissed'>;
  readonly characters: number | null;
}

export type DocumentSourceState =
  | { readonly status: 'idle' }
  | { readonly status: 'reading' }
  | { readonly status: 'failed'; readonly error: DocumentReadFailure }
  | { readonly status: 'loaded'; readonly source: DocumentSource; readonly characters: number };

const UNEXPECTED: DocumentReadFailure = { code: 'document_unexpected', characters: null };

export function useDocumentSource(bridge: DocumentSourceBridge, onText: (text: string) => void) {
  const [state, setState] = useState<DocumentSourceState>({ status: 'idle' });

  const pickPdf = useCallback(async (): Promise<DocumentSourceState> => {
    setState({ status: 'reading' });
    let next: DocumentSourceState;
    try {
      const outcome = await bridge.pickPdf();
      if (outcome.ok) {
        onText(outcome.text);
        next = { status: 'loaded', source: outcome.source, characters: outcome.characters };
      } else if (outcome.error.code === 'document_dismissed') {
        next = { status: 'idle' };
      } else {
        next = { status: 'failed', error: { ...outcome.error, code: outcome.error.code } };
      }
    } catch {
      next = { status: 'failed', error: UNEXPECTED };
    }
    setState(next);
    return next;
  }, [bridge, onText]);

  const cancel = useCallback(() => {
    bridge.cancelDocumentRead();
  }, [bridge]);

  return { state, pickPdf, cancel };
}
