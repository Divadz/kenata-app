import { useEffect, useRef, useState } from 'react';

interface Suggestion {
  label: string;
  city: string | null;
  postcode: string | null;
  context: string | null;
}

interface Props {
  value: string;
  /** Appelé à chaque frappe ET à la sélection d'une suggestion. */
  onChange: (v: string) => void;
  /** Sauvegarde (au blur / à la sélection). */
  onBlur?: () => void;
  /** 'address' = adresse complète ; 'city' = commune. */
  type?: 'address' | 'city';
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Champ d'adresse avec autocomplétion via la Base Adresse Nationale
 * (api-adresse.data.gouv.fr — gratuit, sans clé, France). Saisie libre conservée.
 */
export function AddressAutocomplete({ value, onChange, onBlur, type = 'address', placeholder, className, ariaLabel }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function query(q: string) {
    window.clearTimeout(timer.current);
    if (q.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        const p = new URLSearchParams({ q, limit: '6', autocomplete: '1' });
        if (type === 'city') p.set('type', 'municipality');
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?${p.toString()}`);
        const data = await res.json();
        const s: Suggestion[] = (data.features ?? []).map((f: { properties: Record<string, string> }) => ({
          label: f.properties.label,
          city: f.properties.city ?? null,
          postcode: f.properties.postcode ?? null,
          context: f.properties.context ?? null,
        }));
        setSuggestions(s);
        setOpen(s.length > 0);
        setActive(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 250);
  }

  function pick(s: Suggestion) {
    onChange(s.label);
    setSuggestions([]);
    setOpen(false);
    onBlur?.();
  }

  return (
    <div className={`addr-ac ${className ?? ''}`}>
      <input
        className="full"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          query(e.target.value);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
          onBlur?.();
        }}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && active >= 0) {
            e.preventDefault();
            pick(suggestions[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul className="addr-list">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className={i === active ? 'active' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
            >
              {s.label}
              {type === 'city' && s.context ? <span className="muted small"> · {s.context}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
