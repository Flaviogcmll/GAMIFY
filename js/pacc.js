// ACESSÓRIOS DO PORQUINHO — desenhados no MESMO tamanho de pixel do sprite (grade 32x32), seguindo a cabeça quadro a quadro
// e mudando de forma conforme ele olha pra frente, pro lado (direita/esquerda) ou de costas. O padrão é SEM acessório.
// an = [topX, topY, x0, x1, y1] de cada quadro (calculado do próprio sprite). Os acessórios pintam no canvas 32x32 do quadro.
const OL = '#3a2418';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
/** retângulo com contorno de 1 px */
const B = (c, x, y, w, h, col) => { R(c, x - 1, y - 1, w + 2, h + 2, OL); R(c, x, y, w, h, col); };

/** de onde olha e onde está a cabeça neste quadro */
export function anchorOf(tag, an) {
  const [tx, ty, x0, x1] = an;
  const face = tag.endsWith('East') ? 'E' : tag.endsWith('West') ? 'W' : tag.endsWith('North') ? 'N' : 'S';
  const sleep = tag.startsWith('Sleep');
  if (face === 'S') return { face, cx: tx, ey: ty + (sleep ? 5 : 6.7), b: ty + 3, sep: 3.3, ty };
  if (face === 'N') return { face, cx: tx, ey: ty + 7, b: ty + 3, sep: 3.3, ty };
  const dir = face === 'E' ? 1 : -1, ex = face === 'E' ? x1 - 3 : x0 + 2, ey = ty + (sleep ? 5 : 7.5);
  return { face, dir, ex, ey, cx: ex - dir * 3, b: ty + 3.5, ty };
}

// formas dos chapéus: [dx, dy, largura, altura, cor, 'f' = sai pra frente quando de lado]; dy negativo = pra cima da base b
const HATS = {
  palha: [[-4, -5, 9, 4, '#e6c35a'], [-4, -2, 9, 1, '#c4513a'], [-7, -1, 15, 2, '#d9b050', 'f']],
  bone: [[-4, -5, 9, 5, '#c4513a'], [-5, -1, 11, 1, '#8f3526', 'f'], [-1, -6, 2, 1, '#8f3526']],
  gorro: [[-4, -5, 9, 5, '#3f7abf'], [-4, -1, 9, 2, '#2a5a9a'], [-1, -7, 3, 2, '#f4efe4']],
  bandana: [[-5, -2, 11, 2, '#c4513a'], [-3, -2, 1, 1, '#fff'], [1, -2, 1, 1, '#fff'], [4, -1, 3, 3, '#c4513a']],
  capacete: [[-4, -5, 9, 4, '#f5c840'], [-5, -1, 11, 2, '#e0a820', 'f'], [-1, -4, 3, 1, '#fff2a8']],
  fone: [[-5, -4, 11, 1, '#2a2a30'], [-6, -3, 2, 4, '#3a3a44'], [5, -3, 2, 4, '#3a3a44'], [-6, -2, 1, 2, '#c4513a'], [6, -2, 1, 2, '#c4513a']],
  cartola: [[-3, -10, 7, 9, '#2a2a30'], [-3, -4, 7, 1, '#c4513a'], [-6, -1, 13, 2, '#2a2a30', 'f']],
  mago: [[-6, -1, 13, 2, '#3a2a6a', 'f'], [-4, -4, 9, 3, '#3a2a6a'], [-3, -7, 7, 3, '#3a2a6a'], [-2, -10, 5, 3, '#3a2a6a'], [0, -12, 3, 2, '#3a2a6a'], [-1, -6, 1, 1, '#f5e07a'], [2, -9, 1, 1, '#f5e07a']],
  coroa: [[-4, -3, 9, 3, '#e8b84a'], [-4, -5, 2, 2, '#e8b84a'], [0, -6, 2, 3, '#e8b84a'], [4, -5, 2, 2, '#e8b84a'], [-1, -2, 2, 1, '#d9473a']],
};
function hat(c, id, a) {
  const shapes = HATS[id]; if (!shapes) return;
  const side = a.face === 'E' || a.face === 'W', dir = a.dir || 1;
  // sombra de contorno primeiro (junta tudo), depois as cores
  const pos = shapes.map(([dx, dy, w, h, col, f]) => {
    let x = a.cx + dx + (side && f ? 1.5 * dir : 0);
    if (side && dir < 0) x = a.cx - (dx + w - 1) - (f ? 1.5 : 0) * 1; // espelha pro lado esquerdo
    return [x, a.b + dy, w, h, col];
  });
  pos.forEach(([x, y, w, h]) => R(c, x - 1, y - 1, w + 2, h + 2, OL));
  pos.forEach(([x, y, w, h, col]) => R(c, x, y, w, h, col));
}
function glasses(c, id, a) {
  if (a.face === 'N') return;
  const ring = (x, y) => { R(c, x - 2, y - 2, 5, 1, OL); R(c, x - 2, y + 2, 5, 1, OL); R(c, x - 2, y - 1, 1, 3, OL); R(c, x + 2, y - 1, 1, 3, OL); R(c, x - 1, y - 1, 1, 1, '#cfe8f5'); };
  const dark = (x, y) => { R(c, x - 3, y - 2, 6, 4, '#1a1a20'); R(c, x - 2, y - 2, 2, 1, '#5a5a70'); };
  if (a.face === 'S') {
    const l = a.cx - a.sep, r = a.cx + a.sep;
    if (id === 'oculos') { ring(l, a.ey); ring(r, a.ey); R(c, a.cx - 1, a.ey - 1, 3, 1, OL); }
    if (id === 'sol') { dark(l, a.ey); dark(r, a.ey); R(c, a.cx - 1, a.ey - 1, 3, 1, '#1a1a20'); }
    if (id === 'monoculo') { ring(r, a.ey); R(c, r + 3, a.ey + 3, 1, 5, '#e8b84a'); }
  } else {
    const x = a.ex, d = a.dir;
    if (id === 'oculos') { ring(x, a.ey); R(c, x - d * 3 - (d < 0 ? 3 : 0), a.ey - 1, 3, 1, OL); }
    if (id === 'sol') { dark(x - d, a.ey); R(c, x - d * 4 - (d < 0 ? 2 : 0), a.ey - 1, 3, 1, '#1a1a20'); }
    if (id === 'monoculo') { ring(x, a.ey); R(c, x + d * 3, a.ey + 3, 1, 4, '#e8b84a'); }
  }
}
function neck(c, id, a) {
  if (a.face === 'S' || a.face === 'N') {
    const y = a.face === 'S' ? a.ey + 5 : a.ty + 9, x = a.cx;
    if (id === 'cachecol') { B(c, x - 5, y, 11, 2, '#c4513a'); if (a.face === 'S') { B(c, x + 2, y + 2, 3, 4, '#c4513a'); R(c, x + 2, y + 4, 3, 1, '#f4efe4'); } }
    if (id === 'gravata' && a.face === 'S') { B(c, x - 3, y + 1, 3, 3, '#9b2a2a'); B(c, x + 1, y + 1, 3, 3, '#9b2a2a'); B(c, x - 1, y + 2, 2, 2, '#c4513a'); }
    if (id === 'medalha' && a.face === 'S') { R(c, x - 1, y, 1, 3, '#c4513a'); R(c, x + 1, y, 1, 3, '#c4513a'); B(c, x - 1, y + 3, 3, 3, '#e8b84a'); }
  } else {
    const d = a.dir, x = a.cx - d * 3 - (d < 0 ? 2 : 0), y = a.ey + 1;
    if (id === 'cachecol') { B(c, x, y, 3, 6, '#c4513a'); R(c, x, y + 2, 3, 1, '#f4efe4'); B(c, x - d * 1 - (d < 0 ? 0 : 0), y + 4, 2, 4, '#c4513a'); }
    if (id === 'gravata') { B(c, x, y + 3, 3, 3, '#9b2a2a'); }
    if (id === 'medalha') { B(c, x + (d > 0 ? 0 : 1), y + 4, 3, 3, '#e8b84a'); }
  }
}
function back(c, id, a) {
  if (id === 'mochila') {
    if (a.face === 'S') { R(c, a.cx - 5, a.ey + 6, 1, 5, '#7a5232'); R(c, a.cx + 5, a.ey + 6, 1, 5, '#7a5232'); }
    else if (a.face === 'N') { B(c, a.cx - 5, a.ty + 8, 10, 9, '#7a5232'); R(c, a.cx - 4, a.ty + 9, 8, 2, '#9a6c42'); R(c, a.cx - 1, a.ty + 13, 2, 2, '#e8c870'); }
    else { const d = a.dir, x = d > 0 ? a.ex - 15 : a.ex + 9; B(c, x, a.ey + 1, 6, 7, '#7a5232'); R(c, x + 1, a.ey + 2, 4, 2, '#9a6c42'); }
  }
  if (id === 'capa' || id === 'capaazul') {
    const col = id === 'capaazul' ? '#2a5ab0' : '#c4513a', dk = id === 'capaazul' ? '#1c3a80' : '#8f3526';
    if (a.face === 'S') { B(c, a.cx - 9, a.ey + 4, 3, 10, col); B(c, a.cx + 7, a.ey + 4, 3, 10, col); }
    else if (a.face === 'N') { B(c, a.cx - 6, a.ty + 8, 13, 11, col); R(c, a.cx - 6, a.ty + 16, 13, 3, dk); }
    else { const d = a.dir, x = d > 0 ? a.ex - 16 : a.ex + 8; B(c, x, a.ey + 1, 9, 9, col); R(c, x, a.ey + 7, 9, 2, dk); }
  }
}
/** pinta os acessórios no quadro. layer 'back' vai ANTES do bichinho (atrás do corpo); 'front' depois. */
export function drawBack(c, wear, tag, an) { if (wear?.back) back(c, wear.back, anchorOf(tag, an)); }
export function drawFront(c, wear, tag, an) {
  if (!wear) return;
  const a = anchorOf(tag, an);
  if (wear.neck) neck(c, wear.neck, a);
  if (wear.eyes) glasses(c, wear.eyes, a);
  if (wear.hat) hat(c, wear.hat, a);
}
