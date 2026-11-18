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
// ───── v6.3: MAPA MENTAL NUM QUADRO INFINITO (inspirado no PureRef e nos editores de mapa mental) ─────
// dados: core.mapa = { nodes: [{ id, x, y, text, c }], links: [{ id, a, b, d, c }] }  (d = tracejado, c = cor). O mapa escrito antigo vira balões sozinho.
// O mapa se redesenha sozinho (sem redesenhar a aba): não pula a tela e não perde o que está selecionado.
// Mouse: roda = zoom · arrastar o fundo = caixa de seleção · botão do meio/direito ou ESPAÇO + arrastar = mover o quadro.
// Toque: dois dedos = mover o quadro e dar zoom · um dedo no fundo = caixa de seleção · um dedo no balão = arrastar.
// Teclado (com o mapa ativo): Delete apaga · Ctrl+A tudo · Ctrl+Z/Y desfaz/refaz · Ctrl+C/V/D copiar/colar/duplicar · Tab = filho · Enter = escrever · setas = empurrar · F = ver tudo · Esc = soltar.
const MCOL = { madeira: '--c-acao', verde: '--c-ok', amarelo: '--c-atencao', vermelho: '--c-urg', azul: '--c-calma', roxo: '--c-espera', cinza: '--c-neutro' };
const NODE_H = 40;
const nodeW = (t) => Math.min(240, Math.max(96, String(t || '').length * 7.4 + 28));
const nid = () => 'm' + Math.random().toString(36).slice(2, 9);
const VKEY = 'gamify-ui:mapview';
let D = null, src;                       // cópia de trabalho do mapa e de qual versão salva ela veio
let selN = new Set(), selL = new Set();  // balões e setas escolhidos
let linkMode = false, boxMode = false, active = false, space = false;
let view = (() => { try { return JSON.parse(localStorage.getItem(VKEY)) || null; } catch { return null; } })();
let G = null;                            // gesto em andamento (arrastar, caixa, mover quadro, pinça, ligar)
const touches = new Map();
const hist = [], fut = [];
let clip = null;

function fromSaved() {
  const m = S.core.mapa || {};
  if (m.nodes) return { nodes: m.nodes.map((n) => ({ ...n })), links: (m.links || []).map((l) => ({ ...l })) };
  const tree = parseOutline(m.text), nodes = [], links = []; // mapa escrito (v5.16) → balões
  if (tree) { const { all } = layout(tree); const ids = new Map(); for (const n of all) { const id = nid(); ids.set(n, id); nodes.push({ id, x: n.x + 20, y: n.y + 20, text: n.text, c: n === tree ? 'madeira' : '' }); } for (const n of all) for (const k of n.kids) links.push({ id: nid(), a: ids.get(n), b: ids.get(k), d: false }); }
  return { nodes, links };
}
function data() { if (!D || src !== S.core.mapa) { D = fromSaved(); src = S.core.mapa; const ids = new Set(D.nodes.map((n) => n.id)); selN = new Set([...selN].filter((i) => ids.has(i))); selL = new Set([...selL].filter((i) => D.links.some((l) => l.id === i))); } return D; }
const snap = () => JSON.stringify({ nodes: data().nodes, links: data().links });
/** toda mudança passa aqui: guarda pra desfazer, salva (quieto) e redesenha só o mapa */
function change(fn, { keepHist = false } = {}) {
  const before = snap();
  fn(data());
  if (snap() === before) return;
  if (!keepHist) { hist.push(before); if (hist.length > 60) hist.shift(); fut.length = 0; }
  persist();
}
function persist() { A.setMapa({ nodes: D.nodes, links: D.links }); src = S.core.mapa; paint(); }
function restore(json) { const d = JSON.parse(json); D.nodes = d.nodes; D.links = d.links; selN.clear(); selL.clear(); persist(); }
const saveView = () => { try { localStorage.setItem(VKEY, JSON.stringify(view)); } catch { /* */ } };

// ───── desenho ─────
const colVar = (c) => (c && MCOL[c] ? `var(${MCOL[c]})` : 'var(--c-acao)');
function edgePt(a, b) { // a seta sai e chega na borda do balão (não no meio)
  const ax = a.x + nodeW(a.text) / 2, ay = a.y + NODE_H / 2, bx = b.x + nodeW(b.text) / 2, by = b.y + NODE_H / 2;
  const dx = bx - ax, dy = by - ay, k = (n) => Math.min(Math.abs((nodeW(n.text) / 2 + 3) / (dx || 1e-6)), Math.abs((NODE_H / 2 + 3) / (dy || 1e-6)));
  const ka = Math.min(0.5, k(a)), kb = Math.min(0.5, k(b));
  return [ax + dx * ka, ay + dy * ka, bx - dx * kb, by - dy * kb];
}
function linkPath(d, l) {
  const a = d.nodes.find((n) => n.id === l.a), b = d.nodes.find((n) => n.id === l.b);
  if (!a || !b) return '';
  const [x1, y1, x2, y2] = edgePt(a, b);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`;
}
const markers = () => `<defs>${['', ...Object.keys(MCOL)].map((k) => `<marker id="mma-${k || 'x'}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" style="fill:${colVar(k)}"/></marker>`).join('')}</defs>`;
function linksSvg(d) {
  return `<svg class="mm-links" width="1" height="1">${markers()}
    ${d.links.map((l) => `<g data-mlink="${l.id}" class="${selL.has(l.id) ? 'on' : ''}"><path class="hit" d="${linkPath(d, l)}"/><path class="ln" d="${linkPath(d, l)}" style="stroke:${colVar(l.c)}" ${l.d ? 'stroke-dasharray="7 6"' : ''} marker-end="url(#mma-${l.c && MCOL[l.c] ? l.c : 'x'})"/></g>`).join('')}
    <path class="mm-temp" d="" /></svg>`;
}
const nodeHtml = (n) => `<div class="mnode ${selN.has(n.id) ? 'on' : ''}" data-mnode="${n.id}" style="left:${n.x}px;top:${n.y}px;width:${nodeW(n.text)}px;${n.c ? `--mc:var(${MCOL[n.c]})` : ''}" title="Duplo clique pra escrever · arraste pra mover">${esc(n.text || '…')}${selN.size === 1 && selN.has(n.id) ? '<span class="mm-h" data-mhandle title="Arraste até outro balão pra ligar (ou solte no vazio pra criar um filho)"></span>' : ''}</div>`;
function worldHtml(d) {
  return `${linksSvg(d)}${d.nodes.map(nodeHtml).join('')}`;
}
function fitView(d, box) {
  const W0 = box?.clientWidth || 900, H0 = box?.clientHeight || 460;
  if (!d.nodes.length) return { x: 40, y: 40, z: 1 };
  const minX = Math.min(...d.nodes.map((n) => n.x)), minY = Math.min(...d.nodes.map((n) => n.y));
  const maxX = Math.max(...d.nodes.map((n) => n.x + nodeW(n.text))), maxY = Math.max(...d.nodes.map((n) => n.y + NODE_H));
  const z = Math.max(0.2, Math.min(1.4, Math.min((W0 - 60) / (maxX - minX || 1), (H0 - 60) / (maxY - minY || 1))));
  return { x: (W0 - (maxX - minX) * z) / 2 - minX * z, y: (H0 - (maxY - minY) * z) / 2 - minY * z, z };
}
function applyView(box) {
  const w = box.querySelector('.mm-world'); if (!w) return;
  w.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`;
  box.style.backgroundSize = `${22 * view.z}px ${22 * view.z}px`; box.style.backgroundPosition = `${view.x}px ${view.y}px`;
  const zl = box.closest('[data-gk="mapa"]')?.querySelector('.mm-zl'); if (zl) zl.textContent = `${Math.round(view.z * 100)}%`;
}
function toolsHtml() {
  const col = (k) => `<button type="button" class="mmap-sw" data-act="mm-color" data-c="${k}" style="--mc:var(${MCOL[k]})" title="Cor: ${k} (balões e setas escolhidos)"></button>`;
  const any = selN.size + selL.size;
  return `<button class="btn sm" data-act="mm-add" title="Novo balão (Tab = filho do escolhido)">＋ BALÃO</button>
    <button class="btn sm ${linkMode ? 'pri' : ''}" data-act="mm-link" title="Toque num balão e depois em outro pra ligar. Dica: arraste a bolinha do balão escolhido.">➝ LIGAR</button>
    <span class="mmap-cols">${Object.keys(MCOL).map(col).join('')}</span>
    <button class="btn sm" data-act="mm-dash" title="Setas escolhidas: tracejada ou cheia">┄</button>
    <button class="btn sm danger" data-act="mm-del" ${any ? '' : 'disabled'} title="Apagar o que está escolhido (tecla Delete)">🗑${any > 1 ? ' ' + any : ''}</button>
    <span class="mm-sp"></span>
    <button class="btn sm ghost" data-act="mm-undo" ${hist.length ? '' : 'disabled'} title="Desfazer no mapa (Ctrl+Z)">↶</button><button class="btn sm ghost" data-act="mm-redo" ${fut.length ? '' : 'disabled'} title="Refazer (Ctrl+Y)">↷</button>
    <button class="btn sm ghost" data-act="mm-zout" title="Afastar">−</button><span class="mm-zl meta" title="Zoom (roda do mouse ou dois dedos)">${Math.round((view?.z || 1) * 100)}%</span><button class="btn sm ghost" data-act="mm-zin" title="Aproximar">＋</button>
    <button class="btn sm ghost" data-act="mm-fit" title="Ver o mapa todo (tecla F)">⤢</button>
    ${data().nodes.length ? '<button class="btn sm ghost" data-act="mm-clear" title="Começar um mapa novo">LIMPAR</button>' : ''}`;
}
export function mapCard() {
  const d = data();
  return `<div class="card c12" data-gk="mapa"><header><h2 title="Quadro infinito: duplo clique no vazio cria um balão. Roda do mouse = zoom. Arraste o fundo = caixa de seleção. Botão do meio/direito ou ESPAÇO + arrastar = mover o quadro. Delete apaga.">🗺 Mapa mental</h2>
      <div class="row" style="gap:6px">${d.nodes.length ? `<button class="btn sm" data-act="map-png" title="Baixar o mapa como imagem">⬇ PNG</button><button class="btn sm" data-act="map-attach" title="Guardar o mapa como imagem numa tarefa">🖼 NA TAREFA</button><button class="btn sm pri" data-act="map-block" title="O balão escolhido (ou o primeiro) vira um bloco no BREAKDOWN; os ligados a ele viram tarefas e passos ↳">✅ VIRAR BLOCO</button>` : ''}</div></header>
    <div class="mm-tools">${toolsHtml()}</div>
    <div class="mm-box ${boxMode ? 'boxmode' : ''}" data-mmbox tabindex="0" aria-label="Quadro do mapa mental"><div class="mm-world">${worldHtml(d)}</div>
      <div class="mm-marq" hidden></div>
      ${d.nodes.length ? '' : '<div class="mm-empty">duplo clique (ou toque duas vezes) aqui pra criar o primeiro balão</div>'}
      <div class="mm-help meta">roda = zoom · arraste o fundo = selecionar · botão do meio (ou espaço) = mover · Delete apaga</div><div class="mm-help mm-help-t meta">2 dedos = mover e zoom · 1 dedo no fundo = selecionar</div></div></div>`;
}
/** redesenha só o mapa (balões, setas e botões), mantendo zoom e posição */
function paint() {
  const card = document.querySelector('[data-gk="mapa"]'); if (!card) return;
  const box = card.querySelector('[data-mmbox]'), d = data();
  card.querySelector('.mm-world').innerHTML = worldHtml(d);
  card.querySelector('.mm-tools').innerHTML = toolsHtml();
  box.classList.toggle('boxmode', boxMode);
  const empty = box.querySelector('.mm-empty'); if (empty && d.nodes.length) empty.remove();
  applyView(box);
  window.__deaccent?.(card.querySelector('.mm-tools'));
}
/** chamado depois de cada redesenho da aba: põe o zoom/posição de volta */
export function mountMap() {
  const box = document.querySelector('[data-mmbox]'); if (!box) return;
  if (!view) { view = fitView(data(), box); saveView(); }
  applyView(box);
}
const boxOf = (el) => el?.closest?.('[data-mmbox]');
const toWorld = (box, cx, cy) => { const r = box.getBoundingClientRect(); return { x: (cx - r.left - view.x) / view.z, y: (cy - r.top - view.y) / view.z }; };
function zoomAt(box, cx, cy, f) {
  const r = box.getBoundingClientRect(), px0 = cx - r.left, py0 = cy - r.top, z = Math.max(0.15, Math.min(3, view.z * f));
  view = { x: px0 - (px0 - view.x) * (z / view.z), y: py0 - (py0 - view.y) * (z / view.z), z }; applyView(box); saveView();
}
function nodeAtPoint(cx, cy) { return document.elementsFromPoint(cx, cy).find((e) => e.dataset?.mnode)?.dataset.mnode; }
function editNode(id) {
  const el = document.querySelector(`[data-mnode="${id}"]`); if (!el) return;
  const old = data().nodes.find((n) => n.id === id)?.text || '';
  el.querySelector('.mm-h')?.remove();
  el.contentEditable = 'true'; el.focus({ preventScroll: true }); document.getSelection()?.selectAllChildren(el);
  let cancel = false;
  const key = (e) => { if (e.key === 'Escape') { cancel = true; el.blur(); } };
  el.addEventListener('keydown', key);
  el.addEventListener('blur', () => { el.removeEventListener('keydown', key); el.contentEditable = 'false';
    const t = cancel ? old : el.textContent.trim().slice(0, 80) || '…';
    if (t !== old) change((d) => { const n = d.nodes.find((x) => x.id === id); if (n) n.text = t; }); else paint();
  }, { once: true });
}
function addNode(at, parent) {
  const id = nid();
  change((d) => {
    const p = parent && d.nodes.find((n) => n.id === parent);
    const kids = p ? d.links.filter((l) => l.a === p.id).length : 0;
    const x = at ? at.x - 60 : p ? p.x + nodeW(p.text) + 70 : (-view.x + 120) / view.z, y = at ? at.y - NODE_H / 2 : p ? p.y + kids * 56 - (kids ? 0 : 0) : (-view.y + 80) / view.z;
    d.nodes.push({ id, x: Math.round(x), y: Math.round(y), text: 'nova ideia', c: d.nodes.length ? '' : 'madeira' });
    if (p) d.links.push({ id: nid(), a: p.id, b: id, d: false });
  });
  selN = new Set([id]); selL.clear(); paint(); sfx('tab');
  setTimeout(() => editNode(id), 30);
}
function delSel() {
  if (!selN.size && !selL.size) return;
  change((d) => { d.nodes = d.nodes.filter((n) => !selN.has(n.id)); d.links = d.links.filter((l) => !selL.has(l.id) && !selN.has(l.a) && !selN.has(l.b)); });
  selN.clear(); selL.clear(); paint(); sfx('tab');
}
function copySel() { const d = data(); clip = { nodes: d.nodes.filter((n) => selN.has(n.id)), links: d.links.filter((l) => selN.has(l.a) && selN.has(l.b)) }; }
function paste(dx = 30, dy = 30) {
  if (!clip?.nodes.length) return;
  const map = new Map(clip.nodes.map((n) => [n.id, nid()]));
  change((d) => { for (const n of clip.nodes) d.nodes.push({ ...n, id: map.get(n.id), x: n.x + dx, y: n.y + dy }); for (const l of clip.links) d.links.push({ ...l, id: nid(), a: map.get(l.a), b: map.get(l.b) }); });
  selN = new Set(map.values()); selL.clear(); clip = { nodes: clip.nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy })), links: clip.links }; paint();
}
function toTree(d, rootId) {
  const byId = new Map(d.nodes.map((n) => [n.id, n])), seen = new Set();
  const build = (id) => { seen.add(id); const n = byId.get(id); return { text: n.text, kids: d.links.filter((l) => l.a === id && !seen.has(l.b) && byId.has(l.b)).map((l) => build(l.b)) }; };
  const root = rootId && byId.has(rootId) ? rootId : (d.nodes.find((n) => !d.links.some((l) => l.b === n.id)) || d.nodes[0])?.id;
  return root ? build(root) : null;
}
const oneSel = () => (selN.size === 1 ? [...selN][0] : null);
/** o mapa vira imagem: balões e setas como estão, com as cores, fundo de papel */
function exportSvg(d) {
  const cs = getComputedStyle(document.documentElement), v = (k, f) => cs.getPropertyValue(k).trim() || f;
  const minX = Math.min(...d.nodes.map((n) => n.x)) - 20, minY = Math.min(...d.nodes.map((n) => n.y)) - 20;
  const maxX = Math.max(...d.nodes.map((n) => n.x + nodeW(n.text))) + 20, maxY = Math.max(...d.nodes.map((n) => n.y + NODE_H)) + 20;
  const ink = v('--ink', '#3a2a20'), acao = v('--c-acao', '#9a5744'), panel = v('--panel', '#fbf5ea'), cv = (c) => (c && MCOL[c] ? v(MCOL[c], acao) : acao);
  const used = [...new Set(d.links.map((l) => (l.c && MCOL[l.c] ? l.c : 'x')))];
  const defs = used.map((k) => `<marker id="a-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${cv(k === 'x' ? '' : k)}"/></marker>`).join('');
  const links = d.links.map((l) => `<path d="${linkPath(d, l)}" fill="none" stroke="${cv(l.c)}" stroke-width="2" ${l.d ? 'stroke-dasharray="7 6"' : ''} marker-end="url(#a-${l.c && MCOL[l.c] ? l.c : 'x'})"/>`).join('');
  const nodes = d.nodes.map((n) => { const c = cv(n.c), w = nodeW(n.text), lines = wrap(n.text, Math.floor(w / 7.4)); return `<rect x="${n.x}" y="${n.y}" width="${w}" height="${NODE_H}" rx="12" fill="${panel}" stroke="${c}" stroke-width="3"/>${lines.map((l, i) => `<text x="${n.x + w / 2}" y="${n.y + NODE_H / 2 + (lines.length === 2 ? (i ? 11 : -3) : 4)}" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="${lines.length === 2 ? 10.5 : 12}" font-weight="700" fill="${ink}">${esc(l)}</text>`).join('')}`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" width="${maxX - minX}" height="${maxY - minY}"><rect x="${minX}" y="${minY}" width="100%" height="100%" fill="${v('--bg', '#f3eadc')}"/><defs>${defs}</defs>${links}${nodes}</svg>`;
}
async function svgToPng(svg) {
  const m = /width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/.exec(svg), w = +m[1], h = +m[2];
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
  const ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
const mapName = (d) => toTree(d, oneSel())?.text || 'mapa';

export function extendMapa(ACTIONS, FORMS) {
  // no rascunho, Enter solta e Shift+Enter pula linha; no balão, Enter termina de escrever
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.matches?.('form[data-form="scratch"] textarea')) { e.preventDefault(); e.target.closest('form').requestSubmit(); return; }
    if (e.key === 'Enter' && !e.shiftKey && e.target.matches?.('.mnode[contenteditable="true"]')) { e.preventDefault(); e.target.blur(); }
  });
  // atalhos do mapa (só quando ele está ativo); rodam antes dos atalhos do app
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && active && !e.target.isContentEditable && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { space = true; e.preventDefault(); return; }
    if (!active || !document.querySelector('[data-mmbox]') || e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key, mod = e.ctrlKey || e.metaKey, box = document.querySelector('[data-mmbox]');
    let done = true;
    if (k === 'Delete' || k === 'Backspace') delSel();
    else if (k === 'Escape') { selN.clear(); selL.clear(); linkMode = false; paint(); }
    else if (mod && k.toLowerCase() === 'a') { selN = new Set(data().nodes.map((n) => n.id)); selL = new Set(data().links.map((l) => l.id)); paint(); }
    else if (mod && k.toLowerCase() === 'z' && !e.shiftKey) ACTIONS['mm-undo']();
    else if (mod && (k.toLowerCase() === 'y' || (k.toLowerCase() === 'z' && e.shiftKey))) ACTIONS['mm-redo']();
    else if (mod && k.toLowerCase() === 'c') copySel();
    else if (mod && k.toLowerCase() === 'v') paste();
    else if (mod && k.toLowerCase() === 'd') { copySel(); paste(); }
    else if (k === 'Tab') addNode(null, oneSel());
    else if (k === 'Enter' && oneSel()) editNode(oneSel());
    else if (k === 'f' || k === 'F') { view = fitView(data(), box); applyView(box); saveView(); }
    else if (k.startsWith('Arrow') && selN.size) { const s = e.shiftKey ? 10 : 2, dx = k === 'ArrowLeft' ? -s : k === 'ArrowRight' ? s : 0, dy = k === 'ArrowUp' ? -s : k === 'ArrowDown' ? s : 0; change((d) => { for (const n of d.nodes) if (selN.has(n.id)) { n.x += dx; n.y += dy; } }); }
    else done = false;
    if (done) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') space = false; });
  // roda do mouse = zoom (a página não rola por baixo do mapa)
  document.addEventListener('wheel', (e) => { const box = boxOf(e.target); if (!box) return; e.preventDefault(); zoomAt(box, e.clientX, e.clientY, Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015))); }, { passive: false });
  document.addEventListener('contextmenu', (e) => { if (boxOf(e.target)) e.preventDefault(); });
  document.addEventListener('pointerdown', (e) => {
    const box = boxOf(e.target);
    active = !!box; if (!box) return;
    if (e.target.isContentEditable) return;
    box.focus({ preventScroll: true });
    const pt = { x: e.clientX, y: e.clientY };
    if (e.pointerType === 'touch') { touches.set(e.pointerId, pt); if (touches.size === 2) { // 2 dedos: o gesto de 1 dedo é desfeito e vira mover + zoom
      if (G?.t === 'move' && G.moved) { const d = JSON.parse(G.pre); D.nodes = d.nodes; D.links = d.links; paint(); }
      if (G?.t === 'marq') { box.querySelector('.mm-marq').hidden = true; selN = new Set(G.base); selL = new Set(G.baseL); paint(); }
      const [p1, p2] = [...touches.values()]; G = { t: 'pinch', d0: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1, v0: { ...view }, c: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } }; return; } }
    try { box.setPointerCapture?.(e.pointerId); } catch { /* ponteiro já solto */ }
    const nodeEl = e.target.closest('[data-mnode]'), handle = e.target.closest('[data-mhandle]'), linkEl = e.target.closest('[data-mlink]');
    if (e.button === 1 || e.button === 2 || space || false) { G = { t: 'pan', s: pt, v0: { ...view } }; e.preventDefault(); return; }
    if (handle) { G = { t: 'link', from: handle.closest('[data-mnode]').dataset.mnode, s: pt }; e.preventDefault(); return; }
    if (nodeEl) {
      const id = nodeEl.dataset.mnode;
      if (linkMode) { G = { t: 'tap', id, s: pt }; return; }
      const add = e.shiftKey || e.ctrlKey || e.metaKey, was = selN.has(id) && selN.size === 1;
      if (add) { selN.has(id) ? selN.delete(id) : selN.add(id); } else if (!selN.has(id)) { selN = new Set([id]); selL.clear(); }
      const d = data();
      G = { t: 'move', s: pt, id, was, add, pre: snap(), start: new Map(d.nodes.filter((n) => selN.has(n.id)).map((n) => [n.id, { x: n.x, y: n.y }])), moved: false };
      paint(); e.preventDefault(); return;
    }
    if (linkEl) { const id = linkEl.dataset.mlink; if (e.shiftKey || e.ctrlKey) { selL.has(id) ? selL.delete(id) : selL.add(id); } else { selL = new Set([id]); selN.clear(); } paint(); return; }
    // fundo: caixa de seleção
    if (!(e.shiftKey || e.ctrlKey)) { selN.clear(); selL.clear(); }
    G = { t: 'marq', s: pt, base: new Set(selN), baseL: new Set(selL), moved: false }; paint(); e.preventDefault();
  });
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' && touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!G) return;
    const box = document.querySelector('[data-mmbox]'); if (!box) { G = null; return; }
    if (G.t === 'pinch') { if (touches.size < 2) return; const [p1, p2] = [...touches.values()], r = box.getBoundingClientRect();
      const z = Math.max(0.15, Math.min(3, G.v0.z * Math.hypot(p1.x - p2.x, p1.y - p2.y) / G.d0)), c = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      view = { x: c.x - r.left - (G.c.x - r.left - G.v0.x) * (z / G.v0.z), y: c.y - r.top - (G.c.y - r.top - G.v0.y) * (z / G.v0.z), z }; applyView(box); return; }
    if (G.t === 'pan') { view = { ...G.v0, x: G.v0.x + e.clientX - G.s.x, y: G.v0.y + e.clientY - G.s.y }; applyView(box); return; }
    if (G.t === 'move') {
      const dx = (e.clientX - G.s.x) / view.z, dy = (e.clientY - G.s.y) / view.z;
      if (!G.moved && Math.hypot(e.clientX - G.s.x, e.clientY - G.s.y) < 4) return;
      G.moved = true;
      const d = data();
      for (const n of d.nodes) { const s0 = G.start.get(n.id); if (!s0) continue; n.x = Math.round(s0.x + dx); n.y = Math.round(s0.y + dy); const el = box.querySelector(`[data-mnode="${n.id}"]`); if (el) { el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; } }
      for (const g of box.querySelectorAll('[data-mlink]')) { const l = d.links.find((x) => x.id === g.dataset.mlink); if (l && (G.start.has(l.a) || G.start.has(l.b))) { const p = linkPath(d, l); for (const path of g.querySelectorAll('path')) path.setAttribute('d', p); } }
      return;
    }
    if (G.t === 'link') { const a = data().nodes.find((n) => n.id === G.from), w = toWorld(box, e.clientX, e.clientY); box.querySelector('.mm-temp')?.setAttribute('d', `M${a.x + nodeW(a.text) / 2} ${a.y + NODE_H / 2} L${w.x} ${w.y}`); return; }
    if (G.t === 'marq') {
      if (!G.moved && Math.hypot(e.clientX - G.s.x, e.clientY - G.s.y) < 4) return;
      G.moved = true;
      const r = box.getBoundingClientRect(), x1 = Math.min(G.s.x, e.clientX), y1 = Math.min(G.s.y, e.clientY), x2 = Math.max(G.s.x, e.clientX), y2 = Math.max(G.s.y, e.clientY);
      const m = box.querySelector('.mm-marq'); m.hidden = false; Object.assign(m.style, { left: x1 - r.left + 'px', top: y1 - r.top + 'px', width: x2 - x1 + 'px', height: y2 - y1 + 'px' });
      const a = toWorld(box, x1, y1), b = toWorld(box, x2, y2), d = data();
      selN = new Set([...G.base, ...d.nodes.filter((n) => n.x < b.x && n.x + nodeW(n.text) > a.x && n.y < b.y && n.y + NODE_H > a.y).map((n) => n.id)]);
      selL = new Set([...G.baseL, ...d.links.filter((l) => selN.has(l.a) && selN.has(l.b)).map((l) => l.id)]);
      for (const el of box.querySelectorAll('[data-mnode]')) el.classList.toggle('on', selN.has(el.dataset.mnode));
      for (const el of box.querySelectorAll('[data-mlink]')) el.classList.toggle('on', selL.has(el.dataset.mlink));
    }
  });
  const end = (e) => {
    if (e.pointerType === 'touch') { touches.delete(e.pointerId); if (G?.t === 'pinch') { if (!touches.size) { G = null; saveView(); } return; } }
    if (!G) return;
    const g = G; G = null;
    const box = document.querySelector('[data-mmbox]');
    if (g.t === 'pan') { saveView(); return; }
    if (g.t === 'move') {
      if (g.moved) { hist.push(g.pre); if (hist.length > 60) hist.shift(); fut.length = 0; persist(); return; }
      if (g.was && !g.add && e.type === 'pointerup') editNode(g.id); // tocar de novo no escolhido = escrever (bom no celular)
      return;
    }
    if (g.t === 'tap') { // modo LIGAR: 1º toque escolhe, 2º liga
      const first = oneSel();
      if (first && first !== g.id) { change((d) => { d.links.push({ id: nid(), a: first, b: g.id, d: false }); }); sfx('tab'); }
      selN = new Set([g.id]); selL.clear(); paint(); return;
    }
    if (g.t === 'link') {
      box?.querySelector('.mm-temp')?.setAttribute('d', '');
      const to = nodeAtPoint(e.clientX, e.clientY);
      if (to && to !== g.from) { if (!data().links.some((l) => l.a === g.from && l.b === to)) change((d) => { d.links.push({ id: nid(), a: g.from, b: to, d: false }); }); sfx('tab'); }
      else if (!to && box && Math.hypot(e.clientX - g.s.x, e.clientY - g.s.y) > 30) addNode(toWorld(box, e.clientX, e.clientY), g.from);
      return;
    }
    if (g.t === 'marq') { if (box) box.querySelector('.mm-marq').hidden = true; paint(); }
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  document.addEventListener('dblclick', (e) => {
    const box = boxOf(e.target); if (!box) return;
    const n = e.target.closest('[data-mnode]');
    if (n) { editNode(n.dataset.mnode); return; }
    if (e.target.closest('[data-mlink]')) return;
    addNode(toWorld(box, e.clientX, e.clientY), null);
  });
  Object.assign(FORMS, {
    scratch: (f) => { const v = f.text.value.trim(); if (!v) return; f.text.value = ''; A.addScratch(v); sfx('swish'); },
  });
  const box = () => document.querySelector('[data-mmbox]');
  Object.assign(ACTIONS, {
    'scratch-del': (d) => { A.delScratch(d.id); sfx('tab'); },
    'mm-add': () => addNode(null, oneSel()),
    'mm-link': () => { linkMode = !linkMode; paint(); if (linkMode) toast('➝ Toque num balão e depois no outro pra ligar.'); },
    'mm-color': (x) => { if (!selN.size && !selL.size) { toast('Escolha um balão ou uma seta primeiro (toque nele).'); return; } change((d) => { for (const n of d.nodes) if (selN.has(n.id)) n.c = x.c; for (const l of d.links) if (selL.has(l.id)) l.c = x.c; }); },
    'mm-dash': () => { if (!selL.size) { toast('Escolha uma seta primeiro (toque nela).'); return; } change((d) => { const on = !d.links.find((l) => selL.has(l.id))?.d; for (const l of d.links) if (selL.has(l.id)) l.d = on; }); },
    'mm-del': () => delSel(),
    'mm-undo': () => { if (!hist.length) return; fut.push(snap()); restore(hist.pop()); },
    'mm-redo': () => { if (!fut.length) return; hist.push(snap()); restore(fut.pop()); },
    'mm-zin': () => { const b = box(), r = b.getBoundingClientRect(); zoomAt(b, r.left + r.width / 2, r.top + r.height / 2, 1.25); },
    'mm-zout': () => { const b = box(), r = b.getBoundingClientRect(); zoomAt(b, r.left + r.width / 2, r.top + r.height / 2, 0.8); },
    'mm-fit': () => { const b = box(); view = fitView(data(), b); applyView(b); saveView(); },
    'mm-clear': async () => { const { ask } = await import('./ui.js'); if (await ask('Começar um mapa novo?', 'O mapa atual some. Dá pra voltar com ↶ enquanto esta tela estiver aberta. Se quiser guardar, baixe o PNG antes.', 'LIMPAR', true)) { change((d) => { d.nodes = []; d.links = []; }); selN.clear(); selL.clear(); paint(); } },
    'map-png': async () => {
      const d = data(); if (!d.nodes.length) return;
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
      const d = data(); if (!d.nodes.length) return;
      const blob = await svgToPng(exportSvg(d));
      await addImages(x.id, [new File([blob], `mapa-${slug(mapName(d))}.png`, { type: 'image/png' })]);
    },
    'map-block': () => {
      const d = data(), tree = toTree(d, oneSel()); if (!tree) return;
      const n = (function count(x) { return x.kids.reduce((a, k) => a + 1 + count(k), 0); })(tree);
      const r = A.mapToBlock(tree);
      if (r?.block) { sfx('upgrade'); toast(`✅ Virou o bloco <b>${esc(tree.text)}</b> no BREAKDOWN com ${n} item(ns).`, 'good'); }
    },
  });
}
