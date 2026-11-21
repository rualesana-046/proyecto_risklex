import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

function useNativeConfirm(open: boolean) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmedRef = useRef(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (open && !dialog.open) {
      confirmedRef.current = false;
      dialog.showModal();
      cancelRef.current?.focus();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);
  const close = (confirmed: boolean) => {
    confirmedRef.current = confirmed;
    dialogRef.current?.close();
  };
  return { dialogRef, cancelRef, confirmedRef, close };
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const { dialogRef, cancelRef, confirmedRef, close } = useNativeConfirm(props.open);
  return (
    <dialog
      ref={dialogRef}
      className="consent-dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
      onClose={() => {
        (confirmedRef.current ? props.onConfirm : props.onCancel)();
      }}
    >
      <h2 id="confirm-title">{props.title}</h2>
      <p id="confirm-body">{props.body}</p>
      <div className="consent-actions">
        <button
          ref={cancelRef}
          type="button"
          className="button-secondary"
          onClick={() => {
            close(false);
          }}
        >
          {props.cancelLabel}
        </button>
        <button
          type="button"
          className="button-primary"
          onClick={() => {
            close(true);
          }}
        >
          {props.confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
