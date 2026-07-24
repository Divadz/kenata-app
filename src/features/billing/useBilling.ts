import { useCallback, useEffect, useState } from 'react';
import { api, uploadFile } from '../../api/client';
import type { BillingSettings, Invoice } from '../../types/models';

export function useBilling() {
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setSettings(await api<BillingSettings>('/billing'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { settings, loading, reload };
}

export function updateBilling(patch: Partial<BillingSettings>) {
  return api('/billing', { method: 'PATCH', body: patch });
}

export function useInvoices(concertId?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const q = concertId ? `?concert_id=${encodeURIComponent(concertId)}` : '';
      setInvoices(await api<Invoice[]>(`/invoices${q}`));
    } finally {
      setLoading(false);
    }
  }, [concertId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { invoices, loading, reload };
}

export function createInvoice(body: Record<string, unknown>) {
  return api<{ id: string; number: string }>('/invoices', { method: 'POST', body });
}

/** Importe un PDF de facture existante (ancien système). */
export function importInvoice(
  concertId: string,
  file: File,
  meta: { number: string; amount: string; issue_date: string }
) {
  return uploadFile<{ id: string; number: string }>('/invoices/import', file, {
    concert_id: concertId,
    number: meta.number,
    amount: meta.amount,
    issue_date: meta.issue_date,
  });
}

export function deleteInvoice(id: string) {
  return api(`/invoices/${id}`, { method: 'DELETE' });
}

/** URL du PDF (servi par l'API, session requise). */
export function invoicePdfUrl(id: string) {
  return `/api/invoices/${id}/pdf`;
}

/** Régénère (défaut) ou révoque (action:'revoke') le jeton de partage. */
export function setInvoiceShare(id: string, action?: 'revoke') {
  return api<{ share_token: string | null }>(`/invoices/${id}/share`, {
    method: 'POST',
    body: action ? { action } : {},
  });
}

/** URL publique (sans authentification) du PDF via son jeton de partage. */
export function publicPdfUrl(token: string) {
  return `${window.location.origin}/api/invoices/share/${token}/pdf`;
}

/** Envoie la facture par mail (PDF joint) ; flague le concert côté serveur. */
export function sendInvoice(id: string, body: { to: string; subject: string; body: string }) {
  return api(`/invoices/${id}/send`, { method: 'POST', body });
}
