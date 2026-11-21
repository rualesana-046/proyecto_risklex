import { useSyncExternalStore } from 'react';

type SaveConsent = () => Promise<unknown>;

const keepInMemory: SaveConsent = () => Promise.resolve();
let granted = false;
let saveConsent: SaveConsent = keepInMemory;
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

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function initializeConsent(initial: boolean, save: SaveConsent): void {
  granted = initial;
  saveConsent = save;
  notify();
}

export function grantConsent(): void {
  if (granted) {
    return;
  }
  granted = true;
  notify();
  saveConsent().catch(() => undefined);
}

export function resetConsentForTests(): void {
  granted = false;
  saveConsent = keepInMemory;
}

export function useConsent(): { readonly granted: boolean; readonly grant: () => void } {
  return { granted: useSyncExternalStore(subscribe, isGranted), grant: grantConsent };
}
