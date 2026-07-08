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

// Tonalités : Do → Si, en majeur et mineur.
const NOTES = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
export const KEYS: string[] = [
  ...NOTES.map((n) => `${n} majeur`),
  ...NOTES.map((n) => `${n} mineur`),
];

export const MASTERY_LEVELS = [0, 1, 2, 3, 4, 5] as const;
