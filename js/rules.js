// MOTOR DO JOGO — funções puras: recebem o estado e devolvem números/listas.
// Nada aqui mexe na tela nem no banco. Todas as regras do GAMIFY moram neste arquivo.
import { addDays, diffDays, weekday, weekStart, range, hash, today, isWorkday, holidayName } from './util.js';

// ───────────────────────── CONSTANTES (as mesmas da planilha) ─────────────────────────
export const C = {
  XP_LIST: 15, XP_SUB: 8, XP_STEP: 4, XP_HOME: 50, XP_MINI: 40, // v5.8: tarefas valem mais (o trabalho de verdade pagava pouco perto dos preços)
  XP_BLOCK: { bd: 100, tr: 300, cap: 150, gs: 100, bs: 0 }, XP_GOAL: 200, XP_BOSS: 200,
  M_STAR: 2, M_ONTIME: 1.5, M_EARLY: 2, M_MONEY: 1.5,
  HABIT_XP: 5, RD_XP: 40, FORGE: 66,
  LVL_BASE: 500, LVL_CURVE: 150,
  RIT_PESSOA: 15, RIT_OUTRO: 20,
  BAU_BASE: 50, BAU_NOTE: 10,
  FERREIRO_XP: 100, MYSTERY: 150, OFFER: 0.3, MAX_PER_DAY: 6, DAILY_GOAL: 80, LOOT_PER_DAY: 2, FOCUS_XP: 10,
  X_TASK: 3, X_FOCUS: 60, LATE_DAY: 0.2, LATE_MIN: 0.4, RESCHED: 10,
};

// v4: valores editáveis em PERKS AND RULES (guardados em core.settings.rules). Padrões ficam em DEFAULT_C.
export const DEFAULT_C = JSON.parse(JSON.stringify(C));
export const RULE_FIELDS = [
  ['XP das tarefas', [['XP_STEP', '↳ passo'], ['XP_SUB', 'subtarefa'], ['XP_LIST', 'tarefa de lista'], ['XP_MINI', '⚔ mini-boss'], ['XP_HOME', '🛡 casa/família']]],
  ['XP ao fechar', [['XP_BLOCK.bd', 'bloco BREAKDOWN'], ['XP_BLOCK.tr', 'bloco TRABALHO'], ['XP_BLOCK.cap', 'bloco CAPTAÇÃO'], ['XP_BLOCK.gs', 'bloco GESTÃO'], ['XP_GOAL', '🎯 meta'], ['XP_BOSS', 'boss (padrão)']]],
  ['Multiplicadores', [['M_STAR', '⭐ chata'], ['M_ONTIME', '📅 no prazo'], ['M_EARLY', '🐦 2+ dias antes'], ['M_MONEY', '💰 dinheiro']]],
  ['Rotina e foco', [['HABIT_XP', 'hábito'], ['RD_XP', '⚔ redenção'], ['FOCUS_XP', 'foco 25 min'], ['DAILY_GOAL', 'meta do dia (XP)'], ['RIT_PESSOA', 'ritual 👥'], ['RIT_OUTRO', 'ritual 🔁']]],
  ['Expedições · aceleração', [['X_TASK', 'minutos por tarefa concluída'], ['X_FOCUS', 'minutos por 25 min de foco']]],
  ['Prazos · consequências', [['LATE_DAY', 'XP perdido por dia de atraso (0–1)'], ['LATE_MIN', 'mínimo de XP ao concluir atrasada (0–1)'], ['RESCHED', 'XP da 1ª remarcação (dobra a cada nova)']]],
  ['Loja', [['MYSTERY', 'baú misterioso'], ['FERREIRO_XP', 'ferreiro (XP por nível)'], ['OFFER', 'oferta do dia (desconto 0–1)'], ['MAX_PER_DAY', 'máx. prazos por dia útil']]],
];
const getPath = (o, k) => k.split('.').reduce((a, x) => a?.[x], o);
function setPath(o, k, v) { const ks = k.split('.'), last = ks.pop(); const t = ks.reduce((a, x) => a[x], o); t[last] = v; }
export const ruleValue = (k) => getPath(C, k);
export const ruleDefault = (k) => getPath(DEFAULT_C, k);
/** põe os valores que você editou em cima dos padrões (chamar ao abrir o app e ao editar) */
export function applyRules(s) {
  for (const [k] of RULE_FIELDS.flatMap((g) => g[1])) setPath(C, k, getPath(DEFAULT_C, k));
  applyLabels(s);
  for (const [k, v] of Object.entries(s?.core?.settings?.rules || {})) { try { if (typeof v === 'number' && isFinite(v) && getPath(DEFAULT_C, k) !== undefined) setPath(C, k, v); } catch { /* chave velha */ } }
}

export const TITLES = [
  [1, 'INICIANTE'], [3, 'APRENDIZ DE OBRA'], [5, 'ARQUITETO'], [8, 'SÊNIOR'],
  [10, 'VETERANO'], [15, 'MESTRE CONSTRUTOR'], [20, 'LENDA'],
];

export const GROUPS = {
  bd: { name: 'BREAKDOWN MACHINE', short: 'BREAKDOWN' },
  tr: { name: 'TRABALHO', short: 'TRABALHO' },
  cap: { name: 'CAPTAÇÕES', short: 'CAPTAÇÕES' },
  gs: { name: 'GESTÃO', short: 'GESTÃO' },
  bs: { name: 'BOSSES', short: 'BOSSES' }, // v4: cada boss é um bloco com subtarefas (vida = o que falta)
};
// LISTAS (a janela mãe): são automáticas. A DATA da tarefa decide em qual lista ela aparece; AGUARDANDO junta o que está parado por alguém ou por outra tarefa.
export const AREAS = {
  hoje: 'HOJE', amanha: 'AMANHÃ', semana: 'ESTA SEMANA', depois: 'DEPOIS', sem: 'SEM PRAZO', wait: 'AGUARDANDO',
};
export const AREA_KEYS = ['hoje', 'amanha', 'semana', 'depois', 'sem', 'wait'];
// ───── NOMES PERSONALIZÁVEIS: só o texto muda; as chaves (hoje, bd, tr…) e as regras continuam as mesmas ─────
const NAMES_DEFAULT = { 'tab:listas': 'LISTAS', 'tab:boss': 'BOSSES' };
export const TAB_NAMES = { listas: 'LISTAS', boss: 'BOSSES' };
/** tudo que dá pra renomear: [chave, nome padrão] */
export function labelFields() {
  return [['tab:listas', NAMES_DEFAULT['tab:listas']], ...AREA_KEYS.map((k) => ['area:' + k, NAMES_DEFAULT['area:' + k]]), ['tab:boss', NAMES_DEFAULT['tab:boss']], ...['bd', 'tr', 'cap', 'gs'].map((g) => ['group:' + g, NAMES_DEFAULT['group:' + g]])];
}
/** aplica os nomes escolhidos pelo dono (core.labels) por cima dos padrões. Roda ao abrir e quando ele edita. */
export function applyLabels(s) {
  if (!NAMES_DEFAULT['area:hoje']) { // guarda os padrões na primeira vez
    for (const k of AREA_KEYS) NAMES_DEFAULT['area:' + k] = AREAS[k];
    for (const g of Object.keys(GROUPS)) { NAMES_DEFAULT['group:' + g] = GROUPS[g].short; NAMES_DEFAULT['groupname:' + g] = GROUPS[g].name; }
  }
  const L = s?.core?.labels || {}, val = (k) => String(L[k] || '').trim().toUpperCase().slice(0, 24);
  for (const k of AREA_KEYS) AREAS[k] = val('area:' + k) || NAMES_DEFAULT['area:' + k];
  for (const g of Object.keys(GROUPS)) { const v = val('group:' + g); GROUPS[g].short = v || NAMES_DEFAULT['group:' + g]; GROUPS[g].name = v || NAMES_DEFAULT['groupname:' + g]; }
  TAB_NAMES.listas = val('tab:listas') || NAMES_DEFAULT['tab:listas'];
  TAB_NAMES.boss = val('tab:boss') || NAMES_DEFAULT['tab:boss'];
}
// ───── JANELAS CRIADAS PELO DONO: uma janela nova é só uma "gaveta" de blocos. Cada bloco continua tendo um tipo-base
// (bd, tr, cap ou gs), então XP, 💰 e conquistas funcionam igual: nada das regras muda. ─────
export const WINDOW_BASES = ['bd', 'tr', 'cap', 'gs'];
export const windows = (s) => (s.core?.windows || []).filter((w) => w && w.id && w.name);
/** a janela própria de um bloco (ou null se ele está na janela do tipo dele) */
export const winOf = (s, b) => (b?.win && windows(s).find((w) => w.id === b.win)) || null;
/** nomes das listas antigas (só para mostrar tarefas já arquivadas) e conversão ao criar tarefa com nome antigo */
const AREAS_OLD = { imed: 'IMEDIATOS', curto: 'CURTO PRAZO', longo: 'LONGO PRAZO' };
export const AREA_FROM_OLD = { imed: 'hoje', curto: 'semana', longo: 'depois' };
export const areaName = (k) => AREAS[k] || AREAS_OLD[k] || '';
/** em qual lista uma tarefa (fora de bloco) aparece hoje */
export function listOf(t, td = today()) {
  if (t.st === 'wait' || t.st === 'sent') return 'wait';
  if (!t.due) return 'sem';
  const d = diffDays(td, t.due);
  return d <= 0 ? 'hoje' : d === 1 ? 'amanha' : d <= 7 ? 'semana' : 'depois'; // atrasada fica em HOJE
}
/** que data uma tarefa ganha ao entrar numa lista (adicionar ali ou arrastar pra lá). `cur` = data atual dela */
export function dueForList(k, td = today(), cur = null) {
  if (k === 'hoje') return td;
  if (k === 'amanha') return addDays(td, 1);
  if (k === 'semana') {
    if (cur && diffDays(td, cur) >= 2 && diffDays(td, cur) <= 7) return cur;
    const win = [2, 3, 4, 5, 6, 7].map((n) => addDays(td, n));
    return win.find((d) => weekday(d) === 5) || win.find((d) => isWorkday(d)) || win[0]; // a sexta da janela; sem sexta, o 1º dia útil
  }
  if (k === 'depois') return cur && diffDays(td, cur) > 7 ? cur : addDays(td, 14);
  if (k === 'wait') return cur;
  return null; // SEM PRAZO
}
/** quem/o quê está segurando a tarefa, pra mostrar na tela */
export function waitingOn(s, t) {
  const dep = t.dep ? allTasks(s).find((x) => x.id === t.dep) : null;
  return { who: t.who || '', dep, label: [t.who, dep && '🔗 ' + dep.text.replace(/\s*\(\d+\s*XP\)/i, '')].filter(Boolean).join(' · ') };
}
/** todas as pessoas já usadas em "aguardando quem" */
export const people = (s) => [...new Set(allTasks(s).map((t) => t.who).filter(Boolean))].sort();

// ───────────────────────── CACHE (recalcula quando o estado muda) ─────────────────────────
// O estado carrega um contador `_epoch` que sobe a cada alteração.
const CACHE = new WeakMap();
function cache(s) {
  let c = CACHE.get(s);
  if (!c || c.epoch !== s._epoch) {
    c = { epoch: s._epoch, status: {}, streak: {}, idx: null, event: {}, totals: null, stats: null, attrs: null };
    CACHE.set(s, c);
  }
  return c;
}

// ───────────────────────── LEITURA DO TEXTO DA TAREFA ─────────────────────────
export function parse(text = '') {
  const t = String(text).trim();
  const m = t.match(/\((\d+)\s*XP\)/i);
  return {
    star: t.includes('⭐'),
    home: t.includes('🛡'),
    money: t.includes('💰'),
    xpFix: m ? +m[1] : null,
    step: /^(↳|>)/.test(t),
    mini: t.startsWith('⚔'),
    goal: t.includes('🎯'),
  };
}

// ───────────────────────── ÍNDICE (tudo concluído, por dia) ─────────────────────────
export function allTasks(s) {
  const arq = Object.values(s.arq || {}).flatMap((d) => d.tasks || []);
  return [...(s.quests?.tasks || []), ...arq];
}
export function allBlocks(s) {
  const arq = Object.values(s.arq || {}).flatMap((d) => d.blocks || []);
  return [...(s.quests?.blocks || []), ...arq];
}
/** cada conclusão conta: tarefa feita, ou cada rodada de uma tarefa 🔁 VAI E VOLTA */
export function completions(t) {
  const out = (t.rounds || []).map((r) => ({ ...r, id: t.id, text: t.text, block: t.block, blockTitle: t.blockTitle }));
  if (t.st === 'done' && t.doneAt && !t.approved) out.push({ doneAt: t.doneAt, xp: t.xp || 0, onTime: t.onTime, early: t.early, id: t.id, text: t.text, block: t.block, blockTitle: t.blockTitle });
  return out;
}
export function idx(s) {
  const c = cache(s);
  if (c.idx) return c.idx;
  const doneByDay = {}, buysByDay = {}, xpByDay = {};
  const addXp = (d, v) => { if (d && v) xpByDay[d] = (xpByDay[d] || 0) + v; };
  const tasks = allTasks(s);
  const comps = tasks.flatMap(completions);
  for (const c of comps) {
    doneByDay[c.doneAt] = (doneByDay[c.doneAt] || 0) + 1;
    addXp(c.doneAt, c.xp || 0);
  }
  for (const t of tasks) if (t.approved && t.bonusXp) addXp(t.doneAt, t.bonusXp);
  for (const b of allBlocks(s)) if (b.st === 'done') addXp(b.doneAt, b.xp || 0);
  for (const b of s.quests?.bosses || []) if (b.st === 'done') addXp(b.doneAt, b.xp || 0);
  for (const [d, v] of Object.entries(s.marks?.days || {})) addXp(d, v.xp || 0);
  for (const [d, v] of Object.entries(s.core?.legacy?.days || {})) { addXp(d, v[0] || 0); if (v[1]) doneByDay[d] = (doneByDay[d] || 0) + v[1]; } // meses esvaziados do arquivo
  for (const r of s.core?.ritualLog || []) addXp(r.date, r.xp);
  for (const b of s.core?.bonus || []) addXp(b.date, b.xp || 0);
  for (const x of s.core?.sundays || []) addXp(x.date, x.xp);
  for (const a of Object.values(s.core?.achievements || {})) addXp(a.date, a.xp);
  for (const a of Object.values(s.core?.seasonAch || {})) addXp(a.date, a.xp); // v6: conquistas do capítulo novo
  for (const [ws, w] of Object.entries(s.core?.weeks || {})) {
    for (const [k, v] of Object.entries(w)) if (typeof v === 'number') addXp(w._at?.[k] || addDays(ws, 6), v);
  }
  for (const p of s.loja?.purchases || []) {
    if (p.kind === 'taverna' || p.kind === 'bau') buysByDay[p.date] = (buysByDay[p.date] || 0) + (p.qty || 1);
  }
  c.idx = { tasks, comps, doneByDay, buysByDay, xpByDay };
  return c.idx;
}
const tasksDoneOn = (s, d) => idx(s).doneByDay[d] || 0;

// ───────────────────────── NÍVEL ─────────────────────────
export const levelStart = (n) => C.LVL_CURVE * (n - 1) ** 2 + C.LVL_BASE * (n - 1);
export function titleFor(level) {
  let t = TITLES[0][1];
  for (const [n, name] of TITLES) if (level >= n) t = name;
  return t;
}
export function levelInfo(xp) {
  let n = 1;
  while (levelStart(n + 1) <= xp) n++;
  const start = levelStart(n), end = levelStart(n + 1);
  const next = TITLES.find(([lv]) => lv > n);
  return {
    level: n, start, end, into: xp - start, need: end - start, pct: (xp - start) / (end - start),
    title: titleFor(n), nextTitle: next ? { level: next[0], name: next[1] } : null,
  };
}

// ───────────────────────── HÁBITOS ─────────────────────────
const marksOf = (s, d) => s.marks?.days?.[d]?.h || {};
export const habitIds = (s) => (s.core?.habits || []).map((h) => h.id);
/** dia registrado = pelo menos um hábito marcado (x ou -). Dia todo em branco não pune. */
export const registered = (s, d) => habitIds(s).some((h) => marksOf(s, d)[h]);
export const did = (s, h, d) => marksOf(s, d)[h] === 'x';
export const countX = (s, d) => habitIds(s).filter((h) => did(s, h, d)).length;
/** falhou = dia registrado, hábito em branco. Sábado blindado: falha não conta. */
export const failed = (s, h, d) => weekday(d) !== 6 && registered(s, d) && !marksOf(s, d)[h];
/** 🛡 a 1ª falha da semana (seg-dom) de cada hábito é perdoada (combo e debuff) */
export function forgiven(s, h, d) {
  if (!failed(s, h, d)) return false;
  const ws = weekStart(d);
  for (let x = ws; x < d; x = addDays(x, 1)) if (failed(s, h, x)) return false;
  return true;
}
export const failedCounted = (s, h, d) => failed(s, h, d) && !forgiven(s, h, d);

export function totalX(s, h, upTo = null) {
  let n = 0;
  for (const [d, v] of Object.entries(s.marks?.days || {})) if ((!upTo || d <= upTo) && v.h?.[h] === 'x') n++;
  return n;
}

/** sequência (🔥) do hábito até o dia d (se d ainda não foi marcado, conta até ontem) */
export function streak(s, h, d = today()) {
  const c = cache(s), key = h + '|' + d;
  if (c.streak[key]) return c.streak[key];
  const start = s.core?.startDate || '2000-01-01';
  let n = 0, x = d;
  if (!marksOf(s, d)[h]) x = addDays(d, -1);
  for (let guard = 0; guard < 800 && x >= start; guard++, x = addDays(x, -1)) {
    const m = marksOf(s, x)[h];
    if (m === 'x') n++;
    else if (m === '-' || !registered(s, x) || !failed(s, h, x) || forgiven(s, h, x)) continue;
    else break;
  }
  const total = totalX(s, h, d);
  const forged = total >= C.FORGE;
  let mult = n >= 14 ? 2 : n >= 7 ? 1.5 : 1;
  if (forged) mult = Math.max(mult, 1.5);
  return (c.streak[key] = { streak: n, total, forged, mult });
}

/** recorde: a maior sequência que o hábito já teve (mesma regra da sequência atual: folga, sábado e falha perdoada não quebram) */
export function bestStreak(s, h, d = today()) {
  const c = cache(s), key = 'best|' + h + '|' + d;
  if (c.streak[key] != null) return c.streak[key];
  let n = 0, best = 0;
  for (let x = s.core?.startDate || d, guard = 0; x <= d && guard < 4000; guard++, x = addDays(x, 1)) {
    const m = marksOf(s, x)[h];
    if (m === 'x') { n++; if (n > best) best = n; }
    else if (m === '-' || !registered(s, x) || !failed(s, h, x) || forgiven(s, h, x)) continue;
    else n = 0;
  }
  return (c.streak[key] = Math.max(best, streak(s, h, d).streak));
}

export function isPerfect(s, d) {
  const ids = habitIds(s);
  if (!ids.length) return false;
  const m = marksOf(s, d);
  const blanks = ids.filter((h) => !m[h]).length;
  return blanks === 0 && countX(s, d) >= ids.length - 2;
}

export function habitXpForDay(s, d) {
  const st = dayStatus(s, d), ev = eventOfDay(s, d);
  let sum = 0;
  for (const h of habitIds(s)) {
    if (!did(s, h, d)) continue;
    let x = C.HABIT_XP * streak(s, h, d).mult;
    if (ev?.type === 'habit' && ev.habit === h) x *= 3;
    sum += x;
  }
  sum *= st.habitMult;
  if (isPerfect(s, d)) sum *= 2;
  if (did(s, 'rd', d)) sum += C.RD_XP;
  return Math.round(sum);
}

// ───────────────────────── EVENTO DO DIA / OFERTA ─────────────────────────
const HABIT_EVENT_NAMES = {
  noph: 'MONGE', selfcare: 'ESPELHO', treino: 'GLADIADOR', dieta: 'BANQUETE',
  suplementos: 'ALQUIMISTA', sono: 'SONHADOR', casa: 'FAXINA',
};
export function eventOfDay(s, d) {
  const c = cache(s);
  if (c.event[d] !== undefined) return c.event[d];
  const habits = s.core?.habits || [];
  const pool = [
    ...habits.map((h) => ({ type: 'habit', habit: h.id, icon: h.icon,
      name: `${HABIT_EVENT_NAMES[h.id] || 'BÔNUS'} · ${h.name}`, desc: `${h.icon} ${h.name} vale x3 hoje` })),
    { type: 'happy', icon: '🍺', name: 'HAPPY HOUR', desc: 'Taverna pela metade do preço hoje' },
    { type: 'star', icon: '⭐', name: 'DIA DO CORAJOSO', desc: 'Tarefas ⭐ valem x3 (em vez de x2)' },
    { type: 'money', icon: '💰', name: 'DIA DO OURO', desc: 'Bônus 💰 vale x2 (em vez de x1,5)' },
    { type: 'early', icon: '🐦', name: 'MADRUGADOR', desc: 'Tarefa antecipada vale x3 (em vez de x2)' },
    { type: 'mini', icon: '⚔', name: 'CAÇADOR', desc: 'Mini-boss ⚔ vale o dobro hoje' },
  ];
  return (c.event[d] = pool.length ? pool[hash('evt' + d) % pool.length] : null);
}
/** v4: a oferta do dia (-30%) é escolhida pelo seu contexto (cansaço, meta batida, dinheiro, dia da semana…) */
const REST = /SONECA|BANHO|DORMIR|FOLGA|TARDE LIVRE/, FUN = /JOGO|EPIS[OÓ]DIO|S[EÉ]RIE|FILME|SCROLL|AULA/, TREAT = /SOBREMESA|DELIVERY|DOCE|LANCHE|PIZZA/;
export function offerPick(s, d) {
  const c = cache(s);
  if (c.offer?.[d]) return c.offer[d];
  const items = (s.loja?.taverna || []).filter((i) => !/ANT[IÍ]DOTO/i.test(i.name));
  if (!items.length) return (c.offer ||= {})[d] = { item: null, why: '' };
  const st = dayStatus(s, d), wd = weekday(d), g = dailyGoal(s, d), done = tasksDoneOn(s, d);
  const sc = items.map((it) => {
    let v = (hash('offer' + d + it.id) % 1000) / 1000, why = 'sorteio do dia';
    const bump = (n, w) => { if (n > 0 && n >= v) { why = w; } v += n; };
    if ((st.has('fatigado') || st.has('neblina') || st.has('cansado')) && REST.test(it.name)) bump(2, 'você está cansado: descanso em oferta');
    if ((wd === 0 || wd === 6) && FUN.test(it.name)) bump(1, 'é fim de semana: lazer em oferta');
    if (g.today >= g.goal && (TREAT.test(it.name) || (FUN.test(it.name) && it.xp <= 160))) bump(1.6, 'você bateu a meta de hoje: mimo em oferta');
    if ((st.has('poupador') || st.has('noazul') || st.has('lenda')) && it.xp >= 250) bump(1.2, 'fase boa: um prêmio grande em oferta');
    if (st.has('procrastinacao') && it.xp < 80) bump(1.2, 'pra tirar você do lugar: algo leve em oferta');
    if (st.has('procrastinacao') && FUN.test(it.name) && it.xp >= 100) v -= 2;
    if (!done && it.xp >= 300) v -= 0.8;
    return { it, v, why };
  }).sort((a, z) => z.v - a.v)[0];
  return ((c.offer ||= {})[d] = { item: sc.it, why: sc.why });
}
export const offerOfDay = (s, d) => offerPick(s, d).item;
export const offerWhy = (s, d) => offerPick(s, d).why;

// ───────────────────────── STATUS DO DIA (buffs e debuffs) ─────────────────────────
const isAntidote = (p) => /ANT[IÍ]DOTO/i.test(p.item || '');
const antidoteOn = (s, d) => (s.loja?.purchases || []).some((p) => p.date === d && isAntidote(p));

export function lastSunday(s, d) {
  const list = (s.core?.sundays || []).filter((x) => x.date <= d && diffDays(x.date, d) < 7);
  if (!list.length) return null;
  const sun = list.sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const vals = Object.values(sun.notes || {}).map(Number).filter((n) => !isNaN(n));
  return { ...sun, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
}

/** 💥 PRAZOS ESTOURADOS: cada tarefa que passa do prazo aberta conta 1 (contado ao abrir o app, core.blow = { n, hits }).
 *  A cada BLOW_EVERY, a loja fica BLOW_MULT mais cara por BLOW_DAYS dias. Viagem não conta. */
export const BLOW_EVERY = 5, BLOW_DAYS = 3, BLOW_MULT = 1.2;
export const STATUS_INFO = {
  envenenado: { icon: '☠', name: 'ENVENENADO', kind: 'debuff', desc: 'Falhou o NO PH: taverna x2 por 48h.', cure: '⚔ Redenção ou ANTÍDOTO.' },
  neblina: { icon: '🌫', name: 'NEBLINA', kind: 'debuff', desc: '2 dias sem treino: hábitos -50%.', cure: 'Treinar hoje, ⚔ redenção ou ANTÍDOTO.' },
  fatigado: { icon: '😵', name: 'FATIGADO', kind: 'debuff', desc: '2 noites ruins: multa x2 na loja.', cure: '1 noite boa (😴 hoje) ou ANTÍDOTO.' },
  sobrecarga: { icon: '🧱', name: 'SOBRECARGA', kind: 'debuff', desc: '3 dias sem 🧹 CASA: TRABALHO perde o bônus 💰.', cure: 'Fazer 🧹 CASA hoje.' },
  ressaca: { icon: '🍺', name: 'RESSACA', kind: 'debuff', desc: '3+ compras na taverna ontem: hábitos -25% hoje.', cure: 'Passa amanhã.' },
  procrastinacao: { icon: '🐌', name: 'PROCRASTINAÇÃO', kind: 'debuff', desc: '2 dias sem concluir tarefa: taverna x1,5.', cure: 'Concluir 1 tarefa hoje.' },
  preguica: { icon: '🦥', name: 'PREGUIÇA', kind: 'debuff', desc: '3 dias com menos de 3 hábitos: hábitos -30%.', cure: 'Fazer 5+ hábitos hoje.' },
  cansado: { icon: '😩', name: 'CANSADO', kind: 'debuff', desc: 'Média do baú de domingo < 5: hábitos -10%.', cure: '2 noites boas seguidas.' },
  inspirado: { icon: '✨', name: 'INSPIRADO', kind: 'buff', desc: 'Média do baú de domingo ≥ 8: hábitos +20% na semana.' },
  embalo: { icon: '🚀', name: 'EMBALO', kind: 'buff', desc: '5+ tarefas concluídas ontem: hábitos +20% hoje.' },
  maquina: { icon: '🦾', name: 'MÁQUINA', kind: 'buff', desc: '4+ treinos nos últimos 7 dias: hábitos +15%.' },
  zen: { icon: '🧘', name: 'ZEN', kind: 'buff', desc: '7 noites boas seguidas e nenhum ☠ na semana: taverna -20%.' },
  lenda: { icon: '👑', name: 'LENDA DA SEMANA', kind: 'buff', desc: 'Semana passada foi LENDÁRIA: hábitos +25%.' },
  sabado: { icon: '🛡', name: 'SÁBADO BLINDADO', kind: 'buff', desc: 'Falha hoje não conta. Hábitos +50%.' },
  descansado: { icon: '🏕', name: 'DESCANSADO', kind: 'buff', desc: 'Ontem foi dia de descanso: hábitos +20% hoje.' },
  // v4: o jogo reage ao seu momento (vila, foco, dinheiro, diário)
  poupador: { icon: '🏦', name: 'POUPADOR', kind: 'buff', desc: 'Você guardou dinheiro (💰 GUARDEI) nos últimos 7 dias: taverna -10%.' },
  explorador: { icon: '🎒', name: 'EXPLORADOR', kind: 'buff', desc: 'O PRIMO voltou de uma expedição nos últimos 3 dias: hábitos +10%.' },
  focado: { icon: '🎯', name: 'FOCADO', kind: 'buff', desc: '3+ fogueiras de foco na semana: tarefas +10% XP.' },
  cronista: { icon: '📔', name: 'CRONISTA', kind: 'buff', desc: 'Diário respondido 3 dias seguidos: tarefas +5% XP.' },
  emchama: { icon: '🔥', name: 'EM CHAMA', kind: 'buff', desc: '3+ dias seguidos batendo a meta diária: tarefas +10% XP.' },
  noazul: { icon: '💙', name: 'NO AZUL', kind: 'buff', desc: 'O último mês fechou com sobra (planilha de gastos): taverna -10%.' },
  disperso: { icon: '🌀', name: 'DISPERSO', kind: 'debuff', desc: '4+ tarefas ▶ FAZENDO ao mesmo tempo: tarefas -10% XP.', cure: 'Conclua ou pause até sobrarem 3.' },
  estourado: { icon: '💥', name: 'CASTIGO', kind: 'debuff', desc: `${BLOW_EVERY} prazos estourados: loja ${Math.round((BLOW_MULT - 1) * 100)}% mais cara por ${BLOW_DAYS} dias.`, cure: 'Passa sozinho. Pra não voltar: prazo realista e DISTRIBUIR.' },
  devendo: { icon: '💸', name: 'DEVENDO', kind: 'debuff', desc: '2+ compras "fiz sem comprar" na semana: taverna x1,25.', cure: 'Compre ANTES de aproveitar por 7 dias.' },
  vazando: { icon: '🕳', name: 'VAZANDO', kind: 'debuff', desc: 'Mês passado: besteira acima de 40% ou crédito acima de 70% do gasto (planilha): taverna x1,15.', cure: 'Passa quando o mês virar com números melhores.' },
};

export function dayStatus(s, d) {
  const c = cache(s);
  if (c.status[d]) return c.status[d];
  const list = [];
  const add = (key, fx = {}) => list.push({ key, ...STATUS_INFO[key], ...fx });
  const y1 = addDays(d, -1), y2 = addDays(d, -2), y3 = addDays(d, -3);
  const fc = (h, x) => failedCounted(s, h, x);
  const start = s.core?.startDate || '2000-01-01';
  const ids = habitIds(s);

  if (ids.includes('noph')) {
    const fail = [y1, y2].find((x) => fc('noph', x));
    if (fail) {
      let cured = false;
      for (let x = fail; x <= d; x = addDays(x, 1)) if (did(s, 'rd', x) || antidoteOn(s, x)) cured = true;
      if (!cured) add('envenenado', { shop: 2 });
    }
  }
  if (ids.includes('treino') && fc('treino', y1) && fc('treino', y2) && !(did(s, 'treino', d) || did(s, 'rd', d) || antidoteOn(s, d)))
    add('neblina', { habit: -50 });
  if (ids.includes('sono') && fc('sono', y1) && fc('sono', y2) && !(did(s, 'sono', d) || antidoteOn(s, d)))
    add('fatigado', { shop: 2 });
  if (ids.includes('casa') && [y1, y2, y3].every((x) => fc('casa', x)) && !did(s, 'casa', d)) add('sobrecarga');
  if ((idx(s).buysByDay[y1] || 0) >= 3) add('ressaca', { habit: -25 });
  if (d >= addDays(start, 2) && !tasksDoneOn(s, y1) && !tasksDoneOn(s, y2) && !tasksDoneOn(s, d))
    add('procrastinacao', { shop: 1.5 });
  if ([y1, y2, y3].every((x) => registered(s, x) && countX(s, x) < 3) && countX(s, d) < 5) add('preguica', { habit: -30 });
  const sun = lastSunday(s, d);
  if (sun?.avg != null && sun.avg < 5 && !(did(s, 'sono', y1) && did(s, 'sono', d))) add('cansado', { habit: -10 });
  if (sun?.avg != null && sun.avg >= 8) add('inspirado', { habit: 20 });
  if (tasksDoneOn(s, y1) >= 5) add('embalo', { habit: 20 });
  if (range(addDays(d, -6), 7).filter((x) => did(s, 'treino', x)).length >= 4) add('maquina', { habit: 15 });
  const sleepRun = (end) => range(addDays(end, -6), 7).every((x) => did(s, 'sono', x));
  const noPoison = range(addDays(d, -6), 7).every((x) => !fc('noph', x));
  if (ids.includes('sono') && (sleepRun(d) || sleepRun(y1)) && noPoison) add('zen', { shop: 0.8 });
  if (s.core?.weeks?.[addDays(weekStart(d), -7)]?.lendaria) add('lenda', { habit: 25 });
  if (weekday(d) === 6) add('sabado', { habit: 50 });
  if ((s.core?.rests || []).includes(y1)) add('descansado', { habit: 20 });
  // v4: ecossistema
  const week = range(addDays(d, -6), 7), dayMs = (x) => new Date(x + 'T00:00:00').getTime();
  if ((s.core?.savings || []).some((g) => g.amount > 0 && week.includes(g.date))) add('poupador', { shop: 0.9 }); // só guardar conta; retirada não dá o bônus
  if ((s.core?.focus || []).filter((f) => f.ok && week.includes(f.date)).length >= 3) add('focado', { task: 10 });
  if ((s.core?.bonus || []).some((b) => b.kind === 'expedicao' && b.date >= addDays(d, -2) && b.date <= d)) add('explorador', { habit: 10 });
  if ([y1, y2, y3].every((x) => s.core?.journal?.[x])) add('cronista', { task: 5 });
  if (dailyGoal(s, d).streak >= 3) add('emchama', { task: 10 });
  if (openTasks(s).filter((t) => t.st === 'doing').length >= 4) add('disperso', { task: -10 });
  if ((s.loja?.purchases || []).filter((p) => p.debt && p.date >= addDays(d, -6) && p.date <= d).length >= 2) add('devendo', { shop: 1.25 });
  if (blowState(s, d).active) add('estourado', { shop: BLOW_MULT });
  const closed = (s.core?.cofre?.months || []).filter((m) => m.m < d.slice(0, 7)).at(-1);
  if (closed && closed.gua > 0 && !(closed.bes > 0.4 || closed.cred > 0.7)) add('noazul', { shop: 0.9 });
  if (closed && (closed.bes > 0.4 || closed.cred > 0.7)) add('vazando', { shop: 1.15 });

  const ev = eventOfDay(s, d);
  let habitMult = 1, shopMult = 1, taskMult = 1;
  for (const x of list) {
    if (x.habit) habitMult *= 1 + x.habit / 100;
    if (x.shop) shopMult *= x.shop;
    if (x.task) taskMult *= 1 + x.task / 100;
  }
  if (ev?.type === 'happy') shopMult *= 0.5;
  const res = {
    list, event: ev, habitMult, shopMult, taskMult,
    has: (k) => list.some((x) => x.key === k),
    buffs: list.filter((x) => x.kind === 'buff'),
    debuffs: list.filter((x) => x.kind === 'debuff'),
  };
  return (c.status[d] = res);
}

// ───────────────────────── XP DE TAREFAS ─────────────────────────
export const findBlock = (s, id) => allBlocks(s).find((b) => b.id === id);
export function groupOf(s, t) {
  if (t.group) return t.group;
  if (t.block) return findBlock(s, t.block)?.group || null;
  return null;
}
export function taskBaseXp(s, t) {
  const p = parse(t.text);
  if (p.xpFix != null) return p.xpFix;
  if (p.step) return C.XP_STEP;
  if (p.mini) return C.XP_MINI;
  if (p.home) return C.XP_HOME;
  return t.area === 'block' ? C.XP_SUB : C.XP_LIST;
}
/** XP que a tarefa dá se for concluída no dia `d` (com explicação). */
export function taskXp(s, t, d = today()) {
  const p = parse(t.text), g = groupOf(s, t), ev = eventOfDay(s, d);
  const base = taskBaseXp(s, t);
  const parts = [];
  let m = 1, onTime = false, early = false;
  if (p.star) { const k = ev?.type === 'star' ? 3 : C.M_STAR; m *= k; parts.push(`⭐ x${k}`); }
  if (t.due) {
    const diff = diffDays(d, t.due);
    onTime = diff >= 0;
    early = diff >= 2;
  }
  if (early) { const k = ev?.type === 'early' ? 3 : C.M_EARLY; m *= k; parts.push(`🐦 x${k}`); }
  else if (onTime) { m *= C.M_ONTIME; parts.push('📅 x1,5'); }
  else if (t.due && (s.core?.rests || []).includes(d)) parts.push('🏕 dia de descanso: sem multa de atraso');
  else if (t.due && tripDay(s, d)) parts.push('✈ viagem: sem multa de atraso');
  else if (t.due) { const k = Math.max(C.LATE_MIN, 1 - C.LATE_DAY * -diffDays(d, t.due)); m *= k; parts.push(`⏰ atraso −${Math.round((1 - k) * 100)}%`); }
  const money = p.money || g === 'tr' || g === 'cap';
  if (money) {
    if (g === 'tr' && dayStatus(s, d).has('sobrecarga')) parts.push('🧱 sem 💰');
    else { const k = ev?.type === 'money' ? 2 : C.M_MONEY; m *= k; parts.push(`💰 x${String(k).replace('.', ',')}`); }
  }
  if (p.mini && ev?.type === 'mini') { m *= 2; parts.push('⚔ x2'); }
  if ((s.core?.weekly?.[weekStart(d)] || []).includes(t.id)) { m *= 1.5; parts.push('📌 missão da semana x1,5'); }
  if (d === today()) { const pg = praga(s, d); if (pg.mult < 1 && !pg.list.some((x) => x.id === t.id)) { m *= pg.mult; parts.push(`🐛 A Praga −${Math.round((1 - pg.mult) * 100)}%`); } }
  const tm = dayStatus(s, d).taskMult;
  if (tm !== 1) { m *= tm; parts.push(`${tm > 1 ? '✨' : '⚠'} status ${tm > 1 ? '+' : ''}${Math.round((tm - 1) * 100)}%`); }
  return { xp: Math.round(base * m), base, onTime, early, parts };
}
export function blockXp(b) {
  const p = parse(b.title);
  if (p.xpFix != null) return p.xpFix;
  if (p.goal) return C.XP_GOAL;
  return C.XP_BLOCK[b.group] ?? 100;
}

// ───────────────────────── TOTAIS ─────────────────────────
export function totals(s) {
  const c = cache(s);
  if (c.totals) return c.totals;
  let earned = 0;
  const ix = idx(s), from = s.core?.season?.from || '';
  // v5.16 (1A) NOVO CAPÍTULO: XP, nível e tickets contam a partir do começo do capítulo. Gold, compras, conquistas e histórico ficam.
  for (const [d, v] of Object.entries(ix.xpByDay)) if (!from || d >= from) earned += v;
  for (const a of s.core?.adjust || []) if (!from || (a.date || '') >= from) earned += a.xp || 0;
  const buys = s.loja?.purchases || [];
  const spent = buys.reduce((a, p) => a + (!from || (p.date || '') >= from ? p.xp || 0 : 0), 0) - (s.core?.season?.spentMinus || 0);
  earned -= s.core?.season?.minus || 0; // o XP do próprio dia, ganho antes de apertar NOVO CAPÍTULO, fica no capítulo velho
  const goldIn = (s.loja?.goldIn || []).reduce((a, g) => a + (+g.amount || 0), 0);
  const goldOut = buys.reduce((a, p) => a + (+p.gold || 0), 0);
  const lv = levelInfo(earned);
  const st = stats(s);
  const lootTickets = (s.core?.bonus || []).reduce((a, b) => a + (!from || (b.date || '') >= from ? b.tickets || 0 : 0), 0);
  const bossDone = from ? (s.quests?.bosses || []).filter((b) => b.st === 'done' && (b.doneAt || '') >= from).length : st.bossDone;
  const onTime = from ? ix.comps.filter((c) => c.onTime && (c.doneAt || '') >= from).length : st.onTime;
  const ticketsEarned = (s.core?.season?.tickets || 0) + lv.level - 1 + bossDone + Math.floor(onTime / 10) + lootTickets;
  const ticketsSpent = buys.reduce((a, p) => a + (!from || (p.date || '') >= from ? p.tickets || 0 : 0), 0);
  return (c.totals = {
    earned, spent, balance: earned - spent, goldIn, goldOut, gold: goldIn - goldOut,
    tickets: ticketsEarned - ticketsSpent, ticketsEarned, ...lv,
  });
}
export function xpBetween(s, from, to) {
  let n = 0;
  for (const [d, v] of Object.entries(idx(s).xpByDay)) if (d >= from && d <= to) n += v;
  return n;
}

// ───────────────────────── ESTATÍSTICAS + CONQUISTAS ─────────────────────────
export function stats(s) {
  const c = cache(s);
  if (c.stats) return c.stats;
  const t = idx(s).tasks;
  const done = idx(s).comps;
  const days = Object.keys(s.marks?.days || {}).sort();
  const regDays = days.filter((d) => registered(s, d));
  const blocks = allBlocks(s).filter((b) => b.st === 'done');
  const weeks = Object.values(s.core?.weeks || {});
  const rituals = s.core?.rituals || [];
  const pessoa = new Set(rituals.filter((r) => r.type === 'pessoa').map((r) => r.id));
  let perfectRun = 0, run = 0, legendaryDay = 0, prev = null;
  for (const d of regDays) {
    if (isPerfect(s, d)) {
      run = prev && diffDays(prev, d) === 1 && isPerfect(s, prev) ? run + 1 : 1;
      perfectRun = Math.max(perfectRun, run);
      if (tasksDoneOn(s, d) >= 3) legendaryDay = 1;
    }
    prev = d;
  }
  const maxDone = Math.max(0, ...Object.values(idx(s).doneByDay));
  const td = today();
  let noPoison = 0;
  for (let i = 0; i < 30; i++) {
    const d = addDays(td, -i);
    if (d < (s.core?.startDate || td)) break;
    if (dayStatus(s, d).has('envenenado')) break;
    noPoison++;
  }
  const hx = (h) => totalX(s, h);
  const res = {
    done: done.length,
    onTime: done.filter((x) => x.onTime).length,
    early: done.filter((x) => x.early).length,
    star: done.filter((x) => parse(x.text).star).length,
    home: done.filter((x) => parse(x.text).home).length,
    withDue: (s.quests?.tasks || []).filter((x) => x.due && x.st !== 'done' && x.st !== 'cancel').length,
    blocksWithDue: (s.quests?.blocks || []).filter((b) => b.due && b.st !== 'done').length,
    bdClosed: blocks.filter((b) => b.group === 'bd').length,
    trClosed: blocks.filter((b) => b.group === 'tr').length,
    bossDone: (s.quests?.bosses || []).filter((b) => b.st === 'done').length,
    treino: hx('treino'), sono: hx('sono'), casa: hx('casa'), selfcare: hx('selfcare'), dieta: hx('dieta'), rd: hx('rd'),
    daysRegistered: regDays.length,
    maxStreak: Math.max(0, ...habitIds(s).map((h) => streak(s, h, td).streak)),
    forged: habitIds(s).filter((h) => hx(h) >= C.FORGE).length,
    perfectRun, legendaryDay, maxDone, noPoison,
    sundays: (s.core?.sundays || []).length,
    goldIn: (s.loja?.goldIn || []).reduce((a, g) => a + (+g.amount || 0), 0),
    people: (s.core?.ritualLog || []).filter((r) => pessoa.has(r.rid)).length,
    legendaryWeeks: weeks.filter((w) => w.lendaria).length,
    prazoWeeks: weeks.filter((w) => w.prazo).length,
    archived: Object.values(s.arq || {}).reduce((a, d) => a + (d.tasks || []).length, 0),
  };
  let earned = Object.values(idx(s).xpByDay).reduce((a, v) => a + v, 0) + (s.core?.adjust || []).reduce((a, x) => a + (x.xp || 0), 0);
  const at = Object.values(attributes(s)).map((x) => x.level);
  Object.assign(res, {
    level: levelInfo(earned).level, focus: (s.core?.focus || []).filter((f) => f.ok).length, expeditions: (s.core?.bonus || []).filter((b) => b.kind === 'expedicao').length,
    flame: dailyGoal(s).streak, maxAttr: Math.max(...at), minAttr: Math.min(...at), approved: allTasks(s).filter((t) => t.approved).length,
    capClosed: blocks.filter((b) => b.group === 'cap').length, ferreiro: (s.loja?.purchases || []).filter((p) => p.kind === 'ferreiro').length,
    winsDays: Object.values(s.core?.wins || {}).filter((w) => w.length >= 3).length, chapter: +(s.core?.chapter?.n || 1),
    journal: Object.keys(s.core?.journal || {}).length, bond: s.core?.bond?.pts || 0,
    allGreen: (() => { const last = [...(s.core?.sundays || [])].sort((x, y) => x.date.localeCompare(y.date)).pop(), ms = s.core?.milestones || []; return last && ms.length && ms.every((m) => (+(last.notes || {})[m] || 0) >= 8) ? 1 : 0; })(),
  });
  for (const [k, v] of Object.entries(s.core?.legacy || {})) if (typeof res[k] === 'number' && typeof v === 'number') res[k] += v;
  return (c.stats = res);
}

export const ACHIEVEMENTS = [
  ['first', 'PRIMEIRO SANGUE', 'Conclua 1 tarefa', 'done', 1, 20],
  ['worker', 'OPERÁRIO', 'Conclua 25 tarefas', 'done', 25, 50],
  ['master', 'MESTRE DE OBRAS', 'Conclua 100 tarefas', 'done', 100, 150],
  ['breaker', 'QUEBRADOR', 'Feche 1 bloco da BREAKDOWN MACHINE', 'bdClosed', 1, 50],
  ['breaker5', 'MÁQUINA DE QUEBRAR', 'Feche 5 blocos da BREAKDOWN MACHINE', 'bdClosed', 5, 150],
  ['delivered', 'PROJETO ENTREGUE', 'Feche 1 bloco de TRABALHO inteiro', 'trClosed', 1, 100],
  ['bosskiller', 'MATADOR DE BOSS', 'Derrote 1 BOSS', 'bossDone', 1, 100],
  ['brave', 'CORAJOSO', 'Conclua 10 tarefas ⭐ (as que você adiava)', 'star', 10, 100],
  ['guardian', 'GUARDIÃO DA BASE', 'Conclua 10 missões 🛡 (casa e família)', 'home', 10, 100],
  ['planner', 'PLANEJADOR', 'Tenha 20 tarefas com prazo', 'withDue', 20, 50],
  ['schedule', 'CRONOGRAMA VIVO', 'Dê prazo pra 5 blocos', 'blocksWithDue', 5, 50],
  ['perfectweek', 'SEMANA PERFEITA', '7 dias perfeitos seguidos', 'perfectRun', 7, 150],
  ['combo', 'COMBO MÁXIMO', '14 dias seguidos num hábito (x2)', 'maxStreak', 14, 100],
  ['gym', 'RATO DE ACADEMIA', '30 treinos', 'treino', 30, 100],
  ['monster', 'MONSTRO', '100 treinos', 'treino', 100, 300],
  ['sleep', 'SONO DE PEDRA', '30 noites boas', 'sono', 30, 100],
  ['redeemed', 'REDIMIDO', 'Faça 1 ⚔ Missão de Redenção', 'rd', 1, 30],
  ['constant', 'CONSTANTE', '100 dias com hábito marcado', 'daysRegistered', 100, 200],
  ['reviewer', 'REVISOR', 'Abra 4 BAÚS DE DOMINGO', 'sundays', 4, 100],
  ['richchest', 'BAÚ CHEIO', 'Receba 5.000 de ouro', 'goldIn', 5000, 200],
  ['bonds', 'LAÇOS FORTES', '20 encontros com pessoas (RITUAIS)', 'people', 20, 150],
  ['punctual', 'PONTUAL', '10 tarefas feitas no prazo', 'onTime', 10, 100],
  ['legendweek', 'SEMANA LENDÁRIA', 'Cumpra os 5 desafios numa semana', 'legendaryWeeks', 1, 150],
  ['earlybird', 'MADRUGADOR', 'Faça 10 tarefas 2+ dias antes do prazo', 'early', 10, 150],
  ['elite', 'PONTUALIDADE DE ELITE', '25 tarefas feitas no prazo', 'onTime', 25, 200],
  ['weekontime', 'SEMANA NO PRAZO', 'Uma semana com TODOS os prazos cumpridos', 'prazoWeeks', 1, 100],
  ['firstweek', 'PRIMEIRA SEMANA', '7 dias com hábito marcado', 'daysRegistered', 7, 30],
  ['legendday', 'DIA LENDÁRIO', 'Dia perfeito + 3 tarefas concluídas', 'legendaryDay', 1, 100],
  ['momentum', 'EMBALADO', 'Entre em 🚀 EMBALO (5 tarefas num dia)', 'maxDone', 5, 50],
  ['forger', 'FORJADOR', 'Forje 1 hábito (66 ✔ no mesmo hábito)', 'forged', 1, 150],
  ['forger4', 'MESTRE FORJADOR', 'Forje 4 hábitos', 'forged', 4, 400],
  ['unshaken', 'INABALÁVEL', '30 dias seguidos sem ☠ envenenado', 'noPoison', 30, 200],
  ['penitent', 'PENITENTE', '10 missões de ⚔ redenção', 'rd', 10, 100],
  ['cleaner', 'FAXINEIRO', '50 dias de 🧹 casa em ordem', 'casa', 50, 120],
  ['silk', 'PELE DE SEDA', '40 dias de 🧴 selfcare', 'selfcare', 40, 100],
  ['chef', 'CHEF DE COZINHA', '40 dias de 🍚 dieta', 'dieta', 40, 120],
  ['anticipator', 'ANTECIPADOR', '25 tarefas antecipadas 🐦', 'early', 25, 250],
  ['monthontime', 'MÊS NO PRAZO', '4 semanas 100% no prazo', 'prazoWeeks', 4, 250],
  ['archivist', 'ARQUIVISTA', '50 tarefas no ARQUIVO', 'archived', 50, 100],
  ['steelbonds', 'LAÇOS DE AÇO', '60 encontros com pessoas', 'people', 60, 300],
  ['magnate', 'MAGNATA', 'Receba 20.000 de ouro', 'goldIn', 20000, 500],
  ['oneyear', 'UM ANO DE JOGO', '365 dias com hábito marcado', 'daysRegistered', 365, 800],
  // v3
  ['level5', 'ARQUITETO DE VERDADE', 'Chegue ao nível 5', 'level', 5, 100], ['level10', 'VETERANO DE GUERRA', 'Chegue ao nível 10', 'level', 10, 300], ['level20', 'LENDA VIVA', 'Chegue ao nível 20', 'level', 20, 1000],
  ['focus1', 'PRIMEIRA CHAMA', 'Complete 1 fogueira de foco', 'focus', 1, 20], ['focus25', 'GUARDIÃO DO FOGO', '25 fogueiras de foco', 'focus', 25, 200], ['focus100', 'MONGE DA FOGUEIRA', '100 fogueiras de foco', 'focus', 100, 500],
  ['exp1', 'PÉ NA ESTRADA', 'Mande o companheiro em 1 expedição', 'expeditions', 1, 20], ['exp20', 'CARTÓGRAFO', '20 expedições', 'expeditions', 20, 200],
  ['flame7', 'CHAMA ACESA', '7 dias seguidos batendo a meta diária de XP', 'flame', 7, 100], ['flame30', 'CHAMA ETERNA', '30 dias seguidos na meta diária', 'flame', 30, 400],
  ['attr5', 'ESPECIALISTA', 'Leve um atributo ao nível 5', 'maxAttr', 5, 100], ['attr10', 'MESTRE DE OFÍCIO', 'Leve um atributo ao nível 10', 'maxAttr', 10, 300], ['allattr3', 'EQUILIBRADO', 'Todos os atributos no nível 3', 'minAttr', 3, 150],
  ['approved1', 'DESPACHADO', 'Aprove 1 tarefa 🔁 vai e volta', 'approved', 1, 50], ['approved10', 'CARIMBO DE OURO', '10 aprovações de vai e volta', 'approved', 10, 200],
  ['cap1', 'NOVO CLIENTE', 'Feche 1 bloco de CAPTAÇÃO', 'capClosed', 1, 100], ['cap5', 'ÍMÃ DE CLIENTES', 'Feche 5 captações', 'capClosed', 5, 300],
  ['forge1', 'PRIMEIRA FORJA', 'Compre 1 item no ferreiro', 'ferreiro', 1, 30], ['forge10', 'ARSENAL', '10 itens do ferreiro', 'ferreiro', 10, 200],
  ['chapter2', 'NOVO CAPÍTULO', 'Comece o capítulo 2 da sua história', 'chapter', 2, 200],
  ['boss3', 'CAÇADOR DE BOSSES', 'Derrote 3 bosses', 'bossDone', 3, 300], ['gold50k', 'BARÃO', 'Receba 50.000 de ouro', 'goldIn', 50000, 1000], ['people100', 'CORAÇÃO DA VILA', '100 encontros com pessoas', 'people', 100, 500],
  
  ['bond15', 'PARCEIRO DE FOGUEIRA', 'Chegue a 15 de amizade com o companheiro', 'bond', 15, 80], ['bond100', 'IRMÃOS DE ESTRADA', '100 de amizade com o companheiro', 'bond', 100, 300],
  ['allgreen', 'REINO EM FESTA', 'Todas as bandeiras dos distritos verdes (nota 8+) no mesmo domingo', 'allGreen', 1, 300],
  
  
  ['week700', 'SEMANA DE OURO', 'Faça 700 XP numa única semana', 'bestWeekXp', 700, 150], ['missions4', 'TRÊS PEDRAS', '4 semanas com as 3 missões da semana feitas', 'missionWeeks', 4, 200],
  
  ['pet3', 'CRIADOR DE FAÍSCA', 'Faça a FAÍSCA evoluir 3 vezes', 'petStage', 3, 200],
  // v5.13: com as mecânicas novas (bosses, castigo, revisado, viagem, janelas)
  ['mini1', 'PRIMEIRO GOLPE', 'Derrote 1 mini-boss ⚔', 'miniDone', 1, 30], ['mini10', 'ESPADACHIM', 'Derrote 10 mini-bosses ⚔', 'miniDone', 10, 150], ['mini30', 'LÂMINA LENDÁRIA', 'Derrote 30 mini-bosses ⚔', 'miniDone', 30, 400],
  ['steps50', 'PASSO A PASSO', 'Conclua 50 passos ↳', 'stepsDone', 50, 120], ['bosshalf', 'SANGRANDO', 'Tire metade da vida de um BOSS', 'bossHalf', 1, 80],
  ['gestor', 'GESTOR', 'Feche 1 bloco de GESTÃO', 'gsClosed', 1, 80], ['blocks10', 'EMPREITEIRO', 'Feche 10 blocos', 'blocksClosed', 10, 250], ['blocks25', 'CONSTRUTORA', 'Feche 25 blocos', 'blocksClosed', 25, 500],
  ['eyes10', 'OLHO DE ÁGUIA', 'Deixe 10 blocos 👁 REVISADOS ao mesmo tempo', 'reviewedNow', 10, 80], ['window1', 'DONO DA CASA', 'Crie uma janela sua no QUESTS', 'windows', 1, 40],
  ['trip1', 'MOCHILEIRO', 'Use o ✈ modo VIAGEM e volte', 'trips', 1, 50], ['clean30', 'FICHA LIMPA', '30 dias sem castigo 💥 de prazo estourado', 'cleanDays', 30, 200],
  ['storm10', 'FURACÃO', '10 tarefas num dia só', 'maxDone', 10, 150], ['clock100', 'RELÓGIO SUÍÇO', '100 tarefas feitas no prazo', 'onTime', 100, 400],
  ['imuno', 'BENZEDEIRA', 'Espante 3 encostos antes de virarem ENCOSTO (fase 3)', 'pragaEarly', 3, 120], ['imuno10', 'CORPO FECHADO', 'Espante 10 pragas', 'pragaCured', 10, 200],
  ['done500', 'MÃO DE OBRA PESADA', 'Conclua 500 tarefas', 'done', 500, 500], ['done1000', 'MIL E UMA', 'Conclua 1.000 tarefas', 'done', 1000, 1000],
].map(([key, name, desc, metric, goal, xp]) => ({ key, name, desc, metric, goal, xp }));

/** números que as conquistas novas usam (nível, sequência, semana de ouro…) */
function extraMetrics(s) {
  const xpd = idx(s).xpByDay, weeks = {};
  for (const [d, x] of Object.entries(xpd)) { const w = weekStart(d); weeks[w] = (weeks[w] || 0) + x; }
  return {
    bestWeekXp: Math.max(0, ...Object.values(weeks)),
    missionWeeks: (s.core?.bonus || []).filter((b) => b.kind === 'missoes').length,
    petStage: s.core?.primo?.petMax || 0,
    pragaEarly: s.core?.praga?.early || 0, pragaCured: s.core?.praga?.cured || 0,
    ...(() => {
      const comps = idx(s).comps, closed = allBlocks(s).filter((b) => b.st === 'done'), td = today();
      const lastHit = [...(s.core?.blow?.hits || [])].sort().at(-1) || s.core?.startDate || td;
      return {
        miniDone: comps.filter((x) => parse(x.text).mini).length, stepsDone: comps.filter((x) => parse(x.text).step).length,
        bossHalf: (s.quests?.bosses || []).filter((b) => b.st === 'done' || (bossHp(s, b)?.total && bossHp(s, b).pct <= 0.5)).length,
        gsClosed: closed.filter((b) => b.group === 'gs').length, blocksClosed: closed.length,
        reviewedNow: (s.quests?.blocks || []).filter((b) => b.st !== 'done' && reviewed(b)).length,
        windows: (s.core?.windows || []).length, trips: (s.core?.trips || []).length, cleanDays: Math.max(0, diffDays(lastHit, td)),
      };
    })(),
  };
}
/** v6: o "jogo" visto só a partir do começo do capítulo (pras conquistas recomeçarem sem apagar o histórico) */
export function seasonView(s) {
  const from = s.core?.season?.from;
  if (!from) return s;
  if (s._sv && s._sv.epoch === s._epoch) return s._sv.view;
  const keep = (d) => (d || '') >= from;
  const tasks = (s.quests?.tasks || []).map((t) => (t.st === 'done' && !keep(t.doneAt) ? null : t.rounds?.length ? { ...t, rounds: t.rounds.filter((r) => keep(r.doneAt)) } : t)).filter(Boolean);
  const view = {
    _epoch: s._epoch, arq: {},
    quests: { ...s.quests, tasks, blocks: (s.quests?.blocks || []).filter((b) => b.st !== 'done' || keep(b.doneAt)), bosses: (s.quests?.bosses || []).filter((b) => b.st !== 'done' || keep(b.doneAt)) },
    marks: { ...s.marks, days: Object.fromEntries(Object.entries(s.marks?.days || {}).filter(([d]) => keep(d))) },
    loja: { ...s.loja, purchases: (s.loja?.purchases || []).filter((p) => keep(p.date)), goldIn: (s.loja?.goldIn || []).filter((g) => keep(g.date)) },
    core: { ...s.core, achievements: s.core?.seasonAch || {}, seasonAch: {}, legacy: null, ladder: [], bonus: (s.core?.bonus || []).filter((b) => keep(b.date)), ritualLog: (s.core?.ritualLog || []).filter((r) => keep(r.date)),
      sundays: (s.core?.sundays || []).filter((x) => keep(x.date)), focus: (s.core?.focus || []).filter((f) => keep(f.date)), weeks: Object.fromEntries(Object.entries(s.core?.weeks || {}).filter(([w]) => keep(w))), season: null },
  };
  s._sv = { epoch: s._epoch, view };
  return view;
}
export function achievementList(s) {
  // v6 (1B): no capítulo novo as conquistas recomeçam: contam só o que aconteceu a partir dele e ficam em core.seasonAch
  const sv = seasonView(s), st = { ...stats(sv), ...extraMetrics(sv) }, got = (s.core?.season?.from ? s.core?.seasonAch : s.core?.achievements) || {};
  return ACHIEVEMENTS.map((a) => {
    const value = st[a.metric] || 0;
    return { ...a, value, pct: Math.min(1, value / a.goal), unlocked: !!got[a.key], date: got[a.key]?.date };
  });
}
/** conquistas que já bateram a meta mas ainda não foram registradas */
export const newAchievements = (s) => achievementList(s).filter((a) => !a.unlocked && a.value >= a.goal);

// ───────────────────────── DESAFIOS DA SEMANA ─────────────────────────
export const CHALLENGES = [
  { key: 'treino', icon: '💪', name: 'TREINOS', goal: 4, xp: 40 },
  { key: 'sono', icon: '😴', name: 'NOITES BOAS', goal: 5, xp: 30 },
  { key: 'casa', icon: '🧹', name: 'CASA', goal: 5, xp: 30 },
  { key: 'perfeito', icon: '🌟', name: 'DIAS PERFEITOS', goal: 1, xp: 30 },
  { key: 'prazo', icon: '⏰', name: 'SEMANA NO PRAZO', goal: 1, xp: 50 },
];
export function weekChallenges(s, ws, td = today()) {
  const days = range(ws, 7), end = days[6];
  const count = (h) => days.filter((d) => did(s, h, d)).length;
  const due = idx(s).tasks.filter((t) => t.due && t.due >= ws && t.due <= end && t.st !== 'cancel');
  const ok = due.filter((t) => t.st === 'done' && t.doneAt && t.doneAt <= t.due).length;
  const complete = td > end;
  const vals = {
    treino: count('treino'), sono: count('sono'), casa: count('casa'),
    perfeito: days.filter((d) => isPerfect(s, d)).length,
    prazo: complete && due.length > 0 && ok === due.length ? 1 : 0,
  };
  const list = CHALLENGES.map((c) => ({ ...c, value: vals[c.key], done: vals[c.key] >= c.goal }));
  if (!complete) {
    const p = list.find((c) => c.key === 'prazo');
    p.live = `${ok}/${due.length} no prazo`;
  }
  const n = list.filter((c) => c.done).length;
  return { list, n, legendary: complete && n === 5, complete, dueTotal: due.length, dueOk: ok };
}

// ───────────────────────── LOJA ─────────────────────────
export function shopState(s, d = today()) {
  const st = dayStatus(s, d);
  const overdue = overdueTasks(s, d);
  // v6.4: com 3+ atrasadas a loja tranca e só destranca quando TODAS forem resolvidas ou remarcadas (core.shopLock)
  const rescued = false; // v6.4: o resgate não destranca mais a loja (o dono quer: resolva TODAS)
  const pragaLock = praga(s, d).phase >= 4;
  const locked = overdue.length >= 3 || (!!s.core?.shopLock && overdue.length > 0) || pragaLock;
  const econ = econIndex(s, d);
  return { mult: st.shopMult * econ, econ, locked, pragaLock, rescued: rescued && overdue.length >= 3, overdue: overdue.length, status: st };
}
export function tavernaPrice(s, item, d = today()) {
  let m = dayStatus(s, d).shopMult;
  const offer = offerOfDay(s, d);
  if (offer && offer.id === item.id) m *= 1 - C.OFFER;
  return Math.max(1, Math.round(((lockedPrice(item.name) ?? item.xp) * m * econIndex(s, d)) / 5) * 5);
}
/** "fiz sem comprar": quanto a mais se paga (v5.8: era o dobro) */
export const DEBT_MULT = 1.5;
/** remarcar: o custo dobra a cada vez até este teto, em múltiplos do custo-base (v5.8: era 16x) */
export const RESCHED_CAP = 8;
export function blowState(s, d = today()) {
  const b = s.core?.blow || {}, n = b.n || 0, hit = (b.hits || []).filter((h) => h <= d).sort().at(-1);
  // v5.16 (2F): o castigo tem saída (resolver ou remarcar 1 atrasada depois dele cancela) e intensidade escolhida em PERKS
  const mode = s.core?.settings?.castigo || 'loja', rescued = !!hit && (s.core?.rescue || '') >= hit;
  const on = !!hit && diffDays(hit, d) < BLOW_DAYS && !rescued && praga(s, d).phase < 3; // v6.5: com a Praga ativa o castigo não soma
  return { n, left: BLOW_EVERY - (n % BLOW_EVERY), active: on && mode === 'loja', warn: on && mode === 'aviso', mode, rescued: !!hit && rescued && diffDays(hit, d) < BLOW_DAYS };
}
export const ferreiroXp = (item) => C.FERREIRO_XP * item.nv;
export const timesBought = (s, itemId) =>
  (s.loja?.purchases || []).filter((p) => p.itemId === itemId).reduce((a, p) => a + (p.qty || 1), 0);

// ───────────────────────── PRAZOS ─────────────────────────
/** aberta = ainda precisa de ação sua (📨 enviada aguardando retorno não conta) */
export const isOpen = (t) => t.st !== 'done' && t.st !== 'cancel' && t.st !== 'sent';
export function openTasks(s) {
  const closed = new Set((s.quests?.blocks || []).filter((b) => b.st === 'done').map((b) => b.id));
  return (s.quests?.tasks || []).filter((t) => isOpen(t) && !(t.block && closed.has(t.block)));
}
export const overdueTasks = (s, d = today()) => openTasks(s).filter((t) => t.due && t.due < d);
export function loadByDay(s) {
  const load = {};
  for (const t of openTasks(s)) if (t.due) load[t.due] = (load[t.due] || 0) + 1;
  return load;
}
/** próxima ação de um bloco = 1º item em aberto (na ordem) */
export function nextAction(s, b) {
  const items = (s.quests?.tasks || []).filter((t) => t.block === b.id).sort((a, x) => a.ord - x.ord);
  return items.find((t) => isOpen(t) && !items.some((c) => c.parent === t.id && isOpen(c))) ||
    items.find(isOpen) || null;
}
/** 📅 DISTRIBUIR PRAZOS: propõe datas (máx. 6 por dia útil, pula fim de semana e feriado). */
/** seu ritmo real: média de tarefas concluídas em cada dia da semana nas últimas 8 semanas (dias de viagem não contam). null = pouco histórico */
export function weekdayPace(s, td = today()) {
  const done = idx(s).doneByDay, start = s.core?.startDate || td, sum = Array(7).fill(0), n = Array(7).fill(0);
  for (let i = 1; i <= 56; i++) {
    const d = addDays(td, -i);
    if (d < start) break;
    if (tripDay(s, d)) continue;
    const w = weekday(d); sum[w] += done[d] || 0; n[w]++;
  }
  return sum.map((x, w) => (n[w] >= 2 ? x / n[w] : null));
}
/** quantos prazos cabem num dia: 80% do seu ritmo naquele dia da semana (a folga cobre imprevistos), entre 1 e o máximo dos AJUSTES.
 *  Fim de semana só entra se você costuma render nele; feriado nunca. Sem histórico suficiente, vale o máximo dos AJUSTES nos dias úteis. */
export function dayCapacity(s, d, pace = weekdayPace(s), max = s.core?.settings?.maxPerDay || C.MAX_PER_DAY) {
  const w = weekday(d), p = pace[w], weekend = w === 0 || w === 6;
  if (holidayName(d)) return 0;
  if (p == null) return weekend ? 0 : max;
  const c = Math.min(max, Math.round(p * 0.8));
  return weekend ? c : Math.max(1, c);
}
/** DISTRIBUIR. opts.scope: 'dated' = só remarca as que JÁ TINHAM prazo e atrasaram · 'new' = só dá data à próxima ação de cada bloco · 'all' = as duas coisas.
 *  Ordem: prioridade (!), depois ⭐, depois a mais atrasada primeiro (regra "prazo mais antigo primeiro", que é a que menos acumula atraso). */
export function distributePlan(s, opts = {}) {
  if (opts.onlyNew) return []; // as listas agora são pela data: nada ganha prazo sozinho ao abrir
  const td = opts.today || today(), max = opts.max || s.core?.settings?.maxPerDay || C.MAX_PER_DAY;
  const scope = opts.scope || (opts.reschedule === false ? 'new' : 'all');
  const load = loadByDay(s), pace = weekdayPace(s, td);
  const plan = [];
  const pick = (from) => {
    let d = from;
    for (let i = 0; i < 400; i++, d = addDays(d, 1)) if ((load[d] || 0) < dayCapacity(s, d, pace, max)) return d;
    return from;
  };
  const blocksById = new Map((s.quests?.blocks || []).map((b) => [b.id, b])), capOf = (t) => dueCap(t.block && blocksById.get(t.block), td);
  const push = (t, from, why) => {
    if (t.due && t.due >= td) return;
    if (t.due) load[t.due] = Math.max(0, (load[t.due] || 0) - 1);
    let d = pick(from); const cap = capOf(t);
    if (cap && d > cap) d = cap; // subtarefa não passa do prazo final do bloco
    load[d] = (load[d] || 0) + 1;
    plan.push({ id: t.id, text: t.text, from: t.due || null, to: d, why });
  };
  const open = openTasks(s).filter((t) => t.st !== 'wait');
  if (scope !== 'new') {
    const late = open.filter((t) => t.due && t.due < td).sort((a, b) => (!!b.prio - !!a.prio) || (parse(b.text).star - parse(a.text).star) || a.due.localeCompare(b.due) || a.ord - b.ord);
    for (const t of late) push(t, td, `atrasada ${diffDays(t.due, td)} dia(s)`);
  }
  if (scope !== 'dated') {
    const blocks = (s.quests?.blocks || []).filter((b) => b.st !== 'done' && b.st !== 'wait' && b.color !== 'black');
    for (const b of [...blocks].sort((a, b) => a.ord - b.ord)) {
      const n = nextAction(s, b);
      if (n && !n.due && n.st !== 'wait' && !plan.some((p) => p.id === n.id)) push(n, addDays(td, 1), b.title);
    }
  }
  return plan;
}

// ───────────────────────── RITUAIS ─────────────────────────
export function ritualNext(r, td = today()) {
  if (r.every) return r.last ? addDays(r.last, r.every) : td;
  if (r.dom) {
    const base = r.last ? addDays(r.last, 1) : td;
    let y = +base.slice(0, 4), m = +base.slice(5, 7);
    const mk = () => `${y}-${String(m).padStart(2, '0')}-${String(Math.min(r.dom, 28)).padStart(2, '0')}`;
    let d = mk();
    if (d < base) { m++; if (m > 12) { m = 1; y++; } d = mk(); }
    return d;
  }
  return null;
}
/** dia que VOCÊ marcou pra fazer o ritual (ex.: SPA no sábado). Vale no lugar do aviso automático até você fazer. */
export const ritualPlan = (r) => (r.plan && (!r.last || r.plan > r.last) ? r.plan : null);
/** rituais por dia numa janela (pra AGENDA e linha do tempo): o dia marcado ou o próximo aviso, mais as repetições seguintes. Atrasado aparece em hoje. */
export function ritualDates(s, from, n, td = today()) {
  const end = addDays(from, n - 1), out = {};
  for (const r of s.core?.rituals || []) {
    let d = ritualPlan(r) || ritualNext(r, td);
    if (!d) continue;
    if (d < td) d = td;
    for (let guard = 0; d <= end && guard < 60; guard++) {
      if (d >= from) (out[d] ||= []).push(r);
      d = r.every ? addDays(d, r.every) : ritualNext({ ...r, last: d }, d);
      if (!d) break;
    }
  }
  return out;
}
export function ritualStatus(r, td = today()) {
  const plan = ritualPlan(r), next = plan || ritualNext(r, td);
  if (!next) return { next: null, left: null, label: 'SEM FREQUÊNCIA', tone: 'muted' };
  const left = diffDays(td, next);
  if (plan && left > 0) return { next, left, plan, label: left === 1 ? '📅 AMANHÃ' : `📅 EM ${left}d`, tone: 'good' };
  if (left < 0) return { next, left, label: `⚠ ATRASADO ${-left}d`, tone: 'bad' };
  if (left === 0) return { next, left, label: 'HOJE', tone: 'warn' };
  if (left <= 2) return { next, left, label: `⏳ EM ${left}d`, tone: 'warn' };
  return { next, left, label: '✔ EM DIA', tone: 'good' };
}
/** bloco marcado como REVISADO nas últimas 24 h */
export const reviewed = (b, now = Date.now()) => !!b?.rev && now - b.rev < 864e5;
/** lista do QUESTS marcada como revisada nas últimas 24 h (core.rev = { hoje: hora, amanha: hora… }) */
export const listReviewed = (s, k, now = Date.now()) => reviewed({ rev: s.core?.rev?.[k] }, now);
/** prazo máximo de uma subtarefa = o prazo final do bloco dela. Bloco já vencido não limita (mude o prazo do bloco). */
export const dueCap = (b, td = today()) => (b?.due && b.due >= td ? b.due : null);
/** os blocos de uma aba do QUESTS: 'bd', 'tr', 'cap', 'gs' (sem os guardados em janelas do dono) ou 'w:<id>' (janela do dono) */
export const tabBlocks = (s, k) => { const ws = new Set(windows(s).map((w) => w.id)); return (s.quests?.blocks || []).filter((b) => (k.startsWith('w:') ? b.win === k.slice(2) : b.group === k && !ws.has(b.win))); };
/** aba toda revisada: todas as listas com tarefa aberta, ou todos os blocos ativos (não fechados nem parados) */
export function tabReviewed(s, k) {
  if (k === 'boss') return false;
  if (k === 'listas') { const ks = AREA_KEYS.filter((a) => (s.quests?.tasks || []).some((t) => !t.block && t.area === a && isOpen(t))); return ks.length > 0 && ks.every((a) => listReviewed(s, a)); }
  const bl = tabBlocks(s, k).filter((b) => b.st !== 'done' && b.color !== 'black');
  return bl.length > 0 && bl.every((b) => reviewed(b));
}
export const ritualXp = (r) => (r.type === 'pessoa' ? C.RIT_PESSOA : C.RIT_OUTRO);

// ───────────────────────── ALERTAS ─────────────────────────
export function alerts(s, d = today()) {
  const out = [];
  const over = overdueTasks(s, d);
  if (over.length >= 3) out.push({ icon: '⏰', name: 'ATOLADO', desc: `${over.length} tarefas atrasadas: loja trancada até zerar (concluir ou remarcar).`, tone: 'bad' });
  const forgotten = over.filter((t) => diffDays(t.due, d) >= 7);
  if (forgotten.length) out.push({ icon: '💀', name: 'ESQUECIDA', desc: `${forgotten.length} tarefa(s) atrasada(s) há 7+ dias. Resolva, quebre em pedaços ou remarque com honestidade.`, tone: 'bad' });
  const start = s.core?.startDate || d;
  if (diffDays(start, d) >= 5 && range(addDays(d, -4), 5).every((x) => !tasksDoneOn(s, x)))
    out.push({ icon: '🗿', name: 'ESTAGNADO', desc: '5 dias sem concluir nada. Pegue a menor subtarefa e faça 10 minutos.', tone: 'warn' });
  const miss = (s.core?.rituals || []).filter((r) => r.type === 'pessoa' && (ritualStatus(r, d).left ?? 0) <= -3);
  if (miss.length) out.push({ icon: '💔', name: 'SAUDADE', desc: `${miss.map((r) => r.name).join(', ')}: atrasado há 3+ dias.`, tone: 'warn' });
  return out;
}

// ───────────────────────── BAÚ DE DOMINGO ─────────────────────────
export function sundayXp(notes, rit) {
  const vals = Object.values(notes).map(Number).filter((n) => !isNaN(n) && n > 0);
  const all3 = rit.prazos && rit.pessoas && rit.quests;
  return C.BAU_BASE * (all3 ? 2 : 1) + C.BAU_NOTE * vals.filter((n) => n >= 8).length;
}


// ───────────────────────── v2: LOOT ALEATÓRIO ─────────────────────────
// Sorteio determinístico (mesma tarefa no mesmo dia = mesmo resultado: desmarcar/marcar não re-sorteia).
export function lootRoll(s, t, d, closedBlock = false) {
  const p = parse(t.text);
  if (!closedBlock && (p.step || (taskBaseXp(s, t) < 10 && !p.mini))) return null; // ↳ e subtarefas de 5 XP não soltam loot
  const got = (s.core?.bonus || []).filter((b) => b.kind === 'loot' && b.date === d && b.taskId !== t.id).length;
  if (got >= C.LOOT_PER_DAY) return null;
  const chance = 0.06 + (p.star ? 0.04 : 0) + (p.mini ? 0.08 : 0) + (closedBlock ? 0.25 : 0);
  const r = (hash('loot' + t.id + d) % 10000) / 10000;
  if (r >= chance) return null;
  const k = hash('kind' + t.id + d) % 100;
  const cheap = (s.loja?.taverna || []).filter((i) => i.xp <= 120 && !/ANT[IÍ]DOTO/i.test(i.name));
  if (k < 3) return { kind: 'ticket', tickets: 1, xp: 0, label: '🎟 TICKET' };
  if (k < 18 && cheap.length) { const it = cheap[hash('it' + t.id + d) % cheap.length]; return { kind: 'item', xp: 0, itemId: it.id, label: 'VALE: ' + it.name }; }
  if (k < 26) return { kind: 'xp', xp: 40, label: '+40 XP' };
  const xp = [10, 15, 20][hash('xp' + t.id + d) % 3];
  return { kind: 'xp', xp, label: `+${xp} XP` };
}

// ───────────────────────── v3: PREÇOS TRAVADOS (só mudam aqui, no código) ─────────────────────────
// Calibração: sua média real é ~100 XP/dia. Pequeno prazer ≈ meio dia de esforço · médio ≈ 1–2 dias · grande ≈ 4 dias · folga ≈ 1 semana.
/** índice da economia: compara a sua média de XP dos últimos 14 dias com a META DO DIA.
 *  Na meta = preço normal. Semana forte → sobe só um pouco; semana difícil → cai um pouco. Limites 0,9–1,15. */
export function econIndex(s, d = today()) {
  const start = s.core?.startDate || d, xp = idx(s).xpByDay;
  const days = range(addDays(d, -14), 14).filter((x) => x >= start);
  if (days.length < 5) return 1;
  const avg = days.reduce((a, x) => a + (xp[x] || 0), 0) / days.length;
  // v5.8: o preço é NORMAL quando a sua média bate a meta do dia, e varia pouco (−10% a +15%).
  // Antes ia até +40% com 140 XP/dia: render mais deixava tudo mais caro.
  const goal = goalAt(s);
  return Math.min(1.15, Math.max(0.9, Math.round((avg / goal) * 20) / 20));
}
/** v4: preços não são mais travados no código; valem os da loja (editáveis em PERKS AND RULES) */
export const lockedPrice = () => null;
/** tickets pra pegar o item grátis: recompensa grande custa mais (DIA DE FOLGA = 2 🎟) */
export const ticketCost = (it) => (it.tk >= 1 ? Math.round(it.tk) : (it.xp >= 400 ? 2 : 1));

// ───────────────────────── v3: ATRIBUTOS (ficha do personagem) ─────────────────────────
export function attributes(s) {
  const c = cache(s);
  if (c.attrs) return c.attrs;
  const a = { vigor: 0, ordem: 0, riqueza: 0, saber: 0, lacos: 0 };
  for (const [, v] of Object.entries(s.marks?.days || {})) for (const [h, m] of Object.entries(v.h || {})) if (m === 'x') { if (h === 'casa') a.ordem += 5; else if (h !== 'rd') a.vigor += 5; }
  for (const t of allTasks(s)) for (const cp of completions(t)) {
    const g = groupOf(s, t), p = parse(t.text), b = t.block ? findBlock(s, t.block) : null;
    const k = g === 'tr' || g === 'cap' || p.money ? 'riqueza' : p.home || g === 'gs' || b?.color === 'orange' ? 'ordem' : g === 'bd' ? 'saber' : 'ordem';
    a[k] += cp.xp || 0;
  }
  const pessoa = new Set((s.core?.rituals || []).filter((r) => r.type === 'pessoa').map((r) => r.id));
  for (const r of s.core?.ritualLog || []) a[pessoa.has(r.rid) ? 'lacos' : 'ordem'] += r.xp || 0;
  for (const x of s.core?.sundays || []) a.saber += x.xp || 0;
  const out = {};
  for (const [k, xp] of Object.entries(a)) { const lv = 1 + Math.floor(Math.sqrt(xp / 40)); const lo = 40 * (lv - 1) ** 2, hi = 40 * lv ** 2; out[k] = { xp, level: lv, pct: (xp - lo) / (hi - lo) }; }
  return (c.attrs = out);
}

// ───────────────────────── v3: META DIÁRIA E DIAS EM CHAMA (estilo Duolingo) ─────────────────────────
// ───────────────────────── VIAGEM / VISITAS: o jogo fica congelado nesses dias ─────────────────────────
/** a viagem em andamento (ou null) */
export const tripNow = (s) => s.core?.trip || null;
/** o dia d caiu dentro de uma viagem (a de agora ou uma já encerrada)? */
export function tripDay(s, d) {
  const cur = s.core?.trip;
  if (cur && d >= cur.from && d <= today()) return true;
  return (s.core?.trips || []).some((t) => d >= t.from && d <= t.to);
}

// ───────────────────────── v5.14: ESCADA DO ESFORÇO ─────────────────────────
// Neurociência (limiar de percepção de esforço): o difícil vira fácil quando sobe em degraus. A cada 7 dias seguidos
// batendo a meta, ela sobe um degrau (+5%). Errar não desce: o degrau fica. Cada dia é medido com a meta que valia NAQUELE dia.
export const LADDER_STEP = 0.05, LADDER_MAX = 10;
export const ladderSteps = (s) => (s.core?.ladder || []).slice(0, LADDER_MAX);
export function goalAt(s, d = today()) {
  const base = s.core?.settings?.dailyGoal || C.DAILY_GOAL, n = ladderSteps(s).filter((x) => x <= d).length;
  return n ? Math.round((base * (1 + LADDER_STEP) ** n) / 5) * 5 : base;
}
/** v5.16 (2C): fração da meta que mantém a chama acesa (sem somar dia) */
export const FLAME_MIN = 0.5;
export function dailyGoal(s, d = today()) {
  const goal = goalAt(s, d), xp = idx(s).xpByDay;
  let streak = 0, x = (xp[d] || 0) >= goal ? d : addDays(d, -1), skips = 0;
  const from = s.core?.season?.from || '';
  for (let i = 0; i < 400; i++, x = addDays(x, -1)) {
    if (from && x < from) break; // v6: a chama recomeça no capítulo novo
    if ((xp[x] || 0) >= goalAt(s, x)) streak++;
    else if (tripDay(s, x)) { /* ✈ viagem: não conta e não quebra a sequência */ }
    else if (x !== d && (xp[x] || 0) >= goalAt(s, x) * FLAME_MIN) { /* v5.16 (2C): metade da meta segura a chama, mas não soma */ }
    else if ((weekday(x) === 0 || weekday(x) === 6) && skips < 1) skips++; // 1 fim de semana perdoado por vez
    else break;
    if (weekday(x) === 1) skips = 0;
  }
  return { goal, today: xp[d] || 0, pct: Math.min(1, (xp[d] || 0) / goal), streak, steps: ladderSteps(s).filter((x) => x <= d).length };
}

// ───────────────────────── v3: COMPANHEIRO (o aventureiro da fogueira) ─────────────────────────
export const TIERS = [[1, 'ANDARILHO'], [3, 'APRENDIZ'], [5, 'ARQUITETO'], [8, 'SÊNIOR'], [10, 'VETERANO'], [15, 'MESTRE'], [20, 'LENDA']];
export function companion(s, d = today(), hour = null) {
  const tot = totals(s), st = dayStatus(s, d), n = s.core?.habits?.length || 7;
  const energy = Math.round((countX(s, d) / n) * 100);
  const done = idx(s).doneByDay[d] || 0;
  let tier = 0;
  TIERS.forEach(([lv], i) => { if (tot.level >= lv) tier = i; });
  const asleep = hour == null ? bodyClock(s).key === 'sono' : hour >= 23 || hour < 6; // v5.14: dorme no SEU horário de dormir
  const mood = asleep ? 'dormindo' : st.has('envenenado') ? 'envenenado' : st.has('neblina') || st.has('fatigado') || st.has('preguica') ? 'cansado'
    : done >= 3 || isPerfect(s, d) ? 'feliz' : energy >= 50 ? 'bem' : 'parado';
  return { name: s.core?.companion?.name || 'PRIMO', tier, tierName: TIERS[tier][1], level: tot.level, mood, energy, done, chapter: s.core?.chapter?.n || 1 };
}

// ───────────────────────── v2: ITENS DA LOJA ─────────────────────────
const ITEM_HINTS = [
  [/JOGO|GAME/, '🎮', 60], [/SCROLL|INSTA|TIKTOK|REDES/, '📱', 60], [/BANHO/, '🛁', 20], [/FOLGA/, '🏖', 0],
  [/ANT[IÍ]DOTO/, '🧪', 0], [/SONECA/, '😴', 40], [/EPIS[OÓ]DIO|S[EÉ]RIE/, '📺', 45], [/DELIVERY|LANCHE|PIZZA/, '🍔', 0],
  [/SOBREMESA|DOCE/, '🍰', 0], [/AULA/, '🥋', 0], [/FILME|CINEMA/, '🎬', 120], [/DORMIR/, '🛌', 0], [/WEED/, '🌿', 0],
  [/TARDE LIVRE/, '🌅', 240], [/CERVEJA|BEBIDA|DRINK/, '🍺', 0], [/LIVRO|LEITURA/, '📖', 0], [/MÚSICA|MUSICA/, '🎧', 0],
];
export function rarity(xp) {
  if (xp >= 500) return { key: 'lendario', name: 'LENDÁRIO' };
  if (xp >= 250) return { key: 'epico', name: 'ÉPICO' };
  if (xp >= 100) return { key: 'raro', name: 'RARO' };
  return { key: 'comum', name: 'COMUM' };
}
export function itemMeta(it) {
  const h = ITEM_HINTS.find(([re]) => re.test(it.name || '')) || [null, '🎁', 0];
  const min = it.min != null ? +it.min : (h[2] || (/(\d+)\s*MIN/.exec(it.name || '')?.[1] ? +/(\d+)\s*MIN/.exec(it.name)[1] : /(\d+)\s*H\b/.exec(it.name || '') ? +/(\d+)\s*H\b/.exec(it.name)[1] * 60 : 0));
  return { icon: it.icon || h[1], min, rarity: rarity(it.xp || (it.nv || 0) * C.FERREIRO_XP) };
}
/** mochila: compras da taverna/baú/loot ainda não usadas ou em uso */
export const bag = (s) => (s.loja?.purchases || []).filter((p) => p.status === 'bag' || p.status === 'using');

// ───────────────────────── v2: VIDA DO BOSS ─────────────────────────
const norm = (x) => String(x || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
export function bossBlock(s, boss) {
  if (boss.block) return findBlock(s, boss.block) || null;
  const words = new Set(norm(boss.text));
  return (s.quests?.blocks || []).find((b) => { const w = norm(b.title); return w.length && w.every((x) => words.has(x)); }) || null;
}
/** HP = XP-base dos itens do bloco ligado; dano = o que já foi feito */
export function bossHp(s, boss) {
  const b = bossBlock(s, boss);
  if (!b) return null;
  const items = allTasks(s).filter((t) => t.block === b.id && t.st !== 'cancel');
  const total = items.reduce((a, t) => a + taskBaseXp(s, t), 0);
  const left = items.filter(isOpen).reduce((a, t) => a + taskBaseXp(s, t), 0);
  const minis = items.filter((t) => parse(t.text).mini);
  return { block: b, total, left, pct: total ? left / total : 1, minis: minis.length, minisDone: minis.filter((t) => t.st === 'done').length };
}

// ───────────────────────── v2: FILTRO ─────────────────────────
export function filterRows(s, td = today()) {
  const rows = [];
  const bucket = (d) => (!d ? 'SEM DATA' : d < td ? 'ATRASADA' : d === td ? 'HOJE' : diffDays(td, d) <= 7 ? 'PRÓX. 7 DIAS' : 'DEPOIS');
  const ST = { '': 'ABERTA', doing: '▶ FAZENDO', wait: '⏳ AGUARDANDO' };
  for (const t of openTasks(s)) {
    const b = t.block ? findBlock(s, t.block) : null, p = parse(t.text);
    rows.push({
      id: t.id, kind: 'task', text: t.text, where: b ? b.title : areaName(t.area), cat: b ? GROUPS[b.group].short : 'LISTA', who: t.who || (t.dep ? '🔗 OUTRA TAREFA' : ''),
      date: t.due || '', time: '', left: t.due ? diffDays(td, t.due) : null, bucket: bucket(t.due), status: ST[t.st || ''] || 'ABERTA',
      type: p.mini ? 'MINI-BOSS' : p.step ? 'PASSO' : 'TAREFA', color: b?.color || '', marks: [p.star && '⭐', p.home && '🛡', p.money && '💰'].filter(Boolean).join(''),
      xp: taskXp(s, t, td).xp,
    });
  }
  return rows;
}

// ───────────────────────── v2: LINHA DO TEMPO (AGENDA) ─────────────────────────
export function timeline(s, start, days = 42) {
  const end = addDays(start, days - 1), open = openTasks(s);
  const inRange = (d) => d && d >= start && d <= end;
  const count = (list) => { const m = {}; for (const t of list) if (inRange(t.due)) m[t.due] = (m[t.due] || 0) + 1; return m; };
  const rows = Object.entries(AREAS).map(([k, n]) => ({ name: n, counts: count(open.filter((t) => !t.block && t.area === k)) }));
  const blocks = (s.quests?.blocks || []).filter((b) => b.st !== 'done' && b.color !== 'black').sort((a, b) => a.ord - b.ord).map((b) => ({
    name: b.title, color: b.color, block: b.id, due: b.due || null, created: b.created || null,
    counts: count(open.filter((t) => t.block === b.id)),
  }));
  return { start, end, rows, blocks };
}
export { holidayName };

// ───────────────────────── v2: FILA DE PRAZOS (❗ prioridade e ▶ fazendo primeiro) ─────────────────────────
export function deadlineQueue(s, td = today()) {
  const open = openTasks(s);
  const rank = (t) => (t.st === 'doing' ? 0 : t.prio ? 1 : 2);
  return open.filter((t) => t.due || t.prio || t.st === 'doing')
    .sort((a, b) => rank(a) - rank(b) || (a.due || '9999') .localeCompare(b.due || '9999') || a.ord - b.ord);
}

// ───────────────────────── v2: GOLD = METADE DO PROJETO ─────────────────────────
const VAL_RE = /(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:💰|G\b)/i;
export function projectValue(title = '') {
  const m = VAL_RE.exec(title);
  return m ? +m[1].replace(/\./g, '') : 0;
}
/** pedidos de confirmação de gold: recorrentes (… / MES … DIA 05) e projetos de TRABALHO fechados */
export function goldPrompts(s, td = today()) {
  const out = [], gin = s.loja?.goldIn || [], got = new Set(gin.map((g) => g.key).filter(Boolean));
  const first = (t) => norm(t)[0] || '';
  for (const b of s.quests?.blocks || []) {
    const w = first(b.title);
    for (const g of gin) if (!g.key && w && norm(g.from).includes(w)) { got.add(`${b.id}|${g.date.slice(0, 7)}`); got.add(`${b.id}|fechado`); }
  }
  const snooze = s.core?.goldSnooze || {}, done = s.core?.goldDone || {};
  for (const b of s.quests?.blocks || []) {
    if (b.group !== 'tr' && b.group !== 'cap') continue;
    const v = projectValue(b.title);
    if (!v) continue;
    const rec = /\/\s*M[EÊ]S/i.test(b.title), dom = +(/DIA\s*(\d{1,2})/i.exec(b.title)?.[1] || 0);
    if (rec && dom) {
      const key = `${b.id}|${td.slice(0, 7)}`;
      if (+td.slice(8) >= dom && !got.has(key) && !done[key] && snooze[key] !== td)
        out.push({ key, block: b.id, title: b.title, amount: Math.round(v / 2), full: v, kind: 'mensal', label: `dia ${dom} · metade de ${v}` });
    } else if (b.st === 'done') {
      const key = `${b.id}|fechado`;
      if (!got.has(key) && !done[key] && snooze[key] !== td)
        out.push({ key, block: b.id, title: b.title, amount: Math.round(v / 2), full: v, kind: 'projeto', label: `projeto fechado · metade de ${v}` });
    }
  }
  return out;
}

// ───────────────────────── v3.2: PROPOSTAS ─────────────────────────
/** boss do capítulo com vida em R$: cada gold que entra (sua metade) dá dano */
export function chapterBoss(s) {
  const ch = s.core?.chapter || {}, target = +ch.goal || 0;
  if (!target) return null;
  const since = ch.start || s.core?.startDate || '2000-01-01';
  // só o que você GUARDOU dá dano; retirada entra com valor negativo e devolve vida ao boss
  const moves = (s.core?.savings || []).filter((g) => g.date >= since);
  const got = Math.max(0, moves.reduce((a, g) => a + (+g.amount || 0), 0)), out = moves.reduce((a, g) => a + (g.amount < 0 ? -g.amount : 0), 0);
  return { label: ch.goalLabel || 'META DO CAPÍTULO', target, got, out, moves, left: Math.max(0, target - got), pct: Math.min(1, Math.max(0, 1 - got / target)) };
}
/** as 3 missões da semana (pedras grandes): cada uma x1,5; as 3 feitas = +100 XP e +1 🎟 */
export function weeklyMissions(s, d = today()) {
  const ws = weekStart(d), ids = s.core?.weekly?.[ws] || [];
  const all = allTasks(s), tasks = ids.map((id) => all.find((t) => t.id === id)).filter(Boolean);
  const done = tasks.filter((t) => t.st === 'done' || (t.rounds || []).length).length;
  return { ws, ids, tasks, done, complete: tasks.length === 3 && done === 3 };
}
/** o jogo pede descanso: 5 dias fortes seguidos (meta diária) e nenhum descanso nos últimos 5 dias */
export function restSuggest(s, d = today()) {
  const g = dailyGoal(s, d);
  const recent = (s.core?.rests || []).some((x) => x > addDays(d, -6));
  return g.streak >= 5 && !recent;
}
/** rotina ↔ tarefas: o que a ROTINA diz pra agora e uma tarefa que combina */
const SLOT_HINTS = [[/SOFTWARE|PROJETO/, (t, g) => g === 'tr' || g === 'bd'], [/ESTUD|CURSO|LEITURA/, (t, g) => g === 'bd' || t.area === 'depois' || t.area === 'sem'],
  [/LIMPAR|CASA/, (t) => parse(t.text).home], [/POSTAR|STORIES|REELS|FEED|YOUTUBE|GRAVAR|IG/, (t, g) => g === 'gs']];
export function routineNow(s, d = today(), hour = new Date().getHours()) {
  const r = s.core?.routine;
  if (!r?.plans?.length) return null;
  const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'], hh = String(hour).padStart(2, '0');
  const slot = r.plans[r.active || 0].grid[`${WD[weekday(d)]}|${hh}`];
  if (!slot) return null;
  const hint = SLOT_HINTS.find(([re]) => re.test(slot));
  const task = hint ? deadlineQueue(s, d).concat(openTasks(s)).find((t) => hint[1](t, groupOf(s, t))) : null;
  return { slot, hour: hh, task };
}
/** carta do capítulo: números do capítulo que terminou */
export function chapterStats(s, from, to = today()) {
  const comps = idx(s).comps.filter((c) => c.doneAt >= from && c.doneAt <= to);
  const gold = (s.loja?.goldIn || []).filter((g) => g.date >= from && g.date <= to).reduce((a, g) => a + (+g.amount || 0), 0);
  const habits = Object.entries(s.marks?.days || {}).filter(([d]) => d >= from && d <= to).reduce((a, [, v]) => a + Object.values(v.h || {}).filter((x) => x === 'x').length, 0);
  return { xp: xpBetween(s, from, to), tasks: comps.length, onTime: comps.filter((c) => c.onTime).length, gold, habits, level: totals(s).level };
}

// ───────────────────────── v5.14: NEUROCIÊNCIA — o relógio do corpo ─────────────────────────
// Base: ciclo circadiano (luz da manhã acerta o relógio; pico de alerta nas primeiras horas; vale depois do almoço;
// segundo pico no fim da tarde; luz baixa e desaceleração antes de dormir), "sono é inegociável" (7 a 9 h),
// "coma nos mesmos horários" (comida é sinal para o relógio do corpo) e "não deixe a dopamina mimada".
// Tudo liga/desliga em PERKS (settings.neuro). Os horários são do dono.
export const NEURO_DEFAULT = { clock: true, curfew: true, calm: true, ladder: true, wake: '07:00', bed: '23:00', meals: ['08:00', '12:30', '19:30'],
  // v5.16: Bullet Journal e praticidade (cada um liga/desliga em PERKS → 🧠)
  mig: true, why: true, box: true, cheio: true, pato: true, quick: true, swipe: true, proc: true, foco: true, praga: true };
export const neuro = (s) => ({ ...NEURO_DEFAULT, ...(s.core?.settings?.neuro || {}) });
export const neuroOn = (s, k) => neuro(s)[k] !== false;
export const hm = (x) => { const [h, m] = String(x || '0:0').split(':').map(Number); return ((h || 0) * 60 + (m || 0)) % 1440; };
const hhmm = (m) => `${String(Math.floor(((m + 1440) % 1440) / 60)).padStart(2, '0')}:${String((m + 1440) % 60).padStart(2, '0')}`;
export const PHASES = {
  despertar: { icon: '🌅', name: 'DESPERTAR', tip: 'Luz natural nos olhos por 20 a 30 min (rua ou janela), água e nada de celular na cama: é o que acerta o relógio do corpo pro dia todo.' },
  foco: { icon: '🧠', name: 'PICO DE FOCO', tip: 'As primeiras horas acordado são as de mais alerta. Faça AGORA a tarefa mais pesada do dia.' },
  vale: { icon: '🍃', name: 'VALE DA TARDE', tip: 'Depois do almoço a energia cai: hora de tarefas leves, mensagens, ligações e reuniões. Sem cochilo longo: ele rouba o sono da noite.' },
  pico2: { icon: '💪', name: 'SEGUNDO PICO', tip: 'Fim de tarde: corpo quente e força alta. Ótimo pra treinar (sempre no mesmo horário, e até 4 h antes de dormir) ou fechar pendências.' },
  desacelerar: { icon: '🌆', name: 'DESACELERAR', tip: 'Pare de trabalhar e estudar: faltam 3 h pra dormir. Luz laranja e baixa, telas fracas, jantar leve. O cérebro precisa descer o ritmo pra dormir bem.' },
  recolher: { icon: '🌙', name: 'TOQUE DE RECOLHER', tip: 'Falta menos de 1 hora pra dormir. Feche o dia e largue as listas: amanhã elas continuam aqui.' },
  sono: { icon: '😴', name: 'HORA DE DORMIR', tip: 'Sono é inegociável: 7 a 9 horas, no mesmo horário até no fim de semana. Se acordar no meio da noite, não olhe o relógio. Cama é só pra dormir.' },
};
/** em que fase do dia o corpo está, pelos horários de acordar e dormir do dono */
export function bodyClock(s, now = new Date()) {
  const n = neuro(s), t = now.getHours() * 60 + now.getMinutes(), wake = hm(n.wake), bed = hm(n.bed);
  const since = (t - wake + 1440) % 1440, awake = (bed - wake + 1440) % 1440 || 960, toBed = awake - since;
  const key = since >= awake ? 'sono' : toBed <= 60 ? 'recolher' : toBed <= 180 ? 'desacelerar' : since < 60 ? 'despertar' : since < 300 ? 'foco' : since < 480 ? 'vale' : 'pico2';
  const meal = (n.meals || []).map(hm).map((m) => ({ at: m, in: (m - t + 1440) % 1440 })).filter((m) => m.in <= 180).sort((a, b) => a.in - b.in)[0];
  return { key, ...PHASES[key], toBed: key === 'sono' ? 0 : toBed, bed: n.bed, wake: n.wake, sleepH: Math.round(((wake - bed + 1440) % 1440) / 6) / 10,
    meal: meal ? { at: hhmm(meal.at), in: meal.in } : null, coffeeUntil: hhmm(Math.min(wake + 8 * 60, 15 * 60)), trainUntil: hhmm(bed - 4 * 60) };
}
/** a tarefa mais pesada que dá pra fazer hoje (pro pico de foco): ! prioridade, ⭐, atrasada, mais XP */
export function heaviestTask(s, td = today()) {
  const ts = openTasks(s).filter((t) => t.st !== 'wait' && !t.who && !t.dep && (!t.due || t.due <= addDays(td, 7)));
  const score = (t) => (t.prio ? 400 : 0) + (parse(t.text).star ? 200 : 0) + (t.due && t.due < td ? 150 : t.due === td ? 100 : 0) + taskXp(s, t).xp;
  return ts.sort((a, b) => score(b) - score(a))[0] || null;
}

// ───────────────────────── v5.16: BULLET JOURNAL (Ryder Carroll) ─────────────────────────
// A) MIGRAÇÃO DO MÊS: "se não vale reescrever, não vale fazer". Candidatas: tarefas das LISTAS abertas, sem prazo
// ou antigas (criadas há 30+ dias e com prazo a mais de 7 dias). Atrasadas ficam com a revisão de "o que ficou pra trás".
export const ym = (d = today()) => d.slice(0, 7);
export function migrationCandidates(s, td = today()) {
  if (!neuroOn(s, 'mig')) return [];
  const old = addDays(td, -30), far = addDays(td, 7), m = ym(td);
  return openTasks(s).filter((t) => !t.block && !t.link && !t.mother && t.st !== 'wait' && !t.who && !t.dep && t.mig !== m
    && (!t.due || ((t.created || td) <= old && t.due > far))).sort((a, b) => (a.created || '').localeCompare(b.created || ''));
}
/** a migração deste mês ainda não foi oferecida e tem o que migrar */
export const migrationPending = (s, td = today()) => neuroOn(s, 'mig') && s.core?.migrated !== ym(td) && td.slice(8) <= '10' && migrationCandidates(s, td).length > 0;

// H) PAUSA DE META: o boss fica pausado até a data (no máximo 14 dias); passou a data, volta sozinho.
export const BOSS_PAUSE_MAX = 14;
export const bossPaused = (b, td = today()) => !!(b?.pause && b.pause > td && b.st !== 'done');
// C) BOSS PARADO: dias desde a última subtarefa concluída (ou desde que o boss nasceu)
export function bossIdle(s, boss, td = today()) {
  const b = bossBlock(s, boss);
  if (!b || boss.st === 'done' || boss.st === 'wait' || bossPaused(boss, td)) return 0;
  const last = allTasks(s).filter((t) => t.block === b.id && t.st === 'done' && t.doneAt).map((t) => t.doneAt).sort().at(-1);
  const from = [last, boss.pausedTo, b.created].filter(Boolean).sort().at(-1);
  return from ? Math.max(0, diffDays(from, td)) : 0;
}
export const BOSS_IDLE_DAYS = 7;
export const staleBosses = (s, td = today()) => (neuroOn(s, 'why') ? (s.quests?.bosses || []).map((b) => ({ boss: b, days: bossIdle(s, b, td) })).filter((x) => x.days >= BOSS_IDLE_DAYS).sort((a, b) => b.days - a.days) : []);

// E) TIME BOXING: remarcada 3 vezes → para empurrar de novo precisa de horário + duração (ou cancelar)
export const RESCHED_LOCK = 3;
export const reschedLocked = (s, t) => neuroOn(s, 'box') && (t?.rs || 0) >= RESCHED_LOCK;

// F) ATENÇÃO RESIDUAL: HOJE com mais tarefas que o limite (AJUSTES → máx. prazos por dia)
export function hojeOverflow(s, td = today()) {
  const max = s.core?.settings?.maxPerDay || C.MAX_PER_DAY;
  const hoje = openTasks(s).filter((t) => !t.block && t.st !== 'wait' && !t.who && !t.dep && t.due && t.due <= td);
  if (!neuroOn(s, 'cheio') || hoje.length <= max) return null;
  const score = (t) => (t.prio ? 400 : 0) + (parse(t.text).star ? 200 : 0) + (t.st === 'doing' ? 300 : 0) + taskXp(s, t).xp;
  const movable = hoje.filter((t) => t.due === td && !t.prio && t.st !== 'doing' && !t.link && !reschedLocked(s, t)).sort((a, b) => score(a) - score(b));
  return { count: hoje.length, max, suggest: movable.slice(0, hoje.length - max) };
}

// ───────────────────────── v5.16: RECOMPENSA (aulas 021, 068, 153) ─────────────────────────
// Habituação: a mesma recompensa repetida perde o efeito. Item da TAVERNA comprado 4+ vezes em 7 dias ganha um aviso pra variar.
export const HABIT_BUY = 4;
export function boughtLast7(s, itemId, td = today()) {
  const from = addDays(td, -6);
  return (s.loja?.purchases || []).filter((p) => p.itemId === itemId && p.kind === 'taverna' && p.date >= from && p.date <= td).length;
}

// ───────────────────────── v5.16: MECÂNICAS DO PDF (com contrapesos) ─────────────────────────
// 2D escada que desce: na última semana (7 dias antes de hoje) menos de 3 dias na meta → cai um degrau. No máximo 1 por semana.
export function ladderShouldDrop(s, td = today()) {
  const lad = ladderSteps(s);
  if (!lad.length || diffDays(lad.at(-1), td) < 7) return false;
  if (s.core?.ladderDown && diffDays(s.core.ladderDown, td) < 7) return false;
  const xp = idx(s).xpByDay, days = Array.from({ length: 7 }, (_, i) => addDays(td, -i - 1)).filter((x) => !tripDay(s, x));
  return days.length >= 5 && days.filter((x) => (xp[x] || 0) >= goalAt(s, x)).length < 3;
}
// 2A bônus de volta: hoje bateu a meta, ontem não (e anteontem bateu ou foi folga). +25 XP, 1 vez por dia.
export const COMEBACK_XP = 25;
export function comebackDue(s, td = today()) {
  if ((s.core?.bonus || []).some((b) => b.kind === 'volta' && b.date === td)) return false;
  const xp = idx(s).xpByDay, y = addDays(td, -1), y2 = addDays(td, -2), hit = (x) => (xp[x] || 0) >= goalAt(s, x);
  if (!hit(td) || hit(y) || tripDay(s, y) || y < (s.core?.startDate || y)) return false;
  return hit(y2) || tripDay(s, y2) || weekday(y2) === 0 || weekday(y2) === 6;
}
// 2E + 5A FOCO AGORA: uma tarefa só, e o porquê (o "cérebro": junta prazo, boss, missão, horário do corpo e prioridade)
export function focusNow(s, td = today(), skip = []) {
  { // v6.5: da fase 2 em diante a tarefa da Praga é o FOCO (sem OUTRA)
    const pg = praga(s, td), w = pg.list.find((x) => x.kind === 'task' && x.phase >= 2), t = w && (s.quests?.tasks || []).find((x) => x.id === w.id);
    if (t) return { task: t, why: `🐛 A PRAGA: atrasada há ${w.days} dia(s), fase ${w.phase} de 4`, praga: w.phase };
  }
  const wm = new Set(weeklyMissions(s, td).ids || []), clock = neuroOn(s, 'clock') ? bodyClock(s).key : '';
  const bossOf = (t) => (t.block && (s.quests?.bosses || []).find((b) => b.block === t.block)) || null;
  const cands = openTasks(s).filter((t) => t.st !== 'wait' && !t.who && !t.dep && !t.mother && !skip.includes(t.id) && (!t.block || findBlock(s, t.block)?.color !== 'black'));
  const why = (t) => {
    const r = [];
    if (t.st === 'doing') r.push([900, 'você já começou']);
    if (t.due && t.due < td) r.push([600 + diffDays(t.due, td) * 10, `atrasada há ${diffDays(t.due, td)} dia(s)`]);
    else if (t.due === td) r.push([450, 'o prazo é hoje']);
    if (t.prio) r.push([400, 'marcada como prioridade']);
    if (wm.has(t.id)) r.push([350, 'é uma missão da semana']);
    const bo = bossOf(t), idle = bo ? bossIdle(s, bo, td) : 0;
    if (bo && idle >= BOSS_IDLE_DAYS) r.push([300, `o boss "${bo.text.replace(/:\s*[\d.]+\s*XP.*$/i, '').slice(0, 28)}" está parado há ${idle} dias`]);
    if (parse(t.text).star) r.push([200, 'é a chata que você vive adiando']);
    if (clock === 'foco' && taskXp(s, t, td).xp >= 30) r.push([150, 'é pico de foco: hora da pesada']);
    if (clock === 'vale' && taskXp(s, t, td).xp < 20) r.push([120, 'no vale da tarde, uma leve rende']);
    if (t.due && t.due > td && diffDays(td, t.due) <= 2) r.push([100, 'o prazo está perto']);
    return r.sort((a, b) => b[0] - a[0]);
  };
  const ranked = cands.map((t) => ({ t, r: why(t) })).filter((x) => x.r.length).sort((a, b) => b.r.reduce((x, y) => x + y[0], 0) - a.r.reduce((x, y) => x + y[0], 0));
  const top = ranked[0];
  return top ? { task: top.t, why: top.r.slice(0, 2).map((x) => x[1]).join(' e '), next: ranked.slice(1, 4).map((x) => x.t.id) } : null;
}

// ───────────────────────── v6.1: ROTINA "NEURO" (sugestão, a do dono continua igual) ─────────────────────────
// Base: aulas 093 e 081 (luz natural ao acordar, comer e treinar sempre nos mesmos horários, nada pesado 3 h antes de dormir)
// e o relógio do corpo (pico de foco nas primeiras horas acordado, vale depois do almoço, segundo pico no fim da tarde).
const RT_DEEP = /SOFTWARE|PROJETO|ESTUD|CURSO/, RT_LIGHT = /STORIES|REELS|YOUTUBE|FEED|POSTAR|IG|GRAVAR/;
export function neuroRoutine(plan, hours) {
  const g = { ...plan.grid }, H = (h) => hours.find((x) => x === h);
  for (const d of ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']) {
    // 1) luz do sol no primeiro horário do café
    for (const h of hours) { const v = g[`${d}|${h}`] || ''; if (/CAF[ÉE]/.test(v) && !/LUZ/.test(v)) { g[`${d}|${h}`] = 'LUZ DO SOL + ' + v; break; } }
    // 2) trabalho pesado no pico de foco (manhã) e o leve no vale da tarde
    const morning = ['09', '10', '11'].filter(H), after = ['14', '15'].filter(H), late = ['16', '17'].filter(H);
    const mv = morning.map((h) => g[`${d}|${h}`] || ''), deep = [...after, ...late].map((h) => g[`${d}|${h}`] || '').find((v) => RT_DEEP.test(v));
    if (deep && mv.length && mv.every((v) => RT_LIGHT.test(v) || !v)) {
      const light = mv.find(Boolean) || '';
      morning.forEach((h) => { g[`${d}|${h}`] = deep; });
      after.forEach((h) => { if (RT_DEEP.test(g[`${d}|${h}`] || '')) g[`${d}|${h}`] = light; });
    }
    // 3) jantar sempre no mesmo horário (o relógio do fígado agradece)
    if (H('20') && /DESCANSO/.test(g[`${d}|20`] || '')) g[`${d}|20`] = 'JANTAR LEVE';
  }
  return { name: 'NEURO', grid: g };
}

// ───────────────────────── v6.5: A PRAGA (tarefa e ritual atrasados viram uma praga que se espalha) ─────────────────────────
// 4 fases, 1 por dia de atraso (rituais começam na 2): 1 TREM RUIM · 2 ANGUSTIADO (vira o FOCO AGORA) · 3 ENCOSTO (faixa em todas
// as abas, janelas a cada 7 min, −10% de XP nas outras) · 4 A PRAGA (tela vermelha e preta, FAÍSCA doente, −20% e loja trancada).
// Cada atrasada tem a sua fase; o app mostra a PIOR e o castigo NÃO soma. Feriado, dia de DESCANSO e VIAGEM não contam.
// Cura: fazer = REZA BRABA (XP pela fase), remarcar ou cancelar. Depois: corpo fechado (vacina) 24 h (atrasada nova fica presa na fase 1).
export const PRAGA_XP = [0, 5, 10, 20, 30];
export const PRAGA_POP_MS = 7 * 60e3;
export const PRAGA_VAC_MS = 24 * 3600e3;
export const PRAGA_NAMES = ['', 'TREM RUIM', 'ANGUSTIADO', 'ENCOSTO', 'A PRAGA']; // v6.6: nomes do dono (cartucho amaldiçoado)
export function praga(s, td = today()) {
  const c = cache(s), key = td + '|' + Math.floor(Date.now() / 60e3);
  if (c.praga?.key === key) return c.praga.v;
  const v = pragaCalc(s, td);
  c.praga = { key, v };
  return v;
}
function pragaCalc(s, td) {
  const none = { list: [], phase: 0, worst: null, mult: 1, vac: false };
  if (!neuroOn(s, 'praga') || tripNow(s)) return none;
  const pv = s.core?.praga || {}, vacOn = !!pv.vac && Date.now() < pv.vac.until, vacEnd = pv.vac ? new Date(pv.vac.until).toISOString().slice(0, 10) : null;
  const rests = s.core?.rests || [];
  const born = pv.start || td; // anistia de estreia: nada conta antes do dia em que a Praga chegou
  const daysLate = (start) => { // start = 1º dia de atraso
    if (start < born) start = born;
    let n = 0;
    for (let d = start < addDays(td, -40) ? addDays(td, -40) : start; d <= td; d = addDays(d, 1)) {
      if (holidayName(d) || rests.includes(d) || tripDay(s, d)) continue;
      if (pv.vac && start >= pv.vac.from && d >= pv.vac.from && d <= vacEnd) continue; // nasceu durante a vacina: os dias da vacina não contam
      n++;
    }
    return n;
  };
  const list = [];
  const add = (id, kind, text, start, extra = 0) => {
    const days = daysLate(start);
    if (start < born) start = born;
    let phase = Math.min(4, Math.max(1, days + extra));
    if (vacOn && start >= pv.vac.from) phase = 1; // vacina: a nova fica presa na incubação
    list.push({ id, kind, text, days: Math.max(1, days), phase });
  };
  for (const t of openTasks(s)) {
    if (!t.due || t.due >= td || t.st === 'wait' || t.who || t.dep || t.mother) continue;
    if (t.block && findBlock(s, t.block)?.color === 'black') continue;
    add(t.id, 'task', String(t.text).replace(/\s*\(\d+\s*XP\)/i, ''), addDays(t.due, 1));
  }
  for (const r of s.core?.rituals || []) {
    const st = ritualStatus(r, td);
    if (st.left == null || st.left >= 0) continue;
    add(r.id, 'ritual', '🔁 ' + r.name, addDays(st.next, 1), 1);
  }
  if (!list.length) return { ...none, vac: vacOn };
  list.sort((a, b) => b.phase - a.phase || b.days - a.days);
  const phase = list[0].phase;
  return { list, phase, worst: list[0], mult: phase >= 4 ? 0.8 : phase >= 3 ? 0.9 : 1, vac: vacOn };
}
export const pragaOf = (s, id) => praga(s).list.find((x) => x.id === id) || null;
