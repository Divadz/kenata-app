import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { SetlistItem } from '../../types/models';
import { formatDuration, formatHM, parseDuration } from '../../utils/duration';
import { DurationSelect } from '../../components/DurationSelect';
import { useSongs } from '../repertoire/useSongs';
import { MOODS, type MoodId, moodLabel, randomPhrase } from './souffleur';
import {
  createShare,
  deleteShare,
  getSetlist,
  itemDuration,
  putItems,
  updateSetlist,
} from './useSetlists';

interface EditItem extends SetlistItem {
  _key: string;
}
let keyCounter = 0;
const newKey = () => `k${keyCounter++}`;

export function SetlistEditor() {
  const { id = '' } = useParams();
  const { songs } = useSongs();

  const [name, setName] = useState('');
  const [target, setTarget] = useState<number | null>(null);
  const [items, setItems] = useState<EditItem[]>([]);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [songToAdd, setSongToAdd] = useState('');
  const [mood, setMood] = useState<MoodId>('badass');

  const itemsRef = useRef<EditItem[]>([]);
  itemsRef.current = items;
  const dragFrom = useRef<number | null>(null);

  useEffect(() => {
    getSetlist(id)
      .then((sl) => {
        setName(sl.name);
        setTarget(sl.target_duration_min ?? null);
        setShareToken(sl.share_token);
        setItems(sl.items.map((it) => ({ ...it, _key: newKey() })));
      })
      .finally(() => setLoading(false));
  }, [id]);

  /** Enregistre l'ordre/contenu des éléments côté serveur. */
  function commit(next: EditItem[]) {
    setItems(next);
    putItems(id, next)
      .then(() => setSavedAt('Enregistré ✓'))
      .catch(() => setSavedAt('Erreur d’enregistrement'));
  }

  function persistFromRef() {
    putItems(id, itemsRef.current)
      .then(() => setSavedAt('Enregistré ✓'))
      .catch(() => setSavedAt('Erreur d’enregistrement'));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    commit(next);
  }

  function removeAt(i: number) {
    commit(items.filter((_, idx) => idx !== i));
  }

  function addSong() {
    const song = songs.find((s) => s.id === songToAdd);
    if (!song) return;
    commit([
      ...items,
      {
        _key: newKey(),
        type: 'song',
        song_id: song.id,
        song_title: song.title,
        song_artist: song.artist ?? null,
        song_duration: song.duration_sec ?? null,
        song_tuning: song.tuning ?? null,
        song_key: song.music_key ?? null,
        song_bpm: song.bpm ?? null,
      },
    ]);
    setSongToAdd('');
  }

  function addFree() {
    commit([...items, { _key: newKey(), type: 'free', label: 'Bloc libre', est_duration_sec: 300 }]);
  }

  function addSouffleur() {
    commit([
      ...items,
      { _key: newKey(), type: 'souffleur', souffleur_mood: mood, souffleur_text: randomPhrase(mood) },
    ]);
  }

  function updateItem(key: string, patch: Partial<EditItem>) {
    setItems((prev) => prev.map((it) => (it._key === key ? { ...it, ...patch } : it)));
  }

  async function onNameBlur() {
    await updateSetlist(id, { name: name.trim() || 'Sans titre' });
  }

  // Durées + détection des changements d'accordage entre morceaux consécutifs.
  const { totalSec, rows } = useMemo(() => {
    let lastTuning: string | null = null;
    let total = 0;
    const r = items.map((it) => {
      total += itemDuration(it);
      let tuningChange: string | null = null;
      if (it.type === 'song' && it.song_tuning) {
        if (lastTuning && lastTuning !== it.song_tuning) {
          tuningChange = `${lastTuning} → ${it.song_tuning}`;
        }
        lastTuning = it.song_tuning;
      }
      return { it, tuningChange };
    });
    return { totalSec: total, rows: r };
  }, [items]);

  const targetSec = (target ?? 0) * 60;
  const gaugePct = targetSec ? Math.min(100, (totalSec / targetSec) * 100) : 0;
  const gaugeState = !targetSec
    ? 'neutral'
    : totalSec > targetSec * 1.05
      ? 'over'
      : totalSec < targetSec * 0.9
        ? 'under'
        : 'ok';

  async function onShare() {
    const { token } = await createShare(id);
    setShareToken(token);
  }
  async function onUnshare() {
    await deleteShare(id);
    setShareToken(null);
  }
  const shareUrl = shareToken ? `${window.location.origin}/s/${shareToken}` : '';

  if (loading) return <p className="muted">Chargement…</p>;

  return (
    <section className="stack full">
      <div className="row between full">
        <Link className="btn small" to="/setlists">
          ← Setlists
        </Link>
        {savedAt && <span className="muted small">{savedAt}</span>}
      </div>

      <div className="grid2 full">
        <label className="field">
          <span>Nom</span>
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={onNameBlur} />
        </label>
        <label className="field">
          <span>Durée cible</span>
          <DurationSelect
            ariaLabel="Durée cible"
            value={target}
            onChange={(v) => {
              setTarget(v);
              void updateSetlist(id, { target_duration_min: v });
            }}
          />
        </label>
      </div>

      {/* Jauge de durée */}
      <div className={`gauge ${gaugeState}`}>
        <div className="gauge-bar" style={{ width: `${gaugePct}%` }} />
        <span className="gauge-label mono">
          {formatHM(totalSec) || '00h00'}
          {targetSec ? ` / ${formatHM(targetSec)}` : ''}
        </span>
      </div>

      {/* Barre d'ajout */}
      <div className="row filters full">
        <select
          aria-label="Ajouter un morceau"
          value={songToAdd}
          onChange={(e) => setSongToAdd(e.target.value)}
        >
          <option value="">— Ajouter un morceau —</option>
          {songs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
              {s.artist ? ` — ${s.artist}` : ''}
            </option>
          ))}
        </select>
        <button className="btn" onClick={addSong} disabled={!songToAdd}>
          + Morceau
        </button>
        <button className="btn" onClick={addFree}>
          + Bloc libre
        </button>
        <div className="spacer" />
        <select aria-label="Ambiance du souffleur" value={mood} onChange={(e) => setMood(e.target.value as MoodId)}>
          {MOODS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <button className="btn" onClick={addSouffleur}>
          + Souffleur
        </button>
      </div>

      {/* Liste des éléments */}
      {items.length === 0 ? (
        <p className="muted">Setlist vide. Ajoute des morceaux, blocs ou accroches ci-dessus.</p>
      ) : (
        <ol className="setlist full">
          {rows.map(({ it, tuningChange }, i) => (
            <li key={it._key}>
              {tuningChange && <div className="tuning-change mono">↧ accordage {tuningChange}</div>}
              <div
                className={`sl-item ${it.type}`}
                draggable
                onDragStart={() => (dragFrom.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const from = dragFrom.current;
                  dragFrom.current = null;
                  if (from !== null) move(from, i);
                }}
              >
                <span className="sl-handle" aria-hidden="true">
                  ⠿
                </span>
                <span className="sl-num mono">{i + 1}</span>

                <div className="sl-body">
                  {it.type === 'song' && (
                    <>
                      <span className="sl-title">{it.song_title ?? '(morceau supprimé)'}</span>
                      {it.song_artist && <span className="muted small"> · {it.song_artist}</span>}
                    </>
                  )}
                  {it.type === 'free' && (
                    <div className="row">
                      <input
                        aria-label="Libellé du bloc"
                        value={it.label ?? ''}
                        onChange={(e) => updateItem(it._key, { label: e.target.value })}
                        onBlur={persistFromRef}
                      />
                      <input
                        aria-label="Durée du bloc"
                        className="dur-input"
                        placeholder="5:00"
                        value={formatDuration(it.est_duration_sec ?? undefined)}
                        onChange={(e) =>
                          updateItem(it._key, { est_duration_sec: parseDuration(e.target.value) ?? null })
                        }
                        onBlur={persistFromRef}
                      />
                    </div>
                  )}
                  {it.type === 'souffleur' && (
                    <div className="stack" style={{ gap: '0.3rem', width: '100%' }}>
                      <span className="badge">souffleur · {moodLabel(it.souffleur_mood)}</span>
                      <textarea
                        aria-label="Texte du souffleur"
                        rows={2}
                        value={it.souffleur_text ?? ''}
                        onChange={(e) => updateItem(it._key, { souffleur_text: e.target.value })}
                        onBlur={persistFromRef}
                      />
                    </div>
                  )}
                </div>

                <span className="sl-dur mono">{formatDuration(itemDuration(it))}</span>
                <span className="sl-actions">
                  <button className="btn small" aria-label="Monter" onClick={() => move(i, i - 1)}>
                    ↑
                  </button>
                  <button className="btn small" aria-label="Descendre" onClick={() => move(i, i + 1)}>
                    ↓
                  </button>
                  <button className="btn small danger" aria-label="Retirer" onClick={() => removeAt(i)}>
                    ✕
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Partage */}
      <div className="card form full">
        <h3>Partage en lecture seule</h3>
        {shareToken ? (
          <div className="stack" style={{ gap: '0.5rem' }}>
            <div className="row">
              <input className="full" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
              <button className="btn" onClick={() => navigator.clipboard?.writeText(shareUrl)}>
                Copier
              </button>
            </div>
            <button className="btn small danger" onClick={onUnshare}>
              Désactiver le lien
            </button>
          </div>
        ) : (
          <button className="btn" onClick={onShare}>
            Générer un lien de partage
          </button>
        )}
      </div>
    </section>
  );
}
