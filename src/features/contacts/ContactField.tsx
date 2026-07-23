import { useEffect, useState } from 'react';
import type { Contact } from '../../types/models';
import { ContactAutocomplete } from './ContactAutocomplete';
import { createContact, updateContact } from './useContacts';

interface Props {
  label: string;
  contacts: Contact[];
  /** contact_id lié, ou null. */
  value: string | null;
  /** Lie (ou délie) un contact au concert/lead. */
  onChange: (contactId: string | null) => void;
  /** Recharge le répertoire (après création/édition d'une fiche). */
  reloadDir: () => Promise<void> | void;
}

/**
 * Rôle de contact : sélection dans le répertoire (autocomplétion) + édition des
 * champs de la fiche liée (nom via le sélecteur ; note / tél / mail éditables —
 * la correction s'applique partout, car c'est une référence).
 */
export function ContactField({ label, contacts, value, onChange, reloadDir }: Props) {
  const selected = value ? contacts.find((c) => c.id === value) ?? null : null;
  const [note, setNote] = useState(selected?.notes ?? '');
  const [phone, setPhone] = useState(selected?.phone ?? '');
  const [email, setEmail] = useState(selected?.email ?? '');

  useEffect(() => {
    setNote(selected?.notes ?? '');
    setPhone(selected?.phone ?? '');
    setEmail(selected?.email ?? '');
  }, [selected?.id, selected?.notes, selected?.phone, selected?.email]);

  async function patchContact(patch: Partial<Contact>) {
    if (!selected) return;
    await updateContact(selected.id, patch);
    await reloadDir();
  }

  const picker = (
    <ContactAutocomplete
      contacts={contacts}
      value={value}
      placeholder={`${label} — nom`}
      ariaLabel={`${label} — nom`}
      onPick={(c) => onChange(c.id)}
      onClear={() => onChange(null)}
      onCreate={async (name) => {
        const c = await createContact({ name });
        await reloadDir();
        return c;
      }}
    />
  );

  return (
    <div className="field full">
      <span>{label}</span>
      {!selected ? (
        picker
      ) : (
        <>
          <div className="contact-2col">
            {picker}
            <input
              aria-label={`${label} — note`}
              placeholder="Note (entreprise, date…)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => note !== (selected.notes ?? '') && patchContact({ notes: note.trim() || null })}
            />
          </div>
          <div className="contact-2col">
            <div className="input-btn">
              <input
                className="grow"
                aria-label={`${label} — téléphone`}
                placeholder="Téléphone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => phone !== (selected.phone ?? '') && patchContact({ phone: phone.trim() || null })}
              />
              {phone.trim() ? (
                <a className="btn small icon-btn" href={`tel:${phone.replace(/\s/g, '')}`} aria-label={`Appeler ${label}`}>
                  📞
                </a>
              ) : (
                <button className="btn small icon-btn" disabled aria-label="Appeler">
                  📞
                </button>
              )}
            </div>
            <div className="input-btn">
              <input
                className="grow"
                type="email"
                aria-label={`${label} — email`}
                placeholder="Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => email !== (selected.email ?? '') && patchContact({ email: email.trim() || null })}
              />
              {email.trim() ? (
                <a className="btn small icon-btn" href={`mailto:${email.trim()}`} aria-label={`Écrire à ${label}`}>
                  ✉
                </a>
              ) : (
                <button className="btn small icon-btn" disabled aria-label="Écrire">
                  ✉
                </button>
              )}
            </div>
          </div>
          <p className="muted small">Modifier note / tél / mail met à jour ce contact partout.</p>
        </>
      )}
    </div>
  );
}
