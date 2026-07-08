import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { onValue } from 'firebase/database';
import { auth } from '../firebase/config';
import { dbRef, paths } from '../firebase/db';
import type { Member } from '../types/models';

interface AuthState {
  /** Utilisateur Firebase authentifié (ou null). */
  user: User | null;
  /** Appartenance au groupe (null si l'utilisateur n'est pas membre). */
  member: Member | null;
  /** true tant que l'état auth + appartenance n'est pas résolu. */
  loading: boolean;
  isMember: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  member: null,
  loading: true,
  isMember: false,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [memberResolved, setMemberResolved] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthResolved(true);
      if (!u) {
        setMember(null);
        setMemberResolved(true);
      } else {
        setMemberResolved(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    // Lecture de l'appartenance. Si l'utilisateur n'est pas membre, les règles
    // renvoient null (aucun accès) — géré par RequireMember.
    const unsub = onValue(
      dbRef(paths.member(user.uid)),
      (snap) => {
        setMember(snap.exists() ? (snap.val() as Member) : null);
        setMemberResolved(true);
      },
      () => {
        setMember(null);
        setMemberResolved(true);
      }
    );
    return unsub;
  }, [user]);

  const loading = !authResolved || (!!user && !memberResolved);
  const isMember = !!member?.role;
  const isAdmin = member?.role === 'owner' || member?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, member, loading, isMember, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
