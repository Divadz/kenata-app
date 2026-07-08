import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.database();

const REGION = 'europe-west1';
const GROUP_ID = process.env.GROUP_ID || 'kenata';
// Email du propriétaire initial (bootstrap). À définir dans la config des functions.
const OWNER_EMAIL = (process.env.OWNER_EMAIL || '').toLowerCase();

/**
 * Résolution des accès à la première connexion.
 *
 * Sécurité : c'est le SEUL endroit où un membre est créé. Les règles Realtime
 * Database interdisent à tout client d'écrire dans /members. Cette fonction
 * s'exécute avec le SDK admin (hors règles) et n'accorde un accès que si :
 *   - l'email est vérifié, ET
 *   - il correspond à une invitation existante (ou au propriétaire initial).
 * Sinon : aucun membre créé => aucun accès (les règles refusent tout).
 */
export const onUserCreate = functions
  .region(REGION)
  .auth.user()
  .onCreate(async (user) => {
    const email = (user.email || '').toLowerCase();

    // On exige un email vérifié (Google et lien e-mail le garantissent).
    if (!email || !user.emailVerified) {
      functions.logger.warn('Inscription sans email vérifié, aucun accès', { uid: user.uid });
      return;
    }

    const groupRef = db.ref(`groups/${GROUP_ID}`);
    const membersRef = groupRef.child('members');

    const baseMember = (role: 'owner' | 'admin' | 'member') => ({
      role,
      email,
      profile: { name: user.displayName || '' },
      joined_at: admin.database.ServerValue.TIMESTAMP,
    });

    // 1) Bootstrap du propriétaire initial (uniquement si le groupe n'a aucun membre).
    if (OWNER_EMAIL && email === OWNER_EMAIL) {
      const membersSnap = await membersRef.get();
      if (!membersSnap.exists()) {
        await membersRef.child(user.uid).set(baseMember('owner'));
        const metaSnap = await groupRef.child('meta').get();
        if (!metaSnap.exists()) {
          await groupRef.child('meta').set({ name: 'Kenata', onboarding_pct: 0 });
        }
        functions.logger.info('Propriétaire initial créé', { uid: user.uid });
        return;
      }
    }

    // 2) Invitation en attente pour cet email ?
    const invSnap = await groupRef.child('invitations').get();
    if (invSnap.exists()) {
      let matchedKey: string | null = null;
      let role: 'admin' | 'member' = 'member';
      invSnap.forEach((child) => {
        const v = child.val() as { email?: string; role?: string } | null;
        if (v && (v.email || '').toLowerCase() === email) {
          matchedKey = child.key;
          role = v.role === 'admin' ? 'admin' : 'member';
        }
      });
      if (matchedKey) {
        await membersRef.child(user.uid).set(baseMember(role));
        await groupRef.child('invitations').child(matchedKey).remove();
        functions.logger.info('Membre créé depuis invitation', { uid: user.uid, role });
        return;
      }
    }

    // 3) Aucune invitation => aucun accès.
    functions.logger.warn('Connexion sans invitation, accès refusé', { uid: user.uid, email });
  });
