// O PRIMO — o centro do jogo. Rosto e busto desenhados (pdraw.js), expressões e um banco enorme de frases (falas.js),
// expedições, pedido do dia, armário, mascote FAÍSCA e diário (pstate.js). Aqui ficam a tela, as animações e as reações.
import { S } from './store.js';
import * as R from './rules.js';
import * as A from './actions.js';
import { esc, today, fmtDM } from './util.js';
import { openModal, closeModal, toast, segBar } from './ui.js';
import { sfx } from './audio.js';
import { confetti } from './fx.js';
import { drawPortrait, drawMascot, PW, PH } from './pdraw.js';
import { primoLine, lastExpr, bankSize } from './falas.js';
import { GROUPS, saberCount } from './saber.js';
import * as PS from './pstate.js';
import { say, bond } from './v35.js';
import { openClaude, claudeCount, expeditionLetter } from './claude.js';

const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); const h = (s / 3600) | 0; return `${h ? h + ':' : ''}${String(((s % 3600) / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

// ───────────────────────── o que ele está fazendo (itens em uso na loja mudam a cara dele) ─────────────────────────
const ACT = [
  [/JOGO|GAME/i, 'jogando', 'animado'], [/EPIS[OÓ]DIO|S[EÉ]RIE|FILME|CINEMA/i, 'assistindo', 'neutro'], [/SONECA|DORMIR/i, 'dormindo', 'dormindo'], [/BANHO/i, 'tomando banho quente', 'feliz'],
  [/SCROLL|INSTA|TIKTOK|REDES/i, 'no celular', 'suspeito'], [/DELIVERY|SOBREMESA|LANCHE|PIZZA|DOCE/i, 'comendo', 'apaixonado'], [/AULA|RD|CURSO/i, 'estudando', 'pensativo'], [/FOLGA|TARDE LIVRE/i, 'de folga', 'feliz'],
];
export function primoState() {
  const now = Date.now(), p = (S.loja?.purchases || []).find((x) => x.status === 'using' && x.endsAt > now), c = R.companion(S);
  if (p) { const a = ACT.find(([re]) => re.test(p.item)); return { act: a ? a[1] : 'aproveitando', label: a ? a[1] : 'aproveitando', expr: a ? a[2] : 'feliz', item: p.item, left: p.endsAt - now }; }
  if (c.mood === 'dormindo') return { act: 'idle', label: 'dormindo', expr: 'dormindo' };
  return { act: 'idle', label: c.mood === 'feliz' ? 'feliz da vida' : c.mood === 'cansado' ? 'cansado' : c.mood === 'envenenado' ? 'envenenado' : 'de olho na fogueira', expr: null };
}
/** o visual muda com buffs e debuffs: envenenado = esverdeado, cansado = murcho, em chama = pegando fogo */
function statusMood() {
  const st = R.dayStatus(S, today());
  if (st.has('envenenado') || st.has('miasma')) return 'poison';
  if (st.has('neblina') || st.has('fatigado') || st.has('preguica')) return 'tired';
  if (st.has('emchama') || st.has('embalo') || st.has('lenda')) return 'fire';
  return null;
}
function baseExpr() {
  const c = R.companion(S), st = primoState();
  if (st.expr) return st.expr;
  if (c.mood === 'envenenado') return 'enjoado';
  if (c.mood === 'cansado') return 'cansado';
  if (R.overdueTasks(S).length >= 3) return 'preocupado';
  return c.mood === 'feliz' ? 'feliz' : 'neutro';
}

// ───────────────────────── expressão e fala atuais ─────────────────────────
let rx = null, amb = null, talkUntil = 0, previewWear = null;
const curExpr = () => {
  const now = Date.now();
  if (rx && now < rx.until) return rx.expr;
  if (amb && now - amb.shownAt < 25000) return amb.expr;
  return baseExpr();
};
function ambient() {
  const now = Date.now();
  if (!amb || now - amb.at > 10 * 60000) { const text = primoLine('auto'); amb = { text, expr: lastExpr(), at: now, shownAt: now, typed: false }; }
  return amb;
}
/** o PRIMO reage a algo (tarefa feita, compra, carinho…): muda o rosto e fala */
export function primoReact(kind, ctx) {
  const text = primoLine(kind, ctx);
  rx = { text, expr: lastExpr(), until: Date.now() + 14000, typed: false };
  paintSpeech();
}
/** liga as reações às recompensas que o app mostra */
export function primoFeedback(fb) {
  if (fb.boss) return primoReact('boss');
  if (fb.levelUp) return primoReact('levelup');
  if (fb.achievements?.length) return primoReact('conquista');
  if (fb.bought) return primoReact('compra');
  if (fb.pedido) return primoReact('pedido_ok');
  if (fb.task && fb.xp > 0) {
    const t = fb.task, td = today(), n = { xp: fb.xp };
    if (t.due && t.due < td) return primoReact('atrasada_feita', n);
    if (fb.xp >= 60) return primoReact('tarefa_grande', n);
    return primoReact(t.due && t.due >= td && Math.random() < 0.35 ? 'tarefa_no_prazo' : 'tarefa', n);
  }
}
function saberSrc(el, g) {
  if (!el._saber) { const text = primoLine('saber', { group: g }); el._saber = { text, expr: lastExpr(), typed: false }; rx = { text, expr: lastExpr(), until: Date.now() + 14000, typed: true }; }
  return el._saber;
}
const tabCache = {};
function tabLine(route) {
  const c = tabCache[route], now = Date.now();
  if (c && now - c.at < 10 * 60000) return c;
  return (tabCache[route] = { text: primoLine('tab:' + route), expr: lastExpr(), at: now, typed: false });
}
/** escreve a fala nos lugares da tela que mostram o PRIMO (cartão, central, faixa de cada aba) */
export function paintSpeech() {
  const els = [...document.querySelectorAll('[data-pspeech]')];
  if (!els.length) return;
  const live = rx && Date.now() < rx.until;
  for (const el of els) {
    const kind = el.dataset.pspeech;
    const src = kind.startsWith('saber:') ? saberSrc(el, kind.slice(6)) : live ? rx : kind.startsWith('tab:') ? tabLine(kind.slice(4)) : ambient();
    if (el.dataset.said === src.text) continue;
    el.dataset.said = src.text;
    if (!src.typed) { src.typed = true; talkUntil = Date.now() + src.text.length * 26; say(el, src.text); } else if (!el.classList.contains('typing')) el.textContent = src.text;
  }
}

// ───────────────────────── desenho e animação ─────────────────────────
const MOUNTED = new Set();
let looping = false, last = 0, frame = 0;
const OFF = document.createElement('canvas'); OFF.width = PW; OFF.height = PH;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
function paint(cv) {
  const kind = cv.dataset.portrait, ctx = cv.getContext('2d');
  if (cv.dataset.mascot != null) { const ps = PS.petState(); drawMascot(ctx, ps.stage, frame, R.dailyGoal(S).today >= R.dailyGoal(S).goal); return; }
  const o = { tier: R.companion(S).tier, mood: statusMood(), expr: curExpr(), wear: kind === 'closet' && previewWear ? previewWear : PS.wearing(), talk: Date.now() < talkUntil, f: frame };
  if (kind === 'mini') { drawPortrait(OFF.getContext('2d'), o); ctx.clearRect(0, 0, 44, 44); ctx.drawImage(OFF, 14, 30, 44, 44, 0, 0, 44, 44); } else drawPortrait(ctx, o);
}
export function mountPortraits(root = document) {
  root.querySelectorAll('canvas[data-portrait], canvas[data-mascot]').forEach((cv) => {
    if (cv._pm) return;
    cv._pm = true;
    if (cv.dataset.mascot != null) { cv.width = 32; cv.height = 32; } else if (cv.dataset.portrait === 'mini') { cv.width = 44; cv.height = 44; } else { cv.width = PW; cv.height = PH; }
    MOUNTED.add(cv); paint(cv);
  });
  if (!looping && !still && MOUNTED.size) { looping = true; requestAnimationFrame(loop); }
  paintSpeech();
}
function loop(ts) {
  for (const c of [...MOUNTED]) if (!c.isConnected) MOUNTED.delete(c);
  if (!MOUNTED.size) { looping = false; return; }
  requestAnimationFrame(loop);
  if (document.hidden || ts - last < 110) return;
  last = ts; frame++;
  for (const cv of MOUNTED) { const r = cv.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) paint(cv); }
}
let notified = new Set();
/** roda depois de cada desenho da tela: liga os desenhos, evolui o mascote, avisa a volta da expedição, gera o diário */
export function primoAfterRender() {
  mountPortraits();
  const ev = PS.petSync();
  if (ev) { toast(`🔥 A FAÍSCA evoluiu: <b>${esc(ev.name)}</b>!`, 'gold'); sfx('level'); primoReact('mascote'); }
  const es = PS.expState();
  if (es.cur && es.ready && !notified.has(es.cur.start)) { notified.add(es.cur.start); toast(`🎒 O PRIMO voltou: <b>${esc(es.def.name)}</b>. Abra o que ele trouxe!`, 'gold'); sfx('chest'); primoReact('exp_volta'); }
  if (ls.get('gamify-ui:diary') !== today()) { ls.set('gamify-ui:diary', today()); PS.diarySync(); }
}

// ───────────────────────── o cartão e a central do PRIMO ─────────────────────────
const hearts = () => { const b = bond(); return `<span class="hearts" title="Amizade: ${b.pts} (afague, converse, cumpra pedidos)">${'♥'.repeat(b.hearts)}${'♡'.repeat(5 - b.hearts)}</span>`; };
function askHtml() {
  const a = PS.askInfo();
  return `<div class="pask ${a.done ? 'done' : a.ok ? 'ok' : ''}"><div class="pask-t">🎯 PEDIDO DO DIA</div><div>${esc(a.text)}</div>
    <div class="row" style="flex-wrap:nowrap;gap:8px;align-items:center">${segBar(a.target ? a.value / a.target : 0, 'sm')}<span class="meta">${a.value}/${a.target}</span>
    ${a.done ? '<span class="chip soon">✓ pego</span>' : `<button class="btn sm ${a.ok ? 'pri' : 'ghost'}" data-act="ask-claim" ${a.ok ? '' : 'disabled'}>+${a.xp} XP</button>`}</div></div>`;
}
function expHtml(big) {
  const es = PS.expState();
  if (es.cur) {
    const d = es.def;
    return `<div class="pexp"><div class="pask-t">${d.ico} ${esc(d.name.toUpperCase())}</div>${segBar(es.pct, 'sm')}
      <div class="row" style="flex-wrap:wrap;gap:6px;align-items:center">${es.ready ? '<button class="btn sm pri" data-act="exp-claim">🎒 ABRIR O QUE ELE TROUXE</button>' : `<span class="meta">volta em <b data-countdown="${es.cur.end}">${mmss(es.left)}</b> · tarefas e foco encurtam</span><button class="btn sm" data-act="exp-ticket" title="Gasta 1 ticket e ele volta agora">🎟 TERMINAR</button>`}</div></div>`;
  }
  if (!big) return '';
  return `<div class="pexp"><div class="pask-t">🎒 MANDAR EM EXPEDIÇÃO</div><div class="row" style="flex-wrap:wrap;gap:6px">${PS.EXPS.map((e) => `<button class="btn sm" data-act="exp-send" data-id="${e.id}" title="${e.xp[0]}–${e.xp[1]} XP${e.tk ? ' · chance de 🎟' : ''}">${e.ico} ${esc(e.name)}<small style="display:block;font-size:8px;opacity:.8">${PS.fmtMin(e.min)} · ${e.xp[0]}–${e.xp[1]} XP</small></button>`).join('')}</div></div>`;
}
function body(big) {
  const c = R.companion(S), st = primoState(), es = PS.expState(), pet = PS.petState(), n = claudeCount();
  const status = es.cur ? `${es.def.ico} em expedição` : `${esc(c.name)} está ${esc(st.label)}`;
  return `<div class="pcard ${big ? 'big' : ''}"><div class="pstage"><canvas class="pcv" data-portrait="${big ? 'full' : 'card'}" data-act="comp-poke" aria-label="${esc(c.name)}"></canvas>
      <canvas class="pcv pmascot" data-mascot title="FAÍSCA · ${esc(pet.name)} · ${pet.days} dias na meta${pet.next ? ' · faltam ' + pet.left + ' pra evoluir' : ''}" data-act="mascot-info"></canvas></div>
    <div class="pcol"><div class="speech" id="comp-speech" data-pspeech="ambient" data-act="comp-poke" title="toque pra ouvir outra"></div>
      <div class="meta pstat">${status}${st.left ? ` · <span data-countdown="${Date.now() + st.left}">${mmss(st.left)}</span>` : ''}</div>
      ${askHtml()}${expHtml(big)}
      <div class="row prow">${big ? '' : '<button class="btn sm" data-act="primo-hub">🎒 EXPEDIÇÃO</button>'}<button class="btn sm" data-act="comp-talk">💬 CONVERSAR</button><button class="btn sm" data-act="focus">🔥 FOCO</button><button class="btn sm pri" data-act="saber" data-g="all">📚 ME CONTA UMA</button><button class="btn sm" data-act="closet">👕 ARMÁRIO</button><button class="btn sm" data-act="diary">📖 DIÁRIO</button>${n ? `<button class="btn sm pri" data-act="claude">✨ ${n}</button>` : ''}</div></div></div>`;
}
/** cartão da aba QUESTS */
export function primoCard() {
  const c = R.companion(S), n = claudeCount();
  return `<div class="card comp-card"><header><h2>${esc(c.name)}</h2><span class="row" style="gap:6px;flex-wrap:nowrap">${hearts()}<button class="btn sm ${n ? 'pri' : 'ghost'}" data-act="claude" title="Recados, sugestões e o que o Claude mudou">✨${n ? ' ' + n : ''}</button><button class="icon-btn" data-act="comp-rename" title="Nome" aria-label="Renomear">✎</button></span></header>${body(false)}</div>`;
}
export function openPrimoHub() {
  const c = R.companion(S), b = bond(), pet = PS.petState();
  const m = openModal(`<h2>🔥 ${esc(c.name)} <small class="meta">· ${esc(b.name)} ${hearts()}</small></h2>${body(true)}
    <div class="meta" style="margin-top:8px">FAÍSCA: <b>${esc(pet.name)}</b> · ${pet.days} dia(s) na meta${pet.next ? ` · faltam ${pet.left} pra evoluir` : ' · evolução máxima'} · ${bankSize()} frases e ${saberCount()} curiosidades verificadas</div>
    <div class="actions"><button class="btn pri" data-close>FECHAR</button></div>`, { wide: true });
  mountPortraits(m);
  paintSpeech();
}
const rehub = () => { closeModal(); setTimeout(openPrimoHub, 40); };

// ───────────────────────── armário e diário ─────────────────────────
let closetSlot = 'hat';
function openCloset(slot) {
  if (slot) closetSlot = slot;
  const wear = PS.wearing(), items = PS.WARDROBE.filter((x) => x.slot === closetSlot);
  previewWear = wear;
  const m = openModal(`<h2>👕 armário do PRIMO</h2><div class="closet"><canvas class="pcv" data-portrait="closet" aria-label="PRIMO"></canvas>
    <div class="cl-col"><div class="chips">${PS.SLOTS.map(([k, n]) => `<button class="btn sm ${k === closetSlot ? 'pri' : 'ghost'}" data-act="closet-slot" data-slot="${k}">${n}</button>`).join('')}</div>
    <div class="cl-grid">${`<button class="cl-it ${wear[closetSlot] ? '' : 'on'}" data-act="wear" data-slot="${closetSlot}" data-id="">nada</button>`}${items.map((it) => { const ok = PS.wardrobeOk(it); return `<button class="cl-it ${wear[closetSlot] === it.id ? 'on' : ''} ${ok.ok ? '' : 'lock'}" data-act="wear" data-slot="${it.slot}" data-id="${it.id}" ${ok.ok ? '' : 'disabled'}>${ok.ok ? '' : '🔒 '}${esc(it.name)}${ok.ok ? '' : `<small>${esc(ok.hint)}</small>`}</button>`; }).join('')}</div></div></div>
    <div class="actions"><button class="btn pri" data-close>PRONTO</button></div>`, { wide: true });
  mountPortraits(m);
}
/** central das curiosidades: escolha o tema e o PRIMO conta uma (sem repetir até acabar) */
function openSaber(g = 'all') {
  const chips = [['all', '🎲 TUDO'], ...Object.entries(GROUPS).map(([k, v]) => [k, v[0]])].map(([k, n]) => `<button class="btn sm ${k === g ? 'pri' : 'ghost'}" data-act="saber-go" data-g="${k}">${n}</button>`).join('');
  openModal(`<h2>📚 o PRIMO conta</h2><div class="chips" style="flex-wrap:wrap">${chips}</div>
    <div class="pcard"><div class="pstage" style="min-height:150px"><canvas class="pcv" data-portrait="card" aria-label="PRIMO"></canvas></div><div class="speech" id="saber-say" data-pspeech="saber:${g}" style="font-size:13.5px;line-height:1.5"></div></div>
    <div class="actions"><button class="btn" data-act="saber-go" data-g="${g}">OUTRA ▶</button><button class="btn pri" data-close>FECHAR</button></div>`, { wide: true });
  mountPortraits(document.querySelector('.modal'));
}
function openDiary() {
  const list = [...PS.diarySync()].reverse();
  openModal(`<h2>📖 diário do PRIMO</h2><p class="muted">Todo domingo ele escreve como foi a semana que acabou. Nada sai do seu aparelho.</p>
    <div class="list" style="max-height:55vh;overflow:auto">${list.map((d) => `<div class="li"><div class="lt">${esc(d.text)}<small>semana de ${fmtDM(d.wk)}</small></div></div>`).join('') || '<div class="empty">Ainda sem páginas. A primeira aparece quando uma semana com atividade terminar.</div>'}</div>
    <div class="actions"><button class="btn pri" data-close>FECHAR</button></div>`, { wide: true });
}

export function extendPrimo(ACTIONS) {
  Object.assign(ACTIONS, {
    claude: () => openClaude(),
    'claude-ok': (d) => { const r = A.claudeApprove(d.id); if (r?.error) toast(esc(r.error), 'bad'); else sfx('upgrade'); closeModal(); setTimeout(openClaude, 60); },
    'claude-no': (d) => { A.claudeReject(d.id); closeModal(); setTimeout(openClaude, 60); },
    saber: (d) => { primoReact('saber', { group: d.g || 'all' }); if (!document.querySelector('.modal')) openSaber(d.g || 'all'); },
    closet: () => openCloset(),
    'saber-go': (d) => { closeModal(); setTimeout(() => { openSaber(d.g); }, 30); },
    'closet-slot': (d) => { closeModal(); setTimeout(() => openCloset(d.slot), 30); },
    wear: (d) => { const r = PS.setWear(d.slot, d.id || null); if (r?.error) { toast(esc(r.error), 'bad'); return; } sfx('buy'); primoReact('armario'); closeModal(); setTimeout(() => openCloset(d.slot), 30); },
    diary: () => openDiary(),
    'mascot-info': () => { const p = PS.petState(); toast(`🔥 FAÍSCA · <b>${esc(p.name)}</b> · ${p.days} dia(s) na meta${p.next ? ` · faltam ${p.left} pra evoluir` : ''}`, 'gold'); primoReact('mascote'); },
    'exp-send': (d) => { const r = PS.sendExp(d.id); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); return; } sfx('xp'); primoReact('exp_ida'); if (document.querySelector('.modal')) rehub(); },
    'exp-ticket': () => { const r = PS.finishExpTicket(); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); return; } sfx('ready'); if (document.querySelector('.modal')) rehub(); },
    'ask-claim': () => { const r = PS.claimAsk(); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); return; } sfx('chest'); confetti(40); if (document.querySelector('.modal')) rehub(); },
    'exp-claim': () => {
      const es = PS.expState();
      if (!es.cur || !es.ready) return;
      const [ev, safe, risk] = PS.eventOf(es.cur);
      openModal(`<div class="levelup"><div class="px muted" style="font-size:9px">NA ESTRADA</div><h2 style="margin:14px 0">${es.def.ico} ${esc(ev)}</h2><p class="muted">O que o PRIMO faz?</p>
        <div class="actions" style="justify-content:center;flex-wrap:wrap"><button class="btn" data-act="exp-choose" data-c="safe">🛡 ${esc(safe)}<small style="display:block;font-size:8px">XP normal</small></button><button class="btn pri" data-act="exp-choose" data-c="risk">🎲 ${esc(risk)}<small style="display:block;font-size:8px">50%: dobro · 50%: metade</small></button></div></div>`);
    },
    'exp-choose': (d) => {
      const e = PS.expState().cur, def = PS.expState().def;
      if (!e) return;
      const r = PS.claimExp(d.c === 'risk' ? 'risk' : 'safe');
      if (!r || !e.card) return;
      closeModal(); sfx('chest'); confetti(60); primoReact('exp_volta');
      const notes = (S.core.claude?.notes || []).filter((n) => !n.read).map((n) => `<li>📬 ${esc(n.text)}</li>`).join('');
      openModal(`<div class="levelup"><div class="px muted" style="font-size:9px">CARTA DA EXPEDIÇÃO</div><h2 style="margin:14px 0">${def.ico} ${esc(R.companion(S).name)} voltou.</h2><p id="exp-letter">"${esc(e.card)}"</p>${notes ? `<ul style="text-align:left">${notes}</ul>` : ''}
        <p class="acc px" style="font-size:10px">+${e.xp} XP${e.tk ? ' · +1 🎟' : ''}</p><div class="actions" style="justify-content:center"><button class="btn pri" data-close>BOA!</button></div></div>`);
      if ((S.core.claude?.notes || []).some((n) => !n.read)) A.claudeReadAll();
      expeditionLetter().then((t) => { const el = document.getElementById('exp-letter'); if (el && t) el.innerHTML = esc(t).replace(/\n+/g, '<br>'); });
    },
  });
}
export { claudeCount };
