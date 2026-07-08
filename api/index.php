<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/Session.php';
require __DIR__ . '/lib/Auth.php';
require __DIR__ . '/lib/GoogleOAuth.php';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function redirect_to(string $path): never
{
    header('Location: ' . $path);
    exit;
}

function nullable_str(mixed $v, int $max): ?string
{
    $s = trim((string) $v);
    return $s === '' ? null : mb_substr($s, 0, $max);
}

function nullable_int(mixed $v): ?int
{
    if ($v === '' || $v === null) {
        return null;
    }
    return is_numeric($v) ? (int) $v : null;
}

function parse_duration(string $s): ?int
{
    $s = trim($s);
    if ($s === '') {
        return null;
    }
    if (preg_match('/^(\d{1,3}):([0-5]?\d)$/', $s, $m)) {
        return (int) $m[1] * 60 + (int) $m[2];
    }
    return ctype_digit($s) ? (int) $s : null;
}

function ensure_group(): void
{
    $stmt = db()->prepare('SELECT id FROM app_group WHERE id = ?');
    $stmt->execute([group_id()]);
    if (!$stmt->fetch()) {
        db()->prepare('INSERT INTO app_group (id, name) VALUES (?, ?)')
            ->execute([group_id(), (string) config('group.name', 'Kenata')]);
    }
}

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------

function auth_google_start(): never
{
    $state = bin2hex(random_bytes(32));
    $expires = (new DateTimeImmutable('+10 minutes'))->format('Y-m-d H:i:s');
    db()->prepare('DELETE FROM oauth_states WHERE expires_at < NOW()')->execute();
    db()->prepare('INSERT INTO oauth_states (state, expires_at) VALUES (?, ?)')->execute([$state, $expires]);
    redirect_to(GoogleOAuth::authUrl($state));
}

function auth_google_callback(): never
{
    $redirect = (string) config('app.post_login_redirect', '/');

    if (isset($_GET['error'])) {
        redirect_to($redirect . '?auth_error=denied');
    }

    // Vérifie le state anti-CSRF (usage unique).
    $state = (string) ($_GET['state'] ?? '');
    $stmt = db()->prepare('SELECT expires_at FROM oauth_states WHERE state = ?');
    $stmt->execute([$state]);
    $row = $stmt->fetch();
    db()->prepare('DELETE FROM oauth_states WHERE state = ?')->execute([$state]);
    if (!$row || strtotime($row['expires_at']) < time()) {
        redirect_to($redirect . '?auth_error=state');
    }

    $code = (string) ($_GET['code'] ?? '');
    if ($code === '') {
        redirect_to($redirect . '?auth_error=code');
    }

    $tokens = GoogleOAuth::exchangeCode($code);
    $accessToken = $tokens['access_token'] ?? null;
    if (!is_string($accessToken)) {
        redirect_to($redirect . '?auth_error=token');
    }

    $info = GoogleOAuth::userinfo($accessToken);
    $email = strtolower(trim((string) ($info['email'] ?? '')));
    $verified = ($info['email_verified'] ?? false) === true || ($info['email_verified'] ?? '') === 'true';
    $sub = (string) ($info['sub'] ?? '');
    if ($email === '' || $sub === '' || !$verified) {
        redirect_to($redirect . '?auth_error=email');
    }

    $userId = upsert_user($sub, $email, isset($info['name']) ? (string) $info['name'] : null);
    resolve_membership($userId, $email);
    Session::create($userId);
    redirect_to($redirect);
}

function upsert_user(string $sub, string $email, ?string $name): string
{
    $stmt = db()->prepare('SELECT id FROM users WHERE google_sub = ?');
    $stmt->execute([$sub]);
    if ($row = $stmt->fetch()) {
        return $row['id'];
    }
    $stmt = db()->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($row = $stmt->fetch()) {
        db()->prepare('UPDATE users SET google_sub = ?, name = COALESCE(name, ?) WHERE id = ?')
            ->execute([$sub, $name, $row['id']]);
        return $row['id'];
    }
    $id = uuidv4();
    db()->prepare('INSERT INTO users (id, email, google_sub, name) VALUES (?, ?, ?, ?)')
        ->execute([$id, $email, $sub, $name]);
    return $id;
}

/** Détermine l'accès : membre existant, propriétaire initial, ou invitation. */
function resolve_membership(string $userId, string $email): void
{
    $stmt = db()->prepare('SELECT id FROM memberships WHERE group_id = ? AND user_id = ?');
    $stmt->execute([group_id(), $userId]);
    if ($stmt->fetch()) {
        return;
    }

    ensure_group();

    // Propriétaire initial : uniquement si le groupe n'a encore aucun membre.
    $stmt = db()->prepare('SELECT COUNT(*) AS c FROM memberships WHERE group_id = ?');
    $stmt->execute([group_id()]);
    $count = (int) $stmt->fetch()['c'];
    $ownerEmail = strtolower(trim((string) config('owner_email', '')));
    if ($count === 0 && $ownerEmail !== '' && $email === $ownerEmail) {
        db()->prepare('INSERT INTO memberships (id, group_id, user_id, role) VALUES (?, ?, ?, ?)')
            ->execute([uuidv4(), group_id(), $userId, 'owner']);
        return;
    }

    // Invitation en attente pour cet email ?
    $stmt = db()->prepare('SELECT id, role FROM invitations WHERE group_id = ? AND LOWER(email) = ?');
    $stmt->execute([group_id(), $email]);
    if ($inv = $stmt->fetch()) {
        db()->prepare('INSERT INTO memberships (id, group_id, user_id, role) VALUES (?, ?, ?, ?)')
            ->execute([uuidv4(), group_id(), $userId, $inv['role']]);
        db()->prepare('DELETE FROM invitations WHERE id = ?')->execute([$inv['id']]);
        return;
    }
    // Sinon : aucun accès (l'utilisateur existe mais n'est pas membre).
}

/**
 * Connexion DEV locale — contourne Google pour tester en local.
 * Sécurité : ne répond QUE si `dev.login_email` est défini dans la config ET
 * que la requête vient de localhost. En prod, cette clé est absente → 404.
 */
function auth_dev_login(): never
{
    $email = strtolower(trim((string) config('dev.login_email', '')));
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    if ($email === '' || !preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/', $host)) {
        json_response(['error' => 'not_found'], 404);
    }
    $userId = upsert_user('dev-' . md5($email), $email, 'Dev');
    resolve_membership($userId, $email);
    Session::create($userId);
    redirect_to((string) config('app.post_login_redirect', '/'));
}

function auth_me(): never
{
    $user = Auth::user();
    if ($user === null) {
        json_response(['user' => null, 'member' => null]);
    }
    json_response([
        'user'   => ['email' => $user['email'], 'name' => $user['name']],
        'member' => Auth::member(),
        'csrf'   => Auth::csrfToken(),
    ]);
}

function auth_logout(): never
{
    if (Session::currentUserId() !== null) {
        Auth::enforceCsrf();
    }
    Session::destroy();
    json_response(['ok' => true]);
}

// ---------------------------------------------------------------------------
// Groupe
// ---------------------------------------------------------------------------

function group_get(): never
{
    Auth::requireMember();
    ensure_group();
    $stmt = db()->prepare('SELECT id, name, default_tuning, logo, color_primary, onboarding_pct FROM app_group WHERE id = ?');
    $stmt->execute([group_id()]);
    json_response($stmt->fetch() ?: ['id' => group_id(), 'name' => config('group.name')]);
}

function group_update(): never
{
    Auth::requireAdmin();
    Auth::enforceCsrf();
    ensure_group();
    $b = read_json();
    $name = nullable_str($b['name'] ?? '', 255);
    if ($name === null) {
        json_response(['error' => 'name_required'], 422);
    }
    db()->prepare('UPDATE app_group SET name = ?, default_tuning = ?, color_primary = ? WHERE id = ?')
        ->execute([$name, nullable_str($b['default_tuning'] ?? '', 64), nullable_str($b['color_primary'] ?? '', 16), group_id()]);
    json_response(['ok' => true]);
}

// ---------------------------------------------------------------------------
// Membres & invitations
// ---------------------------------------------------------------------------

function members_list(): never
{
    Auth::requireMember();
    $stmt = db()->prepare(
        'SELECT m.user_id, u.email, u.name, m.role, m.profile_name
         FROM memberships m JOIN users u ON u.id = m.user_id
         WHERE m.group_id = ? ORDER BY m.joined_at'
    );
    $stmt->execute([group_id()]);
    $out = array_map(fn ($r) => [
        'uid'     => $r['user_id'],
        'email'   => $r['email'],
        'role'    => $r['role'],
        'profile' => ['name' => $r['profile_name'] ?? $r['name']],
    ], $stmt->fetchAll());
    json_response($out);
}

function members_invite(): never
{
    $actor = Auth::requireAdmin();
    Auth::enforceCsrf();
    $b = read_json();
    $email = strtolower(trim((string) ($b['email'] ?? '')));
    $role = ($b['role'] ?? 'member') === 'admin' ? 'admin' : 'member';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['error' => 'invalid_email'], 422);
    }
    db()->prepare(
        'INSERT INTO invitations (id, group_id, email, role, invited_by) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE role = VALUES(role)'
    )->execute([uuidv4(), group_id(), $email, $role, $actor['user_id']]);
    json_response(['ok' => true]);
}

function members_update(string $uid): never
{
    $actor = Auth::requireAdmin();
    Auth::enforceCsrf();
    $b = read_json();
    $newRole = $b['role'] ?? '';
    if (!in_array($newRole, ['owner', 'admin', 'member'], true)) {
        json_response(['error' => 'invalid_role'], 422);
    }
    $stmt = db()->prepare('SELECT role FROM memberships WHERE group_id = ? AND user_id = ?');
    $stmt->execute([group_id(), $uid]);
    $target = $stmt->fetch();
    if (!$target) {
        json_response(['error' => 'not_found'], 404);
    }
    // Protection du rôle owner : seul un owner peut toucher un owner ou en créer un.
    if (($target['role'] === 'owner' || $newRole === 'owner') && $actor['role'] !== 'owner') {
        json_response(['error' => 'forbidden'], 403);
    }
    db()->prepare('UPDATE memberships SET role = ? WHERE group_id = ? AND user_id = ?')
        ->execute([$newRole, group_id(), $uid]);
    json_response(['ok' => true]);
}

function members_remove(string $uid): never
{
    $actor = Auth::requireAdmin();
    Auth::enforceCsrf();
    if ($uid === $actor['user_id']) {
        json_response(['error' => 'cannot_remove_self'], 400);
    }
    $stmt = db()->prepare('SELECT role FROM memberships WHERE group_id = ? AND user_id = ?');
    $stmt->execute([group_id(), $uid]);
    $target = $stmt->fetch();
    if (!$target) {
        json_response(['error' => 'not_found'], 404);
    }
    if ($target['role'] === 'owner' && $actor['role'] !== 'owner') {
        json_response(['error' => 'forbidden'], 403);
    }
    db()->prepare('DELETE FROM memberships WHERE group_id = ? AND user_id = ?')->execute([group_id(), $uid]);
    json_response(['ok' => true]);
}

function invitations_list(): never
{
    Auth::requireAdmin();
    $stmt = db()->prepare('SELECT id, email, role FROM invitations WHERE group_id = ? ORDER BY created_at');
    $stmt->execute([group_id()]);
    json_response($stmt->fetchAll());
}

function invitations_remove(string $id): never
{
    Auth::requireAdmin();
    Auth::enforceCsrf();
    db()->prepare('DELETE FROM invitations WHERE id = ? AND group_id = ?')->execute([$id, group_id()]);
    json_response(['ok' => true]);
}

// ---------------------------------------------------------------------------
// Répertoire
// ---------------------------------------------------------------------------

const SONG_COLUMNS = [
    'title', 'artist', 'album', 'duration_sec', 'type',
    'mastery', 'tuning', 'music_key', 'bpm', 'cover', 'roles', 'watch',
];

function sanitize_song(array $b): array
{
    $out = [];
    if (array_key_exists('title', $b)) {
        $out['title'] = mb_substr(trim((string) $b['title']), 0, 255);
    }
    if (array_key_exists('artist', $b)) {
        $out['artist'] = nullable_str($b['artist'], 255);
    }
    if (array_key_exists('album', $b)) {
        $out['album'] = nullable_str($b['album'], 255);
    }
    if (array_key_exists('duration_sec', $b)) {
        $out['duration_sec'] = nullable_int($b['duration_sec']);
    }
    if (array_key_exists('type', $b)) {
        $out['type'] = $b['type'] === 'compo' ? 'compo' : 'reprise';
    }
    if (array_key_exists('mastery', $b)) {
        $out['mastery'] = max(0, min(5, (int) $b['mastery']));
    }
    if (array_key_exists('tuning', $b)) {
        $out['tuning'] = nullable_str($b['tuning'], 64);
    }
    if (array_key_exists('music_key', $b)) {
        $out['music_key'] = nullable_str($b['music_key'], 64);
    }
    if (array_key_exists('bpm', $b)) {
        $out['bpm'] = nullable_int($b['bpm']);
    }
    if (array_key_exists('cover', $b)) {
        $out['cover'] = nullable_str($b['cover'], 1024);
    }
    if (array_key_exists('roles', $b)) {
        $out['roles'] = ($s = trim((string) $b['roles'])) === '' ? null : $s;
    }
    if (array_key_exists('watch', $b)) {
        $out['watch'] = ($s = trim((string) $b['watch'])) === '' ? null : $s;
    }
    return $out;
}

function song_insert(array $fields): string
{
    $fields['type'] ??= 'reprise';
    $fields['mastery'] ??= 0;
    $id = uuidv4();
    $cols = array_keys($fields);
    $place = array_map(fn ($c) => ':' . $c, $cols);
    $sql = 'INSERT INTO songs (id, group_id, ' . implode(', ', $cols) . ')
            VALUES (:id, :group_id, ' . implode(', ', $place) . ')';
    $stmt = db()->prepare($sql);
    $stmt->execute(['id' => $id, 'group_id' => group_id()] + $fields);
    return $id;
}

function songs_list(): never
{
    Auth::requireMember();
    $stmt = db()->prepare('SELECT id, ' . implode(', ', SONG_COLUMNS) . ' FROM songs WHERE group_id = ? ORDER BY title');
    $stmt->execute([group_id()]);
    json_response($stmt->fetchAll());
}

function songs_create(): never
{
    Auth::requireMember();
    Auth::enforceCsrf();
    $fields = sanitize_song(read_json());
    if (empty($fields['title'])) {
        json_response(['error' => 'title_required'], 422);
    }
    json_response(['id' => song_insert($fields)], 201);
}

function songs_update(string $id): never
{
    Auth::requireMember();
    Auth::enforceCsrf();
    $fields = sanitize_song(read_json());
    if (!$fields) {
        json_response(['ok' => true]);
    }
    $set = implode(', ', array_map(fn ($c) => "$c = :$c", array_keys($fields)));
    $stmt = db()->prepare("UPDATE songs SET $set, updated_at = NOW() WHERE id = :id AND group_id = :group_id");
    $stmt->execute($fields + ['id' => $id, 'group_id' => group_id()]);
    json_response(['ok' => true]);
}

function songs_delete(string $id): never
{
    Auth::requireMember();
    Auth::enforceCsrf();
    db()->prepare('DELETE FROM songs WHERE id = ? AND group_id = ?')->execute([$id, group_id()]);
    json_response(['ok' => true]);
}

function songs_import(): never
{
    Auth::requireMember();
    Auth::enforceCsrf();
    $text = (string) (read_json()['text'] ?? '');
    $added = 0;
    $skipped = 0;
    foreach (preg_split('/\r\n|\r|\n/', $text) as $line) {
        $line = trim($line);
        if ($line === '') {
            continue;
        }
        $parts = array_map('trim', explode(';', $line));
        [$title, $artist, $tuning, $mastery, $album, $duration, $bpm, $key] = array_pad($parts, 8, '');
        if ($title === '') {
            $skipped++;
            continue;
        }
        song_insert(sanitize_song([
            'title'        => $title,
            'artist'       => $artist,
            'tuning'       => $tuning,
            'mastery'      => (int) $mastery,
            'album'        => $album,
            'duration_sec' => parse_duration($duration),
            'bpm'          => $bpm,
            'music_key'    => $key,
            'type'         => 'reprise',
        ]));
        $added++;
    }
    json_response(['added' => $added, 'skipped' => $skipped]);
}

// ---------------------------------------------------------------------------
// Routage
// ---------------------------------------------------------------------------

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$uri = rawurldecode($uri);
if (str_starts_with($uri, '/api')) {
    $uri = substr($uri, 4);
}
$uri = '/' . trim($uri, '/');

$routes = [
    ['GET',    '#^/auth/google$#',              'auth_google_start'],
    ['GET',    '#^/auth/google/callback$#',     'auth_google_callback'],
    ['GET',    '#^/auth/dev-login$#',           'auth_dev_login'],
    ['GET',    '#^/auth/me$#',                  'auth_me'],
    ['POST',   '#^/auth/logout$#',              'auth_logout'],

    ['GET',    '#^/group$#',                    'group_get'],
    ['PATCH',  '#^/group$#',                    'group_update'],

    ['GET',    '#^/members$#',                  'members_list'],
    ['POST',   '#^/members/invite$#',           'members_invite'],
    ['PATCH',  '#^/members/([^/]+)$#',          'members_update'],
    ['DELETE', '#^/members/([^/]+)$#',          'members_remove'],
    ['GET',    '#^/invitations$#',              'invitations_list'],
    ['DELETE', '#^/invitations/([^/]+)$#',      'invitations_remove'],

    ['GET',    '#^/songs$#',                    'songs_list'],
    ['POST',   '#^/songs$#',                    'songs_create'],
    ['POST',   '#^/songs/import$#',             'songs_import'],
    ['PATCH',  '#^/songs/([^/]+)$#',            'songs_update'],
    ['DELETE', '#^/songs/([^/]+)$#',            'songs_delete'],
];

try {
    foreach ($routes as [$m, $re, $fn]) {
        if ($m === $method && preg_match($re, $uri, $args)) {
            array_shift($args);
            $fn(...$args);
        }
    }
    json_response(['error' => 'not_found'], 404);
} catch (Throwable $e) {
    error_log('[kenata-api] ' . $e->getMessage());
    json_response(['error' => 'server_error'], 500);
}
