import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { reconcileOrder, SECTION_LABELS, type SectionKey } from '../concerts/sections';
import {
  createGearItem,
  deleteGearItem,
  updateGearItem,
  useGearItems,
} from '../gear/useGearItems';

export function GroupSettings() {
  return (
    <section className="stack full">
      <h2>Réglages du groupe</h2>
      <GearInventory />
      <SectionOrderSettings />
      <AppMaintenance />
    </section>
  );
}

/** Rechargement complet (vide le service worker + les caches) — réservé au owner. */
function AppMaintenance() {
  const { member } = useAuth();
  const [busy, setBusy] = useState(false);
  if (member?.role !== 'owner') return null;

  async function hardReload() {
    setBusy(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      window.location.reload();
    }
  }

  return (
    <div className="card form full">
      <h3>Maintenance</h3>
      <p className="muted small">
        Force le rechargement complet de l'application en vidant le cache et le service worker.
        Utile juste après une mise à jour si l'ancienne version reste affichée.
      </p>
      <button className="btn" onClick={hardReload} disabled={busy}>
        {busy ? 'Rechargement…' : '↻ Tout recharger (vider le cache)'}
      </button>
    </div>
  );
}

function SectionOrderSettings() {
  const { member, sectionOrderRaw, refresh } = useAuth();
  const isOwner = member?.role === 'owner';
  const [order, setOrder] = useState<SectionKey[]>(
    reconcileOrder(sectionOrderRaw.mine ?? sectionOrderRaw.default)
  );

  useEffect(() => {
    setOrder(reconcileOrder(sectionOrderRaw.mine ?? sectionOrderRaw.default));
  }, [sectionOrderRaw]);

  const customized = !isOwner && sectionOrderRaw.mine != null;

  async function persist(next: SectionKey[]) {
    setOrder(next);
    const path = isOwner ? '/group/section-order' : '/me/section-order';
    await api(path, { method: 'PATCH', body: { order: next } });
    await refresh();
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    void persist(next);
  }
  async function reset() {
    await api('/me/section-order', { method: 'PATCH', body: { order: null } });
    await refresh();
  }

  return (
    <div className="card form full">
      <h3>Ordre des sections du concert</h3>
      <p className="muted small">
        « Essentiel » reste toujours en premier.{' '}
        {isOwner
          ? "Tu définis l'ordre par défaut du groupe (appliqué aux membres qui n'ont pas personnalisé)."
          : customized
            ? 'Tu utilises ton ordre personnalisé.'
            : "Tu suis l'ordre par défaut du groupe."}
      </p>
      <ol className="setlist full">
        {order.map((k, i) => (
          <li key={k}>
            <div className="sl-item">
              <span className="sl-num mono">{i + 1}</span>
              <div className="sl-body">{SECTION_LABELS[k]}</div>
              <span className="sl-actions">
                <button className="btn small" aria-label="Monter" onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button className="btn small" aria-label="Descendre" onClick={() => move(i, 1)}>
                  ↓
                </button>
              </span>
            </div>
          </li>
        ))}
      </ol>
      {customized && (
        <button className="btn small" onClick={reset}>
          Réinitialiser (suivre le groupe)
        </button>
      )}
    </div>
  );
}

function GearInventory() {
  const { items, reload } = useGearItems();
  const [label, setLabel] = useState('');

  async function add() {
    if (!label.trim()) return;
    await createGearItem(label.trim());
    setLabel('');
    await reload();
  }

  return (
    <div className="card form full">
      <h3>Matos</h3>
      <p className="muted small">
        Tes éléments de matériel. Coche ceux à emmener <strong>par défaut</strong> — ils seront
        pré-cochés sur les nouveaux concerts (décochables au cas par cas).
      </p>

      {items.length > 0 && (
        <div className="chips">
          {items.map((it) => (
            <span key={it.id} className={`chip ${it.default_checked ? 'on' : ''}`}>
              <button
                type="button"
                className="chip-label"
                aria-pressed={it.default_checked}
                onClick={() => updateGearItem(it.id, { default_checked: !it.default_checked }).then(reload)}
              >
                {it.label}
              </button>
              <button
                type="button"
                className="chip-x"
                aria-label={`Supprimer ${it.label}`}
                onClick={() => deleteGearItem(it.id).then(reload)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="row" style={{ marginTop: '0.85rem' }}>
        <input
          aria-label="Nouvel élément de matos"
          placeholder="Ajouter un élément (Diffu, lights, Caisson…)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn" onClick={add}>
          + Ajouter
        </button>
      </div>
    </div>
  );
}
