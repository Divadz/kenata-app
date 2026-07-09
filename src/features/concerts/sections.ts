// Sections réordonnables de la fiche concert (Essentiel est toujours en 1er, non listée ici).
export const CONCERT_SECTIONS = [
  { key: 'notes', label: 'Notes' },
  { key: 'affiche', label: 'Affiche' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'rider', label: 'Fiche technique' },
  { key: 'roadmap', label: 'Feuille de route' },
  { key: 'lieu', label: 'Lieu & accès' },
  { key: 'loge', label: 'Loge' },
  { key: 'matos', label: 'Matos' },
  { key: 'billetterie', label: 'Billetterie & promo' },
] as const;

export type SectionKey = (typeof CONCERT_SECTIONS)[number]['key'];

export const DEFAULT_SECTION_ORDER: SectionKey[] = CONCERT_SECTIONS.map((s) => s.key);

export const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  CONCERT_SECTIONS.map((s) => [s.key, s.label])
);

/** Filtre les clés valides d'un ordre stocké et complète les manquantes (robuste aux évolutions). */
export function reconcileOrder(order: string[] | null | undefined): SectionKey[] {
  const seen = new Set<string>();
  const out: SectionKey[] = [];
  for (const k of order ?? []) {
    if ((DEFAULT_SECTION_ORDER as string[]).includes(k) && !seen.has(k)) {
      out.push(k as SectionKey);
      seen.add(k);
    }
  }
  for (const k of DEFAULT_SECTION_ORDER) {
    if (!seen.has(k)) out.push(k);
  }
  return out;
}
