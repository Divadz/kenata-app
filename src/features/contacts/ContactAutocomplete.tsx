import { useEffect, useRef, useState } from 'react';
import type { Contact } from '../../types/models';
import { normContact } from './useContacts';

interface Props {
  contacts: Contact[];
  /** contact_id sélectionné, ou null. */
  value: string | null;
  onPick: (contact: Contact) => void;
  onClear: () => void;
  /** Crée une fiche à partir d'un nom saisi ; renvoie la fiche créée. */
  onCreate: (name: string) => Promise<Contact>;
  placeholder?: string;
  ariaLabel?: string;
}

/** Sélecteur de contact avec autocomplétion sur le répertoire (nom → tél + mail). */
export function ContactAutocomplete({ contacts, value, onPick, onClear, onCreate, placeholder, ariaLabel }: Props) {
  const selected = value ? contacts.find((c) => c.id === value) ?? null : null;
  const [text, setText] = useState(selected?.name ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const focused = useRef(false);

  // Resynchronise l'affichage quand la sélection (ou le répertoire) change, hors saisie.
  useEffect(() => {
    if (!focused.current) setText(selected?.name ?? '');
  }, [value, selected?.name]);

  const q = normContact(text.trim());
  // Filtre sur nom + note (+ tél / mail) : taper « K5 » trouve le contact dont
  // la note contient « K5 ».
  const filtered = (
    q
      ? contacts.filter((c) =>
          normContact([c.name, c.notes, c.phone, c.email].filter(Boolean).join(' ')).includes(q)
        )
      : contacts
  ).slice(0, 8);
  const exact = contacts.some((c) => normContact(c.name) === q);
  const canCreate = text.trim().length > 0 && !exact;

  async function create() {
    const c = await onCreate(text.trim());
    setText(c.name);
    setOpen(false);
    onPick(c);
  }
  function pick(c: Contact) {
    setText(c.name);
    setOpen(false);
    onPick(c);
  }

  const rows = filtered.length + (canCreate ? 1 : 0);

  return (
    <div className="addr-ac">
      <div className="input-btn">
        <input
          className="grow"
          aria-label={ariaLabel}
          placeholder={placeholder ?? 'Nom du contact'}
          value={text}
          autoComplete="off"
          onFocus={() => {
            focused.current = true;
            setOpen(true);
          }}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onBlur={() => {
            focused.current = false;
            window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (!open || rows === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, rows - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && active >= 0) {
              e.preventDefault();
              if (active < filtered.length) pick(filtered[active]);
              else void create();
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        {value && (
          <button
            className="btn small icon-btn"
            aria-label="Retirer le contact"
            onMouseDown={(e) => {
              e.preventDefault();
              setText('');
              onClear();
            }}
          >
            ×
          </button>
        )}
      </div>
      {open && rows > 0 && (
        <ul className="addr-list">
          {filtered.map((c, i) => (
            <li
              key={c.id}
              className={i === active ? 'active' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
            >
              <span className="ct-name">{c.name}</span>
              {(c.phone || c.email) && (
                <span className="muted small">
                  {[c.phone, c.email].filter(Boolean).join(' · ')}
                </span>
              )}
              {c.notes && <span className="ct-note muted small">{c.notes}</span>}
            </li>
          ))}
          {canCreate && (
            <li
              className={active === filtered.length ? 'active' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              ＋ Créer « {text.trim()} »
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
