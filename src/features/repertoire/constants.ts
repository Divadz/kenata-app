// Accordages proposés (relevés du domaine métier).
export const TUNINGS = [
  'Standard E',
  'Drop D',
  'Half Step Down',
  'Drop C#',
  'Full Step Down',
  'Drop C',
  'Drop B',
  'Drop A',
  'DADGAD',
  'Open D',
  'Open G',
  'Open E',
  'Open C',
  'Autre',
] as const;

// Tonalités : notation anglaise, majeur (C) et mineur (Cm), de A à G,
// avec les altérations dièse (#) et bémol (b) énharmoniques.
const NOTE_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const ACCIDENTALS: Record<string, string[]> = {
  A: ['A#', 'Bb'],
  C: ['C#', 'Db'],
  D: ['D#', 'Eb'],
  F: ['F#', 'Gb'],
  G: ['G#', 'Ab'],
};
export const KEYS: string[] = NOTE_ORDER.flatMap((n) => [
  n,
  `${n}m`,
  ...(ACCIDENTALS[n] ?? []).flatMap((acc) => [acc, `${acc}m`]),
]);

export const MASTERY_LEVELS = [0, 1, 2, 3, 4, 5] as const;
