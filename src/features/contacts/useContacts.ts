import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Contact } from '../../types/models';

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setContacts(await api<Contact[]>('/contacts'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { contacts, loading, reload };
}

export function createContact(body: Partial<Contact>) {
  return api<Contact>('/contacts', { method: 'POST', body });
}
export function updateContact(id: string, patch: Partial<Contact>) {
  return api(`/contacts/${id}`, { method: 'PATCH', body: patch });
}
export function deleteContact(id: string) {
  return api(`/contacts/${id}`, { method: 'DELETE' });
}

/** Normalise pour une recherche insensible aux accents et à la casse. */
export function normContact(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
