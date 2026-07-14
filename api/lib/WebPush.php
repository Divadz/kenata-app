<?php
declare(strict_types=1);

/**
 * Envoi de notifications Web Push en PHP natif.
 * VAPID (RFC 8292, ES256) + chiffrement du payload aes128gcm (RFC 8291/8188).
 * Aucune dépendance ; utilise openssl + hash_hkdf.
 */
final class WebPush
{
    /** Chemin openssl.cnf optionnel (dev Windows) ; null en prod. */
    public static ?string $opensslConf = null;

    private static function b64uDecode(string $s): string
    {
        return base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4));
    }
    private static function b64uEncode(string $s): string
    {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    }

    /** Clé publique EC P-256 (OpenSSL) depuis un point brut de 65 octets. */
    private static function publicKeyFromPoint(string $point): \OpenSSLAsymmetricKey|false
    {
        $der = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $point;
        $pem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
        return openssl_pkey_get_public($pem);
    }

    /** Signature ECDSA DER → R||S brut (64 octets) pour ES256. */
    private static function derToRaw(string $der): string
    {
        $off = 3;
        $rlen = ord($der[$off]);
        $off++;
        $r = substr($der, $off, $rlen);
        $off += $rlen + 1; // saute R et le marqueur 0x02
        $slen = ord($der[$off]);
        $off++;
        $s = substr($der, $off, $slen);
        $r = ltrim($r, "\0");
        $s = ltrim($s, "\0");
        return str_pad($r, 32, "\0", STR_PAD_LEFT) . str_pad($s, 32, "\0", STR_PAD_LEFT);
    }

    /** En-tête Authorization VAPID pour l'origine de l'endpoint. */
    private static function vapidHeader(string $endpoint): ?string
    {
        $pub = (string) config('vapid.public', '');
        $privPem = (string) config('vapid.private_pem', '');
        $subject = (string) config('vapid.subject', 'mailto:contact@kenata.fr');
        if ($pub === '' || $privPem === '') {
            return null;
        }
        $u = parse_url($endpoint);
        $aud = ($u['scheme'] ?? 'https') . '://' . ($u['host'] ?? '');
        $header = self::b64uEncode((string) json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
        $payload = self::b64uEncode((string) json_encode(['aud' => $aud, 'exp' => time() + 12 * 3600, 'sub' => $subject]));
        $input = $header . '.' . $payload;
        $pk = openssl_pkey_get_private($privPem);
        $der = '';
        openssl_sign($input, $der, $pk, OPENSSL_ALGO_SHA256);
        $jwt = $input . '.' . self::b64uEncode(self::derToRaw($der));
        return "Authorization: vapid t=$jwt, k=$pub";
    }

    /** Chiffre le payload pour un abonnement (aes128gcm). Renvoie le corps binaire. */
    private static function encrypt(string $p256dh, string $authSecret, string $payload): ?string
    {
        $clientPub = self::b64uDecode($p256dh);
        $auth = self::b64uDecode($authSecret);

        $opts = ['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC];
        if (self::$opensslConf) {
            $opts['config'] = self::$opensslConf;
        }
        $server = openssl_pkey_new($opts);
        if (!$server) {
            return null;
        }
        $d = openssl_pkey_get_details($server);
        $serverPub = "\x04"
            . str_pad($d['ec']['x'], 32, "\0", STR_PAD_LEFT)
            . str_pad($d['ec']['y'], 32, "\0", STR_PAD_LEFT);

        $clientKey = self::publicKeyFromPoint($clientPub);
        if ($clientKey === false) {
            return null;
        }
        $shared = openssl_pkey_derive($clientKey, $server, 32);
        if ($shared === false) {
            return null;
        }

        // RFC 8291 : IKM combinant le secret d'auth.
        $ikm = hash_hkdf('sha256', $shared, 32, "WebPush: info\0" . $clientPub . $serverPub, $auth);
        // RFC 8188 : CEK + NONCE dérivés d'un salt aléatoire.
        $salt = random_bytes(16);
        $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $salt);
        $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $salt);

        $tag = '';
        $cipher = openssl_encrypt($payload . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
        if ($cipher === false) {
            return null;
        }
        // En-tête RFC 8188 : salt(16) | rs(4) | idlen(1) | keyid(serverPub) | ciphertext+tag
        return $salt . pack('N', 4096) . chr(strlen($serverPub)) . $serverPub . $cipher . $tag;
    }

    /**
     * Envoie une notification. $payload = tableau (title, body, url…).
     * @return array{0:int,1:string} [statut HTTP (201 = ok), corps/erreur]
     */
    public static function send(string $endpoint, string $p256dh, string $auth, array $payload, int $ttl = 2419200): array
    {
        $body = self::encrypt($p256dh, $auth, (string) json_encode($payload, JSON_UNESCAPED_UNICODE));
        if ($body === null) {
            return [0, 'encrypt_failed'];
        }
        $vapid = self::vapidHeader($endpoint);
        if ($vapid === null) {
            return [0, 'vapid_not_configured'];
        }
        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_HTTPHEADER     => [$vapid, 'Content-Type: application/octet-stream', 'Content-Encoding: aes128gcm', 'TTL: ' . $ttl],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
        ]);
        $resp = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($resp === false) {
            return [0, 'curl: ' . $err];
        }
        return [$status, is_string($resp) ? $resp : ''];
    }
}
