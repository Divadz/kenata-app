import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

interface Stats {
  songs: number;
  setlists: number;
  concerts: number;
  gear_items: number;
  members: number;
}

const DISMISS_KEY = 'kenata_onboarding_dismissed';

function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function Onboarding() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  useEffect(() => {
    api<Stats>('/stats').then(setStats).catch(() => {});
  }, []);

  if (dismissed || !stats) return null;

  const steps = [
    { label: 'Ajoute tes premiers morceaux', done: stats.songs > 0, to: '/repertoire' },
    { label: 'Compose une setlist', done: stats.setlists > 0, to: '/setlists' },
    { label: 'Programme un concert', done: stats.concerts > 0, to: '/concerts' },
    { label: 'Renseigne ton matos', done: stats.gear_items > 0, to: '/settings' },
    { label: 'Invite un membre du groupe', done: stats.members > 1, to: '/members' },
    { label: "Installe l'app sur ton téléphone", done: isInstalled(), to: null },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="card full">
      <div className="row between">
        <h3>Prends Kenata en main</h3>
        <button
          className="chip-x"
          aria-label="Masquer le guide"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setDismissed(true);
          }}
        >
          ×
        </button>
      </div>
      <div className="gauge ok" style={{ margin: '0.3rem 0 0.75rem' }}>
        <div className="gauge-bar" style={{ width: `${pct}%` }} />
        <span className="gauge-label mono">
          {doneCount}/{steps.length}
        </span>
      </div>
      <ul className="onboard-list">
        {steps.map((s, i) => (
          <li key={i} className={s.done ? 'done' : ''}>
            <span className="onboard-check">{s.done ? '☑' : '☐'}</span>
            {s.to && !s.done ? <Link to={s.to}>{s.label}</Link> : <span>{s.label}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
