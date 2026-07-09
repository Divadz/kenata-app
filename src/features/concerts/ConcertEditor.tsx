import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  ConcertContacts,
  ConcertDetail,
  ContactInfo,
  RoadmapItem,
  TicketLink,
} from '../../types/models';
import { formatDuration } from '../../utils/duration';
import { useSetlists } from '../setlists/useSetlists';
import { useGearItems } from '../gear/useGearItems';
import { countdownLabel, deleteConcert, duplicateConcert, getConcert, updateConcert } from './useConcerts';

type StrKey =
  | 'venue_name' | 'poster_url' | 'tech_sheet_url' | 'address' | 'maps_url'
  | 'parking' | 'greenroom' | 'catering' | 'fee' | 'lodging';
type Role = 'org' | 'sound' | 'light';
const ROLES: { id: Role; label: string }[] = [
  { id: 'org', label: 'Organisateur' },
  { id: 'sound', label: 'Régie son' },
  { id: 'light', label: 'Lumière' },
];

export function ConcertEditor() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { setlists } = useSetlists();
  const { items: gearItems } = useGearItems();

  const [c, setC] = useState<ConcertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cRef = useRef<ConcertDetail | null>(null);
  cRef.current = c;

  useEffect(() => {
    getConcert(id)
      .then(setC)
      .finally(() => setLoading(false));
  }, [id]);

  function save(patch: Partial<ConcertDetail>) {
    updateConcert(id, patch)
      .then(() => setSaved('Enregistré ✓'))
      .catch(() => setSaved('Erreur d’enregistrement'));
  }
  function setField<K extends keyof ConcertDetail>(k: K, v: ConcertDetail[K]) {
    setC((prev) => (prev ? { ...prev, [k]: v } : prev));
  }

  if (loading || !c) return <p className="muted">Chargement…</p>;

  // Champ texte : édition locale, sauvegarde au blur.
  const t = (key: StrKey) => ({
    value: (c[key] as string | null) ?? '',
    onChange: (e: ChangeEvent<HTMLInputElement>) => setField(key, e.target.value),
    onBlur: () => save({ [key]: (cRef.current?.[key] ?? null) } as Partial<ConcertDetail>),
  });

  // Contacts (objet imbriqué)
  const contacts = c.contacts ?? {};
  function setContact(role: Role, field: keyof ContactInfo, value: string) {
    setC((prev) => {
      if (!prev) return prev;
      const cs: ConcertContacts = { ...(prev.contacts ?? {}) };
      cs[role] = { ...(cs[role] ?? {}), [field]: value };
      return { ...prev, contacts: cs };
    });
  }
  const saveContacts = () => save({ contacts: cRef.current?.contacts ?? null });

  // Helpers génériques pour les listes JSON
  function commitArr<K extends 'ticket_links' | 'roadmap' | 'gear_checklist'>(
    key: K,
    arr: ConcertDetail[K]
  ) {
    setField(key, arr);
    save({ [key]: arr } as Partial<ConcertDetail>);
  }

  const tickets = c.ticket_links ?? [];
  const roadmap = c.roadmap ?? [];
  const checkedGear = c.gear_checklist ?? [];

  // Durée : comparaison setlist vs cible
  const selected = setlists.find((s) => s.id === c.setlist_id);
  const setlistSec = selected ? Number(selected.total_sec) || 0 : 0;
  const targetSec = (c.target_duration_min ?? 0) * 60;
  const durState = !targetSec || !setlistSec
    ? ''
    : setlistSec > targetSec * 1.05
      ? 'over'
      : setlistSec < targetSec * 0.9
        ? 'under'
        : 'ok';

  const riderText = encodeURIComponent(`Rider ${c.venue_name || ''} : ${c.tech_sheet_url || ''}`);
  const orgEmail = contacts.org?.email;

  return (
    <section className="stack full">
      <div className="row between full">
        <Link className="btn small" to="/concerts">
          ← Concerts
        </Link>
        <span className="row">
          {saved && <span className="muted small">{saved}</span>}
          <button
            className="btn small"
            onClick={async () => {
              const { id: nid } = await duplicateConcert(id);
              navigate(`/concerts/${nid}`);
            }}
          >
            Dupliquer
          </button>
          <button
            className="btn small danger"
            onClick={async () => {
              if (confirmDelete) {
                await deleteConcert(id);
                navigate('/concerts');
              } else {
                setConfirmDelete(true);
              }
            }}
          >
            {confirmDelete ? 'Confirmer' : 'Supprimer'}
          </button>
        </span>
      </div>

      {/* Essentiel */}
      <div className="card form full">
        <h3>Essentiel</h3>
        <div className="grid2">
          <label className="field">
            <span>Salle / événement</span>
            <input placeholder="Nom du lieu…" {...t('venue_name')} />
          </label>
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={c.date ?? ''}
              onChange={(e) => {
                setField('date', e.target.value || null);
                save({ date: e.target.value || null });
              }}
            />
          </label>
          <label className="field">
            <span>Durée cible (min)</span>
            <input
              type="number"
              min="0"
              value={c.target_duration_min ?? ''}
              onChange={(e) =>
                setField('target_duration_min', e.target.value ? parseInt(e.target.value, 10) : null)
              }
              onBlur={() => save({ target_duration_min: cRef.current?.target_duration_min ?? null })}
            />
          </label>
          <label className="field">
            <span>Setlist</span>
            <select
              value={c.setlist_id ?? ''}
              onChange={(e) => {
                const v = e.target.value || null;
                setField('setlist_id', v);
                save({ setlist_id: v });
              }}
            >
              <option value="">— aucune —</option>
              {setlists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Visibilité</span>
            <select
              value={c.visibility}
              onChange={(e) => {
                const v = e.target.value as 'public' | 'private';
                setField('visibility', v);
                save({ visibility: v });
              }}
            >
              <option value="private">Privé</option>
              <option value="public">Public</option>
            </select>
          </label>
          <label className="field" style={{ justifyContent: 'flex-end' }}>
            <span>
              <input
                type="checkbox"
                checked={c.on_site}
                onChange={(e) => {
                  setField('on_site', e.target.checked);
                  save({ on_site: e.target.checked });
                }}
              />{' '}
              On joue sur place
            </span>
          </label>
        </div>
        <p className="muted small">{countdownLabel(c.date)}</p>
        {selected && (
          <p className={`small ${durState === 'over' || durState === 'under' ? 'warn' : 'muted'}`}>
            Setlist : <span className="mono">{formatDuration(setlistSec) || '0:00'}</span>
            {targetSec ? ` / ${c.target_duration_min} min` : ''}
            {durState === 'over' && ' · dépasse le créneau'}
            {durState === 'under' && ' · plus court que le créneau'}
            {durState === 'ok' && ' · dans le créneau ✓'}
          </p>
        )}
      </div>

      {/* Affiche */}
      <div className="card form full">
        <h3>Affiche</h3>
        <label className="field">
          <span>URL de l'affiche</span>
          <input placeholder="https://…" {...t('poster_url')} />
        </label>
        {c.poster_url && (
          <img src={c.poster_url} alt="Affiche du concert" style={{ maxWidth: '220px', borderRadius: 8 }} />
        )}
      </div>

      {/* Billetterie & promo */}
      <div className="card form full">
        <h3>Billetterie &amp; promo</h3>
        <ul className="list">
          {tickets.map((tk: TicketLink, i) => (
            <li key={i}>
              <input
                aria-label="Libellé"
                placeholder="Libellé"
                value={tk.label ?? ''}
                onChange={(e) => setField('ticket_links', patchAt(tickets, i, { label: e.target.value }))}
                onBlur={() => save({ ticket_links: cRef.current?.ticket_links ?? [] })}
              />
              <input
                aria-label="Lien"
                placeholder="https://…"
                value={tk.url ?? ''}
                onChange={(e) => setField('ticket_links', patchAt(tickets, i, { url: e.target.value }))}
                onBlur={() => save({ ticket_links: cRef.current?.ticket_links ?? [] })}
              />
              <button className="btn small" aria-label="Retirer" onClick={() => commitArr('ticket_links', tickets.filter((_, x) => x !== i))}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button className="btn small" onClick={() => commitArr('ticket_links', [...tickets, { label: '', url: '' }])}>
          + Lien
        </button>
      </div>

      {/* Contacts : une ligne par rôle */}
      <div className="card form full">
        <h3>Contacts</h3>
        <div className="stack full" style={{ gap: '0.75rem' }}>
          {ROLES.map((r) => {
            const phone = contacts[r.id]?.phone ?? '';
            const email = contacts[r.id]?.email ?? '';
            return (
              <div key={r.id} className="field full">
                <span>{r.label}</span>
                <div className="row full">
                  <input
                    className="grow"
                    aria-label={`${r.label} — nom`}
                    placeholder="Nom"
                    value={contacts[r.id]?.name ?? ''}
                    onChange={(e) => setContact(r.id, 'name', e.target.value)}
                    onBlur={saveContacts}
                  />
                  <input
                    className="grow"
                    aria-label={`${r.label} — téléphone`}
                    placeholder="Téléphone"
                    value={phone}
                    onChange={(e) => setContact(r.id, 'phone', e.target.value)}
                    onBlur={saveContacts}
                  />
                  {phone.trim() ? (
                    <a className="btn small" href={`tel:${phone.replace(/\s/g, '')}`} aria-label={`Appeler ${r.label}`}>
                      📞
                    </a>
                  ) : (
                    <button className="btn small" disabled aria-label="Appeler">
                      📞
                    </button>
                  )}
                  <input
                    className="grow"
                    type="email"
                    aria-label={`${r.label} — email`}
                    placeholder="Mail"
                    value={email}
                    onChange={(e) => setContact(r.id, 'email', e.target.value)}
                    onBlur={saveContacts}
                  />
                  {email.trim() ? (
                    <a className="btn small" href={`mailto:${email.trim()}`} aria-label={`Écrire à ${r.label}`}>
                      ✉
                    </a>
                  ) : (
                    <button className="btn small" disabled aria-label="Écrire un mail">
                      ✉
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fiche technique */}
      <div className="card form full">
        <h3>Fiche technique (rider)</h3>
        <label className="field">
          <span>Lien du rider</span>
          <input placeholder="https://drive…" {...t('tech_sheet_url')} />
        </label>
        {c.tech_sheet_url && (
          <div className="row">
            <a className="btn small" href={`mailto:${orgEmail ?? ''}?subject=Rider&body=${riderText}`}>
              Envoyer par email
            </a>
            <a className="btn small" href={`https://wa.me/?text=${riderText}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* Lieu & accès */}
      <div className="card form full">
        <h3>Lieu &amp; accès</h3>
        <div className="grid2">
          <label className="field">
            <span>Adresse</span>
            <input placeholder="Adresse de la salle" {...t('address')} />
          </label>
          <label className="field">
            <span>Lien Google Maps</span>
            <input placeholder="https://maps…" {...t('maps_url')} />
          </label>
          <label className="field">
            <span>Stationnement</span>
            <input placeholder="Parking…" {...t('parking')} />
          </label>
        </div>
        {(c.maps_url || c.address) && (
          <a
            className="btn small"
            href={c.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(c.address ?? '')}`}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir dans Maps
          </a>
        )}
      </div>

      {/* Loge & catering + cachet/hébergement */}
      <div className="card form full">
        <h3>Loge, catering &amp; conditions</h3>
        <div className="grid2">
          <label className="field">
            <span>Loge / accès</span>
            <input placeholder="Loge…" {...t('greenroom')} />
          </label>
          <label className="field">
            <span>Repas prévu</span>
            <input placeholder="Catering…" {...t('catering')} />
          </label>
          <label className="field">
            <span>Cachet</span>
            <input placeholder="Montant / modalités" {...t('fee')} />
          </label>
          <label className="field">
            <span>Hébergement</span>
            <input placeholder="Hôtel / nuit sur place" {...t('lodging')} />
          </label>
        </div>
      </div>

      {/* Feuille de route */}
      <div className="card form full">
        <h3>Feuille de route</h3>
        <ul className="list">
          {roadmap.map((r: RoadmapItem, i) => (
            <li key={i}>
              <input
                aria-label="Heure"
                type="time"
                value={r.time ?? ''}
                onChange={(e) => setField('roadmap', patchAt(roadmap, i, { time: e.target.value }))}
                onBlur={() => save({ roadmap: cRef.current?.roadmap ?? [] })}
              />
              <input
                aria-label="Étape"
                placeholder="Balances, catering, set…"
                value={r.label ?? ''}
                onChange={(e) => setField('roadmap', patchAt(roadmap, i, { label: e.target.value }))}
                onBlur={() => save({ roadmap: cRef.current?.roadmap ?? [] })}
              />
              <button className="btn small" aria-label="Retirer" onClick={() => commitArr('roadmap', roadmap.filter((_, x) => x !== i))}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button className="btn small" onClick={() => commitArr('roadmap', [...roadmap, { time: '', label: '' }])}>
          + Étape
        </button>
      </div>

      {/* Checklist matos : chips cochables issues de l'inventaire */}
      <div className="card form full">
        <h3>Checklist matos</h3>
        {gearItems.length === 0 ? (
          <p className="muted small">
            Aucun élément. Ajoute ton matos dans <Link to="/settings">Réglages</Link>.
          </p>
        ) : (
          <div className="chips">
            {gearItems.map((g) => {
              const on = checkedGear.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  className={`chip ${on ? 'on' : ''}`}
                  aria-pressed={on}
                  onClick={() =>
                    commitArr(
                      'gear_checklist',
                      on ? checkedGear.filter((x) => x !== g.id) : [...checkedGear, g.id]
                    )
                  }
                >
                  {on ? '☑' : '☐'} {g.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="card form full">
        <h3>Notes</h3>
        <textarea
          rows={3}
          value={c.notes ?? ''}
          onChange={(e) => setField('notes', e.target.value)}
          onBlur={() => save({ notes: cRef.current?.notes ?? null })}
        />
      </div>
    </section>
  );
}

/** Renvoie une copie du tableau avec l'élément i fusionné avec patch. */
function patchAt<T>(arr: T[], i: number, patch: Partial<T>): T[] {
  return arr.map((it, x) => (x === i ? { ...it, ...patch } : it));
}
