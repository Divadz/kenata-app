<?php
declare(strict_types=1);

/**
 * Sessions serveur. Le cookie contient un jeton aléatoire ; on ne stocke que son
 * SHA-256 en base (un vol de base ne permet pas de rejouer les sessions).
 * Cookie : httpOnly + Secure + SameSite=Lax (Lax laisse passer le retour OAuth GET).
 */
final class Session
{
    public const COOKIE = 'kn_session';

    public static function currentUserId(): ?string
    {
        $token = $_COOKIE[self::COOKIE] ?? '';
        if ($token === '') {
            return null;
        }
        $stmt = db()->prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?');
        $stmt->execute([hash('sha256', $token)]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        if (strtotime($row['expires_at']) < time()) {
            self::destroy();
            return null;
        }
        return $row['user_id'];
    }

    public static function create(string $userId): void
    {
        $token = bin2hex(random_bytes(32));
        $ttlDays = (int) config('session.ttl_days', 30);
        $expiresAt = (new DateTimeImmutable("+{$ttlDays} days"))->format('Y-m-d H:i:s');
        db()->prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
            ->execute([hash('sha256', $token), $userId, $expiresAt]);
        self::setCookie($token, time() + $ttlDays * 86400);
    }

    public static function destroy(): void
    {
        $token = $_COOKIE[self::COOKIE] ?? '';
        if ($token !== '') {
            db()->prepare('DELETE FROM sessions WHERE id = ?')->execute([hash('sha256', $token)]);
        }
        self::setCookie('', time() - 3600);
    }

    public static function token(): string
    {
        return $_COOKIE[self::COOKIE] ?? '';
    }

    private static function setCookie(string $value, int $expires): void
    {
        setcookie(self::COOKIE, $value, [
            'expires'  => $expires,
            'path'     => '/',
            // En prod : true (HTTPS). En dev local HTTP : mettre session.secure=false.
            'secure'   => (bool) config('session.secure', true),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}
