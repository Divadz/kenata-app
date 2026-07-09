import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useGroup } from '../features/group/useGroup';

export function HomePage() {
  const { member } = useAuth();
  const { meta } = useGroup();

  return (
    <section className="stack">
      <h2>Salut {member?.profile?.name || meta?.name || 'Kenata'} 🤘</h2>
      <div className="cards">
        <Link className="card link" to="/repertoire">
          Répertoire
        </Link>
        <Link className="card link" to="/setlists">
          Setlists
        </Link>
        <Link className="card link" to="/concerts">
          Concerts
        </Link>
        <div className="card muted">Booking (CRM) — à venir</div>
      </div>
    </section>
  );
}
