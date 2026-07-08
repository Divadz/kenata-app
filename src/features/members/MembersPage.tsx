import { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { useMembers } from './useMembers';
import type { Role } from '../../types/models';

export function MembersPage() {
  const { isAdmin, member: me } = useAuth();
  const { members, invitations, invite, cancelInvitation, changeRole, removeMember } = useMembers();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<Role, 'owner'>>('member');
  const [error, setError] = useState<string | null>(null);

  async function onInvite() {
    setError(null);
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setError('Email invalide.');
      return;
    }
    try {
      await invite(value, role);
      setEmail('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="stack">
      <h2>Membres</h2>

      <table className="table">
        <thead>
          <tr>
            <th>Membre</th>
            <th>Email</th>
            <th>Rôle</th>
            {isAdmin && <th></th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.uid}>
              <td>{m.profile?.name || '—'}</td>
              <td>{m.email}</td>
              <td>
                {isAdmin && m.role !== 'owner' ? (
                  <select
                    aria-label={`Rôle de ${m.email}`}
                    value={m.role}
                    onChange={(e) => changeRole(m.uid, e.target.value as Role)}
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                ) : (
                  m.role
                )}
              </td>
              {isAdmin && (
                <td>
                  {m.role !== 'owner' && m.email !== me?.email && (
                    <button className="btn small danger" onClick={() => removeMember(m.uid)}>
                      Retirer
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {isAdmin && (
        <div className="stack">
          <h3>Inviter un membre</h3>
          <div className="row">
            <input
              type="email"
              aria-label="Email à inviter"
              autoComplete="off"
              spellCheck={false}
              placeholder="email@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              aria-label="Rôle de l'invité"
              value={role}
              onChange={(e) => setRole(e.target.value as Exclude<Role, 'owner'>)}
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button className="btn primary" onClick={onInvite}>
              Inviter
            </button>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {invitations.length > 0 && (
            <>
              <h3>Invitations en attente</h3>
              <ul className="list">
                {invitations.map((i) => (
                  <li key={i.id}>
                    <span>
                      {i.email} — <em>{i.role}</em>
                    </span>
                    <button className="btn small" onClick={() => cancelInvitation(i.id)}>
                      Annuler
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="muted">
            L'accès est créé automatiquement à la première connexion Google de l'invité (email
            correspondant). Aucun accès n'est possible sans invitation.
          </p>
        </div>
      )}
    </section>
  );
}
