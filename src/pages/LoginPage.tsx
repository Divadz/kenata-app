import { useState } from 'react';
import { loginWithGoogle } from '../firebase/auth';

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onGoogle() {
    setError(null);
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center">
      <div className="card auth-card">
        <h1>Kenata 🤘</h1>
        <p className="muted">Espace de gestion du groupe. Accès sur invitation.</p>
        <button className="btn primary" onClick={onGoogle} disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter avec Google'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
