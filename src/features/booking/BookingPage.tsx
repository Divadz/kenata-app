import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { BookingLead, BookingStage } from '../../types/models';
import { BOARD_STAGES, STAGE_CLS, STAGE_LABEL } from './constants';
import { getArchivedLeads, relanceDays, updateLead, useBooking } from './useBooking';
import { LeadModal } from './LeadModal';

const byPos = (a: BookingLead, b: BookingLead) => a.position - b.position;

function frDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function BookingPage() {
  const { leads, loading, reload, setLeads } = useBooking();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [modal, setModal] = useState<{ lead: BookingLead | null; stage?: BookingStage } | null>(null);
  const [archived, setArchived] = useState<BookingLead[] | null>(null);

  const leadsRef = useRef(leads);
  leadsRef.current = leads;
  const dragRef = useRef<{ id: string; sx: number; sy: number; moved: boolean } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<BookingStage | null>(null);
  const colRefs = useRef(new Map<BookingStage, HTMLElement>());
  const cardRefs = useRef(new Map<string, HTMLElement>());

  const confirmed = leads.filter((l) => l.stage === 'confirme').sort(byPos);
  const relances = leads
    .filter((l) => l.next_relance_date && (relanceDays(l.next_relance_date) ?? 99) <= 7)
    .sort((a, b) => (a.next_relance_date! < b.next_relance_date! ? -1 : 1));

  function openNew(stage: BookingStage) {
    setModal({ lead: null, stage });
  }
  function openLead(l: BookingLead) {
    setModal({ lead: l });
  }

  // --- Drag inter-colonnes (Pointer Events : souris + tactile) ---
  function stageAtPoint(x: number, y: number): BookingStage | null {
    for (const [stage, el] of colRefs.current) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return stage;
    }
    return null;
  }
  function indexAtPoint(stage: BookingStage, y: number, draggedId: string): number {
    const cards = leadsRef.current.filter((l) => l.stage === stage && l.id !== draggedId).sort(byPos);
    for (let i = 0; i < cards.length; i++) {
      const r = cardRefs.current.get(cards[i].id)?.getBoundingClientRect();
      if (r && y < r.top + r.height / 2) return i;
    }
    return cards.length;
  }

  function onCardDown(e: ReactPointerEvent<HTMLElement>, id: string) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragRef.current = { id, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onCardMove(e: ReactPointerEvent<HTMLElement>) {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
      d.moved = true;
      setDraggingId(d.id);
    }
    setOverStage(stageAtPoint(e.clientX, e.clientY));
  }
  function onCardUp(e: ReactPointerEvent<HTMLElement>, lead: BookingLead) {
    const d = dragRef.current;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
    setDraggingId(null);
    setOverStage(null);
    if (!d) return;
    if (!d.moved) {
      openLead(lead);
      return;
    }
    const stage = stageAtPoint(e.clientX, e.clientY);
    if (stage) {
      const index = BOARD_STAGES.some((s) => s.id === stage) ? indexAtPoint(stage, e.clientY, d.id) : undefined;
      moveLead(d.id, stage, index);
    }
  }

  function moveLead(id: string, targetStage: BookingStage, index?: number) {
    setLeads((prev) => {
      const dragged = prev.find((l) => l.id === id);
      if (!dragged) return prev;
      const others = prev.filter((l) => l.id !== id);
      const targetCol = others.filter((l) => l.stage === targetStage).sort(byPos);
      const at = index == null ? targetCol.length : Math.max(0, Math.min(index, targetCol.length));
      targetCol.splice(at, 0, { ...dragged, stage: targetStage });
      const repositioned = targetCol.map((l, i) => ({ ...l, stage: targetStage, position: i }));
      for (const l of repositioned) {
        const b = prev.find((p) => p.id === l.id);
        if (!b || b.stage !== l.stage || b.position !== l.position) {
          void updateLead(l.id, { stage: l.stage, position: l.position });
        }
      }
      return [...others.filter((l) => l.stage !== targetStage), ...repositioned];
    });
  }

  async function loadArchived() {
    setArchived(await getArchivedLeads());
  }

  const registerCol = (stage: BookingStage) => (el: HTMLElement | null) => {
    if (el) colRefs.current.set(stage, el);
    else colRefs.current.delete(stage);
  };
  const registerCard = (id: string) => (el: HTMLElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  };

  function renderCard(l: BookingLead) {
    const d = relanceDays(l.next_relance_date);
    return (
      <div
        key={l.id}
        ref={registerCard(l.id)}
        className={`lead-card${draggingId === l.id ? ' dragging' : ''}`}
        onPointerDown={(e) => onCardDown(e, l.id)}
        onPointerMove={onCardMove}
        onPointerUp={(e) => onCardUp(e, l)}
      >
        <div className="lead-name">{l.name}</div>
        {(l.city || l.type) && (
          <div className="muted small">{[l.city, l.type].filter(Boolean).join(' · ')}</div>
        )}
        {l.next_relance_date && (
          <span className={`badge relance${d !== null && d < 0 ? ' late' : ''}`}>📅 {frDate(l.next_relance_date)}</span>
        )}
      </div>
    );
  }

  return (
    <section className="stack full">
      <div className="row between full">
        <h2>Booking</h2>
        <div className="row">
          <div className="tabs-inline">
            <button className={`tab ${view === 'board' ? 'active' : ''}`} onClick={() => setView('board')}>
              Board
            </button>
            <button className={`tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
              Liste
            </button>
          </div>
          <button className="btn primary" onClick={() => openNew('a_contacter')}>
            + Contact
          </button>
        </div>
      </div>
      <p className="muted small">
        Démarche les salles et organisateurs, et suis tes relances jusqu'à ce que la date soit calée.
      </p>

      {/* Barre de relances */}
      <div className="card full relance-bar">
        {relances.length === 0 ? (
          <span className="muted small">🔔 Aucune relance prévue cette semaine.</span>
        ) : (
          <div className="row" style={{ gap: '0.4rem' }}>
            <span className="muted small">🔔 Relances :</span>
            {relances.map((l) => {
              const d = relanceDays(l.next_relance_date);
              return (
                <button key={l.id} className={`badge relance${d !== null && d < 0 ? ' late' : ''}`} onClick={() => openLead(l)}>
                  {frDate(l.next_relance_date!)} — {l.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : view === 'board' ? (
        <>
          <div className="kanban full">
            {BOARD_STAGES.map((s) => {
              const cards = leads.filter((l) => l.stage === s.id).sort(byPos);
              return (
                <div
                  key={s.id}
                  ref={registerCol(s.id)}
                  className={`kcol${overStage === s.id ? ' over' : ''}`}
                >
                  <div className="kcol-head">
                    <span className={`dot ${s.cls}`} /> {s.label} <span className="muted">{cards.length}</span>
                  </div>
                  <div className="kcol-body">
                    {cards.map(renderCard)}
                    <button className="btn small ghost" onClick={() => openNew(s.id)}>
                      + ajouter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Issues du démarchage */}
          <div className="cards full" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div ref={registerCol('confirme')} className={`card issue confirme${overStage === 'confirme' ? ' over' : ''}`}>
              <h3>✓ Confirmé</h3>
              <p className="muted small">Glisse une carte ici, puis « Transformer en concert » dans la fiche.</p>
              {confirmed.map((l) => (
                <button key={l.id} className="lead-chip" onClick={() => openLead(l)}>
                  <strong>{l.name}</strong>
                  {l.concert_id ? <span className="badge st-confirme">concert ✓</span> : <span className="badge">à transformer</span>}
                </button>
              ))}
            </div>
            <div ref={registerCol('refuse')} className={`card issue refuse${overStage === 'refuse' ? ' over' : ''}`}>
              <h3>✗ Refusé / sans suite</h3>
              <p className="muted small">Glisse une carte ici pour l'archiver.</p>
              <button className="btn small" onClick={archived == null ? loadArchived : () => setArchived(null)}>
                {archived == null ? 'Voir les archivées' : 'Masquer'}
              </button>
              {archived?.map((l) => (
                <button key={l.id} className="lead-chip" onClick={() => openLead(l)}>
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <table className="table full">
          <thead>
            <tr>
              <th>Statut</th>
              <th>Nom</th>
              <th>Ville / Type</th>
              <th>Contact</th>
              <th>Relance</th>
            </tr>
          </thead>
          <tbody>
            {[...leads].sort(byPos).map((l) => (
              <tr key={l.id} className="row-link" onClick={() => openLead(l)}>
                <td>
                  <span className={`badge ${STAGE_CLS[l.stage]}`}>{STAGE_LABEL[l.stage]}</span>
                </td>
                <td>
                  <strong>{l.name}</strong>
                </td>
                <td className="muted small">{[l.city, l.type].filter(Boolean).join(' · ')}</td>
                <td className="muted small">{l.contact_name}</td>
                <td className="muted small">{l.next_relance_date ? frDate(l.next_relance_date) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <LeadModal
          lead={modal.lead}
          initialStage={modal.stage}
          onClose={() => setModal(null)}
          onSaved={() => {
            void reload();
            if (archived != null) void loadArchived();
          }}
        />
      )}
    </section>
  );
}
