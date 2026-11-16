import { useCallback, useState } from 'react';
import type {
  DocumentReadErrorCode,
  DocumentReadOutcome,
  DocumentSource,
  DocumentSourceKind,
} from '../../../common/document-sources.ts';

export type DocumentSourceBridge = Pick<
  Window['risklex'],
  'pickPdf' | 'readLink' | 'cancelDocumentRead'
>;

export interface DocumentReadFailure {
  readonly code: Exclude<DocumentReadErrorCode, 'document_dismissed'>;
  readonly characters: number | null;
}

export type DocumentSourceState =
  | { readonly status: 'idle' }
  | { readonly status: 'reading'; readonly kind: DocumentSourceKind }
  | {
      readonly status: 'failed';
      readonly kind: DocumentSourceKind;
      readonly error: DocumentReadFailure;
    }
  | { readonly status: 'loaded'; readonly source: DocumentSource; readonly characters: number };

const UNEXPECTED: DocumentReadFailure = { code: 'document_unexpected', characters: null };

function nextState(kind: DocumentSourceKind, outcome: DocumentReadOutcome): DocumentSourceState {
  if (outcome.ok) {
    return { status: 'loaded', source: outcome.source, characters: outcome.characters };
  }
  if (outcome.error.code === 'document_dismissed') {
    return { status: 'idle' };
  }
  return { status: 'failed', kind, error: { ...outcome.error, code: outcome.error.code } };
}

export function useDocumentSource(bridge: DocumentSourceBridge, onText: (text: string) => void) {
  const [state, setState] = useState<DocumentSourceState>({ status: 'idle' });

  const read = useCallback(
    async (kind: DocumentSourceKind, work: () => Promise<DocumentReadOutcome>) => {
      setState({ status: 'reading', kind });
      let next: DocumentSourceState;
      try {
        const outcome = await work();
        if (outcome.ok) {
          onText(outcome.text);
        }
        next = nextState(kind, outcome);
      } catch {
        next = { status: 'failed', kind, error: UNEXPECTED };
      }
      setState(next);
      return next;
    },
    [onText],
  );

  const pickPdf = useCallback(() => read('pdf', () => bridge.pickPdf()), [bridge, read]);
  const readLink = useCallback(
    (url: string) => read('link', () => bridge.readLink(url)),
    [bridge, read],
  );
  const cancel = useCallback(() => {
    bridge.cancelDocumentRead();
  }, [bridge]);

  return { state, pickPdf, readLink, cancel };
}
