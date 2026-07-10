import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { BookingLead } from '../../types/models';

export function useBooking() {
  const [leads, setLeads] = useState<BookingLead[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    try {
      setLeads(await api<BookingLead[]>('/booking'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return { leads, loading, reload, setLeads };
}

export function createLead(patch: Partial<BookingLead>) {
  return api<{ id: string }>('/booking', { method: 'POST', body: patch });
}
export function updateLead(id: string, patch: Partial<BookingLead>) {
  return api(`/booking/${id}`, { method: 'PATCH', body: patch });
}
export function deleteLead(id: string) {
  return api(`/booking/${id}`, { method: 'DELETE' });
}
/** Crée le concert lié (idempotent) et passe la piste en « confirmé ». */
export function confirmLead(id: string) {
  return api<{ id: string; existing?: boolean }>(`/booking/${id}/confirm`, { method: 'POST' });
}
export function getArchivedLeads() {
  return api<BookingLead[]>('/booking?archived=1');
}

/** Nombre de jours avant la relance (négatif si en retard), ou null. */
export function relanceDays(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}
