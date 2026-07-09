import { formatHM } from '../utils/duration';

const STEP_MIN = 15;
const MAX_MIN = 360; // 6h

/** Sélecteur de durée au quart d'heure, valeur en minutes, affichage "01h30". */
export function DurationSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  ariaLabel?: string;
}) {
  const options: number[] = [];
  for (let m = STEP_MIN; m <= MAX_MIN; m += STEP_MIN) options.push(m);

  return (
    <select
      aria-label={ariaLabel}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">—</option>
      {options.map((m) => (
        <option key={m} value={m}>
          {formatHM(m * 60)}
        </option>
      ))}
    </select>
  );
}
