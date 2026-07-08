import { useEffect, useState } from 'react';
import { onValue, push, remove, serverTimestamp, set, update } from 'firebase/database';
import { dbRef, paths } from '../../firebase/db';
import { useAuth } from '../../auth/AuthProvider';
import type { Invitation, Member, Role } from '../../types/models';

export interface MemberRow extends Member {
  uid: string;
}
export interface InvitationRow extends Invitation {
  id: string;
}

export function useMembers() {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);

  useEffect(() => {
    const unsubM = onValue(dbRef(paths.members()), (snap) => {
      const val = (snap.val() as Record<string, Member> | null) ?? {};
      setMembers(Object.entries(val).map(([uid, m]) => ({ uid, ...m })));
    });
    // La lecture des invitations est réservée aux admins par les règles ;
    // pour un non-admin, le callback d'erreur laisse simplement la liste vide.
    const unsubI = onValue(
      dbRef(paths.invitations()),
      (snap) => {
        const val = (snap.val() as Record<string, Invitation> | null) ?? {};
        setInvitations(Object.entries(val).map(([id, i]) => ({ id, ...i })));
      },
      () => setInvitations([])
    );
    return () => {
      unsubM();
      unsubI();
    };
  }, []);

  /** Invite un email (admin uniquement — appliqué par les règles). */
  function invite(email: string, role: Exclude<Role, 'owner'>) {
    const invitation: Invitation = {
      email: email.trim().toLowerCase(),
      role,
      invitedBy: user?.uid,
      createdAt: serverTimestamp() as unknown as number,
    };
    return push(dbRef(paths.invitations()), invitation);
  }

  function cancelInvitation(id: string) {
    return remove(dbRef(`${paths.invitations()}/${id}`));
  }

  function changeRole(uid: string, role: Role) {
    return update(dbRef(paths.member(uid)), { role });
  }

  function removeMember(uid: string) {
    return set(dbRef(paths.member(uid)), null);
  }

  return { members, invitations, invite, cancelInvitation, changeRole, removeMember };
}
