// O PRIMO — o centro do jogo. Rosto e busto desenhados (pdraw.js), expressões e um banco enorme de frases (falas.js),
// pedido do dia, a BRASINHA e diário (pstate.js). Aqui ficam a tela, as animações e as reações.
import { S } from './store.js';
import * as R from './rules.js';
import * as A from './actions.js';
import { esc, today, fmtDM, lightNow } from './util.js';
import { openModal, closeModal, toast, segBar } from './ui.js';
import { sfx } from './audio.js';
import { confetti } from './fx.js';
import { drawPortrait, drawMascot, PW, PH } from './pdraw.js';
import { pragaLine } from './praga.js';
import { walkPos, artOn, drawPortraitNew, drawFace, drawMascotNew, sceneUrl } from './pnew.js';
import { primoLine, lastExpr, bankSize } from './falas.js';
import { GROUPS, saberCount } from './saber.js';
import * as PS from './pstate.js';
import { say, bond } from './v35.js';
import { openClaude, claudeCount } from './claude.js';

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
  return MOODS[primoMood()].expr; // v7.2: o rosto segue o humor (com a Praga ele fica PARANOICO, desconfiado; medo só na LUA DE SANGUE)
}

// ───────────────────────── expressão e fala atuais ─────────────────────────
let rx = null, amb = null, talkUntil = 0;
const curExpr = () => {
  const now = Date.now();
  if (rx && now < rx.until) return rx.expr;
  if (amb && now - amb.shownAt < 25000) return amb.expr;
  return baseExpr();
};
// v6: de vez em quando o PRIMO dá uma dica de como usar o app (no banner do QUESTS)
const TIPS = ['Dica, sô: no rascunho da REFLEXÃO, Enter solta e Shift+Enter pula linha.', 'Toca de novo na janela aberta que eu te mostro o relógio. Memento mori, uai.',
  'Arrasta uma tarefa da fila da AGENDA até um dia pra mudar o prazo dela.', 'No celular: segura o dedo numa tarefa e arrasta por cima das outras pra concluir várias, sô.',
  'Fixa um bloco no 📌 e ele vira post-it em todas as abas. Bom pra anotar ideia, sô.', 'Escreve 3000$ no título do bloco que eu entendo que ele vale dinheiro.',
  'Toca na bolinha do lado da tarefa que eu te levo até o bloco dela.', 'Errou? O ↩ lá em cima desfaz. Sem drama, uai.', 'No FILTRO, toca nos quadrinhos de cima que ele já filtra.',
  'Botão direito no quadradinho cancela a tarefa sem punição. Largar também é decidir.', 'O 🎯 FOCO AGORA escolhe UMA pra você. Não precisa pensar, só fazer.',
  'Na AGENDA, o azul é ritual. Não deixa a amizade esfriar, sô.'];
function ambient() {
  const now = Date.now();
  const pl = pragaLine(); if (pl && Math.random() < 0.75) return { text: pl, expr: 'preocupado', at: now }; // v6.7: com medo, só fala dela
  if (!amb || now - amb.at > 3 * 60000) { const tip = Math.random() < 0.45, text = tip ? TIPS[Math.floor(Math.random() * TIPS.length)] : primoLine('auto'); amb = { text, expr: tip ? 'piscada' : lastExpr(), at: now, shownAt: now, typed: false }; }
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
// v5.16: o navegador avisa quando o desenho entra ou sai da tela (antes: medir a posição a cada quadro forçava recalcular a página)
const VIS = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => { for (const e of es) e.target._vis = e.isIntersecting; }) : null;
const MOUNTED = new Set();
let looping = false, last = 0, frame = 0;
// K = quantas vezes a tela do desenho é maior que o espaço lógico (72 x 96). O clássico em pixel continua nítido; o novo ganha definição.
const K = 4;
const OFF = document.createElement('canvas'); OFF.width = PW * K; OFF.height = PH * K;
/** cenário atrás do PRIMO novo: o LUGAR segue o contexto (expedição, hora do dia) e a LUZ segue o relógio/modo do app */
function scenePick() {
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60, wd = d.getDay();
  const light = lightNow(d), night = light === 'noite'; // v7.0: só o relógio (o tema escuro não vira noite)
  let place;
  if (night) place = 'fogueira';
  else if (h < 8 || (h >= 12 && h < 13.5)) place = 'cozinha'; // café da manhã e almoço
  else if (h >= 17.5) place = 'varanda';
  else place = wd === 0 || wd === 6 ? 'varanda' : 'escritorio';
  return { place, light };
}
function applyScenes() {
  const on = artOn(), sc = on ? scenePick() : null;
  document.documentElement.dataset.primo = on ? 'novo' : 'classico';
  document.querySelectorAll('.pstage').forEach((el) => {
    const url = on ? `url("${sceneUrl(sc.place, sc.light)}")` : '';
    if (el.dataset.scene !== url) { el.dataset.scene = url; el.style.backgroundImage = url; el.style.backgroundPosition = on && sc.place === 'fogueira' ? '22% 80%' : ''; el.classList.toggle('has-scene', on); } // na fogueira, o fogo fica à esquerda do quadro
  });
}
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
function paint(cv) {
  const kind = cv.dataset.portrait, ctx = cv.getContext('2d'), NEW = artOn();
  ctx.setTransform(K, 0, 0, K, 0, 0);
  if (cv.dataset.mascot != null) { const ps = PS.petState(), happy = R.dailyGoal(S).today >= R.dailyGoal(S).goal; if (NEW) drawMascotNew(ctx, ps.stage, frame, happy); else { ctx.imageSmoothingEnabled = false; drawMascot(ctx, ps.stage, frame, happy); } return; }
  const o = { tier: R.companion(S).tier, mood: statusMood(), expr: curExpr(), wear: PS.wearing(), talk: Date.now() < talkUntil, f: frame };
  // v6: no banner do QUESTS ele passeia pelo cenário (quando está reagindo, para e reage onde está)
  if (kind === 'walk') {
    const reacting = rx && Date.now() < rx.until, wp = walkPos(frame);
    if (!reacting && o.expr !== 'dormindo') { if (NEW) o.force = wp.pose; cv._x = wp.x; }
    cv.style.left = `${((cv._x ?? 0.5) * 100).toFixed(1)}%`;
  }
  if (kind === 'mini') {
    if (NEW) { drawFace(ctx, o.expr, 44, o.mood); return; }
    const oc = OFF.getContext('2d'); oc.setTransform(K, 0, 0, K, 0, 0); drawPortrait(oc, o);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, 44 * K, 44 * K); ctx.drawImage(OFF, 14 * K, 30 * K, 44 * K, 44 * K, 0, 0, 44 * K, 44 * K);
  } else if (NEW) drawPortraitNew(ctx, o); else drawPortrait(ctx, o);
}
export function mountPortraits(root = document) {
  root.querySelectorAll('canvas[data-portrait], canvas[data-mascot]').forEach((cv) => {
    if (cv._pm) return;
    cv._pm = true;
    if (cv.dataset.mascot != null) { cv.width = 32 * K; cv.height = 32 * K; } else if (cv.dataset.portrait === 'mini') { cv.width = 44 * K; cv.height = 44 * K; } else { cv.width = PW * K; cv.height = PH * K; }
    MOUNTED.add(cv); VIS?.observe(cv); paint(cv);
  });
  applyScenes();
  if (!looping && !still && MOUNTED.size) { looping = true; requestAnimationFrame(loop); }
  paintSpeech();
}
function loop(ts) {
  for (const c of [...MOUNTED]) if (!c.isConnected) { MOUNTED.delete(c); VIS?.unobserve(c); }
  if (!MOUNTED.size) { looping = false; return; }
  requestAnimationFrame(loop);
  if (document.hidden || ts - last < 110) return;
  last = ts; frame++;
  if (frame % 40 === 0) applyScenes(); // as artes novas podem ter acabado de carregar; e a luz muda com a hora
  for (const cv of MOUNTED) if (VIS ? cv._vis !== false : true) paint(cv);
}
/** roda depois de cada desenho da tela: liga os desenhos, evolui o mascote, avisa a volta da expedição, gera o diário */
export function primoAfterRender() {
  mountPortraits();
  const ev = PS.petSync();
  if (ev) { toast(`🐣 A BRASINHA cresceu: <b>${esc(ev.name)}</b>!`, 'gold'); sfx('level'); primoReact('mascote'); }
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
/** v7.2: o HUMOR do PRIMO, um só, que manda no rosto, na cor do cartão e na frase.
 *  paranoico (Praga ou 3+ atrasadas) · orgulhoso (bateu a meta) · focado (tarefa ▶ fazendo) · cansado (debuff de cansaço) · satisfeito (o resto) */
export const MOODS = {
  paranoico: { label: 'paranoico', ico: '👀', expr: 'suspeito', tip: 'Tem trem rondando: atrasadas ou Praga. Ele fica desconfiado, não com medo.' },
  orgulhoso: { label: 'orgulhoso', ico: '😤', expr: 'orgulhoso', tip: 'A meta do dia foi batida.' },
  focado: { label: 'focado', ico: '🎯', expr: 'pensativo', tip: 'Tem tarefa em ▶ FAZENDO.' },
  cansado: { label: 'cansado', ico: '😮‍💨', expr: 'cansado', tip: 'Cansaço, neblina ou preguiça no status do dia.' },
  satisfeito: { label: 'satisfeito', ico: '😌', expr: 'feliz', tip: 'Tudo nos trilhos.' },
};
export function primoMood() {
  const g = R.dailyGoal(S), st = R.dayStatus(S, today());
  if (R.praga(S).phase >= 1 || R.overdueTasks(S).length >= 3) return 'paranoico';
  if (g.today >= g.goal) return 'orgulhoso';
  if (S.quests.tasks.some((t) => t.st === 'doing')) return 'focado';
  if (st.has('neblina') || st.has('fatigado') || st.has('preguica') || R.companion(S).mood === 'cansado') return 'cansado';
  return 'satisfeito';
}
/** v7.2: os COMANDOS moram no cartão do PRIMO. Todo comando gera uma frase dele. */
const CMDS = [
  ['focus', '🔥', 'FOCO', 'Fogueira de foco (pomodoro)'], ['review', '☀', 'REVISAR', 'O PRIMO revisa o dia com você: hábitos de ontem, atrasadas e a primeira de hoje'],
  ['sos', '🆘', 'SOS', 'Travou? Começa pelo menor pedaço'], ['distribute', '📅', 'DISTRIBUIR', 'Dá dias novos às atrasadas e às tarefas sem prazo, pelo seu ritmo'],
  ['trip', '✈', 'VIAGEM', 'Viagem ou visitas: congela o jogo enquanto você está fora'], ['rest-day', '🏕', 'DESCANSO', 'Doença ou dia puxado: os hábitos de hoje viram folga'],
  ['archive-now', '🔄', 'ATUALIZAR', 'Arquiva o que já foi feito e recalcula tudo'], ['backup-download', '⬇', 'BACKUP', 'Baixa um arquivo com todos os seus dados'],
];
const CMD_LINES = {
  focus: ['Fogueira acesa. Eu seguro a BRASINHA, cê segura o foco.', 'Vinte e cinco minutinhos, sô. O trem não se derruba sozinho.'],
  review: ['Bora revisar o dia, uai. Coisa rápida.', 'Senta aqui que a gente olha a lida de hoje.'],
  sos: ['Travou? Respira. Me fala o menor pedaço que a gente começa por ele.', 'Até casa de tijolo começa com um tijolo só, sô.'],
  distribute: ['Espalhei os trens pela semana. Um de cada vez, sô.', 'Cada dia com o seu tanto. Assim ninguém atola.'],
  trip: ['Vai com Deus. Eu fico de olho na casa e na BRASINHA.', 'Mala pronta? A casa fica de pé, pode ir sossegado.'],
  'rest-day': ['Descanso também é obra: tijolo assenta melhor com a massa curada.', 'Hoje é dia de rede. Amanhã a gente volta pra lida.'],
  'archive-now': ['Arrumei a mesa, sô. O que tá feito foi pro ARQUIVO.', 'Mesa limpa, cabeça limpa, uai.'],
  'backup-download': ['Cópia guardada. Casa de tijolo tem planta arquivada.', 'Backup feito. Lobo nenhum sopra isso aqui.'],
};
/** o PRIMO fala um texto pronto (sem sortear do banco) */
export function primoSay(text, expr) { rx = { text, expr: expr || lastExpr(), until: Date.now() + 14000, typed: false }; paintSpeech(); }
function statusIcons() {
  const st = R.dayStatus(S, today()), al = R.alerts(S, today());
  const ic = [...(st.event ? [`<button class="sico event" data-act="explain" data-k="event" title="🎲 ${esc(st.event.name)}: ${esc(st.event.desc)}">🎲</button>`] : []),
    ...st.list.filter((x) => x.key !== 'sabado').map((x) => `<button class="sico ${x.kind}" data-act="explain" data-k="${x.key}" title="${esc(x.name)}: ${esc(x.desc || '')}">${x.icon}</button>`),
    ...al.map((a) => `<button class="sico alert" data-act="explain-text" data-n="${esc(a.icon + ' ' + a.name)}" data-d="${esc(a.desc)}" title="${esc(a.name)}">${a.icon}</button>`)];
  return ic.length ? `<div class="pstatus" title="Status do dia: toque num ícone pra ver o que é">${ic.join('')}</div>` : '';
}
function body(big, compact = false) {
  const c = R.companion(S), st = primoState(), pet = PS.petState(), mk = primoMood(), m = MOODS[mk];
  const status = st.act !== 'idle' ? `${esc(c.name)} está ${esc(st.label)}` : `<span title="${esc(m.tip)}">${m.ico} ${esc(c.name)} está <b>${m.label}</b></span>`;
  const trip = R.tripNow(S);
  return `<div class="pcard ${big ? 'big' : ''} ${compact ? 'compact' : ''}" data-mood="${mk}">${compact ? '' : `<div class="pstage"><canvas class="pcv" data-portrait="${big ? 'full' : 'card'}" data-act="comp-poke" aria-label="${esc(c.name)}"></canvas>
      <canvas class="pcv pmascot" data-mascot title="BRASINHA · ${esc(pet.name)} · ${pet.days} dias na meta${pet.next ? ' · faltam ' + pet.left + ' pra crescer' : ''}" data-act="mascot-info"></canvas></div>`}
    <div class="pcol">${compact ? '' : '<div class="speech" id="comp-speech" data-pspeech="ambient" data-act="comp-poke" title="toque pra ouvir outra"></div>'}
      <div class="meta pstat">${status}${st.left ? ` · <span data-countdown="${Date.now() + st.left}">${mmss(st.left)}</span>` : ''}</div>
      ${statusIcons()}
      ${askHtml()}
      <div class="pcmds">${CMDS.map(([k, i, l, t]) => `<button class="btn sm ${k === 'trip' && trip ? 'pri' : ''}" data-act="pcmd" data-k="${k}" title="${esc(t)}"><span>${i}</span>${k === 'trip' && trip ? 'VOLTEI' : l}</button>`).join('')}</div>
      <div class="row prow"><button class="btn sm pri" data-act="saber" data-g="all">📚 ME CONTA UMA</button><button class="btn sm" data-act="primo-prosa" title="Piada, ditado ou causo da roça">😂 PROSA</button><button class="btn sm" data-act="diary">📖 DIÁRIO</button></div></div></div>`;
}
/** cartão da aba QUESTS */
/** v6 (4A): banner do QUESTS com o cenário, o PRIMO passeando, a BRASINHA e a fala (dicas do app de vez em quando) */
export function questsBanner() {
  const c = R.companion(S), pet = PS.petState();
  return `<div class="qscene pstage"><canvas class="pcv walker" data-portrait="walk" data-act="comp-poke" title="Toque no ${esc(c.name)}" aria-label="${esc(c.name)}"></canvas>
    <canvas class="pcv pmascot" data-mascot title="BRASINHA · ${esc(pet.name)}" data-act="mascot-info"></canvas>
    <div class="qs-say"><div class="speech" data-pspeech="ambient" data-act="comp-poke" title="toque pra ouvir outra"></div></div></div>`;
}
export function primoCard() {
  const c = R.companion(S), n = claudeCount();
  return `<div class="card comp-card"><header><h2>${esc(c.name)}</h2><span class="row" style="gap:6px;flex-wrap:nowrap">${hearts()}<button class="icon-btn" data-act="comp-rename" title="Nome" aria-label="Renomear">✎</button></span></header>${body(false)}</div>`; void n; // v6.3: o PRIMO voltou pro cantinho dele (pedido do dono)
}
export function openPrimoHub() {
  const c = R.companion(S), b = bond(), pet = PS.petState();
  const m = openModal(`<h2>🔥 ${esc(c.name)} <small class="meta">· ${esc(b.name)} ${hearts()}</small></h2>${body(true)}
    <div class="meta" style="margin-top:8px">BRASINHA: <b>${esc(pet.name)}</b> · ${pet.days} dia(s) na meta${pet.next ? ` · faltam ${pet.left} pra crescer` : ' · evolução máxima'} · ${bankSize()} frases e ${saberCount()} curiosidades verificadas</div>
    <div class="actions"><button class="btn pri" data-close>FECHAR</button></div>`, { wide: true });
  mountPortraits(m);
  paintSpeech();
}
const rehub = () => { closeModal(); setTimeout(openPrimoHub, 40); };

// ───────────────────────── armário e diário ─────────────────────────
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
    'primo-prosa': () => { const r = Math.random(); primoReact(r < 0.6 ? 'piada' : r < 0.82 ? 'ditado' : 'causo'); sfx('tab'); },
    saber: (d) => { primoReact('saber', { group: d.g || 'all' }); if (!document.querySelector('.modal')) openSaber(d.g || 'all'); },
    'saber-go': (d) => { closeModal(); setTimeout(() => { openSaber(d.g); }, 30); },
    diary: () => openDiary(),
    'mascot-info': () => { const p = PS.petState(); toast(`🐣 BRASINHA · <b>${esc(p.name)}</b> · ${p.days} dia(s) na meta${p.next ? ` · faltam ${p.left} pra evoluir` : ''}`, 'gold'); primoReact('mascote'); },
    'ask-claim': () => { const r = PS.claimAsk(); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); return; } sfx('chest'); confetti(40); if (document.querySelector('.modal')) rehub(); },
    // v7.2: comando do cartão do PRIMO = o comando de sempre + uma frase dele
    pcmd: (d, e) => { const f = ACTIONS[d.k]; if (!f) return; const r = f(d, e); const L = CMD_LINES[d.k]; if (L) setTimeout(() => primoSay(L[Math.floor(Math.random() * L.length)], MOODS[primoMood()].expr), 60); return r; },
  });
}
export { claudeCount };
