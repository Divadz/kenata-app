import { useState } from 'react';
import type { Contact } from '../../types/models';
import { createContact, deleteContact, normContact, updateContact, useContacts } from './useContacts';

export function ContactsPage() {
  const { contacts, loading, reload } = useContacts();
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!name.trim() || adding) return;
    setAdding(true);
    try {
      await createContact({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: note.trim() || null,
      });
      setName('');
      setPhone('');
      setEmail('');
      setNote('');
      await reload();
    } finally {
      setAdding(false);
    }
  }

  const q = normContact(query.trim());
  const filtered = q
    ? contacts.filter((c) => normContact([c.name, c.phone, c.email].filter(Boolean).join(' ')).includes(q))
    : contacts;

  return (
    <section className="stack full">
      <h2>Contacts</h2>
      <p className="muted small">
        Répertoire partagé. Une correction (numéro, mail) s'applique partout où le contact est
        utilisé (concerts, booking).
      </p>

      <div className="card form full">
        <h3>Nouveau contact</h3>
        <div className="stack full" style={{ gap: '0.6rem' }}>
          <div className="contact-grid">
            <input className="grow" placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="grow" placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="grow" type="email" placeholder="Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <input
            className="full"
            placeholder="Note (entreprise, date, contexte…)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="row full" style={{ justifyContent: 'flex-end' }}>
            <button className="btn primary" onClick={add} disabled={!name.trim() || adding}>
              {adding ? 'Ajout…' : '+ Ajouter'}
            </button>
          </div>
        </div>
      </div>

      {contacts.length > 0 && (
        <div className="search-bar full">
          <div className="search-field">
            <input
              type="search"
              placeholder="Rechercher un contact"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Rechercher un contact"
            />
            {query && (
              <button type="button" className="search-clear" aria-label="Vider la recherche" onClick={() => setQuery('')}>
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : contacts.length === 0 ? (
        <p className="muted">Aucun contact pour l'instant. Ajoute-en un ci-dessus.</p>
      ) : filtered.length === 0 ? (
        <p className="muted">Aucun contact ne correspond à « {query} ».</p>
      ) : (
        <div className="stack full" style={{ gap: '0.6rem' }}>
          {filtered.map((c) => (
            <ContactRow key={c.id} contact={c} onChanged={reload} />
          ))}
        </div>
      )}
    </section>
  );
}

function ContactRow({ contact, onChanged }: { contact: Contact; onChanged: () => void }) {
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone ?? '');
  const [email, setEmail] = useState(contact.email ?? '');
  const [note, setNote] = useState(contact.notes ?? '');
  const [confirmDel, setConfirmDel] = useState(false);

  async function save(patch: Partial<Contact>) {
    await updateContact(contact.id, patch);
  }

  return (
    <div className="card contact-card">
      <div className="contact-fields">
        <div className="contact-grid">
          <input
            className="grow"
            aria-label="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== contact.name && save({ name: name.trim() })}
          />
          <div className="input-btn">
            <input
              className="grow"
              aria-label="Téléphone"
              placeholder="Téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => phone !== (contact.phone ?? '') && save({ phone: phone.trim() || null })}
            />
            {phone.trim() ? (
              <a className="btn small icon-btn" href={`tel:${phone.replace(/\s/g, '')}`} aria-label="Appeler">
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
              aria-label="Mail"
              placeholder="Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => email !== (contact.email ?? '') && save({ email: email.trim() || null })}
            />
            {email.trim() ? (
              <a className="btn small icon-btn" href={`mailto:${email.trim()}`} aria-label="Écrire">
                ✉
              </a>
            ) : (
              <button className="btn small icon-btn" disabled aria-label="Écrire">
                ✉
              </button>
            )}
          </div>
        </div>
        <input
          aria-label="Note"
          placeholder="Note (entreprise, date, contexte…)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (contact.notes ?? '') && save({ notes: note.trim() || null })}
        />
      </div>
      <div className="contact-del">
        {confirmDel ? (
          <div className="contact-del-confirm">
            <button className="btn small danger" onClick={() => deleteContact(contact.id).then(onChanged)}>
              Oui
            </button>
            <button className="btn small" onClick={() => setConfirmDel(false)}>
              Non
            </button>
          </div>
        ) : (
          <button className="btn icon-btn" aria-label="Supprimer le contact" title="Supprimer" onClick={() => setConfirmDel(true)}>
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}
