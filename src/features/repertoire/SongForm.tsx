import { useMemo, useState } from 'react';
import type { Song, SongType } from '../../types/models';
import { KEYS, MASTERY_LEVELS, TUNINGS } from './constants';
import { formatDuration, parseDuration } from '../../utils/duration';
import { lookupMetadata } from './metadata';
import { createSong, findDuplicate, updateSong, type SongRow } from './useSongs';

interface Props {
  songs: SongRow[];
  editing: SongRow | null;
  onSaved: () => void;
  onClose: () => void;
}

export function SongForm({ songs, editing, onSaved, onClose }: Props) {
  const [type, setType] = useState<SongType>(editing?.type ?? 'reprise');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [artist, setArtist] = useState(editing?.artist ?? '');
  const [album, setAlbum] = useState(editing?.album ?? '');
  const [duration, setDuration] = useState(formatDuration(editing?.duration_sec));
  const [mastery, setMastery] = useState(editing?.mastery ?? 0);
  const [tuning, setTuning] = useState(editing?.tuning ?? '');
  const [musicKey, setMusicKey] = useState(editing?.music_key ?? '');
  const [bpm, setBpm] = useState(editing?.bpm ? String(editing.bpm) : '');
  const [cover, setCover] = useState(editing?.cover ?? '');
  const [roles, setRoles] = useState(editing?.roles ?? '');
  const [watch, setWatch] = useState(editing?.watch ?? '');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const artists = useMemo(
    () => [...new Set(songs.map((s) => s.artist).filter(Boolean))] as string[],
    [songs]
  );
  const titles = useMemo(() => [...new Set(songs.map((s) => s.title))], [songs]);

  const duplicate = useMemo(
    () => (title.trim() ? findDuplicate(songs, title, artist, editing?.id) : undefined),
    [songs, title, artist, editing]
  );

  async function onEnrich() {
    setInfo(null);
    const meta = await lookupMetadata(title, artist);
    if (!meta) {
      setInfo('Aucun fournisseur de métadonnées configuré pour le moment.');
      return;
    }
    if (meta.artist) setArtist(meta.artist);
    if (meta.album) setAlbum(meta.album);
    if (meta.duration_sec) setDuration(formatDuration(meta.duration_sec));
    if (meta.bpm) setBpm(String(meta.bpm));
    if (meta.cover) setCover(meta.cover);
  }

  async function onSubmit() {
    setError(null);
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    const song: Partial<Song> = {
      title: title.trim(),
      artist: artist.trim(),
      album: album.trim(),
      duration_sec: parseDuration(duration) ?? undefined,
      type,
      mastery,
      tuning,
      music_key: musicKey,
      bpm: bpm ? parseInt(bpm, 10) || undefined : undefined,
      cover: cover.trim(),
      roles: roles.trim(),
      watch: watch.trim(),
    };
    try {
      if (editing) {
        await updateSong(editing.id, song);
      } else {
        await createSong(song);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="card stack form">
      <div className="row between">
        <div className="tabs-inline">
          <button
            type="button"
            aria-pressed={type === 'reprise'}
            className={`tab ${type === 'reprise' ? 'active' : ''}`}
            onClick={() => setType('reprise')}
          >
            Reprise
          </button>
          <button
            type="button"
            aria-pressed={type === 'compo'}
            className={`tab ${type === 'compo' ? 'active' : ''}`}
            onClick={() => setType('compo')}
          >
            Compo
          </button>
        </div>
        <button className="btn small" onClick={onClose}>
          Fermer
        </button>
      </div>

      <div className="grid2">
        <label className="field">
          <span>Titre *</span>
          <input list="titles" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tape un titre…" />
          <datalist id="titles">
            {titles.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>Artiste</span>
          <input list="artists" value={artist} onChange={(e) => setArtist(e.target.value)} />
          <datalist id="artists">
            {artists.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>Album</span>
          <input value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Album (optionnel)" />
        </label>
        <label className="field">
          <span>Durée</span>
          <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="3:45" />
        </label>
        <label className="field">
          <span>Maîtrise</span>
          <select value={mastery} onChange={(e) => setMastery(Number(e.target.value))}>
            {MASTERY_LEVELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Accordage</span>
          <select value={tuning} onChange={(e) => setTuning(e.target.value)}>
            <option value="">— Accordage —</option>
            {TUNINGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tonalité</span>
          <select value={musicKey} onChange={(e) => setMusicKey(e.target.value)}>
            <option value="">— Tonalité —</option>
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>BPM</span>
          <input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} />
        </label>
        <label className="field">
          <span>Pochette (URL)</span>
          <input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://…" />
        </label>
      </div>

      <button className="btn small" onClick={onEnrich}>
        Compléter les infos automatiquement
      </button>

      <details>
        <summary>Fiche morceau (rôles, points de vigilance)</summary>
        <div className="grid2">
          <label className="field">
            <span>Rôles</span>
            <textarea value={roles} onChange={(e) => setRoles(e.target.value)} rows={3} placeholder="Qui chante / joue quoi…" />
          </label>
          <label className="field">
            <span>Points de vigilance</span>
            <textarea value={watch} onChange={(e) => setWatch(e.target.value)} rows={3} placeholder="Attention à…" />
          </label>
        </div>
      </details>

      {duplicate && (
        <p className="warn" aria-live="polite">
          ⚠ Un morceau identique existe déjà : « {duplicate.title} »
          {duplicate.artist ? ` — ${duplicate.artist}` : ''}.
        </p>
      )}
      {info && (
        <p className="muted" aria-live="polite">
          {info}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="row">
        <button className="btn primary" onClick={onSubmit}>
          {editing ? 'Enregistrer' : 'Ajouter au répertoire'}
        </button>
      </div>
    </div>
  );
}
