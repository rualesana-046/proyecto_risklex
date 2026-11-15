import { useTranslation } from 'react-i18next';
import sampleDocument from './sample-document.es.md?raw';

interface SampleDocumentButtonProps {
  readonly disabled: boolean;
  readonly onUse: (text: string) => void;
}

export function SampleDocumentButton({ disabled, onUse }: SampleDocumentButtonProps) {
  const { t } = useTranslation();
  return (
    <div className="sample-document">
      <button
        type="button"
        className="button-secondary"
        disabled={disabled}
        aria-describedby="sample-document-note"
        onClick={() => {
          onUse(sampleDocument);
        }}
      >
        {t('analyze.sample.label')}
      </button>
      <p id="sample-document-note" className="analyze-hint">
        {t('analyze.sample.note')}
      </p>
    </div>
  );
}
