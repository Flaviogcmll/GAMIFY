// v6.5/v6.6 — A PRAGA: o "cartucho amaldiçoado". Tarefa ou ritual atrasado vira assombração caipira que corrompe o jogo
// (glitch de videogame antigo + mau-olhado, moscas, mariposa). Regras em rules.js → praga(); aqui fica o que se vê e se ouve.
// v8: a Praga é o SOPRO DO LAMBEHOMI contra a casa do PRIMO. Fases (1 por dia): 1-3 TREM TRAPAIADO (efeitos crescendo) · 4 LAMBEHOMI.
// PRAGA: R.noiteN(S) ou mais no LAMBEHOMI ao mesmo tempo. A cura é o BANHO DE SAL GROSSO (resolver, remarcar ou cancelar), sem XP.
// Moscas = podridão ("onde tem mosca, tem coisa podre"): a mosca guia pousa onde o trem está e as tarefas mostram 1, 2 ou 3 moscas.
// Janelas: com o app na fase 3 ou pior, CADA infectada aparece dentro de 7 minutos. Nunca por cima de outra janela,
// nunca enquanto você digita, nunca depois da hora de dormir. Tudo que anda na tela deixa o clique passar (pointer-events: none).
import { fig } from './elenco.js';
import { setDue } from './remarcar.js';
import { S } from './store.js';
import * as R from './rules.js';
import * as A from './actions.js';
import { esc, today, addDays } from './util.js';
import { openModal, closeModal, toast, modalOpen } from './ui.js';
import { sfx, playFile, pragaDrone, pragaWarp, uivo, zumbido, bagunca, salGrosso } from './audio.js';
import { mountPortraits } from './primo.js';

// v7.3: o PRIMO é destemido. Com a Praga ele fica PARANOICO (desconfiado, olhando de lado). Medo de verdade só na PRAGA.
const LINES = [
  'Hm. Tem um trem trapaiado rondando a casa. Eu tô de olho, sô.',
  'Ouvi um uivo longe. Essa atrasada não me engana não.',
  'Segue a mosca, primo. Onde tem mosca, tem coisa podre.',
  'Não tô com medo não. Só tô olhando de lado. Bem de lado.',
  'Esse trem tá soltando chorume… um banho de sal grosso resolve.',
  'O vento tá esquisito. Resolve, remarca ou larga, mas não deixa ela aí.',
  'Vi uma sombra de orelha pontuda no mato. O GUARANÁ tá emburrado. Hm.',
  'Que trem é esse, sô? Bora resolver antes que apodreça.',
];
const LINES_NOITE = [
  'Primo… a noite ficou vermelha. Agora eu tô com medo de verdade.',
  'Três uivos nos morros. Segura a BRASINHA, que eu seguro a porta.',
  'É a PRAGA! Banho de sal grosso, primo, AGORA!',
  'Ninguém solta a mão de ninguém. Fica atrás de mim, pequena.',
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
  guia: [['.ww...ww..', 'wwww.wwww.', '.wwwkwww..', '..kkkkk...', '.kkrkrkk..', '.kkkkkkk..', '..kkkkk...', '...k.k....'], ['..........', 'ww.....ww.', 'wwwwkwwww.', '..kkkkk...', '.kkrkrkk..', '.kkkkkkk..', '..kkkkk...', '...k.k....']],
  alma: [['....yyyy....', '...ybbbby...', '..yyyyyyyy..', '...wwwwww...', '..wwkwwkww..', '..wwwwwwww..', '.wwwwkkwwww.', '.wwwwwwwwwwr', 'wwwwwwwwwwwy', 'wwwwwwwwww..', '.ww.www.ww..', '..w..w...w..'],
    ['....yyyy....', '...ybbbby...', '..yyyyyyyy..', '...wwwwww...', '..wwkwwkww..', '..wwwwwwww..', '.wwwwkkwwww.', '.wwwwwwwwwwy', 'wwwwwwwwwwwr', 'wwwwwwwwww..', 'w.ww.ww.w...', '.w..w..w....']],
  barata: [['.k....k.', '..kbbk..', '.kbbbbk.', 'kbbbbbbk', '.kbbbbk.', 'k.kbbk.k', '..k..k..'], ['k......k', '..kbbk..', '.kbbbbk.', '.bbbbbb.', 'kkbbbbkk', '..kbbk..', '.k....k.']],
};
// v8: as moscas das tarefas (1, 2, 3 e a auréola do LAMBEHOMI), montadas com a mosquinha pequena
function flies(W, H, spots, ring = false) {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  if (ring) for (let x = 0; x < W; x += 2) { const t = (x - (W - 1) / 2) / ((W - 1) / 2), dy = Math.round(((H - 1) / 2) * Math.sqrt(Math.max(0, 1 - t * t))); for (const y of [Math.round((H - 1) / 2) - dy, Math.round((H - 1) / 2) + dy]) if (g[y]) g[y][x] = 'y'; }
  for (const [ox, oy] of spots) SPR.mosca[0].forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && g[oy + y]) g[oy + y][ox + x] = ch; }));
  return g.map((r) => r.join(''));
}
const uri = (rows) => `url("data:image/svg+xml,${encodeURIComponent(pxSvg(rows, 2).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}")`;
let moscasSet = false;
function setMoscas(root) {
  if (moscasSet) return; moscasSet = true;
  root.style.setProperty('--m1', uri(flies(6, 5, [[0, 0]])));
  root.style.setProperty('--m2', uri(flies(13, 7, [[0, 2], [7, 0]])));
  root.style.setProperty('--m3', uri(flies(20, 7, [[0, 2], [7, 0], [14, 2]])));
  root.style.setProperty('--maur', uri(flies(23, 9, [[1, 1], [16, 3]], true)));
}

/** a cor da tela, a FAÍSCA, o PRIMO, os bichos e o som seguem a PIOR fase (chamado em todo render) */
export function pragaPaint() {
  const pg = R.praga(S), root = document.documentElement, route = location.hash || '#quests';
  if (pg.phase) root.dataset.praga = pg.phase; else delete root.dataset.praga;
  if (pg.noite) root.dataset.noite = '1'; else delete root.dataset.noite; // v8: PRAGA
  setMoscas(root);
  // LAMBEHOMI: a tela treme ao trocar de aba
  if (pg.phase >= 4 && route !== lastRoute) { const m = document.getElementById('main'); m?.classList.remove('praga-shake'); void m?.offsetWidth; m?.classList.add('praga-shake'); playFile('praga-chiado', { vol: 0.35 }); }
  lastRoute = route;
  if (pg.phase !== fxPhase) { if (pg.phase >= 4 && fxPhase < 4) setTimeout(() => uivo(), 1200); fxPhase = pg.phase; fx(pg); } // v7.7: o LAMBEHOMI chega uivando
  return pg;
}
/** faixa no topo de todas as abas a partir da fase 3 */
export function pragaBanner() {
  const pg = R.praga(S);
  if (pg.phase < 3) return '';
  const w = pg.worst, more = pg.list.length - 1;
  const lb = R.lobo(S), ovo = R.brasinha(S).egg;
  const fim = pg.noite ? (lb.tregua ? ', o LAMBEHOMI levou a BRASINHA e se curou (o GUARANÁ tá de trégua até amanhã), a MEGG DE FÁTIMA tá chocando o ovo e a loja trancou'
      : ovo ? ', a BRASINHA é OVO (não tem o que roubar: ele continua LAMBEHOMI até o ANTÍDOTO) e a loja trancou' : ', o LAMBEHOMI vem roubar a BRASINHA e a loja trancou')
    : pg.phase >= 4 ? ', a BRASINHA perdeu força e a loja trancou' : `. Se ficar, ela apodrece: o ${lb.st === 'lambehomi' ? 'LAMBEHOMI' : 'GUARANÁ vira LAMBEHOMI e'} sopra a casa`;
  return `<div class="banner praga-b" data-praga="${pg.phase}" ${pg.noite ? 'data-noite="1"' : ''}><span class="pb-tag">${pg.noite ? '🌕 PRAGA' : pg.phase >= 4 ? '🐺 ERRO FATAL NA FITA' : '🪰 ERRO NA FITA'}</span>
    <span class="pb-t"><b>${pg.noite ? `${pg.n4} NO LAMBEHOMI: A NOITE FICOU VERMELHA` : pg.phase >= 4 ? 'O LAMBEHOMI TÁ SOPRANDO A CASA' : 'O TREM TRAPAIADO TÁ SOLTANDO CHORUME'}</b> · ${esc(w.text.slice(0, 60))} (atrasada há ${w.days} dia${w.days > 1 ? 's' : ''})${more > 0 ? ` e mais ${more}` : ''}. ${pg.noite ? 'O PRIMO está com medo de verdade' : 'O PRIMO tá paranoico'}${fim}.<i class="pb-cur">▮</i></span>
    <button class="btn sm pri" data-act="praga-pop" data-id="${w.id}">🧂 BANHO DE SAL GROSSO</button></div>`;
}
/** o que o PRIMO fala quando está infectado */
export function pragaLine() {
  const pg = R.praga(S);
  if (pg.phase < 2) return null;
  const L = pg.noite ? LINES_NOITE : LINES;
  return `${L[Math.floor(Date.now() / 60e3) % L.length]} (${pg.worst.text.slice(0, 40)})`;
}

// ───── efeitos: bichos andando, títulos corrompidos, o nome da tarefa rastejando, sons de fundo ─────
let layer = null, bugs = [], loop = 0, glitchT = 0, crawlT = 0, ambT = 0;
function fx(pg) {
  const ph = pg.phase;
  // v9.0 (pedido do dono: o ronco era estranho): os TREM fazem BAGUNÇA (latas, tralha, gato brigando) de vez em quando; o ronco e a música torta ficam só no LAMBEHOMI
  pragaDrone(ph >= 4 ? 2 : 0);
  pragaWarp(ph >= 4 ? 0.04 : 0);
  clearInterval(loop); clearInterval(glitchT); clearInterval(crawlT); clearInterval(ambT);
  layer?.remove(); layer = null; bugs = [];
  // v7.7: sons desde a fase 1, espaçados (o app é cozy). No LAMBEHOMI, uivos de vez em quando.
  if (ph >= 1) { ambT = setInterval(ambient, ph >= 4 ? 45e3 : ph >= 3 ? 60e3 : 90e3); scheduleGhost(); } else clearTimeout(ghostT);
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
  if (Math.random() < 0.25) bagunca(1);
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
  if (ph >= 4 && r < 0.45) uivo();
  else if (ph >= 1) bagunca(Math.min(3, ph)); // v9.0: os TREM fazendo bagunça (Tom e Jerry de roça)
}

// ───── a janela que pula ("ERRO NA FITA") ─────
// v8.3 (pedido do dono): ◄ ► passa pelas atrasadas sem fechar; remarcar ali mesmo (atalhos de data + motivo);
// depois de cancelar, remarcar ou fazer o ritual, a janela mostra a PRÓXIMA em vez de sumir.
const item = (id) => R.praga(S).list.find((x) => x.id === id);
const nextMon = (td) => { let d = addDays(td, 1); while (new Date(d + 'T12:00').getDay() !== 1) d = addDays(d, 1); return d; };
function popHtml(x) {
  const pg = R.praga(S), isT = x.kind === 'task', n = pg.list.length, i = Math.max(0, pg.list.findIndex((y) => y.id === x.id)), td = today();
  const nav = n > 1 ? `<div class="pp-nav"><button type="button" class="btn sm" data-act="praga-nav" data-i="${(i - 1 + n) % n}" aria-label="Anterior">◄</button><span class="meta">${i + 1} de ${n} atrasadas</span><button type="button" class="btn sm" data-act="praga-nav" data-i="${(i + 1) % n}" aria-label="Próxima">►</button></div>` : '';
  const days = [['AMANHÃ', addDays(td, 1)], ['+2', addDays(td, 2)], ['SEGUNDA', nextMon(td)], ['+7', addDays(td, 7)]];
  const L = pg.noite ? LINES_NOITE : LINES;
  return `<div class="praga-pop" data-praga="${x.phase}"><div class="pp-bar"><span>${x.phase >= 3 ? '⚠ ERRO NA FITA' : '⚠ ' + R.PRAGA_NAMES[x.phase]}</span><span>${String(Math.floor(Math.random() * 0xffff).toString(16)).toUpperCase().padStart(4, '0')}:${x.days}D</span></div>
    ${nav}
    <h2>${x.phase >= 4 ? '🐺' : '🪰'} ${R.PRAGA_NAMES[x.phase]} <small>fase ${x.phase} de 4</small></h2>
    <div class="pp-row">${fig('primo', 4, 'pav', 'PRIMO bravo')}
      <div><p class="pp-t"><b>${esc(x.text)}</b></p><p class="meta">${isT ? 'atrasada' : 'ritual atrasado'} há ${x.days} dia${x.days > 1 ? 's' : ''}</p>
      <p class="speech">${esc(L[Math.floor(Math.random() * L.length)])}</p></div></div>
    ${isT ? `<form class="pp-resched" data-form="praga-resched" data-id="${x.id}" autocomplete="off"><label class="lbl">📅 Remarcar pra</label>
      <div class="row pp-days">${days.map(([nm, d], k) => `<button type="button" class="pill ${k === 0 ? 'on' : ''}" data-act="set-field" data-name="due" data-v="${d}"><span>${nm}</span></button>`).join('')}<input class="inp" type="date" name="due" required min="${td}" value="${addDays(td, 1)}" style="width:auto"></div>
      <input class="inp" name="why" minlength="4" maxlength="120" placeholder="por que atrasou? (obrigatório pra remarcar)" aria-label="Motivo">
      ${(() => { const t = S.quests.tasks.find((y) => y.id === x.id); return t && R.reschedLocked(S, t) ? `<div class="boxlock"><b>🔒 Já remarcada ${t.rs}x:</b> marque um horário e quanto tempo (time box) pra empurrar de novo.
        <div class="row" style="margin-top:6px"><input class="inp" type="time" name="box_at" style="width:auto" aria-label="Horário">${['08:00', '10:00', '14:00', '16:00', '19:00'].map((h) => `<button type="button" class="pill" data-act="set-field" data-name="box_at" data-v="${h}"><span>${h}</span></button>`).join('')}
        <select class="inp" name="box_min" style="width:auto" aria-label="Duração">${[15, 25, 50, 90].map((m) => `<option value="${m}" ${m === 25 ? 'selected' : ''}>${m} min</option>`).join('')}</select></div></div>` : ''; })()}
      <div class="actions"><button type="button" class="btn" data-act="praga-cancel" data-id="${x.id}">✕ CANCELAR</button><button class="btn">📅 REMARCAR</button><button type="button" class="btn pri" data-act="praga-go" data-id="${x.id}">🧂 RESOLVER AGORA</button></div></form>
      <p class="meta" style="margin:4px 0 0">Resolver agora é o <b>🧂 BANHO DE SAL GROSSO</b> (o XP é o da tarefa; limpar não dá XP extra). Remarcar custa o de sempre; cancelar é grátis.</p>`
      : `<form class="pp-resched" data-form="praga-ritual" data-id="${x.id}" autocomplete="off"><label class="lbl">📅 Marcar o dia do ritual</label>
      <div class="row pp-days">${days.map(([nm, d], k) => `<button type="button" class="pill ${k === 0 ? 'on' : ''}" data-act="set-field" data-name="plan" data-v="${d}"><span>${nm}</span></button>`).join('')}<input class="inp" type="date" name="plan" required min="${td}" value="${addDays(td, 1)}" style="width:auto"></div>
      <div class="actions"><button class="btn">📅 MARCAR O DIA</button><button type="button" class="btn pri" data-act="praga-rit-done" data-id="${x.id}">🧂 FIZ O RITUAL</button></div></form>`}
    <p class="meta" style="text-align:right;margin:6px 0 0"><a href="#" data-close>agora não</a></p></div>`;
}
export function pragaPop(id) {
  const x = item(id) || R.praga(S).worst;
  if (!x) return;
  shown.set(x.id, Date.now()); lastPop = Date.now();
  openModal(popHtml(x));
  document.querySelector('.praga-pop')?.closest('.modal')?.classList.add('praga-modal');
  bagunca(Math.min(3, x.phase)); if (x.phase >= 4) setTimeout(() => uivo(0.6), 900);
  setTimeout(() => { try { mountPortraits(document.querySelector('.praga-pop')); } catch { /* */ } }, 30);
}
/** depois de uma ação na janela: mostra a próxima atrasada (ou fecha, se acabaram) */
function popNext(afterId) {
  setTimeout(() => {
    const l = R.praga(S).list.filter((x) => x.id !== afterId);
    if (l.length) pragaPop(l[0].id); else { closeModal(); toast('🧂 Nenhuma atrasada sobrando. A casa tá limpa!', 'good'); }
  }, 120);
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

// ───── a cura: BANHO DE SAL GROSSO (a tela limpa de baixo pra cima, com sal grosso e arruda) ─────
// v8.3: falas variadas (o dono achou repetido) e "o trem ficou organizado" no lugar de "se resolveu"
const SAL_SUB = ['o trem ficou organizado', 'roupa dobrada, papel no lugar', 'a mosca foi embora', 'cheiro de arruda no ar', 'a casa respirou', 'um trem a menos, uai'];
const SAL_TOAST = [
  (n) => `${n} ficou organizado. A mosca bateu asa.`, (n) => `${n}: roupa dobrada e papel no lugar. Trem bão!`,
  (n) => `Sal grosso na porta e ${n} se aquietou. Nó!`, (n) => `${n} saiu do caminho. O GUARANÁ até parou de rosnar.`,
  (n) => `Arruda, sal e coragem: ${n} tá organizado.`, (n) => `${n} já era. Bão demais da conta!`,
  (n) => `A CAJULINA carimbou: ${n}, ORGANIZADO.`, (n) => `${n} resolvido. A BRASINHA até deu um pulinho.`,
];
export const salToast = (name) => SAL_TOAST[Math.floor(Math.random() * SAL_TOAST.length)](name);
export function banhoSal(info) {
  salGrosso(); // v9.0: som novo, gerado no aparelho (grãos caindo + sininho)
  const el = document.createElement('div'); el.className = 'sal-fx'; el.setAttribute('aria-hidden', 'true');
  let parts = '';
  for (let i = 0; i < 26; i++) parts += `<i class="${i % 3 ? 'sal' : 'arruda'}" style="left:${(Math.random() * 100).toFixed(1)}%;animation-delay:${(Math.random() * 0.8).toFixed(2)}s"></i>`;
  el.innerHTML = `<div class="sg-luz"></div>${parts}<div class="sg-t">🧂 BANHO DE SAL GROSSO<br><small>${SAL_SUB[Math.floor(Math.random() * SAL_SUB.length)]}</small></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

export function extendPraga(ACTIONS, FORMS, jump) {
  lastPop = Date.now() - R.PRAGA_POP_MS + 90e3; // a 1ª janela vem 1 min e meio depois de abrir o app
  setInterval(tick, 20e3);
  Object.assign(ACTIONS, {
    'praga-pop': (d) => pragaPop(d.id),
    'praga-nav': (d) => { const l = R.praga(S).list, x = l[+d.i]; if (x) pragaPop(x.id); },
    'praga-go': (d) => { closeModal(); jump(d.id); },
    'praga-cancel': (d) => { A.setStatus(d.id, 'cancel'); popNext(d.id); },
    'praga-rit-done': (d) => { A.ritualDone(d.id); popNext(d.id); },
    'praga-resched': (d) => pragaPop(d.id), // (antigo botão: agora o remarcar mora na própria janela)
  });
  FORMS['praga-resched'] = (f) => {
    const id = f.dataset.id, due = f.due.value, why = f.why.value.trim();
    if (!due || why.length < 4) { toast('Escreva o motivo (é ele que limpa a praga).', 'bad'); sfx('error'); f.why.focus(); return; }
    const t = S.quests.tasks.find((y) => y.id === id); if (!t) return;
    const at = f.box_at?.value, box = at ? { at, min: +(f.box_min?.value || 25) } : null;
    if (f.box_at && !at) { toast('🔒 Marque o horário do time box pra empurrar de novo (ou cancele).', 'bad'); sfx('error'); return; }
    // v9.1: o caminho único de remarcar (bloco junto e custo perguntados na hora)
    setDue(id, due, { extra: { pragaLog: [...(t.pragaLog || []), { d: today(), why }].slice(-10), ...(box ? { box } : {}) }, reopen: () => pragaPop(id) }).then((ok) => { if (ok) popNext(id); });
  };
  FORMS['praga-ritual'] = (f) => { const id = f.dataset.id; if (!f.plan.value) return; A.planRitual(id, f.plan.value); popNext(id); };
}

// ───── v6.7: A ASSOMBRAÇÃO QUE PASSA (alma penada de chapéu de palha e lamparina). Tocar nela (xô!) mostra a tarefa ─────
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
  el.className = 'pfx-alma'; el.type = 'button'; el.dataset.act = 'praga-ghost'; el.title = 'Xô, assombração!'; el.setAttribute('aria-label', 'Assombração: toque pra mandar embora');
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
// ───── v6.7/v8.3: AS MOSCAS GUIA. Uma mosca em CADA lugar que tem coisa atrasada (tarefas E rituais: tudo o que faz a Praga),
// com o número quando é mais de uma. Tocar nela leva até lá e ela voa deixando uma trilha de fedor em espiral (pedido do dono).
function guideTarget(x, route, ui) {
  if (x.kind === 'ritual') {
    if (route !== 'survival' || ui.mm) return [...document.querySelectorAll('#tabs a[href="#survival"], #bottom a[href="#survival"]')].find((a) => a.offsetParent) || null;
    const row = document.querySelector(`[data-rit="${CSS.escape(x.id)}"]`); if (row) row.dataset.guia = '1';
    return null; // já está na tela: a linha do ritual só ganha o brilho
  }
  const where = R.pragaWhere(S, x.id); if (!where) return null;
  if (route !== 'quests' || ui.mm) return [...document.querySelectorAll('#tabs a[href="#quests"], #bottom a[href="#quests"]')].find((a) => a.offsetParent) || null;
  const tab = ui.qtab || 'listas';
  if (tab !== where.tab) return document.querySelector(`.qbar [data-act="qtab"][data-tab="${CSS.escape(where.tab)}"]`);
  const li = document.querySelector(`li.task[data-id="${CSS.escape(x.id)}"]`);
  if (li) li.dataset.guia = '1';
  return li && li.offsetParent ? null : document.querySelector(where.block ? `[data-k="b:${CSS.escape(where.block)}"]` : `[data-k="l:${CSS.escape(where.area || '')}"]`);
}
export function pragaGuide() {
  document.querySelectorAll('.mosca-guia').forEach((x) => x.remove());
  document.querySelectorAll('[data-guia]').forEach((x) => x.removeAttribute('data-guia'));
  const pg = R.praga(S);
  if (!pg.list.length || pg.phase < 1) return;
  const route = (location.hash || '#quests').slice(1), ui = window.__ui || {}, spots = new Map();
  for (const x of pg.list) { const t = guideTarget(x, route, ui); if (!t) continue; if (!spots.has(t)) spots.set(t, []); spots.get(t).push(x); }
  for (const [target, xs] of spots) {
    target.dataset.guia = '1';
    const w = xs[0], b = document.createElement('button');
    b.type = 'button'; b.className = 'mosca-guia'; b.dataset.act = 'praga-guide'; b.dataset.id = w.id; b.dataset.kind = w.kind;
    b.title = `${xs.length > 1 ? `${xs.length} coisas atrasadas por aqui` : `"${w.text.slice(0, 50)}" virou ${R.PRAGA_NAMES[w.phase]}`}. Onde tem mosca, tem coisa podre. Toque pra ir até lá.`;
    b.innerHTML = SPR.guia.map((f, i) => pxSvg(f, 2, `f${i}`)).join('') + (xs.length > 1 ? `<b class="mg-n">${xs.length}</b>` : '');
    if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
    target.appendChild(b);
  }
}
/** a trilha de fedor: a mosca voa de onde foi tocada até a coisa atrasada, fazendo um cachinho em espiral no fim */
function flyTrail(from, sel) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setTimeout(() => {
    const el = document.querySelector(sel); if (!el) return;
    const r = el.getBoundingClientRect(), sx = from.left + from.width / 2, sy = from.top + from.height / 2, ex = r.left + Math.min(r.width - 30, 60), ey = r.top + r.height / 2;
    if (ey < 0 || ey > innerHeight) return;
    const mx = (sx + ex) / 2, my = Math.min(sy, ey) - 80;
    const d = `M${sx} ${sy} Q${mx} ${my} ${ex} ${ey - 14} a14 14 0 1 1 -10 12 a9 9 0 1 1 6 -7 a4 4 0 1 1 -2 3`;
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'fedor-trilha'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<path d="${d}" pathLength="100"/>`;
    const m = document.createElement('div'); m.className = 'fedor-mosca'; m.innerHTML = pxSvg(SPR.mosca[0], 3); m.style.offsetPath = `path('${d}')`;
    document.body.append(svg, m); zumbido(0.8);
    setTimeout(() => { svg.remove(); m.remove(); }, 2200);
  }, 520);
}
export function extendPraga2(ACTIONS, jump) {
  Object.assign(ACTIONS, {
    'praga-guide': (d, e, el) => {
      const from = el?.getBoundingClientRect?.() || { left: innerWidth / 2, top: 80, width: 0, height: 0 };
      if (window.__ui) window.__ui.mm = false;
      if (d.kind === 'ritual') { // ritual atrasado: vai pro SURVIVAL, onde se marca o ritual
        if ((location.hash || '#quests') !== '#survival') location.hash = '#survival';
        setTimeout(() => { const row = document.querySelector(`[data-rit="${CSS.escape(d.id)}"]`); row?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 250);
        flyTrail(from, `[data-rit="${CSS.escape(d.id)}"]`); return;
      }
      jump(d.id); flyTrail(from, `li.task[data-id="${CSS.escape(d.id)}"]`);
    },
    'praga-ghost': (d, e, el) => {
      el?.classList.add('gone'); setTimeout(() => el?.remove(), 400);
      playFile('praga-sino', { vol: 0.5 }); sfx('swish');
      A.commit(['core'], () => { S.core.praga = { ...(S.core.praga || {}), ghosts: (S.core.praga?.ghosts || 0) + 1 }; }, { noUndo: true, quiet: true });
      toast('👻 Xô, assombração! Mas ela veio por causa daquela atrasada…');
      setTimeout(() => pragaPop(R.praga(S).worst?.id), 900);
    },
  });
}
