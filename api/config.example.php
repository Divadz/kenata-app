<?php
// Copier ce fichier en `config.php` (idéalement HORS de la racine web) et remplir.
// `config.php` ne doit JAMAIS être versionné ni exposé publiquement.
return [
    'db' => [
        'host' => 'localhost',
        'name' => 'kenata',
        'user' => '',
        'pass' => '',
    ],
    'group' => [
        'id'   => 'kenata',
        'name' => 'Kenata',
    ],
    // Email du propriétaire initial : à sa 1re connexion Google, il devient owner
    // si le groupe n'a encore aucun membre.
    'owner_email' => 'ton-email@gmail.com',
    'google' => [
        'client_id'     => '',
        'client_secret' => '',
        'redirect_uri'  => 'https://my.kenata.fr/api/auth/google/callback',
    ],
    'security' => [
        // Chaîne aléatoire longue et secrète (ex. `openssl rand -hex 32`).
        'app_secret' => 'A_REMPLACER_PAR_UNE_CHAINE_ALEATOIRE_LONGUE',
    ],
    'session' => [
        'ttl_days' => 30,
    ],
    'app' => [
        // Redirection après connexion réussie.
        'post_login_redirect' => '/',
    ],
    'getsongbpm' => [
        // Clé API gratuite : https://getsongbpm.com/api (nécessite un lien d'attribution
        // « Powered by GetSongBPM » sur le site). Laisser vide pour désactiver tonalité/tempo.
        'api_key' => '',
    ],
];
