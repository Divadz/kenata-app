<?php
declare(strict_types=1);

/**
 * Flow OAuth 2.0 Authorization Code avec Google, implémenté en PHP natif (cURL).
 * Aucune bibliothèque tierce.
 */
final class GoogleOAuth
{
    public static function authUrl(string $state): string
    {
        $params = http_build_query([
            'client_id'     => config('google.client_id'),
            'redirect_uri'  => config('google.redirect_uri'),
            'response_type' => 'code',
            'scope'         => 'openid email profile',
            'state'         => $state,
            'access_type'   => 'online',
            'prompt'        => 'select_account',
        ]);
        return 'https://accounts.google.com/o/oauth2/v2/auth?' . $params;
    }

    /** Échange le code d'autorisation contre les jetons. */
    public static function exchangeCode(string $code): array
    {
        return self::httpPost('https://oauth2.googleapis.com/token', [
            'code'          => $code,
            'client_id'     => config('google.client_id'),
            'client_secret' => config('google.client_secret'),
            'redirect_uri'  => config('google.redirect_uri'),
            'grant_type'    => 'authorization_code',
        ]);
    }

    /** Récupère le profil (sub, email, email_verified, name). */
    public static function userinfo(string $accessToken): array
    {
        $ch = curl_init('https://openidconnect.googleapis.com/v1/userinfo');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $accessToken],
            CURLOPT_TIMEOUT        => 10,
        ]);
        $out = curl_exec($ch);
        curl_close($ch);
        $data = is_string($out) ? json_decode($out, true) : null;
        return is_array($data) ? $data : [];
    }

    private static function httpPost(string $url, array $data): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($data),
            CURLOPT_TIMEOUT        => 10,
        ]);
        $out = curl_exec($ch);
        curl_close($ch);
        $decoded = is_string($out) ? json_decode($out, true) : null;
        return is_array($decoded) ? $decoded : [];
    }
}
