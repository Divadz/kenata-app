import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { SetlistItem } from '../../types/models';
import { formatDuration, formatHM } from '../../utils/duration';
import { itemDuration } from './useSetlists';
import { moodLabel } from './souffleur';

interface Shared {
  name: string;
  target_duration_min: number | null;
  items: SetlistItem[];
}

export function SharedSetlist() {
  const { token = '' } = useParams();
  const [data, setData] = useState<Shared | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'missing'>('loading');

  useEffect(() => {
    api<Shared>(`/share/${token}`)
      .then((d) => {
        setData(d);
        setStatus('ok');
      })
      .catch((e) => setStatus(e instanceof ApiError && e.status === 404 ? 'missing' : 'missing'));
  }, [token]);

  if (status === 'loading') return <div className="center muted">Chargement…</div>;
  if (status === 'missing' || !data) {
    return (
      <div className="center">
        <div className="card auth-card">
          <h1 className="logo">Kenata 🤘</h1>
          <p className="muted">Ce lien de setlist n’existe plus.</p>
        </div>
      </div>
    );
  }

  const total = data.items.reduce((a, it) => a + itemDuration(it), 0);
  let n = 0;

  return (
    <div className="content stack shared">
      <div className="brand logo">Kenata 🤘</div>
      <h1>{data.name}</h1>
      <p className="muted">
        <span className="mono">{formatHM(total) || '00h00'}</span>
        {data.target_duration_min ? ` / ${formatHM(data.target_duration_min * 60)} visés` : ''} · {data.items.length}{' '}
        élément{data.items.length > 1 ? 's' : ''}
      </p>

      <ol className="setlist full">
        {data.items.map((it, i) => (
          <li key={i}>
            <div className={`sl-item ${it.type}`}>
              {it.type === 'song' && (
                <>
                  <span className="sl-num mono">{++n}</span>
                  <div className="sl-body">
                    <span className="sl-title">{it.song_title ?? '(morceau supprimé)'}</span>
                    {it.song_artist && <span className="muted small"> · {it.song_artist}</span>}
                    {it.song_tuning && <span className="badge">{it.song_tuning}</span>}
                  </div>
                  <span className="sl-dur mono">{formatDuration(itemDuration(it))}</span>
                </>
              )}
              {it.type === 'free' && (
                <div className="sl-body">
                  <span className="sl-title">{it.label || 'Bloc libre'}</span>
                  <span className="sl-dur mono"> · {formatDuration(itemDuration(it))}</span>
                </div>
              )}
              {it.type === 'souffleur' && (
                <div className="sl-body muted">
                  <span className="badge">souffleur · {moodLabel(it.souffleur_mood)}</span>{' '}
                  <em>« {it.souffleur_text} »</em>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
