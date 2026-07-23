import type { SetlistItem } from '../../types/models';

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

/**
 * Ouvre une fenêtre d'impression : en-tête (KENATA en Ambulance Shotgun à gauche,
 * titre centré, durée à droite) puis la liste des morceaux + BPM. Une seule page
 * garantie (la police est réduite jusqu'à tenir), chaque morceau sur une ligne.
 */
export function printSetlist(name: string, items: SetlistItem[], duration = ''): void {
  let n = 0;
  const rows = items
    .map((it) => {
      if (it.type === 'song') {
        n += 1;
        const bpm = it.song_bpm ? `${it.song_bpm}` : '';
        return `<li class="song"><span class="num">${n}</span><span class="title">${esc(
          it.song_title ?? '(morceau supprimé)'
        )}</span><span class="bpm">${esc(bpm)}</span></li>`;
      }
      if (it.type === 'free') {
        const label = (it.label ?? '').trim();
        return label ? `<li class="free">${esc(label)}</li>` : '';
      }
      return ''; // souffleur : non imprimé
    })
    .join('');

  const origin = window.location.origin;

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${esc(name || 'Setlist')}</title>
<style>
  @font-face {
    font-family: "Ambulance Shotgun";
    src: url("${origin}/fonts/ambulanceshotgun.woff2") format("woff2"),
         url("${origin}/fonts/ambulanceshotgun.woff") format("woff");
    font-display: block;
  }
  * { box-sizing: border-box; }
  html { font-size: 30mm; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #000; margin: 0; }
  /* Feuille à la largeur imprimable d'une A4 (210 mm - 2 x 8 mm) pour des mesures justes. */
  #sheet { width: 194mm; }
  #head { display: flex; align-items: baseline; gap: 0.5em; border-bottom: 2px solid #000; margin: 0 0 0.35em; padding-bottom: 0.12em; }
  #head .brand { font-family: "Ambulance Shotgun", sans-serif; font-size: 1.1em; line-height: 1; white-space: nowrap; }
  #head .sltitle { flex: 1; text-align: center; text-transform: uppercase; font-weight: 800; font-size: 0.7em; white-space: nowrap; overflow: hidden; }
  #head .dur { white-space: nowrap; font-weight: 700; font-size: 0.6em; font-variant-numeric: tabular-nums; }
  ol { list-style: none; margin: 0; padding: 0; }
  li { padding: 0.12em 0; border-bottom: 1px solid #ccc; line-height: 1.1; }
  li.song { display: flex; align-items: baseline; gap: 0.4em; }
  .num { min-width: 1.6em; text-align: right; font-variant-numeric: tabular-nums; color: #666; font-weight: 700; }
  /* Morceau sur une seule ligne obligatoire : pas de retour à la ligne. */
  .title { flex: 1; font-weight: 800; text-transform: uppercase; white-space: nowrap; }
  .bpm { font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 800; }
  li.free { font-style: italic; color: #333; text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.7em; border-bottom: none; padding-top: 0.4em; white-space: nowrap; }
  @page { size: A4 portrait; margin: 8mm; }
</style>
</head>
<body>
  <div id="sheet">
    <div id="head">
      <span class="brand">KENATA</span>
      <span class="sltitle">${esc(name || 'Setlist')}</span>
      <span class="dur">${esc(duration)}</span>
    </div>
    <ol>${rows}</ol>
  </div>
  <script>
    (function () {
      var printed = false;
      function fitAndPrint() {
        if (printed) return;
        printed = true;
        var mmToPx = 96 / 25.4;
        var maxH = (297 - 16 - 4) * mmToPx; // hauteur utile A4 portrait, en px @96dpi
        var root = document.documentElement;
        var sheet = document.getElementById('sheet');
        var size = parseFloat(getComputedStyle(root).fontSize);
        var guard = 0;
        // Réduit jusqu'à tenir en hauteur ET que chaque ligne tienne en largeur.
        while ((sheet.scrollHeight > maxH || sheet.scrollWidth > sheet.clientWidth + 1) && size > 3 && guard < 800) {
          size -= 0.5;
          root.style.fontSize = size + 'px';
          guard++;
        }
        window.focus();
        window.print();
      }
      // On attend le chargement de la police du logo avant d'imprimer (sinon fallback).
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(fitAndPrint);
        setTimeout(fitAndPrint, 2000);
      } else {
        window.onload = fitAndPrint;
      }
    })();
  </script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) {
    alert("Impossible d'ouvrir la fenêtre d'impression (bloquée par le navigateur ?).");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
