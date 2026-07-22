import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useGroup } from '../features/group/useGroup';
import { InstallPrompt } from './InstallPrompt';

export function AppShell() {
  const { meta } = useGroup();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">{meta?.name || 'Kenata'} 🤘</div>
        <div className="spacer" />
        <button
          className="burger"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <nav className={`tabs${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)}>
          <NavLink to="/" end>
            Accueil
          </NavLink>
          <NavLink to="/repertoire">Répertoire</NavLink>
          <NavLink to="/setlists">Setlists</NavLink>
          <NavLink to="/concerts">Concerts</NavLink>
          <NavLink to="/booking">Booking</NavLink>
          <NavLink to="/members">Membres</NavLink>
          <NavLink to="/settings">Réglages</NavLink>
        </nav>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <InstallPrompt />
    </div>
  );
}
