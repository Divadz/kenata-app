import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useGroup } from '../features/group/useGroup';
import { InstallButton } from './InstallButton';

export function AppShell() {
  const { member, logout } = useAuth();
  const { meta } = useGroup();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">{meta?.name || 'Kenata'} 🤘</div>
        <div className="spacer" />
        <span className="muted small">
          {member?.profile?.name || member?.email} · {member?.role}
        </span>
        <InstallButton />
        <button className="btn small" onClick={() => logout()}>
          Déconnexion
        </button>
      </header>

      <nav className="tabs">
        <NavLink to="/" end>
          Accueil
        </NavLink>
        <NavLink to="/repertoire">Répertoire</NavLink>
        <NavLink to="/setlists">Setlists</NavLink>
        <NavLink to="/concerts">Concerts</NavLink>
        <NavLink to="/members">Membres</NavLink>
        <NavLink to="/settings">Réglages</NavLink>
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
