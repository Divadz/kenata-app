import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProposalVote, SongProposal } from '../../types/models';
import { useAuth } from '../../auth/AuthProvider';
import { formatDuration, parseDuration } from '../../utils/duration';
import { KEYS } from '../repertoire/constants';
import { MetadataImport } from '../repertoire/MetadataImport';
import {
  VOTES,
  addComment,
  addProposalToRepertoire,
  createProposal,
  deleteComment,
  deleteProposal,
  getProposal,
  listenLabel,
  setProposalStatus,
  tally,
  updateProposal,
  voteProposal,
} from './useProposals';

interface Props {
  /** null = nouvelle proposition. */
  proposalId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  title: string;
  artist: string;
  album: string;
  duration: string;
  music_key: string;
  bpm: string;
  cover: string;
  listen_url: string;
  pitch: string;
}

const EMPTY: FormState = {
  title: '', artist: '', album: '', duration: '', music_key: '', bpm: '', cover: '', listen_url: '', pitch: '',
};

function toForm(p: SongProposal): FormState {
  return {
    title: p.title,
    artist: p.artist ?? '',
    album: p.album ?? '',
    duration: formatDuration(p.duration_sec ?? undefined),
    music_key: p.music_key ?? '',
    bpm: p.bpm ? String(p.bpm) : '',
    cover: p.cover ?? '',
    listen_url: p.listen_url ?? '',
    pitch: p.pitch ?? '',
  };
}

const isHttpUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

/** "2026-09-22 20:15:00" -> "22/09/2026". */
function frDate(s: string | null): string {
  if (!s) return '';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function ProposalModal({ proposalId, onClose, onSaved }: Props) {
  const { member, isAdmin } = useAuth();
  const [prop, setProp] = useState<SongProposal | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editing, setEditing] = useState(proposalId === null);
  const [comment, setComment] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isNew = proposalId === null;
  const canEdit = isNew || (!!prop && (prop.proposed_by === member?.user_id || isAdmin));

  async function load() {
    if (!proposalId) return;
    const p = await getProposal(proposalId);
    setProp(p);
    setForm(toForm(p));
  }

  useEffect(() => {
    void load().catch(() => setError('Impossible de charger la proposition.'));
  }, [proposalId]);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  /** Exécute une action serveur puis recharge fiche + liste. */
  async function run(fn: () => Promise<unknown>, after?: () => void) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      onSaved();
      if (after) after();
      else await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    setError(null);
    if (!form.title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    if (form.listen_url.trim() && !isHttpUrl(form.listen_url)) {
      setError('Le lien d’écoute doit commencer par http:// ou https://');
      return;
    }
    const patch: Partial<SongProposal> = {
      title: form.title.trim(),
      artist: form.artist.trim() || null,
      album: form.album.trim() || null,
      duration_sec: parseDuration(form.duration) ?? null,
      music_key: form.music_key || null,
      bpm: form.bpm ? parseInt(form.bpm, 10) || null : null,
      cover: form.cover.trim() || null,
      listen_url: form.listen_url.trim() || null,
      pitch: form.pitch.trim() || null,
    };
    if (isNew) {
      void run(() => createProposal(patch), onClose);
    } else if (prop) {
      void run(() => updateProposal(prop.id, patch), () => {
        setEditing(false);
        void load();
      });
    }
  }

  function vote(v: ProposalVote) {
    if (!prop) return;
    const mine = prop.votes.find((x) => x.user_id === member?.user_id)?.vote;
    void run(() => voteProposal(prop.id, mine === v ? null : v));
  }

  function sendComment() {
    if (!prop || !comment.trim()) return;
    void run(() => addComment(prop.id, comment.trim()), () => {
      setComment('');
      void load();
    });
  }

  function addToRepertoire() {
    if (!prop) return;
    void run(async () => {
      const r = await addProposalToRepertoire(prop.id);
      setInfo(r.existing ? 'Ce morceau était déjà au répertoire : la proposition y est liée.' : 'Morceau ajouté au répertoire ✓');
    });
  }

  const myVote = prop?.votes.find((x) => x.user_id === member?.user_id)?.vote;
  const t = prop ? tally(prop) : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal prop-modal stack" onClick={(e) => e.stopPropagation()}>
        <div className="row between full">
          <h3 className="prop-modal-title">{isNew ? 'Proposer un morceau' : editing ? 'Modifier la proposition' : 'Proposition'}</h3>
          <button className="btn small" aria-label="Fermer" onClick={onClose}>
            ✕
          </button>
        </div>

        {!isNew && !prop && !error && <p className="muted">Chargement…</p>}

        {/* ---- Fiche (lecture) ---- */}
        {prop && !editing && (
          <div className="stack full" style={{ gap: '0.6rem' }}>
            <div className="prop-head">
              {prop.cover && <img className="prop-cover-lg" src={prop.cover} alt="" />}
              <div className="prop-head-txt">
                <strong className="prop-title-lg">{prop.title}</strong>
                {prop.artist && <span>{prop.artist}</span>}
                <span className="muted small">
                  {[prop.album, formatDuration(prop.duration_sec ?? undefined), prop.music_key, prop.bpm ? `${prop.bpm} BPM` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                <span className="muted small">
                  Proposé par {prop.proposed_by_name ?? 'un ancien membre'} le {frDate(prop.created_at)}
                </span>
              </div>
            </div>

            {prop.listen_url && (
              <a className="btn small listen-btn" href={prop.listen_url} target="_blank" rel="noopener noreferrer">
                ▶ {listenLabel(prop.listen_url)}
              </a>
            )}
            {prop.pitch && <p className="prop-pitch">{prop.pitch}</p>}

            {prop.status === 'added' && (
              <p className="prop-state ok">
                ✓ Ajouté au répertoire{prop.decided_by_name ? ` par ${prop.decided_by_name}` : ''} le {frDate(prop.decided_at)}
                {' · '}
                <Link to="/repertoire">Voir le répertoire</Link>
              </p>
            )}
            {prop.status === 'dismissed' && (
              <p className="prop-state">
                Écartée{prop.decided_by_name ? ` par ${prop.decided_by_name}` : ''} le {frDate(prop.decided_at)}
              </p>
            )}

            {/* Votes */}
            <div className="field full">
              <span>Votes</span>
              <div className="vote-bar">
                {VOTES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`vote-btn v-${v.id} ${myVote === v.id ? 'active' : ''}`}
                    aria-pressed={myVote === v.id}
                    disabled={busy}
                    onClick={() => vote(v.id)}
                  >
                    {v.icon} {v.label} <span className="mono">{t![v.id]}</span>
                  </button>
                ))}
              </div>
              {prop.votes.length > 0 ? (
                <p className="muted small">
                  {prop.votes.map((v) => `${VOTES.find((x) => x.id === v.vote)!.icon} ${v.name}`).join(' · ')}
                </p>
              ) : (
                <p className="muted small">Personne n’a encore voté.</p>
              )}
            </div>

            {/* Discussion */}
            <div className="field full">
              <span>Discussion</span>
              {(prop.comments ?? []).length === 0 ? (
                <p className="muted small">Aucun commentaire.</p>
              ) : (
                <ul className="comment-list">
                  {prop.comments!.map((c) => (
                    <li key={c.id}>
                      <div className="comment-meta">
                        <strong>{c.name}</strong>
                        <span className="muted small">{frDate(c.created_at)}</span>
                        {(c.user_id === member?.user_id || isAdmin) && (
                          <button
                            className="chip-x"
                            aria-label="Supprimer le commentaire"
                            onClick={() => void run(() => deleteComment(prop.id, c.id))}
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <p className="comment-body">{c.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="input-btn">
                <input
                  className="grow"
                  aria-label="Ajouter un commentaire"
                  placeholder="Ton avis…"
                  value={comment}
                  maxLength={2000}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), sendComment())}
                />
                <button className="btn small" type="button" disabled={busy || !comment.trim()} onClick={sendComment}>
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---- Formulaire (création / édition) ---- */}
        {editing && (
          <div className="stack full" style={{ gap: '0.6rem' }}>
            <div className="grid2 full">
              <label className="field">
                <span>Titre *</span>
                <input value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus={isNew} />
              </label>
              <label className="field">
                <span>Artiste</span>
                <input value={form.artist} onChange={(e) => set('artist', e.target.value)} />
              </label>
            </div>
            <label className="field full">
              <span>Lien d’écoute (YouTube, Spotify, Deezer…)</span>
              <input
                type="url"
                inputMode="url"
                value={form.listen_url}
                onChange={(e) => set('listen_url', e.target.value)}
                placeholder="https://…"
              />
            </label>
            <label className="field full">
              <span>Pourquoi ce morceau ?</span>
              <textarea
                rows={3}
                value={form.pitch}
                maxLength={4000}
                onChange={(e) => set('pitch', e.target.value)}
                placeholder="Ça irait bien en rappel, facile à caler…"
              />
            </label>

            <MetadataImport
              title={form.title}
              artist={form.artist}
              current={{
                artist: form.artist,
                album: form.album,
                duration: form.duration,
                bpm: form.bpm,
                music_key: form.music_key,
                cover: form.cover,
              }}
              onApply={(p) => setForm((f) => ({ ...f, ...p }))}
            />

            <details>
              <summary>Détails (album, durée, tonalité, BPM, pochette)</summary>
              <div className="grid2">
                <label className="field">
                  <span>Album</span>
                  <input value={form.album} onChange={(e) => set('album', e.target.value)} />
                </label>
                <label className="field">
                  <span>Durée</span>
                  <input value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="3:45" />
                </label>
                <label className="field">
                  <span>Tonalité</span>
                  <select value={form.music_key} onChange={(e) => set('music_key', e.target.value)}>
                    <option value="">— Tonalité —</option>
                    {KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>BPM</span>
                  <input type="number" inputMode="numeric" value={form.bpm} onChange={(e) => set('bpm', e.target.value)} />
                </label>
                <label className="field">
                  <span>Pochette (URL)</span>
                  <input value={form.cover} onChange={(e) => set('cover', e.target.value)} placeholder="https://…" />
                </label>
              </div>
            </details>
          </div>
        )}

        {info && (
          <p className="muted small" aria-live="polite">
            {info}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {/* ---- Actions ---- */}
        {editing ? (
          <div className="row full prop-actions">
            <button className="btn primary" onClick={save} disabled={busy}>
              {isNew ? 'Proposer' : 'Enregistrer'}
            </button>
            {!isNew && prop && (
              <button
                className="btn small"
                onClick={() => {
                  setForm(toForm(prop));
                  setEditing(false);
                }}
              >
                Annuler
              </button>
            )}
          </div>
        ) : (
          prop && (
            <div className="row between full prop-actions">
              <div className="row">
                {prop.status === 'open' && (
                  <>
                    <button className="btn primary" onClick={addToRepertoire} disabled={busy}>
                      ➕ Ajouter au répertoire
                    </button>
                    <button className="btn small" onClick={() => void run(() => setProposalStatus(prop.id, 'dismissed'))} disabled={busy}>
                      Écarter
                    </button>
                  </>
                )}
                {prop.status === 'dismissed' && (
                  <button className="btn small" onClick={() => void run(() => setProposalStatus(prop.id, 'open'))} disabled={busy}>
                    ↺ Remettre en cours
                  </button>
                )}
                {canEdit && (
                  <button className="btn small" onClick={() => setEditing(true)}>
                    ✏️ Modifier
                  </button>
                )}
              </div>
              {canEdit &&
                (confirmDelete ? (
                  <span className="row">
                    <button className="btn small danger" onClick={() => void run(() => deleteProposal(prop.id), onClose)}>
                      Confirmer la suppression
                    </button>
                    <button className="btn small" onClick={() => setConfirmDelete(false)}>
                      Annuler
                    </button>
                  </span>
                ) : (
                  <button className="btn small danger" onClick={() => setConfirmDelete(true)}>
                    Supprimer
                  </button>
                ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
