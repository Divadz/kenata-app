# Kenata — app

Application PWA de gestion du groupe **Kenata**. Contient le **Lot 0 : socle** (authentification, groupe unique, membres et rôles) et le **Lot 1 : Répertoire**.

Stack : **React + TypeScript + Vite** (frontend PWA) · **API PHP native** (aucune dépendance) · **MySQL/MariaDB** · hébergement **IONOS mutualisé**.

## Architecture

```
Navigateur (React PWA)
   │  fetch /api/...  (même origine → cookie de session, en-tête CSRF)
   ▼
IONOS (my.kenata.fr)
   /            → build React statique (dist/)
   /api/        → API PHP (front controller : api/index.php)
   MySQL/MariaDB (PDO, requêtes préparées)
```

- **Single-tenant** : un seul groupe. Accès **sur invitation uniquement**.
- **Auth** : Google OAuth 2.0 implémenté en PHP (magic link e-mail prévu plus tard). Sessions serveur par cookie httpOnly/Secure/SameSite.
- **Autorisation** : rôles owner/admin/member vérifiés côté serveur à chaque endpoint.

## Prérequis

- Node.js 20+ (frontend) et PHP 8.1+ (API). MySQL/MariaDB.
- En prod : hébergement IONOS avec PHP + MySQL + `mod_rewrite`.

## Base de données

Importer le schéma :

```bash
mysql -u <user> -p <base> < db/schema.sql
```

## Configuration de l'API

Copier `api/config.example.php` en **`api/config.php`** (ou, mieux, `kenata-config.php` **hors racine web**) et renseigner :

- `db` : hôte, base, utilisateur, mot de passe.
- `owner_email` : ton e-mail Google (deviendra `owner` à la 1re connexion si le groupe est vide).
- `google.client_id` / `client_secret` : identifiants OAuth (voir ci-dessous).
- `google.redirect_uri` : `https://my.kenata.fr/api/auth/google/callback`.
- `security.app_secret` : chaîne aléatoire longue (`openssl rand -hex 32`).

Ce fichier **ne doit jamais être versionné** (déjà dans `.gitignore`).

## Configurer Google OAuth

1. Google Cloud Console → *APIs & Services* → *Credentials* → *Create OAuth client ID* → type *Web application*.
2. **Authorized redirect URIs** : `https://my.kenata.fr/api/auth/google/callback` (et `http://localhost:8000/api/auth/google/callback` pour le dev si besoin).
3. Reporter `client_id` / `client_secret` dans la config.

## Développement local

Deux serveurs : l'API PHP et le frontend Vite (qui proxifie `/api`).

```bash
# 1) API PHP (port 8000) — sert de routeur
php -S localhost:8000 api/index.php

# 2) Frontend (port 5173), dans un autre terminal
npm install
npm run dev
```

Ouvre http://localhost:5173. Le proxy Vite envoie `/api/*` vers `http://localhost:8000`.

## Déploiement sur IONOS

1. `npm run build` → génère `dist/`.
2. Déposer le contenu de `dist/` à la racine web, et le dossier `api/` sous la racine (→ `my.kenata.fr/api`).
3. Placer `config.php` (idéalement hors racine web : `kenata-config.php` un niveau au-dessus).
4. Importer `db/schema.sql` dans la base MySQL.
5. Vérifier que `mod_rewrite` est actif (les `.htaccess` gèrent le routage SPA et l'API).

## Sécurité — garanties

- **Requêtes préparées PDO** partout (anti-injection SQL).
- **Accès sur invitation strict** : aucun membre ne peut être créé côté client ; l'accès est résolu côté serveur (propriétaire initial ou invitation), sinon aucun accès.
- **Rôle `owner` protégé** : seul un owner peut créer/modifier/supprimer un owner.
- **Sessions** : jeton aléatoire en cookie httpOnly + Secure + SameSite=Lax ; seul le SHA-256 est stocké.
- **CSRF** : en-tête `X-CSRF-Token` requis sur les écritures (jeton HMAC lié à la session).
- **OAuth** : paramètre `state` anti-CSRF à usage unique ; e-mail vérifié exigé.
- **Secrets** hors dépôt (`config.php`), HTTPS de rigueur en prod.

**À durcir plus tard** : rate-limiting sur les endpoints d'auth, magic link e-mail, journalisation des changements de rôle.

## Périmètre

**Lot 0** — auth Google, groupe unique, membres/invitations/rôles, sessions, CSRF.
**Lot 1** — Répertoire : CRUD morceaux, filtres, tris, import en masse, fiche morceau (rôles/vigilance), doublons.
Enrichissement métadonnées : interface prête (`src/features/repertoire/metadata.ts`), fournisseur à brancher.

Lots suivants : Setlists → Concerts → Booking (CRM) → Identité/offline.
