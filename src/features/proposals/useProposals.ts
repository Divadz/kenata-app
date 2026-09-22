import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { ProposalStatus, ProposalVote, SongProposal } from '../../types/models';

type Counts = Record<ProposalStatus, number>;

export function useProposals(status: ProposalStatus) {
  const [items, setItems] = useState<SongProposal[]>([]);
  const [counts, setCounts] = useState<Counts>({ open: 0, added: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const data = await api<{ items: SongProposal[]; counts: Counts }>(`/proposals?status=${status}`);
      setItems(data.items);
      setCounts(data.counts);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  return { items, counts, loading, reload };
}

export function getProposal(id: string) {
  return api<SongProposal>(`/proposals/${id}`);
}
export function createProposal(patch: Partial<SongProposal>) {
  return api<{ id: string }>('/proposals', { method: 'POST', body: patch });
}
export function updateProposal(id: string, patch: Partial<SongProposal>) {
  return api(`/proposals/${id}`, { method: 'PATCH', body: patch });
}
export function deleteProposal(id: string) {
  return api(`/proposals/${id}`, { method: 'DELETE' });
}
/** vote = null retire le vote du membre courant. */
export function voteProposal(id: string, vote: ProposalVote | null) {
  return api(`/proposals/${id}/vote`, { method: 'PUT', body: { vote } });
}
export function setProposalStatus(id: string, status: 'open' | 'dismissed') {
  return api(`/proposals/${id}/status`, { method: 'POST', body: { status } });
}
export function addProposalToRepertoire(id: string) {
  return api<{ song_id: string; existing: boolean }>(`/proposals/${id}/add`, { method: 'POST' });
}
export function addComment(id: string, body: string) {
  return api<{ id: string }>(`/proposals/${id}/comments`, { method: 'POST', body: { body } });
}
export function deleteComment(id: string, cid: string) {
  return api(`/proposals/${id}/comments/${cid}`, { method: 'DELETE' });
}

export const VOTES: { id: ProposalVote; icon: string; label: string }[] = [
  { id: 'pour', icon: '👍', label: 'Pour' },
  { id: 'bof', icon: '😐', label: 'Bof' },
  { id: 'contre', icon: '👎', label: 'Contre' },
];

export function tally(p: SongProposal): Record<ProposalVote, number> {
  const t = { pour: 0, bof: 0, contre: 0 };
  for (const v of p.votes) t[v.vote]++;
  return t;
}

/** Lien d'écoute : libellé de la plateforme reconnue. */
export function listenLabel(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('youtu')) return 'YouTube';
  if (u.includes('spotify')) return 'Spotify';
  if (u.includes('deezer')) return 'Deezer';
  if (u.includes('apple.com')) return 'Apple Music';
  if (u.includes('soundcloud')) return 'SoundCloud';
  if (u.includes('bandcamp')) return 'Bandcamp';
  return 'Écouter';
}
