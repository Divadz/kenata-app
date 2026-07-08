import { useAuth } from '../auth/AuthProvider';

export function NoAccessPage() {
  const { user, logout } = useAuth();
  return (
    <div className="center">
      <div className="card auth-card">
        <h1>Accès non autorisé</h1>
        <p className="muted">
          Le compte <strong>{user?.email}</strong> n'est pas membre du groupe. L'accès se fait
          uniquement sur invitation d'un administrateur.
        </p>
        <button className="btn" onClick={() => logout()}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
