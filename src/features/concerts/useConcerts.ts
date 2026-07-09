import { useEffect, useState } from 'react';
import { api, uploadFile } from '../../api/client';
import type { ConcertDetail, ConcertSummary } from '../../types/models';

export function useConcerts() {
  const [concerts, setConcerts] = useState<ConcertSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    try {
      setConcerts(await api<ConcertSummary[]>('/concerts'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return { concerts, loading, reload };
}

export function createConcert() {
  return api<{ id: string }>('/concerts', { method: 'POST', body: {} });
}
export function deleteConcert(id: string) {
  return api(`/concerts/${id}`, { method: 'DELETE' });
}
export function getConcert(id: string) {
  return api<ConcertDetail>(`/concerts/${id}`);
}
export function updateConcert(id: string, patch: Partial<ConcertDetail>) {
  return api(`/concerts/${id}`, { method: 'PATCH', body: patch });
}
export function duplicateConcert(id: string) {
  return api<{ id: string }>(`/concerts/${id}/duplicate`, { method: 'POST' });
}
export function uploadPoster(id: string, file: File) {
  return uploadFile<{ url: string }>(`/concerts/${id}/poster`, file);
}

/** Nombre de jours avant la date (négatif si passé), ou null. */
export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function countdownLabel(date: string | null): string {
  const n = daysUntil(date);
  if (n === null) return 'Date à définir';
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return 'Demain';
  if (n > 1) return `Dans ${n} jours`;
  if (n === -1) return 'Hier';
  return `Il y a ${-n} jours`;
}
