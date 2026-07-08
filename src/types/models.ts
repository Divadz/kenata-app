// Modèles du socle (Lot 0). Les entités métier (Song, Setlist, Concert,
// BookingCard...) seront ajoutées avec leurs lots respectifs.

export type Role = 'owner' | 'admin' | 'member';

export interface MemberProfile {
  name?: string;
  instrument?: string;
  nickname?: string;
}

export interface Member {
  user_id?: string;
  role: Role;
  email: string;
  profile?: MemberProfile;
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
  // Fiche morceau (intégrée en colonnes côté MySQL)
  roles?: string;
  watch?: string;
}
