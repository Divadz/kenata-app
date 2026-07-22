import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatHM } from '../../utils/duration';
import type { ConcertSummary, ContactInfo } from '../../types/models';
import { countdownLabel, createConcert, daysUntil, updateConcert, useConcerts } from './useConcerts';

/** Normalise pour une recherche insensible aux accents et à la casse. */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Concatène tous les champs pertinents d'un concert en une chaîne cherchable. */
function searchText(c: ConcertSummary): string {
  const parts: string[] = [];
  const add = (v?: string | null) => {
    if (v) parts.push(v);
  };
  add(c.venue_name);
  add(c.address);
  add(c.notes);
  add(c.setlist_name);
  add(c.fee);
  add(c.date);
  const contact = (ct?: ContactInfo) => {
    if (!ct) return;
    add(ct.name);
    add(ct.phone);
    add(ct.email);
  };
  contact(c.contacts?.org);
  contact(c.contacts?.sound);
  contact(c.contacts?.light);
  add(c.contacts?.contract_address);
  // Mots-clés d'état, cherchables au texte.
  parts.push(c.visibility === 'private' ? 'privé private' : 'public');
  if (c.merch) parts.push('merch');
  if (c.fee_guso) parts.push('guso');
  if (c.is_option) parts.push('option');
  return norm(parts.join(' '));
}

/** Formate une date ISO (YYYY-MM-DD) en JJ/MM/AA. */
function shortDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function ConcertCard({ c, onMarkPaid }: { c: ConcertSummary; onMarkPaid?: () => void }) {
  const dt = c.date ? new Date(c.date + 'T00:00:00') : null;
  const wd = dt ? dt.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '') : '';
  const day = dt ? String(dt.getDate()).padStart(2, '0') : '';
  const mon = dt ? dt.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') : '';
  // L'année ne s'affiche que si elle diffère de l'année en cours.
  const yr = dt && dt.getFullYear() !== new Date().getFullYear() ? String(dt.getFullYear()) : '';

  const d = daysUntil(c.date);
  const parts: string[] = [];
  // Le compte à rebours n'apparaît qu'à 15 jours ou moins de la date.
  if (d !== null && Math.abs(d) <= 15) parts.push(countdownLabel(c.date));
  if (c.start_time) parts.push(c.start_time);
  if (c.arrival_time) parts.push(`Arrivée à ${c.arrival_time}`);
  const countLine = parts.join(' · ');

  return (
    <Link className={`card link ccard${c.is_option ? ' is-option' : ''}`} to={`/concerts/${c.id}`}>
      <div className="ccard-top">
        <div className={`date-tile${dt ? '' : ' tbd'}`}>
          {dt ? (
            <>
              <span className="wd">{wd}</span>
              <span className="d">{day}</span>
              <span className="m">{mon}</span>
              {yr && <span className="y">{yr}</span>}
            </>
          ) : (
            <span className="d">?</span>
          )}
        </div>
        <div className="ccard-head">
          <div className="ccard-venue">{c.venue_name || 'Sans titre'}</div>
          <div className="ccard-badges">
            {c.is_option && <span className="badge option">option</span>}
            <span className={`badge ${c.visibility === 'private' ? 'priv' : 'pub'}`}>
              {c.visibility === 'private' ? 'privé' : 'public'}
            </span>
            {c.merch && <span className="badge merch">merch</span>}
            {c.paid && (
              <span className="badge paid">{c.paid_date ? `payé ${shortDate(c.paid_date)}` : 'payé'}</span>
            )}
          </div>
        </div>
      </div>

      {countLine && <div className="ccard-count">{countLine}</div>}

      {(c.target_duration_min || c.fee) && (
        <div className="ccard-data">
          {c.target_duration_min ? (
            <span>
              <span className="lbl">Durée</span> <span className="mono">{formatHM(c.target_duration_min * 60)}</span>
            </span>
          ) : null}
          {c.fee ? (
            <span>
              <span className="lbl">Cachet</span> <span className="mono">{c.fee}</span>
              {c.fee_guso && <span className="badge">GUSO</span>}
            </span>
          ) : null}
        </div>
      )}

      {onMarkPaid && (
        <div className="ccard-actions">
          <button
            type="button"
            className="btn small ok"
            onClick={(e) => {
              // On est dans un <Link> : empêcher la navigation vers la fiche.
              e.preventDefault();
              e.stopPropagation();
              onMarkPaid();
            }}
          >
            💰 Concert payé !
          </button>
        </div>
      )}
    </Link>
  );
}

/** Date du jour au format YYYY-MM-DD (fuseau local). */
function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Popup de saisie de la date de paiement avant de marquer un concert « payé ». */
function PayModal({
  concert,
  onCancel,
  onConfirm,
}: {
  concert: ConcertSummary;
  onCancel: () => void;
  onConfirm: (date: string) => void;
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
          {concert.venue_name || 'Ce concert'}
          {concert.date ? ` · ${shortDate(concert.date)}` : ''}
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

export function ConcertsPage() {
  const { concerts, loading, reload } = useConcerts();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [showAllPast, setShowAllPast] = useState(false);
  const [payTarget, setPayTarget] = useState<ConcertSummary | null>(null);

  async function markPaid(date: string) {
    if (!payTarget) return;
    await updateConcert(payTarget.id, { paid: true, paid_date: date });
    setPayTarget(null);
    await reload();
  }

  async function onCreate() {
    setCreating(true);
    try {
      const { id } = await createConcert();
      navigate(`/concerts/${id}`);
    } finally {
      setCreating(false);
    }
  }

  // Index de recherche (mémoïsé) : chaîne cherchable par concert.
  const index = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of concerts) m.set(c.id, searchText(c));
    return m;
  }, [concerts]);

  const q = norm(query.trim());
  const filtered = q ? concerts.filter((c) => (index.get(c.id) ?? '').includes(q)) : concerts;

  const ts = (c: ConcertSummary) => (c.date ? new Date(c.date + 'T00:00:00').getTime() : null);
  // À venir : aujourd'hui, futur, ou non daté (à planifier) — par date croissante, non datés en dernier.
  const upcoming = filtered
    .filter((c) => {
      const d = daysUntil(c.date);
      return d === null || d >= 0;
    })
    .sort((a, b) => {
      const ta = ts(a);
      const tb = ts(b);
      if (ta === null) return 1;
      if (tb === null) return -1;
      return ta - tb;
    });
  // Passés : par date décroissante (le plus récent d'abord).
  const past = filtered
    .filter((c) => {
      const d = daysUntil(c.date);
      return d !== null && d < 0;
    })
    .sort((a, b) => (ts(b) ?? 0) - (ts(a) ?? 0));
  // Par défaut on masque les concerts passés déjà payés (jusqu'à « Voir tout »).
  const paidCount = past.filter((c) => c.paid).length;
  const pastVisible = showAllPast ? past : past.filter((c) => !c.paid);

  return (
    <section className="stack full">
      <div className="row between full">
        <h2>Concerts</h2>
        <button className="btn primary" onClick={onCreate} disabled={creating}>
          {creating ? 'Création…' : '+ Nouveau concert'}
        </button>
      </div>

      {concerts.length > 0 && (
        <div className="search-bar full">
          <div className="search-field">
            <input
              type="search"
              placeholder="Rechercher (salle, lieu, contact, notes, guso…)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Rechercher un concert"
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                aria-label="Vider la recherche"
                onClick={() => setQuery('')}
              >
                ×
              </button>
            )}
          </div>
          {q && (
            <span className="muted small">
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : concerts.length === 0 ? (
        <p className="muted">Aucun concert. Ajoute ta première date : salle, durée cible, setlist.</p>
      ) : q && filtered.length === 0 ? (
        <p className="muted">Aucun concert ne correspond à « {query} ».</p>
      ) : (
        <>
          <h3 className="full">Concerts à venir</h3>
          {upcoming.length > 0 ? (
            <div className="cards cards-3 full">
              {upcoming.map((c) => (
                <ConcertCard key={c.id} c={c} />
              ))}
            </div>
          ) : (
            <p className="muted">Aucun concert à venir.</p>
          )}

          {past.length > 0 && (
            <>
              <div className="row between full">
                <h3>Concerts passés</h3>
                {paidCount > 0 && (
                  <label className="row show-all" style={{ gap: '0.35rem' }}>
                    <input
                      type="checkbox"
                      checked={showAllPast}
                      onChange={(e) => setShowAllPast(e.target.checked)}
                    />
                    Voir tout ({paidCount} payé{paidCount > 1 ? 's' : ''})
                  </label>
                )}
              </div>
              {pastVisible.length > 0 ? (
                <div className="cards cards-3 full">
                  {pastVisible.map((c) => (
                    <ConcertCard key={c.id} c={c} onMarkPaid={c.paid ? undefined : () => setPayTarget(c)} />
                  ))}
                </div>
              ) : (
                <p className="muted">Tous les concerts passés sont payés. Coche « Voir tout » pour les afficher.</p>
              )}
            </>
          )}
        </>
      )}

      {payTarget && (
        <PayModal concert={payTarget} onCancel={() => setPayTarget(null)} onConfirm={markPaid} />
      )}
    </section>
  );
}
