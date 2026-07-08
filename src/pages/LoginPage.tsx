const ERRORS: Record<string, string> = {
  denied: 'Connexion annulée.',
  state: 'Session expirée, réessaie.',
  code: 'Échec de la connexion.',
  token: 'Échec de la connexion.',
  email: 'Adresse e-mail non vérifiée ou indisponible.',
};

export function LoginPage() {
  const error = new URLSearchParams(window.location.search).get('auth_error');

  return (
    <div className="center">
      <div className="card auth-card">
        <h1 className="logo">Kenata 🤘</h1>
        <p className="muted">Espace de gestion du groupe. Accès sur invitation.</p>
        <a className="btn primary" href="/api/auth/google">
          Se connecter avec Google
        </a>
        {import.meta.env.DEV && (
          <a className="btn small" href="/api/auth/dev-login">
            Connexion dev (local)
          </a>
        )}
        {error && (
          <p className="error" role="alert">
            {ERRORS[error] ?? 'Erreur de connexion.'}
          </p>
        )}
      </div>
    </div>
  );
}
