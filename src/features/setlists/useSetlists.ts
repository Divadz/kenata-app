import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { SetlistDetail, SetlistItem, SetlistSummary } from '../../types/models';

export function useSetlists() {
  const [setlists, setSetlists] = useState<SetlistSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    try {
      setSetlists(await api<SetlistSummary[]>('/setlists'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return { setlists, loading, reload };
}

export function createSetlist(name: string, targetMin: number | null) {
  return api<{ id: string }>('/setlists', {
    method: 'POST',
    body: { name, target_duration_min: targetMin },
  });
}
export function deleteSetlist(id: string) {
  return api(`/setlists/${id}`, { method: 'DELETE' });
}
export function duplicateSetlist(id: string) {
  return api<{ id: string }>(`/setlists/${id}/duplicate`, { method: 'POST' });
}
export function getSetlist(id: string) {
  return api<SetlistDetail>(`/setlists/${id}`);
}
export function updateSetlist(id: string, patch: { name?: string; target_duration_min?: number | null }) {
  return api(`/setlists/${id}`, { method: 'PATCH', body: patch });
}

/** Éléments envoyés au serveur (sans les champs enrichis en lecture seule). */
export function putItems(id: string, items: SetlistItem[]) {
  const payload = items.map((it) => ({
    type: it.type,
    song_id: it.song_id ?? null,
    label: it.label ?? null,
    est_duration_sec: it.est_duration_sec ?? null,
    souffleur_text: it.souffleur_text ?? null,
    souffleur_mood: it.souffleur_mood ?? null,
  }));
  return api(`/setlists/${id}/items`, { method: 'PUT', body: { items: payload } });
}

export function createShare(id: string) {
  return api<{ token: string }>(`/setlists/${id}/share`, { method: 'POST' });
}
export function deleteShare(id: string) {
  return api(`/setlists/${id}/share`, { method: 'DELETE' });
}

/** Durée d'un élément (morceau : durée du morceau ; bloc/souffleur : durée estimée). */
export function itemDuration(it: SetlistItem): number {
  if (it.type === 'song') return it.song_duration ?? 0;
  return it.est_duration_sec ?? 0;
}
