import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { formatHM } from '../utils/duration';
import type { ConcertSummary, ContactInfo } from '../types/models';
import { countdownLabel, daysUntil, useConcerts } from '../features/concerts/useConcerts';

/** Contact à appeler : régie son en priorité, sinon organisateur (nom + numéro requis). */
function callContact(c: ConcertSummary): (ContactInfo & { role: string }) | null {
  const sound = c.contacts?.sound;
  if (sound?.name && sound?.phone) return { ...sound, role: 'Régie son' };
  const org = c.contacts?.org;
  if (org?.name && org?.phone) return { ...org, role: 'Orga' };
  return null;
}

function HomeConcertCard({ c }: { c: ConcertSummary }) {
  const dt = c.date ? new Date(c.date + 'T00:00:00') : null;
  const wd = dt ? dt.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '') : '';
  const day = dt ? String(dt.getDate()).padStart(2, '0') : '';
  const mon = dt ? dt.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') : '';
  const yr = dt && dt.getFullYear() !== new Date().getFullYear() ? String(dt.getFullYear()) : '';

  const d = daysUntil(c.date);
  const parts: string[] = [];
  if (d !== null && Math.abs(d) <= 15) parts.push(countdownLabel(c.date));
  if (c.start_time) parts.push(c.start_time);
  if (c.arrival_time) parts.push(`Arrivée à ${c.arrival_time}`);
  const countLine = parts.join(' · ');

  const navHref = c.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.address)}`
    : '';
  const call = callContact(c);

  return (
    <div className={`card ccard${c.is_option ? ' is-option' : ''}`}>
      <div className="ccard-top">
        <div className={`date-tile${dt ? '' : ' tbd'}`}>
          {dt ? (
            <>
              <span className="wd">{wd}</span>
              <span className="d">{day}</span>
              <span className="m">{mon}</span>
              {yr && <span className="y">{yr}</span>}
            </>
          ) : (
            <span className="d">?</span>
          )}
        </div>
        <div className="ccard-head">
          <Link className="ccard-venue link-plain" to={`/concerts/${c.id}`}>
            {c.venue_name || 'Sans titre'}
          </Link>
          <div className="ccard-badges">
            {c.is_option && <span className="badge option">option</span>}
            <span className={`badge ${c.visibility === 'private' ? 'priv' : 'pub'}`}>
              {c.visibility === 'private' ? 'privé' : 'public'}
            </span>
            {c.merch && <span className="badge merch">merch</span>}
          </div>
        </div>
      </div>

      {countLine && <div className="ccard-count">{countLine}</div>}

      {(c.target_duration_min || c.fee) && (
        <div className="ccard-data">
          {c.target_duration_min ? (
            <span>
              <span className="lbl">Durée</span> <span className="mono">{formatHM(c.target_duration_min * 60)}</span>
            </span>
          ) : null}
          {c.fee ? (
            <span>
              <span className="lbl">Cachet</span> <span className="mono">{c.fee}</span>
              {c.fee_guso && <span className="badge">GUSO</span>}
            </span>
          ) : null}
        </div>
      )}

      <div className="ccard-actions">
        {navHref ? (
          <a className="btn small" href={navHref} target="_blank" rel="noreferrer">
            📍 Y aller
          </a>
        ) : (
          <button className="btn small" disabled title="Pas d'adresse renseignée">
            📍 Y aller
          </button>
        )}
        {call && (
          <a className="btn small" href={`tel:${call.phone}`}>
            📞 {call.role} · {call.name}
          </a>
        )}
      </div>
    </div>
  );
}

export function HomePage() {
  const { member } = useAuth();
  const { concerts } = useConcerts();

  const ts = (c: ConcertSummary) => (c.date ? new Date(c.date + 'T00:00:00').getTime() : null);
  // Les 3 prochains concerts datés (aujourd'hui ou futur), par date croissante.
  const next = concerts
    .filter((c) => {
      const d = daysUntil(c.date);
      return d !== null && d >= 0;
    })
    .sort((a, b) => (ts(a) ?? 0) - (ts(b) ?? 0))
    .slice(0, 3);

  return (
    <section className="stack full">
      <h2 className="hello">Salut {member?.profile?.name || member?.profile?.nickname || 'toi'}</h2>

      {next.length > 0 && (
        <>
          <h3 className="full">Prochains concerts</h3>
          <div className="cards cards-3 full">
            {next.map((c) => (
              <HomeConcertCard key={c.id} c={c} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
