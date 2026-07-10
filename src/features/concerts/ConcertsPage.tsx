import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatHM } from '../../utils/duration';
import type { ConcertSummary } from '../../types/models';
import { countdownLabel, createConcert, daysUntil, useConcerts } from './useConcerts';

function ConcertCard({ c }: { c: ConcertSummary }) {
  const dt = c.date ? new Date(c.date + 'T00:00:00') : null;
  const wd = dt ? dt.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '') : '';
  const day = dt ? String(dt.getDate()).padStart(2, '0') : '';
  const mon = dt ? dt.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') : '';

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
    </Link>
  );
}

export function ConcertsPage() {
  const { concerts, loading } = useConcerts();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  async function onCreate() {
    setCreating(true);
    try {
      const { id } = await createConcert();
      navigate(`/concerts/${id}`);
    } finally {
      setCreating(false);
    }
  }

  const ts = (c: ConcertSummary) => (c.date ? new Date(c.date + 'T00:00:00').getTime() : null);
  // À venir : aujourd'hui, futur, ou non daté (à planifier) — par date croissante, non datés en dernier.
  const upcoming = concerts
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
  const past = concerts
    .filter((c) => {
      const d = daysUntil(c.date);
      return d !== null && d < 0;
    })
    .sort((a, b) => (ts(b) ?? 0) - (ts(a) ?? 0));

  return (
    <section className="stack full">
      <div className="row between full">
        <h2>Concerts</h2>
        <button className="btn primary" onClick={onCreate} disabled={creating}>
          {creating ? 'Création…' : '+ Nouveau concert'}
        </button>
      </div>

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : concerts.length === 0 ? (
        <p className="muted">Aucun concert. Ajoute ta première date : salle, durée cible, setlist.</p>
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
              <h3 className="full">Concerts passés</h3>
              <div className="cards cards-3 full">
                {past.map((c) => (
                  <ConcertCard key={c.id} c={c} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
