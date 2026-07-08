import { useMemo, useState } from 'react';
import { TUNINGS } from './constants';
import { formatDuration } from '../../utils/duration';
import { SongForm } from './SongForm';
import { ImportSongs } from './ImportSongs';
import { deleteSong, useSongs, type SongRow } from './useSongs';

type SortKey = 'az' | 'za' | 'mastery_desc' | 'mastery_asc' | 'album' | 'duration' | 'bpm';

export function RepertoirePage() {
  const { songs, loading, reload } = useSongs();

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<SongRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const [fArtist, setFArtist] = useState('');
  const [fTuning, setFTuning] = useState('');
  const [fAlbum, setFAlbum] = useState('');
  const [fMinMastery, setFMinMastery] = useState(0);
  const [sort, setSort] = useState<SortKey>('az');

  const artists = useMemo(
    () => [...new Set(songs.map((s) => s.artist).filter(Boolean))].sort() as string[],
    [songs]
  );
  const albums = useMemo(
    () => [...new Set(songs.map((s) => s.album).filter(Boolean))].sort() as string[],
    [songs]
  );

  const visible = useMemo(() => {
    let list = songs.filter(
      (s) =>
        (!fArtist || s.artist === fArtist) &&
        (!fTuning || s.tuning === fTuning) &&
        (!fAlbum || s.album === fAlbum) &&
        (s.mastery ?? 0) >= fMinMastery
    );
    const by = <T,>(f: (s: SongRow) => T) => (a: SongRow, b: SongRow) =>
      f(a) < f(b) ? -1 : f(a) > f(b) ? 1 : 0;
    switch (sort) {
      case 'az':
        list = [...list].sort(by((s) => s.title.toLowerCase()));
        break;
      case 'za':
        list = [...list].sort(by((s) => s.title.toLowerCase())).reverse();
        break;
      case 'mastery_desc':
        list = [...list].sort((a, b) => (b.mastery ?? 0) - (a.mastery ?? 0));
        break;
      case 'mastery_asc':
        list = [...list].sort((a, b) => (a.mastery ?? 0) - (b.mastery ?? 0));
        break;
      case 'album':
        list = [...list].sort(by((s) => (s.album ?? '').toLowerCase()));
        break;
      case 'duration':
        list = [...list].sort((a, b) => (a.duration_sec ?? 0) - (b.duration_sec ?? 0));
        break;
      case 'bpm':
        list = [...list].sort((a, b) => (a.bpm ?? 0) - (b.bpm ?? 0));
        break;
    }
    return list;
  }, [songs, fArtist, fTuning, fAlbum, fMinMastery, sort]);

  function openAdd() {
    setEditing(null);
    setShowImport(false);
    setShowForm(true);
  }
  function openEdit(s: SongRow) {
    setEditing(s);
    setShowImport(false);
    setShowForm(true);
  }

  return (
    <section className="stack full">
      <div className="row between full">
        <h2>Répertoire {songs.length > 0 && <span className="muted">· {songs.length}</span>}</h2>
        <div className="row">
          <button className="btn" onClick={() => { setShowImport((v) => !v); setShowForm(false); }}>
            Importer
          </button>
          <button className="btn primary" onClick={openAdd}>
            + Ajouter un morceau
          </button>
        </div>
      </div>

      {showForm && (
        <SongForm
          songs={songs}
          editing={editing}
          onSaved={reload}
          onClose={() => setShowForm(false)}
        />
      )}
      {showImport && <ImportSongs onSaved={reload} onClose={() => setShowImport(false)} />}

      <div className="row filters full">
        <select value={fArtist} onChange={(e) => setFArtist(e.target.value)}>
          <option value="">Tous artistes</option>
          {artists.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select value={fTuning} onChange={(e) => setFTuning(e.target.value)}>
          <option value="">Tous accordages</option>
          {TUNINGS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={fAlbum} onChange={(e) => setFAlbum(e.target.value)}>
          <option value="">Tous albums</option>
          {albums.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select value={fMinMastery} onChange={(e) => setFMinMastery(Number(e.target.value))}>
          {[0, 1, 2, 3, 4, 5].map((m) => (
            <option key={m} value={m}>Maîtrise ≥ {m}</option>
          ))}
        </select>
        <div className="spacer" />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="az">Titre A→Z</option>
          <option value="za">Titre Z→A</option>
          <option value="mastery_desc">Maîtrise ↓</option>
          <option value="mastery_asc">Maîtrise ↑</option>
          <option value="album">Album</option>
          <option value="duration">Durée</option>
          <option value="bpm">BPM</option>
        </select>
      </div>

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : visible.length === 0 ? (
        <p className="muted">Aucun morceau. Ajoute ton premier titre ou importe une liste.</p>
      ) : (
        <div className="table-wrap full">
          <table className="table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Artiste</th>
                <th>Album</th>
                <th>Durée</th>
                <th>Maît.</th>
                <th>Accordage</th>
                <th>Tonalité</th>
                <th>BPM</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.title}
                    {s.type === 'compo' && <span className="badge">compo</span>}
                  </td>
                  <td>{s.artist || '—'}</td>
                  <td>{s.album || '—'}</td>
                  <td>{formatDuration(s.duration_sec) || '—'}</td>
                  <td>{s.mastery ?? 0}</td>
                  <td>{s.tuning || '—'}</td>
                  <td>{s.music_key || '—'}</td>
                  <td>{s.bpm || '—'}</td>
                  <td className="actions">
                    <button className="btn small" onClick={() => openEdit(s)}>
                      Éditer
                    </button>
                    {pendingDelete === s.id ? (
                      <>
                        <button
                          className="btn small danger"
                          onClick={async () => {
                            await deleteSong(s.id);
                            await reload();
                            setPendingDelete(null);
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
