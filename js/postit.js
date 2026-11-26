// v6 — POST-IT (v7.5: até 4 ao mesmo tempo): cada bloco fixado (📌) vira um bilhete flutuante que acompanha você em TODAS as abas
// (QUESTS, AGENDA, SHOP…) pra anotar de qualquer lugar. Dá pra recolher (fica só a etiqueta) e arrastar pelo topo.
import { S } from './store.js';
import * as R from './rules.js';
import { esc } from './util.js';
import { taskRow } from './ui.js';
import { pinnedBlockIds } from './views/quests.js';

const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
const POS = 'gamify-ui:postit-pos', MIN = 'gamify-ui:postit-min'; // + ':' + id do bloco (v7.5: um por post-it)
let drag = null;

/** v7.5: um post-it por bloco fixado (até 4), cada um com a sua posição e o seu "recolhido" */
export function renderPostit() {
  const ids = pinnedBlockIds().filter((id) => S.quests?.blocks.some((x) => x.id === id && x.st !== 'done'));
  document.querySelectorAll('aside.postit').forEach((el) => { if (!ids.includes(el.dataset.id)) el.remove(); });
  ids.forEach((id, i) => one(id, i));
}
function one(id, i) {
  const b = S.quests.blocks.find((x) => x.id === id);
  let el = document.querySelector(`aside.postit[data-id="${id}"]`);
  // guarda o que estava sendo digitado (o post-it é redesenhado junto com a tela)
  const inp = el?.querySelector('input[name="text"]'), draft = inp?.value || '', focused = inp && document.activeElement === inp;
  if (!el) { el = document.createElement('aside'); el.className = 'postit'; el.dataset.id = id; el.setAttribute('aria-label', 'Post-it'); document.body.appendChild(el); }
  if (i === 0) el.id = 'postit'; else el.removeAttribute('id');
  const min = (ls.get(MIN + ':' + id) ?? (i === 0 ? ls.get(MIN) : null)) === '1', items = S.quests.tasks.filter((t) => t.block === b.id && R.isOpen(t)).sort((x, y) => x.ord - y.ord);
  el.classList.toggle('min', min);
  el.style.setProperty('--pi', i);
  el.innerHTML = `<header class="pi-h" title="Arraste por aqui"><b>📌 ${esc(b.title)}</b><span class="meta">${items.length}</span>
      <button class="icon-btn" data-pi="min" aria-label="${min ? 'Abrir' : 'Recolher'} post-it" title="${min ? 'Abrir' : 'Recolher'}">${min ? '▴' : '▾'}</button><button class="icon-btn" data-act="pin-block" data-id="${b.id}" aria-label="Guardar post-it" title="Guardar (tirar da tela)">×</button></header>
    ${min ? '' : `<ul class="tasks">${items.map((t) => taskRow(t)).join('') || '<div class="empty">vazio: anote abaixo.</div>'}</ul>`}
    <form class="addline" data-form="add-task" data-block="${b.id}" autocomplete="off"><input class="inp" name="text" placeholder="+ anotar aqui (Enter)" aria-label="Anotar no post-it"></form>`; // v8.3: dá pra anotar mesmo recolhido
  // v8.3: o post-it fica preso pela parte de BAIXO (left + bottom): abrir, recolher ou ganhar tarefa faz ele crescer pra cima,
  // e o campo de anotar não sai do lugar (antes ele pulava e o dono tinha que arrastar de novo pra escrever)
  const pos = (() => { try { return JSON.parse(ls.get(POS + ':' + id) || (i === 0 ? ls.get(POS) : 'null')); } catch { return null; } })();
  if (pos && innerWidth > 860) {
    const b0 = pos.b != null ? pos.b : Math.max(8, innerHeight - (pos.y + 60)); // posição antiga (topo) vira distância do pé da tela
    el.style.left = Math.max(4, Math.min(pos.x, innerWidth - 120)) + 'px'; el.style.bottom = Math.max(4, Math.min(b0, innerHeight - 60)) + 'px'; el.style.right = 'auto'; el.style.top = 'auto';
  }
  fitPostit(el);
  const ni = el.querySelector('input[name="text"]');
  if (ni && draft) ni.value = draft;
  if (ni && focused) ni.focus();
  window.__deaccent?.(el);
}

/** v9.3 (bug do dono: o post-it subia por cima do topo): ele cresce pra cima a partir do pé, mas NUNCA passa do topo da tela.
 *  A altura máxima é o espaço que sobra acima dele; a lista rola por dentro. */
function fitPostit(el) {
  const stick = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stick')) || 100;
  let b = parseFloat(el.style.bottom); if (isNaN(b)) b = parseFloat(getComputedStyle(el).bottom) || 18;
  if (innerHeight - b - stick < 180) { b = Math.max(4, innerHeight - stick - 180); el.style.bottom = b + 'px'; } // arrastado alto demais: desce até caber
  el.style.maxHeight = Math.max(140, innerHeight - b - stick - 10) + 'px';
}
addEventListener('resize', () => document.querySelectorAll('aside.postit').forEach(fitPostit));
// recolher e arrastar (cada post-it por si)
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('aside.postit [data-pi="min"]');
  if (!b) return;
  const id = b.closest('aside.postit').dataset.id, k = MIN + ':' + id;
  ls.set(k, (ls.get(k) ?? ls.get(MIN)) === '1' ? '0' : '1'); renderPostit();
});
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest?.('aside.postit .pi-h');
  if (!h || e.target.closest('button') || innerWidth <= 860) return;
  const el = h.closest('aside.postit'), r = el.getBoundingClientRect();
  drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, el };
  h.setPointerCapture?.(e.pointerId);
});
document.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const x = Math.max(4, Math.min(innerWidth - 120, e.clientX - drag.dx)), y = Math.max(4, Math.min(innerHeight - 50, e.clientY - drag.dy));
  Object.assign(drag.el.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' }); // enquanto arrasta, pelo topo; ao soltar, vira "pelo pé" 
});
document.addEventListener('pointerup', () => {
  if (!drag) return;
  const el = drag.el, r = el.getBoundingClientRect(), b = Math.max(4, Math.round(innerHeight - r.bottom));
  ls.set(POS + ':' + el.dataset.id, JSON.stringify({ x: Math.round(r.left), b }));
  Object.assign(el.style, { top: 'auto', bottom: b + 'px' }); drag = null; fitPostit(el);
});
