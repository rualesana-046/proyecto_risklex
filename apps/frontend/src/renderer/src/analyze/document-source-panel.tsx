import { MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import { useRef, useState, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { PDF_MAX_BYTES, PDF_MAX_PAGES } from '../../../common/document-sources.ts';
import { LinkForm } from './link-form.tsx';
import type { DocumentReadFailure, DocumentSourceState } from './use-document-source.ts';

interface DocumentSourcePanelProps {
  readonly state: DocumentSourceState;
  readonly busy: boolean;
  readonly pdfButtonRef: Ref<HTMLButtonElement>;
  readonly linkInputRef: Ref<HTMLInputElement>;
  readonly onPickPdf: () => void;
  readonly onReadLink: (url: string) => void;
  readonly onCancel: () => void;
  readonly children?: ReactNode;
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

function ReadingStatus({
  kind,
  onCancel,
}: {
  readonly kind: 'pdf' | 'link';
  readonly onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <p role="status" className="analyze-hint">
        {kind === 'link' ? t('analyze.sources.readingLink') : t('analyze.sources.readingPdf')}
      </p>
      <button type="button" className="button-secondary" onClick={onCancel}>
        {t('analyze.sources.cancel')}
      </button>
    </>
  );
}

interface SourceButtonsProps {
  readonly locked: boolean;
  readonly reading: DocumentSourceState;
  readonly linkOpen: boolean;
  readonly pdfButtonRef: Ref<HTMLButtonElement>;
  readonly toggleRef: Ref<HTMLButtonElement>;
  readonly onPickPdf: () => void;
  readonly onToggleLink: () => void;
  readonly onCancel: () => void;
}

function SourceButtons({
  locked,
  reading,
  linkOpen,
  pdfButtonRef,
  toggleRef,
  onPickPdf,
  onToggleLink,
  onCancel,
}: SourceButtonsProps) {
  const { t } = useTranslation();
  return (
    <div className="document-source-actions" role="group" aria-label={t('analyze.sources.label')}>
      <button
        ref={pdfButtonRef}
        type="button"
        className="button-secondary"
        disabled={locked}
        onClick={onPickPdf}
      >
        {t('analyze.sources.pdf')}
      </button>
      <button
        ref={toggleRef}
        type="button"
        className="button-secondary"
        aria-expanded={linkOpen}
        aria-controls="link-form"
        disabled={locked}
        onClick={onToggleLink}
      >
        {t('analyze.sources.link')}
      </button>
      {reading.status === 'reading' ? (
        <ReadingStatus kind={reading.kind} onCancel={onCancel} />
      ) : null}
    </div>
  );
}

function useLinkToggle() {
  const [linkOpen, setLinkOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const toggle = () => {
    setLinkOpen((open) => !open);
  };
  const close = () => {
    setLinkOpen(false);
    toggleRef.current?.focus();
  };
  return { linkOpen, toggleRef, toggle, close };
}

export function DocumentSourcePanel({
  state,
  busy,
  pdfButtonRef,
  linkInputRef,
  onPickPdf,
  onReadLink,
  onCancel,
  children,
}: DocumentSourcePanelProps) {
  const { linkOpen, toggleRef, toggle, close } = useLinkToggle();
  const locked = busy || state.status === 'reading';
  return (
    <div className="document-sources">
      <SourceButtons
        locked={locked}
        reading={state}
        linkOpen={linkOpen}
        pdfButtonRef={pdfButtonRef}
        toggleRef={toggleRef}
        onPickPdf={onPickPdf}
        onToggleLink={toggle}
        onCancel={onCancel}
      />
      {linkOpen ? (
        <LinkForm busy={locked} inputRef={linkInputRef} onSubmit={onReadLink} onClose={close} />
      ) : null}
      {children}
      {state.status === 'loaded' ? (
        <SourceStatus name={state.source.name} characters={state.characters} />
      ) : null}
      {state.status === 'failed' ? <DocumentReadError error={state.error} /> : null}
    </div>
  );
}
