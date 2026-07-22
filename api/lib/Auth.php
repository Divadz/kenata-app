<?php
declare(strict_types=1);

/**
 * Utilisateur/appartenance courants + gardes d'autorisation + protection CSRF.
 */
final class Auth
{
    public static function user(): ?array
    {
        $uid = Session::currentUserId();
        if ($uid === null) {
            return null;
        }
        $stmt = db()->prepare('SELECT id, email, name, google_sub FROM users WHERE id = ?');
        $stmt->execute([$uid]);
        return $stmt->fetch() ?: null;
    }

    /** Renvoie l'appartenance (role + profil) de l'utilisateur courant au groupe, ou null. */
    public static function member(): ?array
    {
        $user = self::user();
        if ($user === null) {
            return null;
        }
        $stmt = db()->prepare(
            'SELECT role, profile_name, profile_instrument FROM memberships WHERE group_id = ? AND user_id = ?'
        );
        $stmt->execute([group_id(), $user['id']]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        return [
            'user_id' => $user['id'],
            'email'   => $user['email'],
            'role'    => $row['role'],
            'profile' => [
                // À défaut de nom de profil saisi, on retombe sur le nom du compte Google.
                'name'       => $row['profile_name'] ?? $user['name'],
                'instrument' => $row['profile_instrument'],
            ],
        ];
    }

    public static function requireMember(): array
    {
        $member = self::member();
        if ($member === null) {
            json_response(['error' => 'forbidden'], 403);
        }
        return $member;
    }

    public static function requireAdmin(): array
    {
        $member = self::requireMember();
        if (!in_array($member['role'], ['owner', 'admin'], true)) {
            json_response(['error' => 'forbidden'], 403);
        }
        return $member;
    }

    /**
     * Jeton CSRF = HMAC(secret, jeton de session). Impossible à forger sans le secret
     * serveur, et illisible pour un attaquant (cookie httpOnly + SameSite + CORS).
     * Le client le reçoit via /api/auth/me et le renvoie en en-tête X-CSRF-Token.
     */
    public static function csrfToken(): string
    {
        $sessionToken = Session::token();
        if ($sessionToken === '') {
            return '';
        }
        return hash_hmac('sha256', $sessionToken, (string) config('security.app_secret'));
    }

    public static function enforceCsrf(): void
    {
        $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $expected = self::csrfToken();
        if ($expected === '' || !hash_equals($expected, $header)) {
            json_response(['error' => 'csrf'], 403);
        }
    }
}
