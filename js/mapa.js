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
    <form data-form="scratch" class="scratch-f" autocomplete="off"><textarea class="inp" name="text" rows="3" placeholder="escreva sem filtro… (Enter solta · Shift+Enter pula linha · some em 2 dias)" aria-label="Rascunho"></textarea><button class="btn pri">SOLTAR</button></form>
    ${list.length ? `<div class="scratch-l">${list.map((x) => `<div class="sn"><p>${esc(x.text)}</p><span class="sn-t" title="Some sozinho">⏳ ${left(x)}</span><button class="rx" data-act="scratch-del" data-id="${x.id}" title="Apagar agora" aria-label="Apagar">×</button></div>`).join('')}</div>` : ''}</div>`;
}
// ───── v6: MAPA MENTAL DE MONTAR (balões, cores, setas, tracejado) ─────
// dados: core.mapa = { nodes: [{ id, x, y, text, c }], links: [{ id, a, b, d }] }  (d = tracejado). O mapa escrito antigo vira balões sozinho.
const MCOL = { madeira: '--c-acao', verde: '--c-ok', amarelo: '--c-atencao', vermelho: '--c-urg', azul: '--c-calma', roxo: '--c-espera', cinza: '--c-neutro' };
let sel = null, linkMode = false, drag = null;
const nid = () => 'm' + Math.random().toString(36).slice(2, 9);
function mapData() {
  const m = S.core.mapa || {};
  if (m.nodes) return { nodes: m.nodes.map((n) => ({ ...n })), links: (m.links || []).map((l) => ({ ...l })) };
  const tree = parseOutline(m.text); // mapa escrito (v5.16) → balões
  const nodes = [], links = [];
  if (tree) { const { all } = layout(tree); const ids = new Map(); for (const n of all) { const id = nid(); ids.set(n, id); nodes.push({ id, x: n.x + 20, y: n.y + 20, text: n.text, c: n === tree ? 'madeira' : '' }); } for (const n of all) for (const k of n.kids) links.push({ id: nid(), a: ids.get(n), b: ids.get(k), d: false }); }
  return { nodes, links };
}
const save = (d) => A.setMapa(d);
const nodeW = (t) => Math.min(220, Math.max(96, String(t || '').length * 7.4 + 28)), NODE_H = 38;
function linkPath(d, l) {
  const a = d.nodes.find((n) => n.id === l.a), b = d.nodes.find((n) => n.id === l.b);
  if (!a || !b) return '';
  const ax = a.x + nodeW(a.text) / 2, ay = a.y + NODE_H / 2, bx = b.x + nodeW(b.text) / 2, by = b.y + NODE_H / 2;
  // a seta termina na borda do balão de chegada (não no meio dele)
  const dx = bx - ax, dy = by - ay, k = Math.min(1, Math.min(Math.abs((nodeW(b.text) / 2) / (dx || 1e-6)), Math.abs((NODE_H / 2 + 4) / (dy || 1e-6))));
  return `M${ax} ${ay} L${bx - dx * k} ${by - dy * k}`;
}
function linksSvg(d) {
  return `<svg class="mm-links" width="1800" height="1000"><defs><marker id="mm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--c-acao)"/></marker></defs>
    ${d.links.map((l) => `<g data-mlink="${l.id}" class="${sel?.type === 'link' && sel.id === l.id ? 'on' : ''}"><path class="hit" d="${linkPath(d, l)}"/><path class="ln" d="${linkPath(d, l)}" ${l.d ? 'stroke-dasharray="7 6"' : ''} marker-end="url(#mm-arrow)"/></g>`).join('')}</svg>`;
}
export function mapCard() {
  const d = mapData();
  const col = (k) => `<button type="button" class="mm-c" data-act="mm-color" data-c="${k}" style="--mc:var(${MCOL[k]})" title="${k}"></button>`;
  return `<div class="card c12" data-gk="mapa"><header><h2 title="Toque duas vezes no espaço vazio pra criar um balão. Arraste os balões. LIGAR: toque num balão e depois no outro.">🗺 Mapa mental</h2>
      <div class="row" style="gap:6px">${d.nodes.length ? `<button class="btn sm" data-act="map-png" title="Baixar o mapa como imagem">⬇ PNG</button><button class="btn sm" data-act="map-attach" title="Guardar o mapa como imagem numa tarefa">🖼 NA TAREFA</button><button class="btn sm pri" data-act="map-block" title="O balão escolhido (ou o primeiro) vira um bloco no BREAKDOWN; os ligados a ele viram tarefas e passos ↳">✅ VIRAR BLOCO</button>` : ''}</div></header>
    <div class="mm-tools"><button class="btn sm" data-act="mm-add">＋ BALÃO</button><button class="btn sm ${linkMode ? 'pri' : ''}" data-act="mm-link" title="Toque num balão e depois em outro pra ligar com uma seta">➝ LIGAR</button>
      <span class="mm-cols" title="Cor do balão escolhido">${Object.keys(MCOL).map(col).join('')}</span>
      <button class="btn sm" data-act="mm-dash" title="Seta escolhida: tracejada ou cheia">┄ TRACEJADO</button><button class="btn sm danger" data-act="mm-del" title="Apagar o balão ou a seta escolhida">🗑</button>
      ${d.nodes.length ? '<button class="btn sm ghost" data-act="mm-clear" title="Começar um mapa novo">LIMPAR</button>' : ''}</div>
    <div class="mm-box"><div class="mm-canvas" data-mmcanvas>${linksSvg(d)}
      ${d.nodes.map((n) => `<div class="mn ${sel?.type === 'node' && sel.id === n.id ? 'on' : ''}" data-mnode="${n.id}" style="left:${n.x}px;top:${n.y}px;width:${nodeW(n.text)}px;${n.c ? `--mc:var(${MCOL[n.c]})` : ''}" title="Toque duas vezes pra escrever">${esc(n.text || '…')}</div>`).join('')}
      ${d.nodes.length ? '' : '<div class="mm-empty">toque duas vezes aqui pra criar o primeiro balão</div>'}</div></div></div>`;
}
const redraw = () => { const el = document.querySelector('[data-gk="mapa"]'); if (el) { el.outerHTML = mapCard(); window.__deaccent?.(document.querySelector('[data-gk="mapa"]')); } };
function toTree(d, rootId) {
  const byId = new Map(d.nodes.map((n) => [n.id, n])), seen = new Set();
  const build = (id) => { seen.add(id); const n = byId.get(id); return { text: n.text, kids: d.links.filter((l) => l.a === id && !seen.has(l.b) && byId.has(l.b)).map((l) => build(l.b)) }; };
  const root = rootId && byId.has(rootId) ? rootId : (d.nodes.find((n) => !d.links.some((l) => l.b === n.id)) || d.nodes[0])?.id;
  return root ? build(root) : null;
}
/** o mapa vira imagem: balões e setas como estão na tela, com fundo de papel */
function exportSvg(d) {
  const cs = getComputedStyle(document.documentElement), v = (k, f) => cs.getPropertyValue(k).trim() || f;
  const minX = Math.min(...d.nodes.map((n) => n.x)) - 20, minY = Math.min(...d.nodes.map((n) => n.y)) - 20;
  const maxX = Math.max(...d.nodes.map((n) => n.x + nodeW(n.text))) + 20, maxY = Math.max(...d.nodes.map((n) => n.y + NODE_H)) + 20;
  const ink = v('--ink', '#2b241d'), acao = v('--c-acao', '#7a4a2c'), panel = v('--panel', '#fbf6ec');
  const links = d.links.map((l) => `<path d="${linkPath(d, l)}" fill="none" stroke="${acao}" stroke-width="2" ${l.d ? 'stroke-dasharray="7 6"' : ''} marker-end="url(#a)"/>`).join('');
  const nodes = d.nodes.map((n) => { const c = n.c ? v(MCOL[n.c], acao) : acao, w = nodeW(n.text), lines = wrap(n.text, Math.floor(w / 7.4)); return `<rect x="${n.x}" y="${n.y}" width="${w}" height="${NODE_H}" rx="12" fill="${panel}" stroke="${c}" stroke-width="3"/>${lines.map((l, i) => `<text x="${n.x + w / 2}" y="${n.y + NODE_H / 2 + (lines.length === 2 ? (i ? 11 : -3) : 4)}" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="${lines.length === 2 ? 10.5 : 12}" font-weight="700" fill="${ink}">${esc(l)}</text>`).join('')}`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" width="${maxX - minX}" height="${maxY - minY}"><rect x="${minX}" y="${minY}" width="100%" height="100%" fill="${v('--bg', '#f7f5f0')}"/><defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${acao}"/></marker></defs>${links}${nodes}</svg>`;
}
async function svgToPng(svg) {
  const m = /width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/.exec(svg), w = +m[1], h = +m[2];
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
  const ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
const mapName = (d) => toTree(d, sel?.type === 'node' ? sel.id : null)?.text || 'mapa';

export function extendMapa(ACTIONS, FORMS) {
  // no rascunho, Enter solta e Shift+Enter pula linha
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.matches?.('form[data-form="scratch"] textarea')) { e.preventDefault(); e.target.closest('form').requestSubmit(); return; }
    if (e.key === 'Enter' && !e.shiftKey && e.target.matches?.('.mn[contenteditable]')) { e.preventDefault(); e.target.blur(); }
  });
  // ── mapa: arrastar, escolher, ligar, escrever
  document.addEventListener('pointerdown', (e) => {
    const n = e.target.closest?.('[data-mnode]');
    if (!n || n.isContentEditable) return;
    const d = mapData(), node = d.nodes.find((x) => x.id === n.dataset.mnode);
    drag = { el: n, id: node.id, x0: e.clientX, y0: e.clientY, nx: node.x, ny: node.y, moved: false, d };
    n.setPointerCapture?.(e.pointerId);
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    const node = drag.d.nodes.find((x) => x.id === drag.id); node.x = Math.max(0, Math.round(drag.nx + dx)); node.y = Math.max(0, Math.round(drag.ny + dy));
    drag.el.style.left = node.x + 'px'; drag.el.style.top = node.y + 'px';
    const svg = document.querySelector('.mm-links'); if (svg) svg.outerHTML = linksSvg(drag.d);
  });
  document.addEventListener('pointerup', () => {
    if (!drag) return;
    const { id, moved, d } = drag; drag = null;
    if (moved) { save(d); return; }
    if (linkMode && sel?.type === 'node' && sel.id !== id) { d.links.push({ id: nid(), a: sel.id, b: id, d: false }); sel = { type: 'node', id }; save(d); sfx('tab'); return; }
    if (sel?.type === 'node' && sel.id === id) { document.querySelector(`[data-mnode="${id}"]`)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); return; } // tocar de novo = escrever (bom no celular)
    sel = { type: 'node', id }; redraw();
  });
  document.addEventListener('click', (e) => { const l = e.target.closest?.('[data-mlink]'); if (l) { sel = { type: 'link', id: l.dataset.mlink }; redraw(); } });
  document.addEventListener('dblclick', (e) => {
    const n = e.target.closest?.('[data-mnode]');
    if (n) { n.contentEditable = 'true'; n.focus(); document.getSelection()?.selectAllChildren(n); n.addEventListener('blur', () => { const d = mapData(), node = d.nodes.find((x) => x.id === n.dataset.mnode); if (node) { node.text = n.textContent.trim().slice(0, 80) || '…'; save(d); } }, { once: true }); return; }
    const c = e.target.closest?.('[data-mmcanvas]');
    if (!c) return;
    const r = c.getBoundingClientRect(), d = mapData(), id = nid();
    d.nodes.push({ id, x: Math.round(e.clientX - r.left - 60), y: Math.round(e.clientY - r.top - 19), text: 'nova ideia', c: d.nodes.length ? '' : 'madeira' });
    sel = { type: 'node', id }; save(d); sfx('tab');
    setTimeout(() => document.querySelector(`[data-mnode="${id}"]`)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })), 60);
  });
  Object.assign(FORMS, {
    scratch: (f) => { const v = f.text.value.trim(); if (!v) return; f.text.value = ''; A.addScratch(v); sfx('swish'); },
  });
  Object.assign(ACTIONS, {
    'scratch-del': (d) => { A.delScratch(d.id); sfx('tab'); },
    'mm-add': () => { const d = mapData(), id = nid(), base = sel?.type === 'node' && d.nodes.find((n) => n.id === sel.id);
      d.nodes.push({ id, x: base ? base.x + nodeW(base.text) + 60 : 40 + (d.nodes.length % 5) * 40, y: base ? base.y + (d.links.filter((l) => l.a === base.id).length) * 54 : 40 + d.nodes.length * 20, text: 'nova ideia', c: d.nodes.length ? '' : 'madeira' });
      if (base) d.links.push({ id: nid(), a: base.id, b: id, d: false });
      sel = { type: 'node', id }; save(d); sfx('tab'); setTimeout(() => document.querySelector(`[data-mnode="${id}"]`)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })), 60); },
    'mm-link': () => { linkMode = !linkMode; redraw(); if (linkMode) toast('➝ Toque num balão e depois no outro pra ligar.'); },
    'mm-color': (x) => { if (sel?.type !== 'node') { toast('Escolha um balão primeiro (toque nele).'); return; } const d = mapData(), n = d.nodes.find((y) => y.id === sel.id); if (n) { n.c = x.c; save(d); } },
    'mm-dash': () => { if (sel?.type !== 'link') { toast('Escolha uma seta primeiro (toque nela).'); return; } const d = mapData(), l = d.links.find((y) => y.id === sel.id); if (l) { l.d = !l.d; save(d); } },
    'mm-del': () => { if (!sel) { toast('Escolha um balão ou uma seta primeiro.'); return; } const d = mapData();
      if (sel.type === 'node') { d.nodes = d.nodes.filter((n) => n.id !== sel.id); d.links = d.links.filter((l) => l.a !== sel.id && l.b !== sel.id); } else d.links = d.links.filter((l) => l.id !== sel.id);
      sel = null; save(d); sfx('tab'); },
    'mm-clear': async () => { const { ask } = await import('./ui.js'); if (await ask('Começar um mapa novo?', 'O mapa atual some (o ↩ não desfaz isto). Se quiser guardar, baixe o PNG antes.', 'LIMPAR', true)) { sel = null; save({ nodes: [], links: [] }); } },
    'map-png': async () => {
      const d = mapData(); if (!d.nodes.length) return;
      const blob = await svgToPng(exportSvg(d)), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `mapa-${slug(mapName(d))}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      sfx('ready');
    },
    'map-attach': () => {
      const list = R.openTasks(S).sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 200);
      openModal(`<h2>🖼 guardar o mapa em qual tarefa?</h2><input class="inp" data-v4filter=".mapt" placeholder="🔍 buscar tarefa…" aria-label="Buscar" style="margin-bottom:8px">
        <div class="list mapt" style="max-height:50vh;overflow:auto">${list.map((t) => `<button class="li" style="width:100%;text-align:left;border:0;background:none;cursor:pointer" data-act="map-attach-to" data-id="${t.id}"><span class="lt">${esc(t.text.replace(/\s*\(\d+\s*XP\)/i, ''))}<small>${esc(t.block ? R.findBlock(S, t.block)?.title || '' : R.areaName(t.area))}</small></span></button>`).join('')}</div>
        <div class="actions"><button class="btn" data-close>CANCELAR</button></div>`);
    },
    'map-attach-to': async (x) => {
      closeModal();
      const d = mapData(); if (!d.nodes.length) return;
      const blob = await svgToPng(exportSvg(d));
      await addImages(x.id, [new File([blob], `mapa-${slug(mapName(d))}.png`, { type: 'image/png' })]);
    },
    'map-block': () => {
      const d = mapData(), tree = toTree(d, sel?.type === 'node' ? sel.id : null); if (!tree) return;
      const n = (function count(x) { return x.kids.reduce((a, k) => a + 1 + count(k), 0); })(tree);
      const r = A.mapToBlock(tree);
      if (r?.block) { sfx('upgrade'); toast(`✅ Virou o bloco <b>${esc(tree.text)}</b> no BREAKDOWN com ${n} item(ns).`, 'good'); }
    },
  });
}
