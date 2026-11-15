import { useSyncExternalStore } from 'react';

/** Chrome/Edge/Android only; not in the DOM typings yet */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** installed: running as the app already. prompt: the browser will show its install dialog. manual: it won't, so explain. */
export type InstallState = 'installed' | 'prompt' | 'manual';

let deferred: BeforeInstallPromptEvent | null = null;
let installed =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Registered when this module loads (from main.tsx), since the event can fire before React mounts.
// No preventDefault: the browser's own install prompt still appears; this only keeps a way to reopen it.
window.addEventListener('beforeinstallprompt', (e) => {
  deferred = e as BeforeInstallPromptEvent;
  emit();
});
window.addEventListener('appinstalled', () => {
  installed = true;
  deferred = null;
  emit();
});

const snapshot = (): InstallState =>
  installed ? 'installed' : deferred ? 'prompt' : 'manual';

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    snapshot,
  );
}

/** Opens the browser's install dialog. The event works once, so it is used up either way. */
export async function promptInstall(): Promise<void> {
  const e = deferred;
  if (!e) return;
  deferred = null;
  emit();
  await e.prompt();
  await e.userChoice;
}

export const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
