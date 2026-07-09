import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { GearItem } from '../../types/models';

export function useGearItems() {
  const [items, setItems] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    try {
      setItems(await api<GearItem[]>('/gear-items'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return { items, loading, reload };
}

export function createGearItem(label: string, defaultChecked = false) {
  return api<{ id: string }>('/gear-items', {
    method: 'POST',
    body: { label, default_checked: defaultChecked },
  });
}
export function updateGearItem(id: string, patch: { label?: string; default_checked?: boolean }) {
  return api(`/gear-items/${id}`, { method: 'PATCH', body: patch });
}
export function deleteGearItem(id: string) {
  return api(`/gear-items/${id}`, { method: 'DELETE' });
}
