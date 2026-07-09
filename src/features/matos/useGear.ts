import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { GearTemplate, GearTemplateItem } from '../../types/models';

export function useGear() {
  const [templates, setTemplates] = useState<GearTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    try {
      setTemplates(await api<GearTemplate[]>('/gear-templates'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return { templates, loading, reload };
}

export function createTemplate(name: string) {
  return api<{ id: string }>('/gear-templates', { method: 'POST', body: { name, items: [] } });
}
export function updateTemplate(id: string, patch: { name?: string; items?: GearTemplateItem[] }) {
  return api(`/gear-templates/${id}`, { method: 'PATCH', body: patch });
}
export function deleteTemplate(id: string) {
  return api(`/gear-templates/${id}`, { method: 'DELETE' });
}
