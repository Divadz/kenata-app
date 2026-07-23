-- Schéma MySQL / MariaDB — Kenata (Lot 0 socle + Lot 1 Répertoire)
-- Encodage utf8mb4 partout.

SET NAMES utf8mb4;

-- Utilisateurs (identité)
CREATE TABLE IF NOT EXISTS users (
  id          CHAR(36)      NOT NULL,
  email       VARCHAR(255)  NOT NULL,
  google_sub  VARCHAR(255)  NULL,
  name        VARCHAR(255)  NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_email (email),
  UNIQUE KEY uniq_google_sub (google_sub)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Groupe unique (single-tenant) — table pour porter les métadonnées / branding
CREATE TABLE IF NOT EXISTS app_group (
  id             VARCHAR(64)  NOT NULL,
  name           VARCHAR(255) NOT NULL,
  default_tuning VARCHAR(64)  NULL,
  logo           VARCHAR(1024) NULL,
  color_primary  VARCHAR(16)  NULL,
  onboarding_pct INT          NOT NULL DEFAULT 0,
  concert_section_order JSON   NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Appartenance d'un utilisateur au groupe, avec rôle
CREATE TABLE IF NOT EXISTS memberships (
  id                 CHAR(36)     NOT NULL,
  group_id           VARCHAR(64)  NOT NULL,
  user_id            CHAR(36)     NOT NULL,
  role               ENUM('owner','admin','member') NOT NULL DEFAULT 'member',
  profile_name       VARCHAR(255) NULL,
  profile_instrument VARCHAR(255) NULL,
  concert_section_order JSON      NULL,
  joined_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_group_user (group_id, user_id),
  KEY idx_group (group_id),
  CONSTRAINT fk_mem_group FOREIGN KEY (group_id) REFERENCES app_group(id) ON DELETE CASCADE,
  CONSTRAINT fk_mem_user  FOREIGN KEY (user_id)  REFERENCES users(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invitations (accès sur invitation uniquement)
CREATE TABLE IF NOT EXISTS invitations (
  id         CHAR(36)     NOT NULL,
  group_id   VARCHAR(64)  NOT NULL,
  email      VARCHAR(255) NOT NULL,
  role       ENUM('admin','member') NOT NULL DEFAULT 'member',
  invited_by CHAR(36)     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_group_email (group_id, email),
  CONSTRAINT fk_inv_group FOREIGN KEY (group_id) REFERENCES app_group(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions serveur (cookie = jeton aléatoire ; on stocke son SHA-256)
CREATE TABLE IF NOT EXISTS sessions (
  id         CHAR(64)  NOT NULL,   -- sha256(hex) du jeton du cookie
  user_id    CHAR(36)  NOT NULL,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  CONSTRAINT fk_sess_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- États OAuth (anti-CSRF du flow Google), éphémères
CREATE TABLE IF NOT EXISTS oauth_states (
  state      CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Répertoire (Lot 1) — la fiche morceau (roles, watch) est intégrée en colonnes (1:1)
CREATE TABLE IF NOT EXISTS songs (
  id             CHAR(36)     NOT NULL,
  group_id       VARCHAR(64)  NOT NULL,
  title          VARCHAR(255) NOT NULL,
  artist         VARCHAR(255) NULL,
  album          VARCHAR(255) NULL,
  duration_sec   INT          NULL,
  type           ENUM('reprise','compo') NOT NULL DEFAULT 'reprise',
  mastery        TINYINT      NOT NULL DEFAULT 0,
  tuning         VARCHAR(64)  NULL,
  music_key      VARCHAR(64)  NULL,
  bpm            INT          NULL,
  cover          VARCHAR(1024) NULL,
  roles          TEXT         NULL,
  watch          TEXT         NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_played_at DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_group (group_id),
  CONSTRAINT fk_song_group FOREIGN KEY (group_id) REFERENCES app_group(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Setlists (Lot 2)
CREATE TABLE IF NOT EXISTS setlists (
  id                  CHAR(36)     NOT NULL,
  group_id            VARCHAR(64)  NOT NULL,
  name                VARCHAR(255) NOT NULL,
  target_duration_min INT          NULL,
  share_token         CHAR(32)     NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_share (share_token),
  KEY idx_group (group_id),
  CONSTRAINT fk_setlist_group FOREIGN KEY (group_id) REFERENCES app_group(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Éléments d'une setlist (morceau / bloc libre / souffleur), ordonnés par position
CREATE TABLE IF NOT EXISTS setlist_items (
  id               CHAR(36) NOT NULL,
  setlist_id       CHAR(36) NOT NULL,
  position         INT      NOT NULL,
  type             ENUM('song','free','souffleur') NOT NULL DEFAULT 'song',
  song_id          CHAR(36) NULL,
  label            VARCHAR(255) NULL,
  est_duration_sec INT      NULL,
  souffleur_text   TEXT     NULL,
  souffleur_mood   VARCHAR(32) NULL,
  PRIMARY KEY (id),
  KEY idx_setlist (setlist_id),
  KEY idx_song (song_id),
  CONSTRAINT fk_item_setlist FOREIGN KEY (setlist_id) REFERENCES setlists(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_song    FOREIGN KEY (song_id)    REFERENCES songs(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventaire matos (Lot 3, simplifié) : éléments cochés par concert.
CREATE TABLE IF NOT EXISTS gear_items (
  id              CHAR(36)     NOT NULL,
  group_id        VARCHAR(64)  NOT NULL,
  label           VARCHAR(255) NOT NULL,
  default_checked TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_group (group_id),
  CONSTRAINT fk_gearitem_group FOREIGN KEY (group_id) REFERENCES app_group(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Concerts (Lot 3). Sous-listes variables (contacts, billetterie, feuille de
-- route, checklist matos) stockées en JSON ; setlist reliée par clé.
CREATE TABLE IF NOT EXISTS concerts (
  id                  CHAR(36)     NOT NULL,
  group_id            VARCHAR(64)  NOT NULL,
  date                DATE         NULL,
  start_time          VARCHAR(5)   NULL,
  arrival_time        VARCHAR(5)   NULL,
  venue_name          VARCHAR(255) NULL,
  poster_url          VARCHAR(1024) NULL,
  poster_is_link      TINYINT(1)   NOT NULL DEFAULT 0,
  target_duration_min INT          NULL,
  on_site             TINYINT(1)   NOT NULL DEFAULT 0,
  setlist_id          CHAR(36)     NULL,
  tech_sheet_url      VARCHAR(1024) NULL,
  address             VARCHAR(512) NULL,
  maps_url            VARCHAR(1024) NULL,
  parking             VARCHAR(512) NULL,
  greenroom           VARCHAR(512) NULL,
  catering            VARCHAR(512) NULL,
  fee                 VARCHAR(255) NULL,
  fee_guso            TINYINT(1)   NOT NULL DEFAULT 0,
  lodging             VARCHAR(512) NULL,
  visibility          ENUM('public','private') NOT NULL DEFAULT 'private',
  is_option           TINYINT(1)   NOT NULL DEFAULT 0,
  merch               TINYINT(1)   NOT NULL DEFAULT 0,
  paid                TINYINT(1)   NOT NULL DEFAULT 0,
  paid_date           DATE         NULL,
  notes               TEXT         NULL,
  contacts            JSON         NULL,
  ticket_links        JSON         NULL,
  roadmap             JSON         NULL,
  gear_checklist      JSON         NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_group (group_id),
  KEY idx_setlist (setlist_id),
  CONSTRAINT fk_concert_group   FOREIGN KEY (group_id)   REFERENCES app_group(id) ON DELETE CASCADE,
  CONSTRAINT fk_concert_setlist FOREIGN KEY (setlist_id) REFERENCES setlists(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Booking / CRM de démarchage (Lot 4). Pipeline de prospection des dates ;
-- une piste confirmée peut engendrer un concert (concert_id).
CREATE TABLE IF NOT EXISTS booking_leads (
  id                 CHAR(36)     NOT NULL,
  group_id           VARCHAR(64)  NOT NULL,
  name               VARCHAR(255) NOT NULL,
  stage              ENUM('a_contacter','contacte','relance','en_discussion','confirme','refuse') NOT NULL DEFAULT 'a_contacter',
  position           INT          NOT NULL DEFAULT 0,
  city               VARCHAR(255) NULL,
  type               VARCHAR(120) NULL,
  contact_name       VARCHAR(255) NULL,
  link               VARCHAR(1024) NULL,
  email              VARCHAR(255) NULL,
  phone              VARCHAR(64)  NULL,
  est_fee            VARCHAR(255) NULL,
  capacity           INT          NULL,
  source             VARCHAR(255) NULL,
  next_relance_date  DATE         NULL,
  next_relance_note  VARCHAR(255) NULL,
  notes              TEXT         NULL,
  exchanges          JSON         NULL,
  concert_id         CHAR(36)     NULL,
  contact_id         CHAR(36)     NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_group_stage (group_id, stage),
  CONSTRAINT fk_lead_group   FOREIGN KEY (group_id)   REFERENCES app_group(id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_concert FOREIGN KEY (concert_id) REFERENCES concerts(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Répertoire de contacts (source de vérité unique, partagée Concerts + Booking).
-- Les concerts/leads référencent un contact ; corriger une fiche corrige partout.
CREATE TABLE IF NOT EXISTS contacts (
  id         CHAR(36)     NOT NULL,
  group_id   VARCHAR(64)  NOT NULL,
  name       VARCHAR(255) NOT NULL,
  phone      VARCHAR(64)  NULL,
  email      VARCHAR(255) NULL,
  notes      VARCHAR(512) NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_group_name (group_id, name),
  CONSTRAINT fk_contact_group FOREIGN KEY (group_id) REFERENCES app_group(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Abonnements aux notifications push (Lot 6). Un membre peut avoir plusieurs
-- appareils ; unicité par empreinte de l'endpoint.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            CHAR(36)     NOT NULL,
  user_id       CHAR(36)     NOT NULL,
  endpoint      TEXT         NOT NULL,
  endpoint_hash CHAR(64)     NOT NULL,
  p256dh        VARCHAR(255) NOT NULL,
  auth          VARCHAR(255) NOT NULL,
  ua            VARCHAR(255) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_endpoint (endpoint_hash),
  KEY idx_user (user_id),
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Amorçage du groupe unique (renseigne l'id depuis la config : ex. 'kenata').
INSERT INTO app_group (id, name) VALUES ('kenata', 'Kenata')
  ON DUPLICATE KEY UPDATE name = name;
