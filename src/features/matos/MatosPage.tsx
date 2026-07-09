import { useState } from 'react';
import type { GearTemplate, GearTemplateItem } from '../../types/models';
import { createTemplate, deleteTemplate, updateTemplate, useGear } from './useGear';

const CATEGORIES = ['backline', 'sono', 'câbles', 'lumières', 'autre'];

export function MatosPage() {
  const { templates, loading, reload } = useGear();
  const [name, setName] = useState('');

  async function onCreate() {
    if (!name.trim()) return;
    await createTemplate(name.trim());
    setName('');
    await reload();
  }

  return (
    <section className="stack full">
      <h2>Matos</h2>
      <p className="muted small">
        Modèles de checklist réutilisables (ex. « Config bar trio »). Charge-les dans un concert
        depuis sa fiche.
      </p>

      <div className="card form full">
        <h3>Nouveau modèle</h3>
        <div className="row">
          <input
            aria-label="Nom du modèle"
            placeholder="Nom du modèle…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn primary" onClick={onCreate}>
            Créer
          </button>
        </div>
      </div>

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : templates.length === 0 ? (
        <p className="muted">Aucun modèle. Crée-en un pour le réutiliser sur tes concerts.</p>
      ) : (
        templates.map((t) => <TemplateCard key={t.id} template={t} onChanged={reload} />)
      )}
    </section>
  );
}

function TemplateCard({ template, onChanged }: { template: GearTemplate; onChanged: () => void }) {
  const [items, setItems] = useState<GearTemplateItem[]>(template.items ?? []);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);

  function persist(next: GearTemplateItem[]) {
    setItems(next);
    void updateTemplate(template.id, { items: next });
  }
  function addItem() {
    if (!label.trim()) return;
    persist([...items, { label: label.trim(), category }]);
    setLabel('');
  }

  return (
    <div className="card form full">
      <div className="row between">
        <h3>{template.name}</h3>
        <button
          className="btn small danger"
          onClick={async () => {
            await deleteTemplate(template.id);
            onChanged();
          }}
        >
          Supprimer le modèle
        </button>
      </div>

      <ul className="list">
        {items.map((it, i) => (
          <li key={i}>
            <span>
              {it.label} {it.category && <span className="badge">{it.category}</span>}
            </span>
            <button
              className="btn small"
              aria-label={`Retirer ${it.label}`}
              onClick={() => persist(items.filter((_, idx) => idx !== i))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="row">
        <input
          aria-label="Ajouter du matos"
          placeholder="Ajouter du matos (ex. Micros x5)…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <select aria-label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button className="btn" onClick={addItem}>
          + Ajouter
        </button>
      </div>
    </div>
  );
}
