import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
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
    <section className="stack">
      <h2>Réglages du groupe</h2>
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
        <p className="muted">Seul un administrateur peut modifier les réglages.</p>
      )}
      {saved && <p className="ok">Enregistré ✓</p>}
    </section>
  );
}
