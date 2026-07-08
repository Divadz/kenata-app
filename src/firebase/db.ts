import { ref } from 'firebase/database';
import { db, GROUP_ID } from './config';

/** Chemins Realtime Database sous le groupe unique. */
export const paths = {
  group: () => `groups/${GROUP_ID}`,
  meta: () => `groups/${GROUP_ID}/meta`,
  members: () => `groups/${GROUP_ID}/members`,
  member: (uid: string) => `groups/${GROUP_ID}/members/${uid}`,
  memberProfile: (uid: string) => `groups/${GROUP_ID}/members/${uid}/profile`,
  invitations: () => `groups/${GROUP_ID}/invitations`,
  // Répertoire (Lot 1)
  songs: () => `groups/${GROUP_ID}/songs`,
  song: (sid: string) => `groups/${GROUP_ID}/songs/${sid}`,
  songSheets: () => `groups/${GROUP_ID}/songSheets`,
  songSheet: (sid: string) => `groups/${GROUP_ID}/songSheets/${sid}`,
  // Données métier (Lots suivants)
  setlists: () => `groups/${GROUP_ID}/setlists`,
  concerts: () => `groups/${GROUP_ID}/concerts`,
  gearTemplates: () => `groups/${GROUP_ID}/gearTemplates`,
  booking: () => `groups/${GROUP_ID}/booking`,
};

export const dbRef = (path: string) => ref(db, path);
