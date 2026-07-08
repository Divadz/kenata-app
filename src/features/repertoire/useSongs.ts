import { useEffect, useState } from 'react';
import { get, onValue, push, remove, serverTimestamp, update } from 'firebase/database';
import { dbRef, paths } from '../../firebase/db';
import type { Song, SongSheet } from '../../types/models';
import { parseDuration } from '../../utils/duration';

export interface SongRow extends Song {
  id: string;
}

export function useSongs() {
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onValue(dbRef(paths.songs()), (snap) => {
      const val = (snap.val() as Record<string, Song> | null) ?? {};
      setSongs(Object.entries(val).map(([id, s]) => ({ id, ...s })));
      setLoading(false);
    });
  }, []);

  function addSong(song: Song) {
    return push(dbRef(paths.songs()), {
      ...clean(song),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }

  function updateSong(id: string, patch: Partial<Song>) {
    return update(dbRef(paths.song(id)), { ...clean(patch), updated_at: serverTimestamp() });
  }

  function deleteSong(id: string) {
    // Supprime aussi la fiche morceau associée.
    return Promise.all([
      remove(dbRef(paths.song(id))),
      remove(dbRef(paths.songSheet(id))),
    ]);
  }

  /** Import en masse — format : Titre ; Artiste ; Accordage ; Maîtrise ; Album ; Durée ; BPM ; Tonalité */
  async function importSongs(text: string): Promise<{ added: number; skipped: number }> {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    let added = 0;
    let skipped = 0;
    for (const line of lines) {
      const [title, artist, tuning, mastery, album, duration, bpm, music_key] = line
        .split(';')
        .map((c) => c.trim());
      if (!title) {
        skipped++;
        continue;
      }
      const song: Song = {
        title,
        artist: artist || undefined,
        tuning: tuning || undefined,
        mastery: clampMastery(mastery),
        album: album || undefined,
        duration_sec: parseDuration(duration || ''),
        bpm: bpm ? parseInt(bpm, 10) || undefined : undefined,
        music_key: music_key || undefined,
        type: 'reprise',
      };
      await addSong(song);
      added++;
    }
    return { added, skipped };
  }

  return { songs, loading, addSong, updateSong, deleteSong, importSongs };
}

export async function getSongSheet(id: string): Promise<SongSheet | null> {
  const snap = await get(dbRef(paths.songSheet(id)));
  return snap.exists() ? (snap.val() as SongSheet) : null;
}

export function saveSongSheet(id: string, sheet: SongSheet) {
  return update(dbRef(paths.songSheet(id)), sheet);
}

/** Détection de doublon (même titre + même artiste, insensible à la casse). */
export function findDuplicate(
  songs: SongRow[],
  title: string,
  artist: string | undefined,
  exceptId?: string
): SongRow | undefined {
  const t = title.trim().toLowerCase();
  const a = (artist || '').trim().toLowerCase();
  return songs.find(
    (s) =>
      s.id !== exceptId &&
      s.title.trim().toLowerCase() === t &&
      (s.artist || '').trim().toLowerCase() === a
  );
}

function clampMastery(v: string | number | undefined): number {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  if (Number.isNaN(n)) return 0;
  return Math.min(5, Math.max(0, n));
}

/** Retire les clés undefined (Realtime Database ne les accepte pas). */
function clean<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}
