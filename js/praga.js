// v6.5/v6.6 — A PRAGA: o "cartucho amaldiçoado". Tarefa ou ritual atrasado vira assombração caipira que corrompe o jogo
// (glitch de videogame antigo + mau-olhado, encosto, urubu, mariposa). Regras em rules.js → praga(); aqui fica o que se vê e se ouve.
// Fases (1 por dia): 1 TREM RUIM · 2 ANGUSTIADO · 3 ENCOSTO · 4 A PRAGA. A cura é a REZA BRABA (fazer a tarefa).
// Janelas: com o app no ENCOSTO ou pior, CADA infectada aparece dentro de 7 minutos. Nunca por cima de outra janela,
// nunca enquanto você digita, nunca depois da hora de dormir. Tudo que anda na tela deixa o clique passar (pointer-events: none).
import { S } from './store.js';
import * as R from './rules.js';
import * as A from './actions.js';
import { esc, today, addDays } from './util.js';
import { openModal, closeModal, toast, modalOpen } from './ui.js';
import { sfx, playFile, pragaDrone, pragaWarp } from './audio.js';
import { mountPortraits } from './primo.js';

const LINES = [
  'Primo… tem um trem ruim aqui. Tô com medo.',
  'Ouvi um barulho no paiol. É essa atrasada, eu sei que é.',
  'Segue o urubu, primo. Ele tá pousado onde ela tá.',
  'Tô tremendo até o chapéu… resolve essa pra mim?',
  'Encosto pesado… só uma reza braba espanta isso.',
  'O cartucho tá chiando. Faz, remarca ou larga, mas não deixa ela aí.',
  'Vi uma alma passando com lamparina. Mau sinal.',
];
const shown = new Map(); // id → quando apareceu pela última vez
let lastPop = 0, lastRoute = '', fxPhase = 0;

// ───── pixel art (uma cor por letra; "." é vazio). Um <path> por cor, igual aos ícones do app ─────
const PAL = { k: '#241414', r: '#c0392b', b: '#5a3a2a', m: '#8a6a52', w: '#d8c8b0', g: '#6f7a3a', y: '#e8c87a' };
function pxSvg(rows, scale = 3, cls = '') {
  const paths = {};
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (PAL[ch]) (paths[ch] ||= []).push(`M${x} ${y}h1v1h-1z`); }));
  const w = rows[0].length, h = rows.length;
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges" aria-hidden="true">${Object.entries(paths).map(([c, d]) => `<path fill="${PAL[c]}" d="${d.join('')}"/>`).join('')}</svg>`;
}
const SPR = {
  mariposa: [['m......m', 'mm.bb.mm', 'mmmbbmmm', '.mmbbmm.', '...bb...', '........'], ['........', '..mbbm..', '.mmbbmm.', 'mmmbbmmm', 'm..bb..m', '........']],
  mosca: [['.w..w.', 'wwkkww', '.kkkk.', '.kkkk.', '..kk..'], ['w....w', '.wkkw.', '.kkkk.', '.kkkk.', '..kk..']],
  urubu: [['..kkk.....', '.kkrkk....', 'kkkkkkk...', '..kkkkkkk.', '..kkkkkkkk', '...kkkkk..', '....k.k...', '....k.k...']],
  alma: [['....yyyy....', '...ybbbby...', '..yyyyyyyy..', '...wwwwww...', '..wwkwwkww..', '..wwwwwwww..', '.wwwwkkwwww.', '.wwwwwwwwwwr', 'wwwwwwwwwwwy', 'wwwwwwwwww..', '.ww.www.ww..', '..w..w...w..'],
    ['....yyyy....', '...ybbbby...', '..yyyyyyyy..', '...wwwwww...', '..wwkwwkww..', '..wwwwwwww..', '.wwwwkkwwww.', '.wwwwwwwwwwy', 'wwwwwwwwwwwr', 'wwwwwwwwww..', 'w.ww.ww.w...', '.w..w..w....']],
  barata: [['.k....k.', '..kbbk..', '.kbbbbk.', 'kbbbbbbk', '.kbbbbk.', 'k.kbbk.k', '..k..k..'], ['k......k', '..kbbk..', '.kbbbbk.', '.bbbbbb.', 'kkbbbbkk', '..kbbk..', '.k....k.']],
};
const urubuUri = () => `url("data:image/svg+xml,${encodeURIComponent(pxSvg(SPR.urubu[0], 2).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}")`;

/** a cor da tela, a FAÍSCA, o PRIMO, os bichos e o som seguem a PIOR fase (chamado em todo render) */
export function pragaPaint() {
  const pg = R.praga(S), root = document.documentElement, route = location.hash || '#quests';
  if (pg.phase) root.dataset.praga = pg.phase; else delete root.dataset.praga;
  root.style.setProperty('--urubu', urubuUri());
  // A PRAGA: a tela treme ao trocar de aba
  if (pg.phase >= 4 && route !== lastRoute) { const m = document.getElementById('main'); m?.classList.remove('praga-shake'); void m?.offsetWidth; m?.classList.add('praga-shake'); playFile('praga-chiado', { vol: 0.35 }); }
  lastRoute = route;
  if (pg.phase !== fxPhase) { fxPhase = pg.phase; fx(pg); }
  return pg;
}
/** faixa no topo de todas as abas a partir do ENCOSTO */
export function pragaBanner() {
  const pg = R.praga(S);
  if (pg.phase < 3) return '';
  const w = pg.worst, more = pg.list.length - 1;
  return `<div class="banner praga-b" data-praga="${pg.phase}"><span class="pb-tag">${pg.phase >= 4 ? '💀 ERRO FATAL NA FITA' : '👻 ERRO NA FITA'}</span>
    <span class="pb-t"><b>${pg.phase >= 4 ? 'A PRAGA TOMOU CONTA' : 'TEM UM ENCOSTO NO JOGO'}</b> · ${esc(w.text.slice(0, 60))} (atrasada há ${w.days} dia${w.days > 1 ? 's' : ''})${more > 0 ? ` e mais ${more}` : ''}. O PRIMO está doente${pg.phase >= 4 ? ', a loja trancou e o XP caiu 20%' : ' e o XP caiu 10%'}.<i class="pb-cur">▮</i></span>
    <button class="btn sm pri" data-act="praga-pop" data-id="${w.id}">🙏 REZA BRABA</button></div>`;
}
/** o que o PRIMO fala quando está infectado */
export function pragaLine() {
  const pg = R.praga(S);
  if (pg.phase < 2) return null;
  return `${LINES[Math.floor(Date.now() / 60e3) % LINES.length]} (${pg.worst.text.slice(0, 40)})`;
}

// ───── efeitos: bichos andando, títulos corrompidos, o nome da tarefa rastejando, sons de fundo ─────
let layer = null, bugs = [], loop = 0, glitchT = 0, crawlT = 0, ambT = 0;
function fx(pg) {
  const ph = pg.phase;
  pragaDrone(ph >= 4 ? 2 : ph >= 2 ? 1 : 0);
  pragaWarp(ph >= 4 ? 0.06 : ph >= 3 ? 0.02 : 0);
  clearInterval(loop); clearInterval(glitchT); clearInterval(crawlT); clearInterval(ambT);
  layer?.remove(); layer = null; bugs = [];
  if (ph >= 2) { ambT = setInterval(ambient, 38e3); scheduleGhost(); } else clearTimeout(ghostT);
  if (ph < 3) return;
  layer = document.createElement('div'); layer.id = 'praga-fx'; layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const kinds = ph >= 4 ? ['mariposa', 'mariposa', 'mosca', 'mosca', 'barata', 'mosca', 'mariposa'] : ['mariposa', 'mosca', 'mosca', 'mariposa'];
  for (const k of kinds) {
    const el = document.createElement('div'); el.className = `pfx-bug ${k}`;
    el.innerHTML = SPR[k].map((f, i) => pxSvg(f, k === 'barata' ? 3 : 3, `f${i}`)).join('');
    layer.appendChild(el);
    const ground = k === 'barata';
    bugs.push({ el, ground, x: Math.random() * innerWidth, y: ground ? innerHeight - 30 - Math.random() * 40 : Math.random() * innerHeight * 0.8, a: Math.random() * 6.28, sp: ground ? 1.6 : 2.4 + Math.random() * 1.5, f: 0 });
  }
  loop = setInterval(step, 90);
  glitchT = setInterval(glitchTitle, ph >= 4 ? 4200 : 7000);
  if (ph >= 4) crawlT = setInterval(crawlName, 32e3);
}
function step() {
  if (document.hidden || !layer) return;
  for (const b of bugs) {
    b.a += (Math.random() - 0.5) * (b.ground ? 0.3 : 0.9);
    b.x += Math.cos(b.a) * b.sp; b.y += b.ground ? 0 : Math.sin(b.a) * b.sp;
    if (b.x < -30) b.x = innerWidth + 10; if (b.x > innerWidth + 30) b.x = -10;
    if (b.y < -30) b.y = innerHeight * 0.8; if (b.y > innerHeight + 10) b.y = 0;
    b.f ^= 1;
    b.el.style.transform = `translate(${b.x | 0}px, ${b.y | 0}px) scaleX(${Math.cos(b.a) < 0 ? -1 : 1})`;
    b.el.dataset.f = b.f;
  }
}
const GL = '▓▒░█▚▞#%&@';
function glitchTitle() {
  if (document.hidden || modalOpen()) return;
  const hs = [...document.querySelectorAll('main h2, main h1, .tabs a.on, .logo')].filter((h) => h.offsetParent && h.getBoundingClientRect().top < innerHeight);
  const h = hs[Math.floor(Math.random() * hs.length)]; if (!h) return;
  const nodes = []; const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.trim()) nodes.push([n, n.nodeValue]);
  for (const [n, v] of nodes) n.nodeValue = [...v].map((c) => (c !== ' ' && Math.random() < 0.45 ? GL[(Math.random() * GL.length) | 0] : c)).join('');
  h.classList.add('pfx-glitch');
  if (Math.random() < 0.35) playFile('praga-chiado', { vol: 0.18 });
  setTimeout(() => { for (const [n, v] of nodes) if (n.isConnected) n.nodeValue = v; h.classList.remove('pfx-glitch'); }, 260);
}
function crawlName() {
  if (document.hidden || !layer) return;
  const pg = R.praga(S); if (pg.phase < 4) return;
  const el = document.createElement('div'); el.className = 'pfx-crawl'; el.textContent = `${pg.worst.text.toUpperCase()} · ${pg.worst.text.toUpperCase()} · `;
  el.style.top = `${20 + Math.random() * 60}vh`;
  layer.appendChild(el); setTimeout(() => el.remove(), 14e3);
}
function ambient() {
  if (document.hidden) return;
  const ph = R.praga(S).phase, r = Math.random();
  if (ph >= 4 && r < 0.3) playFile('praga-canto', { vol: 0.55 });
  else if (ph >= 3 && r < 0.6) playFile('praga-sino', { vol: 0.5 });
  else if (ph >= 2) playFile('praga-corvo', { vol: 0.6 });
}

// ───── a janela que pula ("ERRO NA FITA") ─────
const item = (id) => R.praga(S).list.find((x) => x.id === id);
function popHtml(x) {
  const pg = R.praga(S), isT = x.kind === 'task';
  return `<div class="praga-pop" data-praga="${x.phase}"><div class="pp-bar"><span>${x.phase >= 3 ? '⚠ ERRO NA FITA' : '⚠ TREM RUIM'}</span><span>${String(Math.floor(Math.random() * 0xffff).toString(16)).toUpperCase().padStart(4, '0')}:${x.days}D</span></div>
    <h2>${x.phase >= 4 ? '💀' : x.phase >= 3 ? '👻' : x.phase >= 2 ? '😰' : '👁'} ${R.PRAGA_NAMES[x.phase]} <small>fase ${x.phase} de 4</small></h2>
    <div class="pp-row"><canvas class="pcv" data-portrait="mini" aria-hidden="true"></canvas>
      <div><p class="pp-t"><b>${esc(x.text)}</b></p><p class="meta">atrasada há ${x.days} dia${x.days > 1 ? 's' : ''}${pg.list.length > 1 ? ` · ${pg.list.length} com encosto no total` : ''}</p>
      <p class="speech">${esc(LINES[Math.floor(Math.random() * LINES.length)])}</p></div></div>
    <p class="meta">Fazer agora é a <b>🙏 REZA BRABA: +${R.PRAGA_XP[x.phase]} XP</b>. Remarcar (com motivo) ou cancelar também espanta, mas sem XP. Depois: 🛡 corpo fechado por 24 h.</p>
    <div class="actions">${isT ? `<button class="btn" data-act="praga-cancel" data-id="${x.id}">✕ CANCELAR</button><button class="btn" data-act="praga-resched" data-id="${x.id}">📅 REMARCAR</button><button class="btn pri" data-act="praga-go" data-id="${x.id}">🙏 FAZER AGORA</button>`
      : `<button class="btn" data-close>DEPOIS</button><button class="btn pri" data-act="ritual-done" data-id="${x.id}" data-close>🙏 FIZ O RITUAL</button>`}</div>
    ${isT ? '<p class="meta" style="text-align:right;margin:6px 0 0"><a href="#" data-close>agora não</a></p>' : ''}</div>`;
}
export function pragaPop(id) {
  const x = item(id) || R.praga(S).worst;
  if (!x) return;
  shown.set(x.id, Date.now()); lastPop = Date.now();
  openModal(popHtml(x));
  document.querySelector('.praga-pop')?.closest('.modal')?.classList.add('praga-modal');
  playFile(x.phase >= 3 ? 'praga-fita' : 'praga-chiado', { vol: 0.7 });
  if (x.phase >= 3) setTimeout(() => playFile(Math.random() < 0.5 ? 'praga-corvo' : 'praga-sino', { vol: 0.6 }), 700);
  setTimeout(() => { try { mountPortraits(document.querySelector('.praga-pop')); } catch { /* */ } }, 30);
}
/** relógio das janelas: roda a cada 20 s */
function tick() {
  const pg = R.praga(S);
  if (pg.phase < 3 || document.hidden || modalOpen()) return;
  const a = document.activeElement;
  if (a && (a.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(a.tagName))) return;
  if (R.neuroOn(S, 'curfew') && ['recolher', 'sono'].includes(R.bodyClock(S).key)) return;
  const gap = Math.max(60e3, R.PRAGA_POP_MS / pg.list.length); // cada infectada aparece dentro de 7 min
  if (Date.now() - lastPop < gap) return;
  const next = [...pg.list].sort((x, y) => (shown.get(x.id) || 0) - (shown.get(y.id) || 0) || y.phase - x.phase)[0];
  pragaPop(next.id);
}

// ───── a cura: REZA BRABA (a tela limpa de baixo pra cima, com arruda e sal grosso) ─────
export function rezaBraba(info) {
  playFile('reza', { vol: 0.9 });
  const el = document.createElement('div'); el.className = 'reza-fx'; el.setAttribute('aria-hidden', 'true');
  let parts = '';
  for (let i = 0; i < 26; i++) parts += `<i class="${i % 3 ? 'sal' : 'arruda'}" style="left:${(Math.random() * 100).toFixed(1)}%;animation-delay:${(Math.random() * 0.8).toFixed(2)}s"></i>`;
  el.innerHTML = `<div class="rz-luz"></div>${parts}<div class="rz-t">🙏 REZA BRABA${info?.xp ? ` · +${info.xp} XP` : ''}</div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

export function extendPraga(ACTIONS, FORMS, jump) {
  lastPop = Date.now() - R.PRAGA_POP_MS + 90e3; // a 1ª janela vem 1 min e meio depois de abrir o app
  setInterval(tick, 20e3);
  Object.assign(ACTIONS, {
    'praga-pop': (d) => pragaPop(d.id),
    'praga-go': (d) => { closeModal(); jump(d.id); },
    'praga-cancel': async (d) => { closeModal(); A.setStatus(d.id, 'cancel'); },
    'praga-resched': (d) => {
      const t = S.quests.tasks.find((y) => y.id === d.id); if (!t) return;
      openModal(`<form data-form="praga-resched" data-id="${t.id}"><h2>📅 remarcar · ${esc(String(t.text).slice(0, 50))}</h2>
        <label class="lbl">Nova data</label><input class="inp" type="date" name="due" required min="${today()}" value="${addDays(today(), 1)}">
        <label class="lbl">Por que atrasou? (obrigatório: é o que espanta o encosto)</label><input class="inp" name="why" required minlength="4" maxlength="120" placeholder="ex.: dependia do cliente, subestimei o tempo…" autofocus>
        <p class="meta">Remarcar custa o XP normal de remarcar. O motivo fica guardado na tarefa.</p>
        <div class="actions"><button type="button" class="btn" data-close>VOLTAR</button><button class="btn pri">REMARCAR E ESPANTAR</button></div></form>`);
    },
  });
  FORMS['praga-resched'] = (f) => {
    const id = f.dataset.id, due = f.due.value, why = f.why.value.trim();
    if (!due || why.length < 4) { toast('Escreva o motivo (é ele que espanta o encosto).', 'bad'); sfx('error'); return; }
    const t = S.quests.tasks.find((y) => y.id === id); if (!t) return;
    const r = A.updateTask(id, { due, pragaLog: [...(t.pragaLog || []), { d: today(), why }].slice(-10) });
    if (r?.error) { toast(r.error, 'bad'); return; }
    closeModal();
  };
}

// ───── v6.7: A ASSOMBRAÇÃO QUE PASSA (alma penada de chapéu de palha e lamparina). Tocar nela espanta e mostra a tarefa ─────
let ghostT = 0;
function scheduleGhost() {
  clearTimeout(ghostT);
  const ph = R.praga(S).phase;
  if (ph < 2) return;
  const wait = (ph >= 4 ? 70 : ph >= 3 ? 120 : 200) * 1e3 * (0.6 + Math.random() * 0.8);
  ghostT = setTimeout(() => { passGhost(); scheduleGhost(); }, wait);
}
export function passGhost() {
  const pg = R.praga(S);
  if (pg.phase < 2 || document.hidden || modalOpen()) return;
  document.querySelector('.pfx-alma')?.remove();
  const el = document.createElement('button');
  el.className = 'pfx-alma'; el.type = 'button'; el.dataset.act = 'praga-ghost'; el.title = 'Espantar a assombração'; el.setAttribute('aria-label', 'Assombração: toque pra espantar');
  const dir = Math.random() < 0.5 ? 1 : -1;
  el.innerHTML = SPR.alma.map((f, i) => pxSvg(f, 4, `f${i}`)).join('');
  el.style.top = `${18 + Math.random() * 50}vh`;
  el.style.setProperty('--dir', dir);
  el.classList.add(dir > 0 ? 'ltr' : 'rtl');
  document.body.appendChild(el);
  let f = 0; const bob = setInterval(() => { f ^= 1; el.dataset.f = f; }, 260);
  playFile('praga-alma', { vol: 0.7 });
  setTimeout(() => { clearInterval(bob); el.remove(); }, 9500);
}
// ───── v6.7: O URUBU GUIA. Pousa onde a tarefa infectada está; as cores vão puxando até lá; tocar nele leva até ela ─────
export function pragaGuide() {
  document.querySelectorAll('.urubu-guia').forEach((x) => x.remove());
  document.querySelectorAll('[data-guia]').forEach((x) => x.removeAttribute('data-guia'));
  const pg = R.praga(S), w = pg.list.find((x) => x.kind === 'task');
  if (!w || pg.phase < 1) return;
  const route = (location.hash || '#quests').slice(1), ui = window.__ui || {};
  const where = R.pragaWhere(S, w.id); if (!where) return;
  let target = null;
  if (route !== 'quests' || ui.mm) target = [...document.querySelectorAll('#tabs a[href="#quests"], #bottom a[href="#quests"]')].find((a) => a.offsetParent);
  else {
    const tab = ui.qtab || 'listas';
    if (tab !== where.tab) target = document.querySelector(`.qbar [data-act="qtab"][data-tab="${CSS.escape(where.tab)}"]`);
    else {
      const li = document.querySelector(`li.task[data-id="${CSS.escape(w.id)}"]`);
      target = li && li.offsetParent ? null : document.querySelector(where.block ? `[data-k="b:${CSS.escape(where.block)}"]` : `[data-k="l:${CSS.escape(where.area || '')}"]`);
      if (li) li.dataset.guia = '1';
    }
  }
  if (!target) return;
  target.dataset.guia = '1';
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'urubu-guia'; b.dataset.act = 'praga-guide'; b.dataset.id = w.id;
  b.title = `O urubu pousou aqui: "${w.text.slice(0, 50)}" está com ${R.PRAGA_NAMES[w.phase]}. Toque pra ir até ela.`;
  b.innerHTML = pxSvg(SPR.urubu[0], 2);
  if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
  target.appendChild(b);
}
export function extendPraga2(ACTIONS, jump) {
  Object.assign(ACTIONS, {
    'praga-guide': (d) => { playFile('praga-corvo', { vol: 0.6 }); if (window.__ui) window.__ui.mm = false; jump(d.id); },
    'praga-ghost': (d, e, el) => {
      el?.classList.add('gone'); setTimeout(() => el?.remove(), 400);
      playFile('praga-sino', { vol: 0.5 }); sfx('swish');
      A.commit(['core'], () => { S.core.praga = { ...(S.core.praga || {}), ghosts: (S.core.praga?.ghosts || 0) + 1 }; }, { noUndo: true, quiet: true });
      toast('👻 Espantou a assombração! Mas ela veio por causa daquela atrasada…');
      setTimeout(() => pragaPop(R.praga(S).worst?.id), 900);
    },
  });
}
