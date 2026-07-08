import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { GroupMeta } from '../../types/models';

export function useGroup() {
  const [meta, setMeta] = useState<GroupMeta | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    try {
      setMeta(await api<GroupMeta>('/group'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  /** Mise à jour partielle (réservée aux admins côté serveur). */
  async function updateMeta(patch: Partial<GroupMeta>) {
    await api('/group', { method: 'PATCH', body: patch });
    await reload();
  }

  return { meta, loading, updateMeta, reload };
}
