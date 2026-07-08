import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Role } from '../../types/models';

export interface MemberRow {
  uid: string;
  email: string;
  role: Role;
  profile?: { name?: string | null };
}
export interface InvitationRow {
  id: string;
  email: string;
  role: Exclude<Role, 'owner'>;
}

export function useMembers() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);

  async function reload() {
    setMembers(await api<MemberRow[]>('/members'));
    // Réservé aux admins côté serveur : un 403 laisse la liste vide.
    try {
      setInvitations(await api<InvitationRow[]>('/invitations'));
    } catch {
      setInvitations([]);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  function invite(email: string, role: Exclude<Role, 'owner'>) {
    return api('/members/invite', { method: 'POST', body: { email, role } }).then(reload);
  }
  function cancelInvitation(id: string) {
    return api(`/invitations/${id}`, { method: 'DELETE' }).then(reload);
  }
  function changeRole(uid: string, role: Role) {
    return api(`/members/${uid}`, { method: 'PATCH', body: { role } }).then(reload);
  }
  function removeMember(uid: string) {
    return api(`/members/${uid}`, { method: 'DELETE' }).then(reload);
  }

  return { members, invitations, invite, cancelInvitation, changeRole, removeMember };
}
