import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatHM } from '../../utils/duration';
import { countdownLabel, createConcert, deleteConcert, useConcerts } from './useConcerts';

export function ConcertsPage() {
  const { concerts, loading, reload } = useConcerts();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

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
          {concerts.map((c) => {
            const sec = c.setlist_sec ? parseInt(String(c.setlist_sec), 10) : 0;
            const targetSec = (c.target_duration_min ?? 0) * 60;
            const over = targetSec > 0 && sec > targetSec * 1.05;
            const under = targetSec > 0 && sec > 0 && sec < targetSec * 0.9;
            return (
              <div key={c.id} className="card setlist-card">
                <div className="row between">
                  <Link className="setlist-name" to={`/concerts/${c.id}`}>
                    {c.venue_name || 'Sans titre'}
                  </Link>
                  {c.visibility === 'public' && <span className="badge">public</span>}
                </div>
                <p className="muted small">
                  {c.date ? new Date(c.date + 'T00:00:00').toLocaleDateString('fr-FR') : '—'} ·{' '}
                  {countdownLabel(c.date)}
                </p>
                {c.setlist_name && (
                  <p className="muted small">
                    {c.setlist_name} · <span className="mono">{formatHM(sec) || '00h00'}</span>
                    {targetSec ? ` / ${formatHM(targetSec)}` : ''}
                    {over && <span className="warn"> · trop long</span>}
                    {under && <span className="warn"> · trop court</span>}
                  </p>
                )}
                <div className="row">
                  <Link className="btn small" to={`/concerts/${c.id}`}>
                    Ouvrir
                  </Link>
                  {pendingDelete === c.id ? (
                    <>
                      <button
                        className="btn small danger"
                        onClick={async () => {
                          await deleteConcert(c.id);
                          setPendingDelete(null);
                          await reload();
                        }}
                      >
                        Confirmer
                      </button>
                      <button className="btn small" onClick={() => setPendingDelete(null)}>
                        Annuler
                      </button>
                    </>
                  ) : (
                    <button className="btn small" onClick={() => setPendingDelete(c.id)}>
                      Suppr.
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
