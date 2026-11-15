import { useSyncExternalStore } from 'react';

let granted = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isGranted(): boolean {
  return granted;
}

export function grantConsent(): void {
  granted = true;
  for (const listener of listeners) {
    listener();
  }
}

export function resetConsentForTests(): void {
  granted = false;
}

export function useConsent(): { readonly granted: boolean; readonly grant: () => void } {
  return { granted: useSyncExternalStore(subscribe, isGranted), grant: grantConsent };
}
