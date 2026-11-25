// v9 (guia de interface, etapa 1): PODRIDÃO COMO INFORMAÇÃO. "Onde tem mosca, tem coisa podre."
// Ícones em pixel desenhados na grade de 7 (7×7 pixels de arte), mostrados em escala inteira (×2 = 14 px).
// 0 moscas = em dia · 1 = prazo correndo (TREM FEI) · 2 = vence (TREM CUSTOSO) · 3 = estourou (TREM TRAPAIADO)
// · auréola de 2 moscas = apodreceu (LAMBEHOMI). Os dias de cada nível ficam em PERKS → 🧠 (R.moscaCfg).
// Também: a MOSCA MORTA (de barriga pra cima) no que está PARADO e o objeto que cai do card no dia em que a tarefa atrasa.
// Nada aqui é sprite de personagem: os TREM desmontados (pose 4) entram quando a arte estiver aprovada.

// k = corpo · w = asa · r = olho · y = fedor da auréola · o objetos: m meia, p papel, t tampinha, l linha
const PAL = { k: 'currentColor', w: '#d9cfe0', r: '#c0392b', y: '#c9a65a', m: '#9a5744', M: '#c48a6c', p: '#efe3cf', P: '#a08b77', t: '#bd4d3f', T: '#e0806c' };
const ROWS = {
  mosca: ['.w...w.', 'ww...ww', '.wkkkw.', '.krkrk.', '..kkk..', '.k.k.k.', '.......'],
  morta: ['.......', '.k.k.k.', '..kkk..', '.kkkkk.', 'wwkkkww', '.w...w.', '.......'], // de barriga pra cima, perninhas pro ar
  aur: ['....yyyyyy....', '..yy......yy..', '.y.w.w..w.w.y.', 'y..kkk..kkk..y', '.y..k....k..y.', '..yy......yy..', '....yyyyyy....'], // auréola de fedor com 2 moscas (o LAMBEHOMI)
  meia: ['..MMM..', '..MMM..', '..mMm..', '..MMM..', '.MMMM..', 'MMMMm..', '.mmm...'],
  papel: ['.ppppp.', '.pPPPp.', '.ppppp.', '.pPPpp.', '.ppppp.', '.pPPPp.', '.ppppp.'],
  tampa: ['.......', '..ttt..', '.tTTTt.', '.tTtTt.', '.tTTTt.', '..ttt..', '.......'],
  monte: ['...p...', '..pPp..', '..mMt..', '.MmpMm.', 'mMpmTpm', 'MmMmMmM', '.m.M.m.'], // o TREM: montinho de tralha (roupa, papel, tampinha)
};
const cache = {};
/** desenho → SVG nítido, um <path> por cor (igual aos ícones do app) */
function svg(name, scale = 2, cls = '') {
  const key = name + scale + cls;
  if (cache[key]) return cache[key];
  const rows = ROWS[name], paths = {};
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (PAL[ch]) paths[ch] = (paths[ch] || '') + `M${x} ${y}h1v1h-1z`; }));
  const w = rows[0].length, h = rows.length;
  return (cache[key] = `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges" aria-hidden="true">${Object.entries(paths).map(([c, d]) => `<path fill="${PAL[c]}" d="${d}"/>`).join('')}</svg>`);
}
/** as moscas de uma tarefa (n = 0, 1, 2, 3 ou 'aur'), com legenda */
/** ov = pousadas na borda de cima do card (não roubam espaço do texto); sem ov = na linha */
export function moscasHtml(n, title = '', ov = false) {
  if (!n) return '';
  const inner = n === 'aur' ? svg('aur') : Array.from({ length: n }, () => svg('mosca')).join('');
  return `<span class="moscas ${ov ? 'ov' : ''}" data-n="${n}" title="${title}" role="img" aria-label="${title}">${inner}</span>`;
}
export const moscaMortaHtml = (title = 'Mosca morta: está PARADO', ov = false) => `<span class="mosca-morta ${ov ? 'ov' : ''}" title="${title}" role="img" aria-label="${title}">${svg('morta')}</span>`;

/** v8.8 (pedido do dono): cada vez que a tarefa é adiada (t.rs), o TREM cresce: ×2, ×3, ×4 pixels */
export function tremHtml(rs) {
  if (!rs) return '';
  const k = Math.min(4, rs + 1), tip = `Adiada ${rs}x: o TREM cresceu${rs >= 3 ? ' (travou: pra empurrar de novo precisa de time box)' : ''}`;
  return `<span class="trem-monte" data-rs="${Math.min(rs, 3)}" title="${tip}" role="img" aria-label="${tip}">${svg('monte', k)}</span>`;
}
// o objeto que cai do card: uma vez por tarefa, no dia em que ela atrasa (fica guardado só neste aparelho)
const K = 'gamify-ui:caiu';
let caiu = null;
function load(td) {
  if (caiu?.d === td) return caiu;
  try { caiu = JSON.parse(localStorage.getItem(K) || 'null'); } catch { caiu = null; }
  if (!caiu || caiu.d !== td) caiu = { d: td, ids: [] };
  return caiu;
}
export function quedaHtml(id, td) {
  const c = load(td);
  if (c.ids.includes(id)) return '';
  c.ids.push(id);
  try { localStorage.setItem(K, JSON.stringify(c)); } catch { /* */ }
  const obj = ['meia', 'papel', 'tampa'][[...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 3];
  return `<span class="queda" aria-hidden="true">${svg(obj)}</span>`;
}
