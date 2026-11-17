// v5.16 (3A) — REFLEXÃO: rascunho que some em 2 dias (desatolar a cabeça) e MAPA MENTAL escrito como lista recuada.
// Cada linha é uma ideia; o recuo (espaço, tab ou "-") diz de quem ela é galho. O app desenha o mapa sozinho.
// Botões: SALVAR PNG · ANEXAR NA TAREFA (vira imagem da tarefa) · VIRAR BLOCO (raiz = bloco, galhos = tarefas, sub-galhos = passos ↳).
import { S } from './store.js';
import * as A from './actions.js';
import * as R from './rules.js';
import { esc } from './util.js';
import { openModal, closeModal, toast } from './ui.js';
import { sfx } from './audio.js';
import { addImages } from './imgs.js';

// ───── lista recuada → árvore ─────
export function parseOutline(text) {
  const lines = String(text || '').split('\n').map((l) => {
    const m = /^(\s*)(?:[-*•]\s*)?(.*)$/.exec(l.replace(/\t/g, '  '));
    return { depth: Math.floor(m[1].length / 2) + (/^\s*[-*•]/.test(l) && !m[1].length ? 1 : 0), text: m[2].trim() };
  }).filter((l) => l.text);
  if (!lines.length) return null;
  const root = { text: '', kids: [], depth: -1 }, stack = [root];
  for (const l of lines) {
    while (stack.length > 1 && stack.at(-1).depth >= l.depth) stack.pop();
    const node = { text: l.text, kids: [], depth: l.depth };
    stack.at(-1).kids.push(node); stack.push(node);
  }
  return root.kids.length === 1 ? root.kids[0] : { text: 'MAPA', kids: root.kids };
}

// ───── árvore → desenho (raiz à esquerda, galhos pra direita) ─────
const W = 170, H = 34, GX = 46, GY = 12;
function layout(tree) {
  let y = 0;
  const place = (n, d) => {
    n.x = d * (W + GX);
    if (!n.kids.length) { n.y = y; y += H + GY; } else { n.kids.forEach((k) => place(k, d + 1)); n.y = (n.kids[0].y + n.kids.at(-1).y) / 2; }
  };
  place(tree, 0);
  let maxX = 0; const all = []; const walk = (n) => { all.push(n); maxX = Math.max(maxX, n.x); n.kids.forEach(walk); }; walk(tree);
  return { all, w: maxX + W + 20, h: Math.max(y - GY, H) + 20 };
}
const wrap = (t, n = 22) => { const w = String(t).split(/\s+/), out = []; let cur = ''; for (const x of w) { if ((cur + ' ' + x).trim().length > n && cur) { out.push(cur); cur = x; } else cur = (cur + ' ' + x).trim(); } if (cur) out.push(cur); return out.slice(0, 2); };
/** cores do mapa = as da casa do app (madeira e dourado); fonte do sistema pra o PNG sair igual em qualquer aparelho */
export function mapSvg(tree, forExport = false) {
  if (!tree) return '';
  const { all, w, h } = layout(tree);
  const cs = getComputedStyle(document.documentElement), v = (k, f) => cs.getPropertyValue(k).trim() || f;
  const ink = v('--ink', '#2b241d'), acao = v('--c-acao', '#7a4a2c'), premio = v('--c-premio', '#b8862a'), panel = v('--panel', '#fbf6ec'), bg = v('--bg', '#f7f5f0');
  const links = all.flatMap((n) => n.kids.map((k) => `<path d="M${n.x + W} ${n.y + H / 2 + 10} C ${n.x + W + GX / 2} ${n.y + H / 2 + 10}, ${k.x - GX / 2} ${k.y + H / 2 + 10}, ${k.x} ${k.y + H / 2 + 10}" fill="none" stroke="${acao}" stroke-width="2" opacity=".55"/>`)).join('');
  const boxes = all.map((n) => { const root = n === tree, lines = wrap(n.text); return `<g><rect x="${n.x}" y="${n.y + 10}" width="${W}" height="${H}" rx="10" fill="${root ? acao : panel}" stroke="${root ? acao : premio}" stroke-width="2"/>
    ${lines.map((l, i) => `<text x="${n.x + W / 2}" y="${n.y + 10 + H / 2 + (lines.length === 2 ? (i ? 11 : -3) : 4)}" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="${lines.length === 2 ? 10.5 : 12}" font-weight="700" fill="${root ? '#fff7ef' : ink}">${esc(l)}</text>`).join('')}</g>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ${forExport ? '' : 'class="mapsvg"'}>${forExport ? `<rect width="100%" height="100%" fill="${bg}"/>` : ''}${links}${boxes}</svg>`;
}
/** o desenho vira PNG (fundo de papel, 2x mais nítido) */
async function toPng(tree) {
  const svg = mapSvg(tree, true), m = /width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/.exec(svg), w = +m[1], h = +m[2];
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
  const ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
const slug = (t) => String(t || 'mapa').normalize('NFD').replace(/[^\w ]/g, '').trim().toLowerCase().replace(/\s+/g, '-').slice(0, 40) || 'mapa';

// ───── cartões da REFLEXÃO ─────
export function scratchCard() {
  const now = Date.now(), list = (S.core.scratch || []).filter((x) => now - x.at < A.SCRATCH_TTL).sort((a, b) => b.at - a.at);
  const left = (x) => { const h = Math.max(1, Math.round((A.SCRATCH_TTL - (now - x.at)) / 3600e3)); return h >= 24 ? `${Math.round(h / 24)}d` : `${h}h`; };
  return `<div class="card c12" data-gk="rascunho"><header><h2 title="Escreva o que está rodando na cabeça. Some sozinho em 2 dias: é só pra desatolar.">🫧 Descarregar a cabeça</h2></header>
    <form data-form="scratch" class="scratch-f" autocomplete="off"><textarea class="inp" name="text" rows="3" placeholder="escreva sem filtro… (some em 2 dias)" aria-label="Rascunho"></textarea><button class="btn pri">SOLTAR</button></form>
    ${list.length ? `<div class="scratch-l">${list.map((x) => `<div class="sn"><p>${esc(x.text)}</p><span class="sn-t" title="Some sozinho">⏳ ${left(x)}</span><button class="rx" data-act="scratch-del" data-id="${x.id}" title="Apagar agora" aria-label="Apagar">×</button></div>`).join('')}</div>` : ''}</div>`;
}
export function mapCard() {
  const text = S.core.mapa?.text || '', tree = parseOutline(text);
  return `<div class="card c12" data-gk="mapa"><header><h2 title="Escreva uma ideia por linha. O recuo (2 espaços ou -) diz de quem ela é galho.">🗺 Mapa mental</h2>
      <div class="row" style="gap:6px">${tree ? `<button class="btn sm" data-act="map-png" title="Baixar o mapa como imagem">⬇ PNG</button><button class="btn sm" data-act="map-attach" title="Guardar o mapa como imagem numa tarefa">🖼 NA TAREFA</button><button class="btn sm pri" data-act="map-block" title="A primeira linha vira um bloco no BREAKDOWN; os galhos viram tarefas e passos ↳">✅ VIRAR BLOCO</button>` : ''}</div></header>
    <div class="mapgrid"><textarea class="inp mapsrc" data-change="mapa" rows="12" spellcheck="false" aria-label="Texto do mapa" placeholder="COMPRAR O APÊ&#10;  juntar a entrada&#10;    guardar 3000 por mês&#10;  escolher o bairro&#10;    visitar 3 imóveis">${esc(text)}</textarea>
      <div class="mapview" id="mapview">${tree ? mapSvg(tree) : '<div class="empty">escreva ao lado: uma ideia por linha, com recuo pros galhos.</div>'}</div></div></div>`;
}

export function extendMapa(ACTIONS, FORMS) {
  // o desenho acompanha a digitação (sem salvar a cada tecla; salva ao sair do campo)
  document.addEventListener('input', (e) => {
    if (!e.target.matches?.('.mapsrc')) return;
    const v = document.getElementById('mapview'), tree = parseOutline(e.target.value);
    if (v) v.innerHTML = tree ? mapSvg(tree) : '<div class="empty">escreva ao lado: uma ideia por linha, com recuo pros galhos.</div>';
  });
  Object.assign(FORMS, {
    scratch: (f) => { const v = f.text.value.trim(); if (!v) return; f.text.value = ''; A.addScratch(v); sfx('swish'); },
  });
  Object.assign(ACTIONS, {
    'scratch-del': (d) => { A.delScratch(d.id); sfx('tab'); },
    'map-png': async () => {
      const tree = parseOutline(S.core.mapa?.text); if (!tree) return;
      const blob = await toPng(tree), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `mapa-${slug(tree.text)}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      sfx('ready');
    },
    'map-attach': () => {
      const list = R.openTasks(S).sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 200);
      openModal(`<h2>🖼 guardar o mapa em qual tarefa?</h2><input class="inp" data-v4filter=".mapt" placeholder="🔍 buscar tarefa…" aria-label="Buscar" style="margin-bottom:8px">
        <div class="list mapt" style="max-height:50vh;overflow:auto">${list.map((t) => `<button class="li" style="width:100%;text-align:left;border:0;background:none;cursor:pointer" data-act="map-attach-to" data-id="${t.id}"><span class="lt">${esc(t.text.replace(/\s*\(\d+\s*XP\)/i, ''))}<small>${esc(t.block ? R.findBlock(S, t.block)?.title || '' : R.areaName(t.area))}</small></span></button>`).join('')}</div>
        <div class="actions"><button class="btn" data-close>CANCELAR</button></div>`);
    },
    'map-attach-to': async (d) => {
      closeModal();
      const tree = parseOutline(S.core.mapa?.text); if (!tree) return;
      const blob = await toPng(tree);
      await addImages(d.id, [new File([blob], `mapa-${slug(tree.text)}.png`, { type: 'image/png' })]);
    },
    'map-block': () => {
      const tree = parseOutline(S.core.mapa?.text); if (!tree) return;
      const n = (function count(x) { return x.kids.reduce((a, k) => a + 1 + count(k), 0); })(tree);
      const r = A.mapToBlock(tree);
      if (r?.block) { sfx('upgrade'); toast(`✅ Virou o bloco <b>${esc(tree.text)}</b> no BREAKDOWN com ${n} item(ns).`, 'good'); }
    },
  });
}
