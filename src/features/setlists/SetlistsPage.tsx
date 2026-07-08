import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDuration } from '../../utils/duration';
import { createSetlist, deleteSetlist, useSetlists } from './useSetlists';

export function SetlistsPage() {
  const { setlists, loading, reload } = useSetlists();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setError(null);
    if (!name.trim()) {
      setError('Donne un nom à la setlist.');
      return;
    }
    setCreating(true);
    try {
      await createSetlist(name.trim(), target ? parseInt(target, 10) || null : null);
      setName('');
      setTarget('');
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="stack full">
      <h2>Setlists</h2>

      <div className="card form full">
        <h3>Nouvelle setlist</h3>
        <div className="row">
          <input
            aria-label="Nom de la setlist"
            placeholder="Ex. Concert du 12 juillet…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            aria-label="Durée cible en minutes"
            type="number"
            min="0"
            placeholder="Durée cible (min)"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <button className="btn primary" onClick={onCreate} disabled={creating}>
            {creating ? 'Création…' : 'Créer'}
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : setlists.length === 0 ? (
        <p className="muted">Aucune setlist. Crée ta première pour préparer un concert.</p>
      ) : (
        <div className="cards full">
          {setlists.map((s) => (
            <div key={s.id} className="card setlist-card">
              <div className="row between">
                <Link className="setlist-name" to={`/setlists/${s.id}`}>
                  {s.name}
                </Link>
                {s.share_token && <span className="badge">partagée</span>}
              </div>
              <p className="muted small">
                {s.item_count} élément{s.item_count > 1 ? 's' : ''} ·{' '}
                <span className="mono">{formatDuration(s.total_sec) || '0:00'}</span>
                {s.target_duration_min ? ` / ${s.target_duration_min} min` : ''}
              </p>
              <div className="row">
                <Link className="btn small" to={`/setlists/${s.id}`}>
                  Ouvrir
                </Link>
                {pendingDelete === s.id ? (
                  <>
                    <button
                      className="btn small danger"
                      onClick={async () => {
                        await deleteSetlist(s.id);
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
                  <button className="btn small" onClick={() => setPendingDelete(s.id)}>
                    Suppr.
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
