import { useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';

interface LinkFormProps {
  readonly busy: boolean;
  readonly inputRef: Ref<HTMLInputElement>;
  readonly onSubmit: (url: string) => void;
  readonly onClose: () => void;
}

interface LinkFieldProps {
  readonly value: string;
  readonly busy: boolean;
  readonly inputRef: Ref<HTMLInputElement>;
  readonly onChange: (value: string) => void;
}

function LinkField({ value, busy, inputRef, onChange }: LinkFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="link-form-row">
      <input
        id="link-address"
        ref={inputRef}
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={value}
        disabled={busy}
        aria-describedby="link-notice"
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      <button type="submit" className="button-secondary" disabled={busy || value.trim() === ''}>
        {t('analyze.sources.linkSubmit')}
      </button>
    </div>
  );
}

export function LinkForm({ busy, inputRef, onSubmit, onClose }: LinkFormProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const address = value.trim();
  return (
    <form
      id="link-form"
      className="link-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (address !== '') {
          onSubmit(address);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <label htmlFor="link-address">{t('analyze.sources.linkLabel')}</label>
      <LinkField value={value} busy={busy} inputRef={inputRef} onChange={setValue} />
      <p id="link-notice" className="analyze-hint">
        {t('analyze.sources.linkNotice')}
      </p>
    </form>
  );
}
