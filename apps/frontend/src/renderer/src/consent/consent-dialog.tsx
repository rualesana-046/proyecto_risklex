import { useEffect, useRef, type Ref } from 'react';
import { useTranslation } from 'react-i18next';

interface ConsentDialogProps {
  readonly open: boolean;
  readonly onAccept: () => void;
  readonly onDismiss: () => void;
}

function useNativeDialog({ open, onAccept, onDismiss }: ConsentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const acceptedRef = useRef(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (open && !dialog.open) {
      acceptedRef.current = false;
      dialog.showModal();
      initialFocusRef.current?.focus();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);
  const close = (accepted: boolean) => {
    acceptedRef.current = accepted;
    dialogRef.current?.close();
  };
  const handleClose = () => {
    (acceptedRef.current ? onAccept : onDismiss)();
  };
  return { dialogRef, initialFocusRef, close, handleClose };
}

interface ConsentActionsProps {
  readonly initialFocusRef: Ref<HTMLButtonElement>;
  readonly close: (accepted: boolean) => void;
}

function ConsentActions({ initialFocusRef, close }: ConsentActionsProps) {
  const { t } = useTranslation();
  return (
    <div className="consent-actions">
      <button
        ref={initialFocusRef}
        type="button"
        className="button-secondary"
        onClick={() => {
          close(false);
        }}
      >
        {t('consent.dismiss')}
      </button>
      <button
        type="button"
        className="button-primary"
        onClick={() => {
          close(true);
        }}
      >
        {t('consent.accept')}
      </button>
    </div>
  );
}

export function ConsentDialog(props: ConsentDialogProps) {
  const { t } = useTranslation();
  const { dialogRef, initialFocusRef, close, handleClose } = useNativeDialog(props);
  return (
    <dialog
      ref={dialogRef}
      className="consent-dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-what"
      onClose={handleClose}
    >
      <h2 id="consent-title">{t('consent.title')}</h2>
      <p id="consent-what">{t('consent.what')}</p>
      <p>{t('consent.retention')}</p>
      <p>{t('consent.link')}</p>
      <p>{t('consent.history')}</p>
      <p>{t('consent.advice')}</p>
      <p className="consent-session">{t('consent.session')}</p>
      <ConsentActions initialFocusRef={initialFocusRef} close={close} />
    </dialog>
  );
}
