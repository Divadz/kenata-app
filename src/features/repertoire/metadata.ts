import { api } from '../../api/client';

/** Candidat renvoyé par la recherche Deezer (une version précise d'un morceau). */
export interface MetaCandidate {
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration_sec: number;
}

/** Caractéristiques audio (tonalité + tempo) issues de GetSongBPM. */
export interface AudioFeatures {
  configured: boolean;
  bpm: number | null;
  music_key: string | null;
  key_raw: string | null;
}

/** Liste de candidats pour « titre (+ artiste) » via Deezer. */
export function searchMetadata(title: string, artist?: string): Promise<MetaCandidate[]> {
  const p = new URLSearchParams({ title });
  if (artist) p.set('artist', artist);
  return api<MetaCandidate[]>(`/metadata/search?${p.toString()}`);
}

/** Tonalité + tempo pour un candidat choisi via GetSongBPM. */
export function fetchAudioFeatures(title: string, artist?: string): Promise<AudioFeatures> {
  const p = new URLSearchParams({ title });
  if (artist) p.set('artist', artist);
  return api<AudioFeatures>(`/metadata/audio?${p.toString()}`);
}
