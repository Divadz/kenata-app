import { useState } from 'react';
import { formatDuration } from '../../utils/duration';
import { fetchAudioFeatures, searchMetadata, type MetaCandidate } from './metadata';

/** Valeurs importables (chaînes prêtes à injecter dans le formulaire). */
export interface ImportPatch {
  artist?: string;
  album?: string;
  duration?: string;
  bpm?: string;
  music_key?: string;
  cover?: string;
}

/** Valeurs actuelles du formulaire, pour comparer « nouveau » vs « actuel ». */
export interface CurrentValues {
  artist: string;
  album: string;
  duration: string;
  bpm: string;
  music_key: string;
  cover: string;
}

interface Props {
  title: string;
  artist: string;
  current: CurrentValues;
  onApply: (patch: ImportPatch) => void;
}

interface Row {
  field: keyof ImportPatch;
  label: string;
  value: string;
  display: string;
  current: string;
  checked: boolean;
}

type Phase = 'idle' | 'searching' | 'list' | 'loading' | 'preview';
type Msg = { type: 'info' | 'error'; text: string } | null;

export function MetadataImport({ title, artist, current, onApply }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [candidates, setCandidates] = useState<MetaCandidate[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<Msg>(null);

  async function onSearch() {
    setMsg(null);
    if (!title.trim()) {
      setMsg({ type: 'error', text: 'Saisis au moins un titre avant de rechercher.' });
      return;
    }
    setPhase('searching');
    try {
      const found = await searchMetadata(title.trim(), artist.trim() || undefined);
      if (found.length === 0) {
        setMsg({ type: 'info', text: 'Aucun résultat. Vérifie l’orthographe du titre ou de l’artiste.' });
        setPhase('idle');
        return;
      }
      setCandidates(found);
      setPhase('list');
    } catch {
      setMsg({ type: 'error', text: 'La recherche a échoué. Réessaie dans un instant.' });
      setPhase('idle');
    }
  }

  async function onPick(cand: MetaCandidate) {
    setMsg(null);
    setPhase('loading');
    let af;
    try {
      af = await fetchAudioFeatures(cand.title, cand.artist || undefined);
    } catch {
      af = { configured: true, bpm: null, music_key: null, key_raw: null };
    }

    const next: Row[] = [];
    const push = (field: keyof ImportPatch, label: string, value: string, cur: string, display?: string) => {
      if (!value) return;
      next.push({ field, label, value, display: display ?? value, current: cur, checked: value !== cur });
    };

    if (af.music_key) push('music_key', 'Tonalité', af.music_key, current.music_key);
    if (af.bpm) push('bpm', 'Tempo (BPM)', String(af.bpm), current.bpm);
    if (cand.duration_sec) push('duration', 'Durée', formatDuration(cand.duration_sec), current.duration);
    push('artist', 'Artiste', cand.artist, current.artist);
    push('album', 'Album', cand.album, current.album);
    if (cand.cover) push('cover', 'Pochette', cand.cover, current.cover, 'image (Deezer)');

    // Messages selon la disponibilité tonalité/tempo.
    if (!af.configured) {
      setMsg({ type: 'info', text: 'Tonalité et tempo indisponibles (clé GetSongBPM non configurée). Durée et infos Deezer restent proposées.' });
    } else if (!af.music_key && af.key_raw) {
      setMsg({ type: 'info', text: `Tonalité GetSongBPM non reconnue (« ${af.key_raw} ») — à saisir à la main.` });
    } else if (!af.music_key && !af.bpm) {
      setMsg({ type: 'info', text: 'GetSongBPM n’a pas de tonalité/tempo pour ce titre.' });
    }

    if (next.length === 0) {
      setMsg({ type: 'info', text: 'Rien de nouveau à importer pour cette version.' });
      setPhase('idle');
      return;
    }
    setRows(next);
    setPhase('preview');
  }

  function toggle(i: number) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, checked: !r.checked } : r)));
  }

  function onImport() {
    const patch: ImportPatch = {};
    for (const r of rows) {
      if (r.checked) patch[r.field] = r.value;
    }
    onApply(patch);
    const n = Object.keys(patch).length;
    setMsg({ type: 'info', text: n ? `${n} champ${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''} ✓` : 'Aucun champ sélectionné.' });
    setPhase('idle');
    setRows([]);
    setCandidates([]);
  }

  function reset() {
    setPhase('idle');
    setRows([]);
    setCandidates([]);
    setMsg(null);
  }

  const busy = phase === 'searching' || phase === 'loading';

  return (
    <div className="stack meta-import" style={{ gap: '0.5rem', alignItems: 'stretch' }}>
      {phase === 'idle' && (
        <button type="button" className="btn small" onClick={onSearch}>
          🎵 Récupérer tonalité, tempo & durée
        </button>
      )}

      {busy && (
        <p className="muted small" aria-live="polite">
          {phase === 'searching' ? 'Recherche des morceaux…' : 'Récupération de la tonalité et du tempo…'}
        </p>
      )}

      {phase === 'list' && (
        <div className="stack" style={{ gap: '0.4rem', alignItems: 'stretch' }}>
          <p className="muted small">Choisis la bonne version :</p>
          {candidates.map((c, i) => (
            <button type="button" key={i} className="btn meta-candidate" onClick={() => onPick(c)}>
              {c.cover && <img src={c.cover} alt="" width={40} height={40} loading="lazy" />}
              <span className="meta-candidate-txt">
                <strong>{c.title}</strong>
                <span className="muted small">
                  {c.artist}
                  {c.album ? ` · ${c.album}` : ''}
                  {c.duration_sec ? ` · ${formatDuration(c.duration_sec)}` : ''}
                </span>
              </span>
            </button>
          ))}
          <button type="button" className="btn small" onClick={reset}>
            Annuler
          </button>
        </div>
      )}

      {phase === 'preview' && (
        <div className="stack" style={{ gap: '0.5rem', alignItems: 'stretch' }}>
          <p className="muted small">Coche ce que tu veux importer :</p>
          <ul className="meta-preview">
            {rows.map((r, i) => (
              <li key={r.field}>
                <label className="meta-row">
                  <input type="checkbox" checked={r.checked} onChange={() => toggle(i)} />
                  <span className="meta-row-body">
                    <span className="meta-row-label">{r.label}</span>
                    <span className="meta-row-val">
                      <span className="mono">{r.display}</span>
                      {r.current && r.current !== r.value && (
                        <span className="muted small"> (actuel : {r.current})</span>
                      )}
                      {r.current && r.current === r.value && <span className="muted small"> (identique)</span>}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="row" style={{ gap: '0.5rem' }}>
            <button type="button" className="btn primary small" onClick={onImport}>
              Importer la sélection
            </button>
            <button type="button" className="btn small" onClick={reset}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p className={msg.type === 'error' ? 'error small' : 'muted small'} role={msg.type === 'error' ? 'alert' : undefined} aria-live="polite">
          {msg.text}
        </p>
      )}
    </div>
  );
}
