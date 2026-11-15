import { useTranslation } from 'react-i18next';

export function LegalNotice() {
  const { t } = useTranslation();
  return (
    <footer className="legal-notice">
      <p role="note">{t('legal.notice')}</p>
    </footer>
  );
}
