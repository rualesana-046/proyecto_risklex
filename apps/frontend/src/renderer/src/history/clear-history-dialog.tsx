import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../shell/confirm-dialog.tsx';

interface ClearHistoryDialogProps {
  readonly open: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ClearHistoryDialog({ open, onConfirm, onCancel }: ClearHistoryDialogProps) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      open={open}
      title={t('history.confirm.title')}
      body={t('history.confirm.body')}
      confirmLabel={t('history.confirm.accept')}
      cancelLabel={t('history.confirm.cancel')}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
