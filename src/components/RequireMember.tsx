import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { LoginPage } from '../pages/LoginPage';
import { NoAccessPage } from '../pages/NoAccessPage';

/**
 * Garde d'accès :
 *  - pas connecté        -> page de connexion
 *  - connecté, non membre -> page "accès refusé" (pas d'invitation)
 *  - membre               -> contenu protégé
 */
export function RequireMember({ children }: { children: ReactNode }) {
  const { user, isMember, loading } = useAuth();

  if (loading) {
    return <div className="center muted">Chargement…</div>;
  }
  if (!user) {
    return <LoginPage />;
  }
  if (!isMember) {
    return <NoAccessPage />;
  }
  return <>{children}</>;
}
