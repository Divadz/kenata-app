import { useEffect, useRef, useState, type ChangeEvent, type ReactElement } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  ConcertContacts,
  ConcertDetail,
  RoadmapItem,
  TicketLink,
} from '../../types/models';
import { DurationSelect } from '../../components/DurationSelect';
import { AddressAutocomplete } from '../../components/AddressAutocomplete';
import { ContactField } from '../contacts/ContactField';
import { useContacts } from '../contacts/useContacts';
import { PayModal, fullDate } from './PayModal';
import { useAuth } from '../../auth/AuthProvider';
import { useSetlists } from '../setlists/useSetlists';
import { useGearItems } from '../gear/useGearItems';
import type { SectionKey } from './sections';
import {
  countdownLabel,
  deleteConcert,
  duplicateConcert,
  getConcert,
  updateConcert,
  uploadPoster,
  useConcerts,
} from './useConcerts';

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
  const { sectionOrder } = useAuth();
  const { setlists } = useSetlists();
  const { items: gearItems } = useGearItems();
  const { concerts } = useConcerts();
  const { contacts: directory, reload: reloadDir } = useContacts();

  const [c, setC] = useState<ConcertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [posterMsg, setPosterMsg] = useState<string | null>(null);
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

  const contacts = c.contacts ?? {};
  // Lie (ou délie) un contact du répertoire à un rôle, puis sauvegarde.
  function setContactRef(role: Role, contactId: string | null) {
    setC((prev) => {
      if (!prev) return prev;
      const cs: ConcertContacts = { ...(prev.contacts ?? {}) };
      if (contactId) cs[role] = { contact_id: contactId };
      else delete cs[role];
      return { ...prev, contacts: cs };
    });
    // cRef est mis à jour au prochain rendu ; on sauvegarde la valeur explicitement.
    const next: ConcertContacts = { ...(cRef.current?.contacts ?? {}) };
    if (contactId) next[role] = { contact_id: contactId };
    else delete next[role];
    save({ contacts: next });
  }
  function setContractAddress(value: string) {
    setC((prev) => (prev ? { ...prev, contacts: { ...(prev.contacts ?? {}), contract_address: value } } : prev));
  }
  const saveContacts = () => save({ contacts: cRef.current?.contacts ?? null });

  function commitArr<K extends 'ticket_links' | 'roadmap' | 'gear_checklist'>(
    key: K,
    arr: ConcertDetail[K]
  ) {
    setField(key, arr);
    save({ [key]: arr } as Partial<ConcertDetail>);
  }

  // Tri des étapes par heure croissante ; les étapes sans heure restent en fin.
  const sortRoadmap = (arr: RoadmapItem[]): RoadmapItem[] =>
    [...arr].sort((a, b) => {
      const ta = a.time || '';
      const tb = b.time || '';
      if (ta === tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return ta < tb ? -1 : 1;
    });

  async function onPosterFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPosterMsg('Import…');
    try {
      const { url } = await uploadPoster(id, file);
      setField('poster_url', url);
      setPosterError(false);
      setPosterMsg('Image importée ✓');
    } catch {
      setPosterMsg('Échec de l’import (image trop lourde ou format non supporté).');
    } finally {
      e.target.value = '';
    }
  }

  const tickets = c.ticket_links ?? [];
  const roadmap = c.roadmap ?? [];
  const checkedGear = c.gear_checklist ?? [];
  const checkedLabels = gearItems.filter((g) => checkedGear.includes(g.id)).map((g) => g.label);

  const riderText = encodeURIComponent(`Rider ${c.venue_name || ''} : ${c.tech_sheet_url || ''}`);
  const orgEmail = contacts.org?.email;
  const mapsHref = c.maps_url
    || (c.address ? `https://www.google.com/maps/search/${encodeURIComponent(c.address)}` : '');
  const dateConflict = c.date ? concerts.find((x) => x.id !== id && x.date === c.date) : undefined;

  const essentiel = (
    <div className="card form full" key="essentiel">
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
        <div className="field">
          <div className="split2">
            <label className="field">
              <span>Heure de début</span>
              <input
                type="time"
                value={c.start_time ?? ''}
                onChange={(e) => {
                  setField('start_time', e.target.value || null);
                  save({ start_time: e.target.value || null });
                }}
              />
            </label>
            <label className="field">
              <span>Durée cible</span>
              <DurationSelect
                ariaLabel="Durée cible"
                value={c.target_duration_min}
                onChange={(v) => {
                  setField('target_duration_min', v);
                  save({ target_duration_min: v });
                }}
              />
            </label>
          </div>
        </div>
        <label className="field">
          <span>Heure d'arrivée</span>
          <input
            type="time"
            value={c.arrival_time ?? ''}
            onChange={(e) => {
              setField('arrival_time', e.target.value || null);
              save({ arrival_time: e.target.value || null });
            }}
          />
        </label>
        <div className="field">
          <span>Options</span>
          <div className="row" style={{ gap: '1rem' }}>
            <label className="row" style={{ gap: '0.3rem', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={!!c.is_option}
                onChange={(e) => {
                  setField('is_option', e.target.checked);
                  save({ is_option: e.target.checked });
                }}
              />{' '}
              Option
            </label>
            <label className="row" style={{ gap: '0.3rem', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={c.visibility === 'private'}
                onChange={(e) => {
                  const v = e.target.checked ? 'private' : 'public';
                  setField('visibility', v);
                  save({ visibility: v });
                }}
              />{' '}
              Privé
            </label>
            <label className="row" style={{ gap: '0.3rem', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={c.merch}
                onChange={(e) => {
                  setField('merch', e.target.checked);
                  save({ merch: e.target.checked });
                }}
              />{' '}
              Merchandising
            </label>
          </div>
        </div>
      </div>
      <p className="muted small">{countdownLabel(c.date)}</p>
      {dateConflict && (
        <p className="warn" role="alert">
          ⚠ Un concert existe déjà le{' '}
          {new Date(c.date + 'T00:00:00').toLocaleDateString('fr-FR')} : «{' '}
          {dateConflict.venue_name || 'Sans titre'} ». Saisis une autre date, ou{' '}
          <Link to={`/concerts/${dateConflict.id}`}>ouvre le concert existant</Link>.
        </p>
      )}
      {/* Rappels */}
      <p className="small">
        <span className="muted">Cachet :</span>{' '}
        {c.fee ? <strong>{c.fee}</strong> : <span className="muted">—</span>}
        {c.fee_guso && <span className="badge">GUSO</span>}
      </p>
      <div className="row" style={{ gap: '0.4rem' }}>
        <span className="muted small">Matos :</span>
        {checkedLabels.length ? (
          <div className="chips">
            {checkedLabels.map((l) => (
              <span key={l} className="chip on ro">
                {l}
              </span>
            ))}
          </div>
        ) : (
          <span className="muted small">aucun</span>
        )}
      </div>
    </div>
  );

  const sections: Record<SectionKey, ReactElement> = {
    notes: (
      <div className="card form full" key="notes">
        <h3>Notes</h3>
        <textarea
          rows={3}
          value={c.notes ?? ''}
          onChange={(e) => setField('notes', e.target.value)}
          onBlur={() => save({ notes: cRef.current?.notes ?? null })}
        />
      </div>
    ),

    affiche: (
      <div className="card form full" key="affiche">
        <h3>Affiche</h3>
        <div className="row">
          <label className="btn small" style={{ cursor: 'pointer' }}>
            📷 Importer une image
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onPosterFile} />
          </label>
          <input className="grow" placeholder="… ou coller une URL" {...t('poster_url')} />
        </div>
        {posterMsg && <span className="muted small">{posterMsg}</span>}
        {c.poster_url && (
          <div className="stack" style={{ gap: '0.4rem', alignItems: 'flex-start' }}>
            <img
              src={c.poster_url}
              alt="Affiche du concert"
              onError={() => setPosterError(true)}
              onLoad={() => setPosterError(false)}
              style={{ maxWidth: '220px', borderRadius: 8, display: posterError ? 'none' : 'block' }}
            />
            <a className="btn small" href={c.poster_url} target="_blank" rel="noreferrer">
              🔗 Ouvrir l'affiche
            </a>
            {posterError && (
              <span className="muted small">Aperçu indisponible — l'URL n'est pas une image affichable.</span>
            )}
          </div>
        )}
      </div>
    ),

    contacts: (
      <div className="card form full" key="contacts">
        <h3>Contacts</h3>
        <div className="stack full" style={{ gap: '0.75rem' }}>
          {ROLES.map((r) => (
            <ContactField
              key={r.id}
              label={r.label}
              contacts={directory}
              value={contacts[r.id]?.contact_id ?? null}
              onChange={(cid) => setContactRef(r.id, cid)}
              reloadDir={reloadDir}
            />
          ))}
          <label className="field full">
            <span>Adresse contrat</span>
            <textarea
              rows={3}
              placeholder="Raison sociale, adresse complète, SIRET… (servira à générer le contrat)"
              value={contacts.contract_address ?? ''}
              onChange={(e) => setContractAddress(e.target.value)}
              onBlur={saveContacts}
            />
          </label>
        </div>
      </div>
    ),

    rider: (
      <div className="card form full" key="rider">
        <h3>Fiche technique</h3>
        <div className="grid2">
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
            <span>Lien du rider</span>
            <input placeholder="https://drive…" {...t('tech_sheet_url')} />
          </label>
        </div>
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
    ),

    roadmap: (
      <div className="card form full" key="roadmap">
        <h3>Feuille de route</h3>
        <ul className="roadmap-list">
          {roadmap.map((r: RoadmapItem, i) => (
            <li key={i} className="roadmap-row">
              <input
                className="rm-time"
                aria-label="Heure"
                type="time"
                value={r.time ?? ''}
                onChange={(e) => setField('roadmap', patchAt(roadmap, i, { time: e.target.value }))}
                onBlur={() => commitArr('roadmap', sortRoadmap(cRef.current?.roadmap ?? []))}
              />
              <input
                className="rm-label"
                aria-label="Étape"
                placeholder="Balances, catering, set…"
                value={r.label ?? ''}
                onChange={(e) => setField('roadmap', patchAt(roadmap, i, { label: e.target.value }))}
                onBlur={() => save({ roadmap: cRef.current?.roadmap ?? [] })}
              />
              <button className="btn small icon-btn rm-del" aria-label="Retirer" onClick={() => commitArr('roadmap', roadmap.filter((_, x) => x !== i))}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button className="btn small" onClick={() => commitArr('roadmap', [...roadmap, { time: '', label: '' }])}>
          + Étape
        </button>
      </div>
    ),

    adresse: (
      <div className="card form full" key="adresse">
        <h3>Adresse &amp; conditions</h3>
        <div className="stack full" style={{ gap: '0.75rem' }}>
          <label className="field full">
            <span>Adresse</span>
            <div className="input-btn">
              <AddressAutocomplete
                className="grow"
                ariaLabel="Adresse"
                placeholder="Adresse de la salle"
                value={c.address ?? ''}
                onChange={(v) => setField('address', v)}
                onBlur={() => save({ address: cRef.current?.address ?? null })}
              />
              {mapsHref ? (
                <a className="btn small icon-btn" href={mapsHref} target="_blank" rel="noreferrer" aria-label="Ouvrir dans Maps">
                  📍
                </a>
              ) : (
                <button className="btn small icon-btn" disabled aria-label="Ouvrir dans Maps" title="Saisis une adresse pour activer le lien">
                  📍
                </button>
              )}
            </div>
          </label>
          <label className="field full">
            <span>Cachet</span>
            <div className="row">
              <input className="grow" placeholder="Montant / modalités" {...t('fee')} />
              <label className="row" style={{ gap: '0.3rem', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={c.fee_guso}
                  onChange={(e) => {
                    setField('fee_guso', e.target.checked);
                    save({ fee_guso: e.target.checked });
                  }}
                />{' '}
                GUSO
              </label>
              <label className="row" style={{ gap: '0.3rem', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={!!c.paid}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Demande la date de paiement avant de valider.
                      setPayOpen(true);
                    } else {
                      setField('paid', false);
                      setField('paid_date', null);
                      save({ paid: false, paid_date: null });
                    }
                  }}
                />{' '}
                {c.paid && c.paid_date ? `Payé le ${fullDate(c.paid_date)}` : 'Payé'}
              </label>
            </div>
          </label>
          <div className="grid2">
            <label className="field">
              <span>Loge / accès</span>
              <input placeholder="Loge…" {...t('greenroom')} />
            </label>
            <label className="field">
              <span>Repas prévu</span>
              <input placeholder="Catering…" {...t('catering')} />
            </label>
          </div>
          <div className="grid2">
            <label className="field">
              <span>Stationnement</span>
              <input placeholder="Parking…" {...t('parking')} />
            </label>
            <label className="field">
              <span>Hébergement</span>
              <input placeholder="Hôtel / nuit sur place" {...t('lodging')} />
            </label>
          </div>
        </div>
      </div>
    ),

    matos: (
      <div className="card form full" key="matos">
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
                  {g.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    ),

    billetterie: (
      <div className="card form full" key="billetterie">
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
    ),
  };

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

      {essentiel}
      {sectionOrder.map((k) => sections[k])}

      {payOpen && (
        <PayModal
          venueName={c.venue_name}
          date={c.date}
          onCancel={() => setPayOpen(false)}
          onConfirm={(date) => {
            setField('paid', true);
            setField('paid_date', date);
            save({ paid: true, paid_date: date });
            setPayOpen(false);
          }}
        />
      )}
    </section>
  );
}

/** Renvoie une copie du tableau avec l'élément i fusionné avec patch. */
function patchAt<T>(arr: T[], i: number, patch: Partial<T>): T[] {
  return arr.map((it, x) => (x === i ? { ...it, ...patch } : it));
}
