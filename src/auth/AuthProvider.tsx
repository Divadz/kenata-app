import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setCsrfToken } from '../api/client';
import type { Member } from '../types/models';

interface MeResponse {
  user: { email: string; name: string | null } | null;
  member: Member | null;
  csrf?: string;
}

interface AuthState {
  user: MeResponse['user'];
  member: Member | null;
  loading: boolean;
  isMember: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  member: null,
  loading: true,
  isMember: false,
  isAdmin: false,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse>({ user: null, member: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<MeResponse>('/auth/me');
      setCsrfToken(data.csrf ?? '');
      setMe({ user: data.user, member: data.member });
    } catch {
      setCsrfToken('');
      setMe({ user: null, member: null });
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthState>(() => {
    const isMember = !!me.member?.role;
    const isAdmin = me.member?.role === 'owner' || me.member?.role === 'admin';
    return { user: me.user, member: me.member, loading, isMember, isAdmin, refresh, logout };
  }, [me, loading, refresh, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
