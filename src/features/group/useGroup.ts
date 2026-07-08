import { useEffect, useState } from 'react';
import { onValue, update } from 'firebase/database';
import { dbRef, paths } from '../../firebase/db';
import type { GroupMeta } from '../../types/models';

export function useGroup() {
  const [meta, setMeta] = useState<GroupMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onValue(dbRef(paths.meta()), (snap) => {
      setMeta(snap.exists() ? (snap.val() as GroupMeta) : null);
      setLoading(false);
    });
  }, []);

  /** Mise à jour partielle (réservée aux admins par les règles Firebase). */
  function updateMeta(patch: Partial<GroupMeta>) {
    return update(dbRef(paths.meta()), patch);
  }

  return { meta, loading, updateMeta };
}
