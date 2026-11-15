import { MAX_DOCUMENT_CHARACTERS } from '@risklex/shared';
import { useTranslation } from 'react-i18next';

interface DocumentInputProps {
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
}

export function isOverLimit(text: string): boolean {
  return text.length > MAX_DOCUMENT_CHARACTERS;
}

export function isAnalyzable(text: string): boolean {
  return text.trim().length > 0 && !isOverLimit(text);
}

export function DocumentInput({ value, disabled, onChange }: DocumentInputProps) {
  const { t, i18n } = useTranslation();
  const format = new Intl.NumberFormat(i18n.language);
  const max = format.format(MAX_DOCUMENT_CHARACTERS);
  const overLimit = isOverLimit(value);
  return (
    <div className="document-input">
      <label htmlFor="document-text">{t('analyze.input.label')}</label>
      <p id="document-hint" className="document-hint">
        {t('analyze.input.hint')}
      </p>
      <textarea
        id="document-text"
        value={value}
        disabled={disabled}
        rows={14}
        spellCheck={false}
        aria-describedby="document-hint document-counter"
        aria-invalid={overLimit}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      <p
        id="document-counter"
        className={overLimit ? 'document-counter document-counter-over' : 'document-counter'}
      >
        {t('analyze.input.counter', { current: format.format(value.length), max })}
      </p>
      {overLimit ? (
        <p role="alert" className="document-limit">
          {t('analyze.input.tooLong', { max })}
        </p>
      ) : null}
    </div>
  );
}
