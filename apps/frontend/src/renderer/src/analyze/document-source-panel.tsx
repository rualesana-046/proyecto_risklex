import { MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { PDF_MAX_BYTES, PDF_MAX_PAGES } from '../../../common/document-sources.ts';
import type { DocumentReadFailure, DocumentSourceState } from './use-document-source.ts';

interface DocumentSourcePanelProps {
  readonly state: DocumentSourceState;
  readonly busy: boolean;
  readonly pdfButtonRef: Ref<HTMLButtonElement>;
  readonly onPickPdf: () => void;
  readonly onCancel: () => void;
}

function DocumentReadError({ error }: { readonly error: DocumentReadFailure }) {
  const { t, i18n } = useTranslation();
  const format = new Intl.NumberFormat(i18n.language);
  const values = {
    maxMb: format.format(PDF_MAX_BYTES / 1024 / 1024),
    maxPages: format.format(PDF_MAX_PAGES),
    max: format.format(MAX_DOCUMENT_CHARACTERS),
    characters: format.format(error.characters ?? 0),
  };
  const cancelled = error.code === 'document_cancelled';
  return (
    <div
      role={cancelled ? 'status' : 'alert'}
      className={cancelled ? 'analysis-message analysis-message-neutral' : 'analysis-message'}
    >
      <p className="analysis-message-title">{t(`documentErrors.${error.code}.message`, values)}</p>
      <p>{t(`documentErrors.${error.code}.next`, values)}</p>
    </div>
  );
}

function SourceStatus({
  name,
  characters,
}: {
  readonly name: string;
  readonly characters: number;
}) {
  const { t, i18n } = useTranslation();
  return (
    <p role="status" className="document-source-status">
      {t('analyze.sources.extracted', {
        name,
        characters: new Intl.NumberFormat(i18n.language).format(characters),
      })}
    </p>
  );
}

export function DocumentSourcePanel({
  state,
  busy,
  pdfButtonRef,
  onPickPdf,
  onCancel,
}: DocumentSourcePanelProps) {
  const { t } = useTranslation();
  const reading = state.status === 'reading';
  return (
    <div className="document-sources">
      <div className="document-source-actions" role="group" aria-label={t('analyze.sources.label')}>
        <button
          ref={pdfButtonRef}
          type="button"
          className="button-secondary"
          disabled={busy || reading}
          onClick={onPickPdf}
        >
          {t('analyze.sources.pdf')}
        </button>
        {reading ? (
          <>
            <p role="status" className="analyze-hint">
              {t('analyze.sources.readingPdf')}
            </p>
            <button type="button" className="button-secondary" onClick={onCancel}>
              {t('analyze.sources.cancel')}
            </button>
          </>
        ) : null}
      </div>
      {state.status === 'loaded' ? (
        <SourceStatus name={state.source.name} characters={state.characters} />
      ) : null}
      {state.status === 'failed' ? <DocumentReadError error={state.error} /> : null}
    </div>
  );
}
