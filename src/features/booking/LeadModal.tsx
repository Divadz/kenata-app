import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BookingExchange, BookingLead, BookingStage, ExchangeType } from '../../types/models';
import { BOARD_STAGES, EXCHANGE_TYPES, exchangeIcon } from './constants';
import { confirmLead, createLead, deleteLead, updateLead } from './useBooking';

interface Props {
  lead: BookingLead | null;
  initialStage?: BookingStage;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: Partial<BookingLead> = { stage: 'a_contacter', exchanges: [] };

export function LeadModal({ lead, initialStage, onClose, onSaved }: Props) {
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<BookingLead>>(
    lead ? { ...lead } : { ...EMPTY, stage: initialStage ?? 'a_contacter' }
  );
  const [exType, setExType] = useState<ExchangeType>('appel');
  const [exText, setExText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof BookingLead>(k: K, v: BookingLead[K]) => setForm((f) => ({ ...f, [k]: v }));
  const exchanges = form.exchanges ?? [];

  function addExchange() {
    if (!exText.trim()) return;
    const ex: BookingExchange = {
      date: new Date().toISOString().slice(0, 10),
      type: exType,
      text: exText.trim(),
    };
    set('exchanges', [ex, ...exchanges]);
    setExText('');
  }
  function removeExchange(i: number) {
    set('exchanges', exchanges.filter((_, x) => x !== i));
  }

  async function save() {
    setError(null);
    if (!form.name?.trim()) {
      setError('Le nom du lieu / événement est obligatoire.');
      return;
    }
    setBusy(true);
    try {
      const patch: Partial<BookingLead> = {
        name: form.name.trim(),
        stage: form.stage,
        city: form.city ?? null,
        type: form.type ?? null,
        contact_name: form.contact_name ?? null,
        link: form.link ?? null,
        email: form.email ?? null,
        phone: form.phone ?? null,
        est_fee: form.est_fee ?? null,
        capacity: form.capacity ?? null,
        source: form.source ?? null,
        next_relance_date: form.next_relance_date ?? null,
        next_relance_note: form.next_relance_note ?? null,
        notes: form.notes ?? null,
        exchanges,
      };
      if (lead) await updateLead(lead.id, patch);
      else await createLead(patch);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!lead) return;
    await deleteLead(lead.id);
    onSaved();
    onClose();
  }

  async function transform() {
    if (!lead) return;
    setBusy(true);
    try {
      const { id } = await confirmLead(lead.id);
      onSaved();
      navigate(`/concerts/${id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal booking-modal stack" onClick={(e) => e.stopPropagation()}>
        <div className="row between full">
          <input
            className="lead-title"
            placeholder="Nom du lieu / événement"
            value={form.name ?? ''}
            onChange={(e) => set('name', e.target.value)}
            autoFocus
          />
          <button className="btn small" aria-label="Fermer" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="tabs-inline">
          {BOARD_STAGES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`tab ${form.stage === s.id ? 'active' : ''}`}
              onClick={() => set('stage', s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid2 full">
          <label className="field">
            <span>Ville</span>
            <input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
          </label>
          <label className="field">
            <span>Type (bar, salle, festival…)</span>
            <input value={form.type ?? ''} onChange={(e) => set('type', e.target.value)} />
          </label>
          <label className="field">
            <span>Contact (nom)</span>
            <input value={form.contact_name ?? ''} onChange={(e) => set('contact_name', e.target.value)} />
          </label>
          <label className="field">
            <span>Lien (site / Insta)</span>
            <input value={form.link ?? ''} onChange={(e) => set('link', e.target.value)} placeholder="https://…" />
          </label>
          <label className="field">
            <span>Email</span>
            <div className="input-btn">
              <input className="grow" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
              {form.email?.trim() ? (
                <a className="btn small icon-btn" href={`mailto:${form.email.trim()}`} aria-label="Écrire un mail">
                  ✉
                </a>
              ) : (
                <button className="btn small icon-btn" disabled aria-label="Écrire un mail">
                  ✉
                </button>
              )}
            </div>
          </label>
          <label className="field">
            <span>Téléphone</span>
            <div className="input-btn">
              <input className="grow" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
              {form.phone?.trim() ? (
                <a className="btn small icon-btn" href={`tel:${form.phone.replace(/\s/g, '')}`} aria-label="Appeler">
                  📞
                </a>
              ) : (
                <button className="btn small icon-btn" disabled aria-label="Appeler">
                  📞
                </button>
              )}
            </div>
          </label>
          <label className="field">
            <span>Cachet pressenti</span>
            <input value={form.est_fee ?? ''} onChange={(e) => set('est_fee', e.target.value)} placeholder="ex. 1500 €" />
          </label>
          <label className="field">
            <span>Jauge / capacité</span>
            <input
              type="number"
              value={form.capacity ?? ''}
              onChange={(e) => set('capacity', e.target.value ? parseInt(e.target.value, 10) : null)}
            />
          </label>
          <label className="field">
            <span>Source du contact</span>
            <input value={form.source ?? ''} onChange={(e) => set('source', e.target.value)} placeholder="recommandation, festival…" />
          </label>
        </div>

        <div className="relance-box">
          <span className="lbl">🔔 Prochaine relance</span>
          <input
            type="date"
            value={form.next_relance_date ?? ''}
            onChange={(e) => set('next_relance_date', e.target.value || null)}
          />
          <input
            className="grow"
            placeholder="Quoi faire ?"
            value={form.next_relance_note ?? ''}
            onChange={(e) => set('next_relance_note', e.target.value || null)}
          />
        </div>

        <label className="field full">
          <span>Notes</span>
          <textarea rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </label>

        <div className="field full">
          <span>Historique des échanges</span>
          <div className="input-btn">
            <select aria-label="Type d'échange" value={exType} onChange={(e) => setExType(e.target.value as ExchangeType)}>
              {EXCHANGE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
            <input
              className="grow"
              placeholder="Ajouter un échange (appel, mail…)"
              value={exText}
              onChange={(e) => setExText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExchange())}
            />
            <button className="btn small" type="button" onClick={addExchange}>
              + Ajouter
            </button>
          </div>
          {exchanges.length === 0 ? (
            <p className="muted small">Aucun échange noté.</p>
          ) : (
            <ul className="exchange-log">
              {exchanges.map((ex, i) => (
                <li key={i}>
                  <span className="ex-icon" title={ex.type}>
                    {exchangeIcon(ex.type)}
                  </span>
                  <span className="ex-date mono">{ex.date}</span>
                  <span className="ex-text">{ex.text}</span>
                  <button className="chip-x" aria-label="Retirer" onClick={() => removeExchange(i)}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lead && (
          <div className="row full">
            {lead.concert_id ? (
              <button className="btn small" onClick={() => navigate(`/concerts/${lead.concert_id}`)}>
                📅 Ouvrir le concert
              </button>
            ) : (
              <button className="btn small" onClick={transform} disabled={busy}>
                📅 Transformer en concert
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="row between full">
          <button className="btn primary" onClick={save} disabled={busy}>
            {lead ? 'Enregistrer' : 'Créer la fiche'}
          </button>
          {lead &&
            (confirmDelete ? (
              <span className="row">
                <button className="btn small danger" onClick={onDelete}>
                  Confirmer la suppression
                </button>
                <button className="btn small" onClick={() => setConfirmDelete(false)}>
                  Annuler
                </button>
              </span>
            ) : (
              <button className="btn small danger" onClick={() => setConfirmDelete(true)}>
                Supprimer
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
