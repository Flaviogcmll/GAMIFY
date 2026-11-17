// CHAPÉU DE PALHA do porquinho clássico — desenhado no MESMO tamanho de pixel do sprite (grade 32x32), seguindo a cabeça quadro a quadro
// e mudando de forma conforme ele olha pra frente, pro lado (direita/esquerda) ou de costas.
// an = [topX, topY, x0, x1, y1] de cada quadro (calculado do próprio sprite). O chapéu pinta no canvas 32x32 do quadro.
const OL = '#3a2418';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };

/** de onde ele olha e onde fica a base do chapéu neste quadro (an = [topo x, topo y, x0, x1, y1]) */
function anchorOf(tag, an) {
  const [tx, ty, x0, x1] = an;
  const face = tag.endsWith('East') ? 'E' : tag.endsWith('West') ? 'W' : tag.endsWith('North') ? 'N' : 'S';
  if (face === 'S' || face === 'N') return { face, cx: tx, b: ty + 3 };
  const dir = face === 'E' ? 1 : -1;
  return { face, dir, cx: (face === 'E' ? x1 - 3 : x0 + 2) - dir * 3, b: ty + 3.5 };
}

// chapéu de palha: [dx, dy, largura, altura, cor, 'f' = sai pra frente quando de lado]; dy negativo = pra cima da base b
const PALHA = [[-4, -5, 9, 4, '#e6c35a'], [-4, -2, 9, 1, '#c4513a'], [-7, -1, 15, 2, '#d9b050', 'f']];
function hat(c, a) {
  const side = a.face === 'E' || a.face === 'W', dir = a.dir || 1;
  const pos = PALHA.map(([dx, dy, w, h, col, f]) => {
    let x = a.cx + dx + (side && f ? 1.5 * dir : 0);
    if (side && dir < 0) x = a.cx - (dx + w - 1) - (f ? 1.5 : 0); // espelha pro lado esquerdo
    return [x, a.b + dy, w, h, col];
  });
  pos.forEach(([x, y, w, h]) => R(c, x - 1, y - 1, w + 2, h + 2, OL)); // contorno primeiro (junta tudo), depois as cores
  pos.forEach(([x, y, w, h, col]) => R(c, x, y, w, h, col));
}
/** pinta o chapéu de palha no quadro do porquinho clássico */
export function drawFront(c, wear, tag, an) { if (wear?.hat) hat(c, anchorOf(tag, an)); }
