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
import { reconcileOrder, type SectionKey } from '../features/concerts/sections';

interface SectionOrder {
  default: string[] | null;
  mine: string[] | null;
}
interface MeResponse {
  user: { email: string; name: string | null } | null;
  member: Member | null;
  csrf?: string;
  section_order?: SectionOrder;
}

interface AuthState {
  user: MeResponse['user'];
  member: Member | null;
  loading: boolean;
  isMember: boolean;
  isAdmin: boolean;
  /** Ordre effectif des sections de concert (override membre, sinon défaut groupe). */
  sectionOrder: SectionKey[];
  /** Valeurs brutes (pour l'écran Réglages). */
  sectionOrderRaw: SectionOrder;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  member: null,
  loading: true,
  isMember: false,
  isAdmin: false,
  sectionOrder: reconcileOrder(null),
  sectionOrderRaw: { default: null, mine: null },
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
      setMe({ user: data.user, member: data.member, section_order: data.section_order });
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
    const raw: SectionOrder = me.section_order ?? { default: null, mine: null };
    const sectionOrder = reconcileOrder(raw.mine ?? raw.default);
    return {
      user: me.user,
      member: me.member,
      loading,
      isMember,
      isAdmin,
      sectionOrder,
      sectionOrderRaw: raw,
      refresh,
      logout,
    };
  }, [me, loading, refresh, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
