<?php
declare(strict_types=1);

/**
 * Envoi d'e-mails via SMTP (Gmail), en PHP natif — STARTTLS + AUTH LOGIN.
 * Config attendue : smtp.host, smtp.port, smtp.user, smtp.pass, smtp.from,
 * smtp.from_name, smtp.reply_to. Pas de dépendance externe.
 */
final class Mailer
{
    /**
     * @param array<int,array{name:string,type:string,data:string}> $attachments
     * @return array{0:bool,1:?string} [succès, message d'erreur éventuel]
     */
    public static function send(string $to, string $subject, string $html, ?string $text = null, array $attachments = []): array
    {
        $host     = (string) config('smtp.host', 'smtp.gmail.com');
        $port     = (int) config('smtp.port', 587);
        $user     = (string) config('smtp.user', '');
        $pass     = (string) config('smtp.pass', '');
        $from     = (string) config('smtp.from', $user);
        $fromName = (string) config('smtp.from_name', 'Kenata');
        $replyTo  = (string) config('smtp.reply_to', $from);

        if ($user === '' || $pass === '') {
            return [false, 'smtp_not_configured'];
        }
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return [false, 'invalid_recipient'];
        }
        if ($text === null) {
            $text = trim(html_entity_decode(
                strip_tags(preg_replace('#<br\s*/?>|</p>#i', "\n", $html)),
                ENT_QUOTES,
                'UTF-8'
            ));
        }

        $fp = @stream_socket_client("tcp://$host:$port", $errno, $errstr, 15);
        if (!$fp) {
            return [false, "connexion SMTP: $errstr"];
        }
        stream_set_timeout($fp, 15);

        $read = static function () use ($fp): string {
            $data = '';
            while (($line = fgets($fp, 515)) !== false) {
                $data .= $line;
                if (strlen($line) < 4 || $line[3] === ' ') {
                    break;
                }
            }
            return $data;
        };

        try {
            $expect = static function (string $r, string $code): void {
                if (strncmp($r, $code, strlen($code)) !== 0) {
                    throw new RuntimeException("SMTP: attendu $code, reçu " . trim($r));
                }
            };
            $cmd = static function (string $c, string $code) use ($fp, $read, $expect): void {
                fwrite($fp, $c . "\r\n");
                $expect($read(), $code);
            };

            $expect($read(), '220');
            $ehlo = 'EHLO ' . (gethostname() ?: 'kenata');
            $cmd($ehlo, '250');
            $cmd('STARTTLS', '220');
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                fclose($fp);
                return [false, 'tls_failed'];
            }
            $cmd($ehlo, '250');
            $cmd('AUTH LOGIN', '334');
            $cmd(base64_encode($user), '334');
            $cmd(base64_encode($pass), '235');
            $cmd('MAIL FROM:<' . $from . '>', '250');
            $cmd('RCPT TO:<' . $to . '>', '250');
            $cmd('DATA', '354');

            $enc = static fn (string $s): string => '=?UTF-8?B?' . base64_encode($s) . '?=';
            // Corps texte + HTML (multipart/alternative).
            $altBoundary = 'alt_' . bin2hex(random_bytes(8));
            $part = static fn (string $type, string $content): string =>
                "--$altBoundary\r\nContent-Type: $type; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: base64\r\n\r\n"
                . chunk_split(base64_encode($content)) . "\r\n";
            $alt = $part('text/plain', $text) . $part('text/html', $html) . "--$altBoundary--\r\n";

            if ($attachments) {
                // multipart/mixed = corps alternatif + pièces jointes.
                $mixBoundary = 'mix_' . bin2hex(random_bytes(8));
                $contentType = 'multipart/mixed; boundary="' . $mixBoundary . '"';
                $body = "--$mixBoundary\r\n"
                    . 'Content-Type: multipart/alternative; boundary="' . $altBoundary . "\"\r\n\r\n"
                    . $alt;
                foreach ($attachments as $a) {
                    $name = str_replace('"', '', (string) $a['name']);
                    $body .= "--$mixBoundary\r\n"
                        . 'Content-Type: ' . $a['type'] . '; name="' . $name . "\"\r\n"
                        . "Content-Transfer-Encoding: base64\r\n"
                        . 'Content-Disposition: attachment; filename="' . $name . "\"\r\n\r\n"
                        . chunk_split(base64_encode((string) $a['data'])) . "\r\n";
                }
                $body .= "--$mixBoundary--\r\n";
            } else {
                $contentType = 'multipart/alternative; boundary="' . $altBoundary . '"';
                $body = $alt;
            }

            $headers = implode("\r\n", [
                'Date: ' . date('r'),
                'From: ' . $enc($fromName) . ' <' . $from . '>',
                'To: <' . $to . '>',
                'Reply-To: <' . $replyTo . '>',
                'Subject: ' . $enc($subject),
                'MIME-Version: 1.0',
                'Content-Type: ' . $contentType,
            ]);
            $message = $headers . "\r\n\r\n" . $body;
            // Dot-stuffing (défensif ; les corps base64 n'en contiennent pas).
            $message = preg_replace('/^\./m', '..', $message);

            fwrite($fp, $message . "\r\n.\r\n");
            $r = $read();
            fwrite($fp, "QUIT\r\n");
            fclose($fp);
            if (strncmp($r, '250', 3) !== 0) {
                return [false, 'envoi refusé: ' . trim($r)];
            }
            return [true, null];
        } catch (Throwable $e) {
            if (is_resource($fp)) {
                fclose($fp);
            }
            return [false, $e->getMessage()];
        }
    }
}
