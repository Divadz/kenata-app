// « Le Souffleur » : accroches scéniques pré-écrites selon l'ambiance.

export const MOODS = [
  { id: 'badass', label: 'Badass' },
  { id: 'chaleureux', label: 'Chaleureux' },
  { id: 'sobre', label: 'Sobre & classe' },
  { id: 'dejante', label: 'Déjanté' },
] as const;

export type MoodId = (typeof MOODS)[number]['id'];

const PHRASES: Record<MoodId, string[]> = {
  badass: [
    'On n’est pas venus pour enfiler des perles. On envoie la suite !',
    'Vous voulez du lourd ? On accélère. Trois, quatre !',
    'Assez discuté. La prochaine va vous décoller la nuque.',
    'Montez le son dans vos têtes, on passe à la vitesse supérieure.',
  ],
  chaleureux: [
    'Merci d’être là ce soir, ça nous touche vraiment. La suivante est pour vous.',
    'On se sent bien avec vous. Continuons ensemble.',
    'Faites du bruit pour la personne à côté de vous — et pour ce morceau.',
    'C’est une belle soirée, profitons-en. Celle-ci vient du cœur.',
  ],
  sobre: [
    'Merci. Ce morceau nous tient particulièrement à cœur.',
    'On enchaîne avec un titre un peu plus intime.',
    'Prenez un instant. Voici la suite.',
    'Merci de votre écoute. On continue.',
  ],
  dejante: [
    'Alors, qui a ramené sa belle-mère ? Celle-là est pour elle !',
    'On a répété ça dans un garage. Vous allez comprendre pourquoi.',
    'Si quelqu’un perd une chaussure dans le pogo, on la met sur eBay.',
    'Petit sondage : qui n’a rien compris aux paroles ? Parfait, la suite non plus.',
  ],
};

export function moodLabel(id: string | null | undefined): string {
  return MOODS.find((m) => m.id === id)?.label ?? '';
}

export function randomPhrase(mood: MoodId): string {
  const list = PHRASES[mood] ?? [];
  if (list.length === 0) return '';
  return list[Math.floor(Math.random() * list.length)];
}
