// Modèles du socle (Lot 0). Les entités métier (Song, Setlist, Concert,
// BookingCard...) seront ajoutées avec leurs lots respectifs.

export type Role = 'owner' | 'admin' | 'member';

export interface MemberProfile {
  name?: string;
  instrument?: string;
  nickname?: string;
}

export interface Member {
  role: Role;
  email: string;
  profile?: MemberProfile;
  joined_at?: number;
}

export interface Invitation {
  email: string;
  role: Exclude<Role, 'owner'>;
  invitedBy?: string;
  createdAt?: number;
}

export interface GroupMeta {
  name: string;
  default_tuning?: string;
  logo?: string;
  color_primary?: string;
  onboarding_pct?: number;
}

// --- Lot 1 : Répertoire ---

export type SongType = 'reprise' | 'compo';

export interface Song {
  title: string;
  artist?: string;
  album?: string;
  duration_sec?: number;
  type: SongType;
  mastery: number; // 0..5
  tuning?: string;
  music_key?: string;
  bpm?: number;
  cover?: string;
  created_at?: number;
  updated_at?: number;
  last_played_at?: number;
}

/** Fiche morceau : notes de jeu attachées à un morceau. */
export interface SongSheet {
  roles?: string;
  watch?: string;
}
