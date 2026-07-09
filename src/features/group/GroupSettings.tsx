import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import {
  createGearItem,
  deleteGearItem,
  updateGearItem,
  useGearItems,
} from '../gear/useGearItems';
import { useGroup } from './useGroup';

export function GroupSettings() {
  const { isAdmin } = useAuth();
  const { meta, loading, updateMeta } = useGroup();
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (meta) setName(meta.name ?? '');
  }, [meta]);

  if (loading) return <p className="muted">Chargement…</p>;

  async function onSave() {
    await updateMeta({ name: name.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <section className="stack full">
      <h2>Réglages du groupe</h2>

      <div className="card form full">
        <label className="field">
          <span>Nom du groupe</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
            placeholder="Kenata"
          />
        </label>
        {isAdmin ? (
          <button className="btn primary" onClick={onSave}>
            Enregistrer
          </button>
        ) : (
          <p className="muted">Seul un administrateur peut modifier le nom.</p>
        )}
        {saved && (
          <p className="ok" aria-live="polite">
            Enregistré ✓
          </p>
        )}
      </div>

      <GearInventory />
    </section>
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
                {it.default_checked ? '☑' : '☐'} {it.label}
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

      <div className="row">
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
