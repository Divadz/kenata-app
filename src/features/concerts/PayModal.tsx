import { useState } from 'react';

/** Date du jour au format YYYY-MM-DD (fuseau local). */
export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Formate une date ISO (YYYY-MM-DD) en JJ/MM/AA. */
export function shortDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

/** Formate une date ISO (YYYY-MM-DD) en JJ/MM/AAAA. */
export function fullDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Popup de saisie de la date de paiement avant de marquer un concert « payé ». */
export function PayModal({
  venueName,
  date: concertDate,
  onCancel,
  onConfirm,
}: {
  venueName?: string | null;
  date?: string | null;
  onCancel: () => void;
  onConfirm: (date: string) => void | Promise<void>;
}) {
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm(date);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal stack" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <h3>Concert payé</h3>
        <p className="muted small">
          {venueName || 'Ce concert'}
          {concertDate ? ` · ${shortDate(concertDate)}` : ''}
        </p>
        <label className="field">
          <span>Date du paiement</span>
          <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="row" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button className="btn" onClick={onCancel} disabled={busy}>
            Annuler
          </button>
          <button className="btn primary" onClick={confirm} disabled={busy || !date}>
            {busy ? 'Enregistrement…' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  );
}
