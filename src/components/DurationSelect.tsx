import { formatHM } from '../utils/duration';

const STEP_MIN = 15;

/**
 * Sélecteur de durée compact (stepper) au quart d'heure, valeur en minutes,
 * affichage "01h30". Décrémenter sous le minimum repasse sur « aucune » (null).
 */
export function DurationSelect({
  value,
  onChange,
  min = 45,
  max = 180,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  ariaLabel?: string;
}) {
  function dec() {
    if (value == null) return;
    const next = value - STEP_MIN;
    onChange(next < min ? null : next);
  }
  function inc() {
    if (value == null) {
      onChange(min);
      return;
    }
    onChange(Math.min(max, value + STEP_MIN));
  }

  return (
    <div className="stepper" role="group" aria-label={ariaLabel}>
      <button type="button" className="btn small" aria-label="Diminuer" onClick={dec} disabled={value == null}>
        −
      </button>
      <span className="stepper-val mono" aria-live="polite">
        {value == null ? '—' : formatHM(value * 60)}
      </span>
      <button type="button" className="btn small" aria-label="Augmenter" onClick={inc} disabled={value === max}>
        +
      </button>
    </div>
  );
}
