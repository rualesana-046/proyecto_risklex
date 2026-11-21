import { useCallback, useEffect, useRef, useState } from 'react';
import { changeSettings, useSettings } from '../settings/settings-store.ts';

export function useWelcome() {
  const settings = useSettings();
  const [open, setOpen] = useState(!settings.welcomeSeen);
  const returnTo = useRef<HTMLElement | null>(null);
  const restoreFocus = useRef(false);
  const show = useCallback(() => {
    returnTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    restoreFocus.current = true;
    setOpen(false);
    if (!settings.welcomeSeen) {
      void changeSettings({ welcomeSeen: true });
    }
  }, [settings.welcomeSeen]);
  useEffect(() => {
    if (open || !restoreFocus.current) {
      return;
    }
    restoreFocus.current = false;
    const target = returnTo.current?.isConnected === true ? returnTo.current : null;
    (target ?? document.querySelector<HTMLElement>('.app-main'))?.focus();
    returnTo.current = null;
  }, [open]);
  return { open, show, close };
}
