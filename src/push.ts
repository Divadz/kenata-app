import { api } from './api/client';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  // getRegistration() ne bloque pas (contrairement à .ready qui attend un SW actif).
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/** Demande la permission, s'abonne et enregistre l'abonnement côté serveur. */
export async function enablePush(): Promise<void> {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('permission_denied');
  const { key } = await api<{ key: string }>('/push/vapid-public-key');
  if (!key) throw new Error('vapid_missing');
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.ready);
  // Repart d'un état propre : supprime un éventuel abonnement bancal avant de recréer.
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    try {
      await existing.unsubscribe();
    } catch {
      /* ignore */
    }
  }
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key) as unknown as BufferSource,
  });
  const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
  await api('/push/subscribe', { method: 'POST', body: { endpoint: j.endpoint, keys: j.keys } });
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  // Tout en best-effort : ni l'appel serveur ni le désabonnement navigateur
  // ne doivent faire échouer la désactivation.
  try {
    await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } });
  } catch {
    /* ignore */
  }
  try {
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
}
