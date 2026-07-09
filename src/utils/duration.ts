/** "3:45" -> 225 (secondes). Renvoie undefined si vide/invalide. */
export function parseDuration(input: string): number | undefined {
  const s = input.trim();
  if (!s) return undefined;
  const m = s.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  // secondes brutes acceptées
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return undefined;
}

/** 225 -> "3:45" (minutes:secondes, pour les morceaux). */
export function formatDuration(sec?: number): string {
  if (sec == null || Number.isNaN(sec)) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 5400 -> "01h30" (heures/minutes, pour les durées longues : cibles, totaux). */
export function formatHM(sec?: number): string {
  if (sec == null || Number.isNaN(sec)) return '';
  const totalMin = Math.round(sec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
}
