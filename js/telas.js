// v5.16 — REPAGINAÇÃO das abas esquecidas (FILTRO, CONQUISTAS, ARQUIVO, ROTINA, PERKS) no padrão de QUESTS e AGENDA:
// faixa de resumo no topo (os mesmos quadrinhos .stat da AGENDA), atalhos de 1 toque e cores com significado.
import { esc } from './util.js';

/** faixa de quadrinhos. Cada item: { label, value, sub, cls, tone, act, data, on }.
 *  tone = significado da cor (urg, quase, atencao, ok, calma, espera, neutro, premio): vira a faixa colorida no topo do quadrinho.
 *  act = o quadrinho vira botão (filtro de 1 toque). */
export function tiles(items) {
  return `<div class="stats tiles">${items.filter(Boolean).map((x) => {
    const tag = x.act ? 'button' : 'div';
    const data = Object.entries(x.data || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
    return `<${tag} class="stat ${x.act ? 'tap' : ''} ${x.on ? 'on' : ''}" ${x.tone ? `data-tone="${x.tone}"` : ''} ${x.act ? `type="button" data-act="${x.act}" ${data}` : ''}><small>${x.label}</small><b class="${x.cls || ''}">${x.value}</b>${x.sub ? `<span>${x.sub}</span>` : ''}</${tag}>`;
  }).join('')}</div>`;
}

/** PERKS: índice no topo com os cartões da página (1 toque leva até ele e abre se estiver recolhido) */
export function perksNav(main) {
  const page = main.querySelector('.page-title');
  if (!page || main.querySelector('.perks-nav')) return;
  const cards = [...main.querySelectorAll('.grid > .card > header > h2, .grid .sitem > .card > header > h2')];
  if (cards.length < 4) return;
  const nav = document.createElement('nav');
  nav.className = 'perks-nav';
  nav.setAttribute('aria-label', 'Índice de PERKS AND RULES');
  nav.innerHTML = `<button type="button" class="btn sm pri" data-act="backup-download">⬇ BAIXAR BACKUP</button>` + cards.map((h, i) => {
    const txt = h.textContent.replace(/^[▸▾]\s*/, '').split('·')[0].split(':')[0].trim();
    return `<button type="button" class="chip" data-act="perks-go" data-i="${i}">${esc(txt.slice(0, 28))}</button>`;
  }).join('');
  page.after(nav);
}
export function perksGo(i) {
  const h = [...document.querySelectorAll('main .grid > .card > header > h2, main .grid .sitem > .card > header > h2')][+i];
  const card = h?.closest('.card');
  if (!card) return;
  if (card.classList.contains('collapsed')) h.click(); // abre (o redesenho acontece no clique)
  setTimeout(() => { const again = [...document.querySelectorAll('main .grid > .card > header > h2, main .grid .sitem > .card > header > h2')][+i]?.closest('.card'); again?.scrollIntoView({ behavior: 'smooth', block: 'start' }); again?.classList.add('flash'); }, 60);
}
