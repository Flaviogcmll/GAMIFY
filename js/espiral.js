// v9.6 (guia de interface 10.2, a assinatura do artista): ESPIRAIS em pixel.
// O CALOR da BRASINHA é uma espiral que ACENDE DE DENTRO PRA FORA; o carregamento é a mesma espiral se desenhando.
// Cada "pixel" é um quadradinho numa grade (crispEdges), como as artes do elenco.
const pts = (() => {
  // espiral de Arquimedes amostrada e presa numa grade de 2: do centro pra fora, sem repetir quadradinho
  const out = [], seen = new Set();
  for (let i = 0; i < 900; i++) {
    const a = i * 0.05, r = 0.95 * a;
    if (r > 13) break;
    const x = Math.round((14 + r * Math.cos(a)) / 2) * 2, y = Math.round((14 + r * Math.sin(a)) / 2) * 2, k = x + ',' + y;
    if (!seen.has(k)) { seen.add(k); out.push([x, y]); }
  }
  return out;
})();
const COLS = ['#fff3b0', '#facf83', '#f8bc56', '#ea9145', '#d76443', '#ba4f40']; // de dentro (mais quente/claro) pra fora (brasa)
/** pct 0..1 do calor; size em px. title vira legenda. */
export function espiralCalor(pct, size = 34, title = '') {
  const n = pts.length, lit = Math.round(Math.max(0, Math.min(1, pct)) * n);
  const rects = pts.map(([x, y], i) => `<rect x="${x}" y="${y}" width="2" height="2" fill="${i < lit ? COLS[Math.min(COLS.length - 1, Math.floor((i / n) * COLS.length))] : 'currentColor'}" ${i < lit ? '' : 'opacity=".22"'}/>`).join('');
  return `<svg class="espiral" viewBox="0 0 30 30" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="${title}">${title ? `<title>${title}</title>` : ''}${rects}</svg>`;
}
/** a espiral se desenhando (carregando): cada quadradinho acende em sequência (só CSS anima) */
export function espiralLoader(size = 56) {
  const n = pts.length;
  return `<svg class="espiral loader" viewBox="0 0 30 30" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">${pts.map(([x, y], i) => `<rect x="${x}" y="${y}" width="2" height="2" fill="${COLS[Math.min(COLS.length - 1, Math.floor((i / n) * COLS.length))]}" style="--i:${i}"/>`).join('')}</svg>`;
}
