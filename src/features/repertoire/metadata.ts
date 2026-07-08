import type { Song } from '../../types/models';

export type SongMetadata = Partial<
  Pick<Song, 'artist' | 'album' | 'duration_sec' | 'bpm' | 'cover'>
>;

/**
 * Enrichissement des métadonnées d'un morceau (artiste, album, durée, pochette, BPM).
 *
 * Point d'extension : le fournisseur (MusicBrainz, Spotify API, autre) n'est pas
 * encore tranché. Cette fonction est l'unique interface à implémenter ; le reste
 * de l'UI est déjà câblé (bouton « Compléter les infos »).
 */
export async function lookupMetadata(
  _title: string,
  _artist?: string
): Promise<SongMetadata | null> {
  // TODO(lot ultérieur) : brancher un fournisseur de métadonnées.
  return null;
}
