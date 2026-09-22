import { useState } from 'react';
import type { ProposalStatus, ProposalVote, SongProposal } from '../../types/models';
import { useAuth } from '../../auth/AuthProvider';
import { ProposalModal } from './ProposalModal';
import { VOTES, listenLabel, tally, useProposals, voteProposal } from './useProposals';

const TABS: { id: ProposalStatus; label: string }[] = [
  { id: 'open', label: 'En cours' },
  { id: 'added', label: 'Ajoutées' },
  { id: 'dismissed', label: 'Écartées' },
];

export function ProposalsPage() {
  const [status, setStatus] = useState<ProposalStatus>('open');
  const { items, counts, loading, reload } = useProposals(status);
  // undefined = fermée, null = nouvelle proposition, sinon id ouvert.
  const [open, setOpen] = useState<string | null | undefined>(undefined);

  return (
    <section className="stack full">
      <div className="row between full">
        <h2>Propositions</h2>
        <button className="btn primary" onClick={() => setOpen(null)}>
          + Proposer un morceau
        </button>
      </div>

      <div className="tabs-inline">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={status === t.id}
            className={`tab ${status === t.id ? 'active' : ''}`}
            onClick={() => setStatus(t.id)}
          >
            {t.label} <span className="mono">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="muted">
          {status === 'open'
            ? 'Aucune proposition en cours. Un morceau à reprendre ? Propose-le au groupe !'
            : status === 'added'
              ? 'Aucune proposition ajoutée au répertoire pour l’instant.'
              : 'Aucune proposition écartée.'}
        </p>
      ) : (
        <ul className="prop-list full">
          {items.map((p) => (
            <ProposalCard key={p.id} p={p} onOpen={() => setOpen(p.id)} onVoted={reload} />
          ))}
        </ul>
      )}

      {open !== undefined && (
        <ProposalModal proposalId={open} onClose={() => setOpen(undefined)} onSaved={reload} />
      )}
    </section>
  );
}

function ProposalCard({ p, onOpen, onVoted }: { p: SongProposal; onOpen: () => void; onVoted: () => void }) {
  const { member } = useAuth();
  const [busy, setBusy] = useState(false);
  const myVote = p.votes.find((v) => v.user_id === member?.user_id)?.vote;
  const t = tally(p);

  async function vote(v: ProposalVote) {
    setBusy(true);
    try {
      await voteProposal(p.id, myVote === v ? null : v);
      onVoted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="card prop-card clickable" onClick={onOpen}>
      <div className="prop-card-head">
        {p.cover && (
          <img
            className="song-thumb"
            src={p.cover}
            alt=""
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="prop-card-txt">
          <div className="song-title">
            {p.title}
            {p.status === 'open' && !myVote && <span className="badge">à voter</span>}
          </div>
          {p.artist && <div className="muted small">{p.artist}</div>}
          <div className="muted small">par {p.proposed_by_name ?? 'un ancien membre'}</div>
        </div>
        {p.listen_url && (
          <a
            className="btn small listen-btn"
            href={p.listen_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            ▶ {listenLabel(p.listen_url)}
          </a>
        )}
      </div>

      <div className="prop-card-foot" onClick={(e) => e.stopPropagation()}>
        <div className="vote-bar">
          {VOTES.map((v) =>
            p.status === 'open' ? (
              <button
                key={v.id}
                type="button"
                className={`vote-btn v-${v.id} ${myVote === v.id ? 'active' : ''}`}
                aria-pressed={myVote === v.id}
                aria-label={`${v.label} (${t[v.id]})`}
                disabled={busy}
                onClick={() => void vote(v.id)}
              >
                {v.icon} <span className="mono">{t[v.id]}</span>
              </button>
            ) : (
              <span key={v.id} className="vote-count" aria-label={`${v.label} : ${t[v.id]}`}>
                {v.icon} <span className="mono">{t[v.id]}</span>
              </span>
            )
          )}
        </div>
        <button type="button" className="btn small" onClick={onOpen} aria-label={`${p.comment_count} commentaire(s)`}>
          💬 {p.comment_count}
        </button>
      </div>
    </li>
  );
}
