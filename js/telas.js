// v5.16 — REPAGINAÇÃO das abas esquecidas (FILTRO, CONQUISTAS, ARQUIVO, ROTINA, PERKS) no padrão de QUESTS e AGENDA:
// faixa de resumo no topo (os mesmos quadrinhos .stat da AGENDA), atalhos de 1 toque e cores com significado.
import { esc } from './util.js';

/** faixa de quadrinhos. Cada item: { label, value, sub, cls, tone, act, data, on }.
 *  tone = significado da cor (urg, quase, atencao, ok, calma, espera, neutro, premio): vira a faixa colorida no topo do quadrinho.
 *  act = o quadrinho vira botão (filtro de 1 toque). tip = legenda ao passar o mouse (no lugar de textinho embaixo). */
export function tiles(items) {
  return `<div class="stats tiles">${items.filter(Boolean).map((x) => {
    const tag = x.act ? 'button' : 'div';
    const data = Object.entries(x.data || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
    return `<${tag} class="stat ${x.act ? 'tap' : ''} ${x.on ? 'on' : ''}" ${x.tip ? `title="${esc(x.tip)}"` : ''} ${x.tone ? `data-tone="${x.tone}"` : ''} ${x.act ? `type="button" data-act="${x.act}" ${data}` : ''}><small>${x.label}</small><b class="${x.cls || ''}">${x.value}</b>${x.sub ? `<span>${x.sub}</span>` : ''}</${tag}>`;
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

// ───── v6 (5C) CURSOR PRÓPRIO: pincel mágico ou patinha do porquinho (escolha em PERKS → Ajustes; fica neste aparelho) ─────
// desenhados em pixel art aqui mesmo (originais): cada letra é uma cor, "." é transparente. A ponta (onde o clique acontece) é o canto de cima à esquerda.
const CUR_PAL = { K: '#3d2a20', W: '#fff4ce', C: '#e8c49a', k: '#2b1d14', w: '#fff7e0', y: '#f2c14e', o: '#e8793a', b: '#8a5a2b', d: '#5a3a1e', g: '#cfd6dd', p: '#f4a7b9', P: '#d9788f', s: '#ffe98a' };
const CURSORS = {
  // v6.3: SETA e MÃO do jogo (iguais às do sistema, em pixel, sem preto puro). A seta é o padrão; a mão aparece no que dá pra tocar.
  seta: ['K...............', 'KK..............', 'KWK.............', 'KWWK............', 'KWWCK...........', 'KWWWCK..........', 'KWWWWCK.........',
    'KWWWWWCK........', 'KWWWWWWCK.......', 'KWWWWKKKKK......', 'KWWKWWK.........', 'KWK.KWCK........', 'KK..KWCK........', 'K....KWCK.......', '.....KWCK.......', '......KK........'],
  mao: ['....KK..........', '...KWWK.........', '...KWWK.........', '...KWWK.........', '...KWWKKK.......', '...KWWKWWKKK....', '.KKKWWKWWKWWKK..', 'KWWKWWWWWWWWKWK.',
    'KWWKWWWWWWWWWWK.', '.KWWWWWWWWWWWCK.', '..KWWWWWWWWWWCK.', '..KWWWWWWWWWCK..', '...KWWWWWWWCK...', '...KWWWWWWWCK...', '....KKKKKKKK....', '................'],
  pincel: ['kk..............', 'kwyk...s........', '.kyok..........s', '..kook.....s....', '...kook.........', '....kgk.........', '.....kgk........', '......kbk.......', '.......kbk......', '........kbk.....', '.........kbk....', '..........kbk...', '...........kdk..', '............kdk.', '.............kk.', '................'],
  // v8.9 (pedido do dono): a PENA DA BRASINHA (cor de brasa); é o cursor padrão. v9.0: virada, com a PONTA dura onde o clique acontece e as plumas pra baixo
  pena: ['kk..............', 'kdk.............', '.kdk............', '..kdk...........', '.koyokk.........', '.koyoyok........', '..kooyook.......', '...kooyook......', '....kyoyook.....', '.....kyooyok....', '......koyook....', '.......kooyok...', '........kyook...', '..........koyk..', '...........kyk..', '.............k..'],
  // v9.0 (pedido do dono): nos botões, em vez da mãozinha, a pena PEGA FOGO
  penaFogo: ['kk..............', 'kdk.............', '.kdk............', '..kdk......s....', '.koyokk...sys...', '.koyoyok..syos..', '..kooyook.syos..', '...kooyookyoos..', '....kyoyookoos..', '.....kyooyokoys.', '......koyookoys.', '.......kooyokos.', '........kyookos.', '..........koykys', '...........kykos', '.............ks.'],
  patinha: ['.kk..kk.........', 'kPPkkPPk........', 'kPpkkpPk........', 'kPpkkpPk........', '.kppppk.........', '.kppppk.........', 'kppppppk........', 'kppwwppk........', 'kpppppppk.......', '.kpppppppk......', '..kppppppk......', '...kpppppk......', '....kkkkk.......', '................', '................', '................'],
};
const curUrl = (rows, hx = 1, hy = 1) => {
  let r = ''; rows.forEach((row, y) => [...row].forEach((ch, x) => { if (CUR_PAL[ch]) r += `<rect x="${x * 2}" y="${y * 2}" width="2" height="2" fill="${CUR_PAL[ch]}"/>`; }));
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">${r}</svg>`)}") ${hx} ${hy}`;
};
export const CURSOR_KEY = 'gamify-ui:cursor';
export function applyCursor() {
  let k = 'pena'; try { k = localStorage.getItem(CURSOR_KEY) || 'pena'; } catch { /* */ }
  const root = document.documentElement;
  if (!CURSORS[k] || k === 'mao' || k === 'penaFogo') { root.style.removeProperty('--cur'); root.style.removeProperty('--cur-hand'); delete root.dataset.cursor; return; }
  root.style.setProperty('--cur', curUrl(CURSORS[k]) + ', auto');
  root.style.setProperty('--cur-hand', k === 'pena' ? curUrl(CURSORS.penaFogo) + ', pointer' : k === 'seta' ? curUrl(CURSORS.mao, 9, 1) + ', pointer' : curUrl(CURSORS[k]) + ', pointer'); // v9.0: pena = a pena em chamas nos botões
  root.dataset.cursor = k;
}
