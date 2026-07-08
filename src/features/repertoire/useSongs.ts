import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Song } from '../../types/models';

export interface SongRow extends Song {
  id: string;
}

export function useSongs() {
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    try {
      setSongs(await api<SongRow[]>('/songs'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return { songs, loading, reload };
}

// --- Opérations (rechargez la liste via reload() après appel) ---

export function createSong(song: Partial<Song>) {
  return api<{ id: string }>('/songs', { method: 'POST', body: song });
}
export function updateSong(id: string, patch: Partial<Song>) {
  return api(`/songs/${id}`, { method: 'PATCH', body: patch });
}
export function deleteSong(id: string) {
  return api(`/songs/${id}`, { method: 'DELETE' });
}
export function importSongs(text: string) {
  return api<{ added: number; skipped: number }>('/songs/import', { method: 'POST', body: { text } });
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
