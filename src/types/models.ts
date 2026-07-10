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

// --- Lot 2 : Setlists ---

export type SetlistItemType = 'song' | 'free' | 'souffleur';

export interface SetlistItem {
  type: SetlistItemType;
  song_id?: string | null;
  label?: string | null;
  est_duration_sec?: number | null;
  souffleur_text?: string | null;
  souffleur_mood?: string | null;
  // Données morceau enrichies (renvoyées par le serveur, lecture seule).
  song_title?: string | null;
  song_artist?: string | null;
  song_duration?: number | null;
  song_tuning?: string | null;
  song_key?: string | null;
  song_bpm?: number | null;
}

export interface SetlistSummary {
  id: string;
  name: string;
  target_duration_min: number | null;
  share_token: string | null;
  item_count: number;
  total_sec: number;
}

export interface SetlistDetail {
  id: string;
  name: string;
  target_duration_min: number | null;
  share_token: string | null;
  items: SetlistItem[];
}

// --- Lot 3 : Concerts & Matos ---

export interface ContactInfo {
  name?: string;
  phone?: string;
  email?: string;
}
export interface ConcertContacts {
  org?: ContactInfo;
  sound?: ContactInfo;
  light?: ContactInfo;
}
export interface TicketLink {
  label?: string;
  url?: string;
}
export interface RoadmapItem {
  time?: string;
  label?: string;
}
/** Élément d'inventaire matos, coché par défaut ou non. */
export interface GearItem {
  id: string;
  label: string;
  default_checked: boolean;
}

export interface ConcertSummary {
  id: string;
  date: string | null;
  start_time?: string | null;
  arrival_time?: string | null;
  venue_name: string | null;
  visibility: 'public' | 'private';
  /** Date en option (pas encore confirmée) vs validée. */
  is_option?: boolean;
  merch?: boolean;
  fee?: string | null;
  fee_guso?: boolean;
  target_duration_min: number | null;
  setlist_id: string | null;
  setlist_name?: string | null;
  setlist_sec?: string | number | null;
}

export interface ConcertDetail extends ConcertSummary {
  start_time: string | null;
  arrival_time: string | null;
  poster_url: string | null;
  poster_is_link: boolean;
  on_site: boolean;
  tech_sheet_url: string | null;
  address: string | null;
  maps_url: string | null;
  parking: string | null;
  greenroom: string | null;
  catering: string | null;
  fee: string | null;
  fee_guso: boolean;
  lodging: string | null;
  merch: boolean;
  notes: string | null;
  contacts: ConcertContacts | null;
  ticket_links: TicketLink[] | null;
  roadmap: RoadmapItem[] | null;
  /** Ids des éléments matos cochés pour ce concert (figés à la création depuis les défauts). */
  gear_checklist: string[] | null;
}
