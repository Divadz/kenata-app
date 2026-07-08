# Kenata — app

Application PWA de gestion du groupe **Kenata**. Ce dépôt contient le **Lot 0 : socle** (authentification, groupe unique, membres et rôles, règles de sécurité) et le **Lot 1 : Répertoire**.

Stack : React + TypeScript + Vite, Firebase (Realtime Database, Auth, Hosting, Cloud Functions).

## Architecture (rappel)

- **Single-tenant** : un seul groupe, sous `/groups/{VITE_GROUP_ID}`. Accès **sur invitation uniquement**.
- **Auth** : Google (le magic link e-mail sera ajouté plus tard).
- **Sécurité** : la création d'un membre n'est possible **que** via la Cloud Function `onUserCreate` (SDK admin). Les règles Realtime Database interdisent à tout client d'écrire dans `/members`. Un utilisateur sans invitation n'a aucun accès.

## Prérequis

- Node.js 20+
- Firebase CLI : `npm i -g firebase-tools`
- Un projet Firebase avec **Realtime Database** et **Authentication (Google)** activés.

## Configuration

1. Installer les dépendances :

   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

2. Config client : copier `.env.example` en `.env.local` et renseigner les valeurs Firebase (console → Paramètres du projet → Vos applications). Définir aussi `VITE_GROUP_ID` (ex. `kenata`).

3. Renseigner l'ID de projet dans `.firebaserc` (remplacer `REMPLACER_PAR_ID_PROJET_FIREBASE`).

4. Config des Cloud Functions (propriétaire initial + groupe) : copier
   `functions/.env.example` en `functions/.env` et renseigner `OWNER_EMAIL` et
   `GROUP_ID`. Ces variables sont lues via `process.env` par `functions/src/index.ts`
   et déployées avec la fonction.

## Activer l'authentification Google

Console Firebase → Authentication → Sign-in method → activer **Google**. Ajouter le domaine de dev (`localhost`) et le domaine de prod aux domaines autorisés.

## Démarrer en développement

```bash
npm run dev
```

## Déployer

```bash
# Règles de la base
npm run rules:deploy

# Cloud Functions
cd functions && npm run build && cd ..
npm run functions:deploy

# App (build + hosting)
npm run deploy
```

## Amorçage (premier accès)

1. Déployer les règles et les functions.
2. Se connecter avec le compte **propriétaire** (email = `owner_email`). La fonction `onUserCreate` crée automatiquement le membre `owner` et initialise `meta`.
3. Le propriétaire invite les autres membres depuis l'onglet **Membres** ; chacun obtient l'accès à sa première connexion Google.

## Périmètre du Lot 0

- [x] Auth Google + garde d'accès (connexion / non-membre / membre)
- [x] Groupe unique + réglages (nom)
- [x] Membres : liste, invitation, rôles (owner/admin/member), retrait
- [x] Règles de sécurité Realtime Database
- [x] Cloud Function de résolution des accès (invitation obligatoire)
- [x] PWA installable (manifest + service worker)

## Sécurité — garanties et limites connues

**Garanti par les règles + la Cloud Function :**

- Aucun accès sans invitation : un membre ne peut être créé que par la fonction `onUserCreate` (SDK admin), jamais par un client.
- Un utilisateur ne peut pas s'auto-attribuer ou modifier son rôle (`/members/{uid}/role` est en écriture admin/owner uniquement).
- Un non-membre ne peut ni lire ni écrire les données du groupe (règles + `.read/.write` par défaut à `false`).
- Les invitations (emails) ne sont lisibles que par les admins ; on ne peut pas inviter au rôle `owner`.
- Email vérifié exigé avant tout octroi d'accès.
- Le rôle `owner` est protégé : un `admin` ne peut ni promouvoir quelqu'un `owner`, ni modifier/supprimer le compte `owner` (rôle et profil). Seul l'`owner` peut agir sur un compte `owner`.

**À durcir dans un lot ultérieur (admins considérés comme de confiance en V1) :**

- Journaliser les changements de rôle et les retraits de membre.
- Ajouter des `.validate` plus stricts sur les nœuds de données (formats, tailles) au fil des lots métier.

---

## Périmètre du Lot 1 (Répertoire)

- [x] CRUD morceau : titre, artiste, album, durée, type (reprise/compo), maîtrise 0-5, accordage, tonalité, BPM, pochette
- [x] Onglets Reprise / Compo, auto-complétion locale (titres/artistes existants)
- [x] Filtres (artiste, accordage, album, maîtrise min) et tris (A→Z, Z→A, maîtrise, album, durée, BPM)
- [x] Alerte doublon (titre + artiste)
- [x] Import en masse (`Titre ; Artiste ; Accordage ; Maîtrise ; Album ; Durée ; BPM ; Tonalité`)
- [x] Fiche morceau (rôles, points de vigilance)
- [ ] Enrichissement métadonnées : interface prête (`metadata.ts`), fournisseur à brancher (décision en attente)

Lots suivants : Setlists → Concerts → Booking (CRM) → Identité/offline.
Voir le cahier des charges technique (hors dépôt).
