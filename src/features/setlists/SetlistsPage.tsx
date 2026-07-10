import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatHM } from '../../utils/duration';
import { DurationSelect } from '../../components/DurationSelect';
import { createSetlist, useSetlists } from './useSetlists';

export function SetlistsPage() {
  const { setlists, loading, reload } = useSetlists();
  const [name, setName] = useState('');
  const [target, setTarget] = useState<number | null>(120); // 02h00 par défaut
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setError(null);
    if (!name.trim()) {
      setError('Donne un nom à la setlist.');
      return;
    }
    setCreating(true);
    try {
      await createSetlist(name.trim(), target);
      setName('');
      setTarget(120);
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
          <DurationSelect ariaLabel="Durée cible" value={target} onChange={setTarget} />
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
        <div className="cards cards-3 full">
          {setlists.map((s) => (
            <Link key={s.id} className="card link setlist-card" to={`/setlists/${s.id}`}>
              <div className="row between">
                <span className="setlist-name">{s.name}</span>
                {s.share_token && <span className="badge">partagée</span>}
              </div>
              <p className="muted small">
                {s.item_count} élément{s.item_count > 1 ? 's' : ''} ·{' '}
                <span className="mono">{formatHM(Number(s.total_sec)) || '00h00'}</span>
                {s.target_duration_min ? ` / ${formatHM(s.target_duration_min * 60)}` : ''}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
