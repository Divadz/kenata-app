<?php
declare(strict_types=1);

// Amorçage : chargement de la config, PDO, helpers. Aucune dépendance externe.

// La config est cherchée d'abord HORS de la racine web (recommandé), puis dans api/.
$configCandidates = [
    __DIR__ . '/../../kenata-config.php', // hors webroot (idéal)
    __DIR__ . '/../config.php',           // à côté de api/
    __DIR__ . '/config.php',              // dans api/ (fallback)
];
$loaded = null;
foreach ($configCandidates as $candidate) {
    if (is_file($candidate)) {
        $loaded = require $candidate;
        break;
    }
}
if (!is_array($loaded)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'server_misconfigured']);
    exit;
}

// Clés d'API tierces (ex. GetSongBPM) dans un fichier séparé, déployable sans
// toucher au config.php de secrets. Optionnel ; fusionné par-dessus la config.
$keysCandidates = [
    __DIR__ . '/../../kenata-keys.php',
    __DIR__ . '/../config.keys.php',
    __DIR__ . '/config.keys.php',
];
foreach ($keysCandidates as $candidate) {
    if (is_file($candidate)) {
        $extra = require $candidate;
        if (is_array($extra)) {
            $loaded = array_replace_recursive($loaded, $extra);
        }
        break;
    }
}

$GLOBALS['kenata_config'] = $loaded;

function config(string $path, mixed $default = null): mixed
{
    $node = $GLOBALS['kenata_config'];
    foreach (explode('.', $path) as $part) {
        if (is_array($node) && array_key_exists($part, $node)) {
            $node = $node[$part];
        } else {
            return $default;
        }
    }
    return $node;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=utf8mb4',
            config('db.host'),
            config('db.name')
        );
        $pdo = new PDO($dsn, (string) config('db.user'), (string) config('db.pass'), [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

function group_id(): string
{
    return (string) config('group.id', 'kenata');
}

function uuidv4(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

function json_response(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
