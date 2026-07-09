import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatHM } from '../../utils/duration';
import { countdownLabel, createConcert, useConcerts } from './useConcerts';

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
        <div className="cards full">
          {concerts.map((c) => (
            <Link key={c.id} className="card link concert-card" to={`/concerts/${c.id}`}>
              <div className="row between">
                <span className="setlist-name">{c.venue_name || 'Sans titre'}</span>
                <span className="row" style={{ gap: '0.3rem' }}>
                  <span className="badge">{c.visibility === 'private' ? 'privé' : 'public'}</span>
                  {c.merch && <span className="badge">merch</span>}
                </span>
              </div>

              <p className="muted small">
                {c.date ? new Date(c.date + 'T00:00:00').toLocaleDateString('fr-FR') : 'Date à définir'}
                {c.start_time ? ` · ${c.start_time}` : ''}
                {' · '}
                {countdownLabel(c.date)}
              </p>

              {(c.target_duration_min || c.fee) && (
                <p className="muted small">
                  {c.target_duration_min ? (
                    <>
                      Durée : <span className="mono">{formatHM(c.target_duration_min * 60)}</span>
                    </>
                  ) : null}
                  {c.target_duration_min && c.fee ? ' · ' : ''}
                  {c.fee ? (
                    <>
                      Cachet : {c.fee}
                      {c.fee_guso && <span className="badge">GUSO</span>}
                    </>
                  ) : null}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
