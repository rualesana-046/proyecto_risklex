import { useTranslation } from 'react-i18next';

export function useSavedDate(): (savedAt: string) => string {
  const { i18n } = useTranslation();
  const format = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return (savedAt) => format.format(new Date(savedAt));
}
