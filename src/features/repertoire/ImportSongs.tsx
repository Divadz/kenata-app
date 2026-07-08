import { useState } from 'react';
import { useSongs } from './useSongs';

export function ImportSongs({ onClose }: { onClose: () => void }) {
  const { importSongs } = useSongs();
  const [text, setText] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onImport() {
    setBusy(true);
    setResult(null);
    try {
      const { added, skipped } = await importSongs(text);
      setResult(`${added} morceau(x) ajouté(s)${skipped ? `, ${skipped} ligne(s) ignorée(s)` : ''}.`);
      if (added > 0) setText('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack form">
      <div className="row between">
        <h3>Import en masse</h3>
        <button className="btn small" onClick={onClose}>
          Fermer
        </button>
      </div>
      <p className="muted small">
        Une ligne par morceau, champs séparés par des points-virgules :<br />
        <code>Titre ; Artiste ; Accordage ; Maîtrise ; Album ; Durée ; BPM ; Tonalité</code>
      </p>
      <textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Chop Suey! ; System of a Down ; Drop C ; 4 ; Toxicity ; 3:30 ; 127 ; Do# mineur"
      />
      <div className="row">
        <button className="btn primary" onClick={onImport} disabled={busy || !text.trim()}>
          {busy ? 'Import…' : 'Importer'}
        </button>
      </div>
      {result && <p className="ok">{result}</p>}
    </div>
  );
}
