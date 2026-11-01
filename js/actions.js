// AÇÕES DO JOGO — tudo que muda o estado passa por aqui (concluir tarefa, marcar hábito, comprar...).
// Cada ação: altera o estado → recalcula recompensas (desafios, conquistas) → salva → avisa a tela (XP ganho, nível, medalhas).
import { S, save, deleteDocs } from './store.js';

import * as R from './rules.js';
import { uid, today, addDays, weekStart, weekday } from './util.js';

let feedbackFn = () => {};
export const onFeedback = (fn) => { feedbackFn = fn; };

// ───────────────────────── DESFAZER / REFAZER (Ctrl+Z) ─────────────────────────
// Cada ação guarda uma foto dos 4 documentos ANTES de mexer. Desfazer = voltar a foto (só salva o que mudou).
const UNDO = [], REDO = [], UDOCS = ['core', 'quests', 'marks', 'loja'];
const UNDO_LABEL = {
  toggleDone: 'tarefa', cycleBack: 'tarefa', cycleApprove: 'tarefa', setStatus: 'status da tarefa', addTask: 'nova tarefa', updateTask: 'edição da tarefa', deleteTask: 'tarefa apagada', moveTask: 'ordem', dropTask: 'tarefa movida',
  addBlock: 'novo bloco', updateBlock: 'edição do bloco', deleteBlock: 'bloco apagado', dropBlock: 'bloco movido', addBoss: 'novo boss', toggleBoss: 'boss', deleteBoss: 'boss apagado',
  cycleHabit: 'hábito', setHabit: 'hábito', updateHabits: 'hábitos', buyTaverna: 'compra', buyMystery: 'baú', buyFerreiro: 'forja', undoPurchase: 'compra desfeita', useItem: 'uso do item', confessItem: 'compra tardia',
  addGold: 'ouro', deleteGold: 'ouro apagado', saveShopItem: 'item da loja', deleteShopItem: 'item apagado', openSunday: 'baú de domingo', addCommitment: 'compromisso', deleteCommitment: 'compromisso apagado',
  answerQuestion: 'diário', deleteJournal: 'página do diário', editJournal: 'página do diário', deleteBonus: 'bônus apagado', deleteSunday: 'baú apagado', setRule: 'regra', resetRules: 'regras', addSaving: 'guardei',
  setWeekly: 'missões da semana', claudeApprove: 'sugestão do Claude', claudeReject: 'sugestão recusada', toBreakdown: 'enviar pro breakdown', unlinkTask: 'desvincular', addBoss: 'novo boss', deleteBoss: 'boss apagado', setVcat: 'custo da vila', resetVcat: 'vila', buildStart: 'obra', buildFinish: 'obra acelerada', buildMove: 'prédio movido', ensureVillage: 'vila', restDay: 'descanso', focusDone: 'foco', sosDone: 'SOS', ritualDone: 'ritual',
};
const snapNow = () => Object.fromEntries(UDOCS.map((d) => [d, JSON.stringify(S[d])]));
function labelFromStack() {
  for (const l of (new Error().stack || '').split('\n')) { const m = /(?:at (?:async )?(?:[A-Za-z0-9_$]+\.)?|^)([A-Za-z0-9_]+)(?:@| \()/.exec(l.trim()); if (m && UNDO_LABEL[m[1]]) return UNDO_LABEL[m[1]]; }
  return 'última ação';
}
const undoListeners = new Set();
export const onUndoChange = (fn) => undoListeners.add(fn);
const undoEvt = () => undoListeners.forEach((fn) => fn(undoState()));
export const undoState = () => ({ undo: UNDO.length, redo: REDO.length, next: UNDO.at(-1)?.label || '', nextRedo: REDO.at(-1)?.label || '' });
function restore(pre) {
  const changed = [];
  for (const d of UDOCS) if (JSON.stringify(S[d]) !== pre[d]) { S[d] = JSON.parse(pre[d]); changed.push(d); }
  R.applyRules(S);
  S._epoch++;
  if (changed.length) save(...changed);
  undoEvt();
}
export function undo() {
  const e = UNDO.pop();
  if (!e) return null;
  REDO.push({ label: e.label, pre: snapNow() });
  restore(e.pre);
  return e.label;
}
export function redo() {
  const e = REDO.pop();
  if (!e) return null;
  UNDO.push({ label: e.label, pre: snapNow() });
  restore(e.pre);
  return e.label;
}

const touched = new Set();
const touch = (...d) => d.forEach((x) => touched.add(x));
export function commit(docs, fn, opts = {}) {
  const pre = opts.noUndo ? null : snapNow();
  const before = R.totals(S);
  touched.clear();
  const res = fn();
  docs.push(...touched);
  S._epoch++;
  const extra = sync();
  if (extra.changed) docs.push('core');
  if (pre) {
    const post = snapNow();
    if (UDOCS.some((d) => post[d] !== pre[d])) { UNDO.push({ label: opts.label || labelFromStack(), pre, t: Date.now() }); if (UNDO.length > 40) UNDO.shift(); REDO.length = 0; undoEvt(); }
  }
  save(...new Set(docs));
  const after = R.totals(S);
  feedbackFn({
    xp: after.earned - before.earned, spent: after.spent - before.spent, gold: after.gold - before.gold,
    tickets: after.tickets - before.tickets, levelUp: after.level > before.level ? after : null,
    achievements: extra.achievements, at: opts.at, msg: res?.msg, ...(res?.feedback || {}),
  });
  return res;
}

/** desafios da semana (atual e anterior) + conquistas novas */
function sync() {
  const td = today();
  let changed = false;
  const achievements = [];
  S.core.weeks ||= {};
  for (const ws of [weekStart(td), addDays(weekStart(td), -7)]) {
    const wc = R.weekChallenges(S, ws, td);
    const prev = S.core.weeks[ws] || {};
    const next = {}, at = { ...(prev._at || {}) };
    for (const c of wc.list) if (c.done) { next[c.key] = c.xp; at[c.key] ||= td; }
    if (wc.legendary) { next.lendaria = 50; at.lendaria ||= td; }
    for (const k of Object.keys(at)) if (!(k in next)) delete at[k];
    const sig = (o) => JSON.stringify(Object.keys(o).filter((k) => k !== '_at').sort().map((k) => [k, o[k]]));
    if (sig(prev) !== sig(next)) {
      if (Object.keys(next).length) S.core.weeks[ws] = { ...next, _at: at };
      else delete S.core.weeks[ws];
      changed = true;
      S._epoch++;
    }
  }
  S.core.achievements ||= {};
  for (const a of R.newAchievements(S)) {
    S.core.achievements[a.key] = { date: td, xp: a.xp };
    achievements.push(a);
    changed = true;
  }
  if (achievements.length) S._epoch++;
  // missões da semana: as 3 feitas = +100 XP e +1 🎟 (uma vez por semana)
  const wm = R.weeklyMissions(S, td);
  if (wm.complete && !(S.core.bonus || []).some((b) => b.kind === 'missoes' && b.week === wm.ws)) {
    S.core.bonus ||= [];
    S.core.bonus.push({ id: uid('wm'), date: td, week: wm.ws, kind: 'missoes', xp: 100, tickets: 1, label: '📌 3 missões da semana' });
    achievements.push({ name: '3 MISSÕES DA SEMANA (+1 🎟)', xp: 100 });
    changed = true; S._epoch++;
  }
  return { changed, achievements };
}

// ───────────────────────── INÍCIO DO DIA ─────────────────────────
/** roda ao abrir o app: arquiva concluídas antigas, limpa missões velhas, atualiza desafios */
// itens novos da loja (nome, XP, ícone, minutos do cronômetro) · (categoria, nome, nível, ícone, recorrente)
const NEW_TAVERNA = [
  ['CLASH ROYALE (3 PARTIDAS)', 45, '⚔', 15], ['POE 2 / DIABLO (1H)', 130, '🗡', 60], ['AÇAÍ NO PARQUE', 60, '🍧', 0], ['SUSHI / TEMAKI', 190, '🍣', 0],
  ['JANTAR COM A HEVELIN', 260, '🍷', 0], ['CINEMA', 180, '🎬', 150], ['CAFÉ ESPECIAL', 45, '☕', 0], ['CERVEJA COM OS AMIGOS', 150, '🍺', 0],
  ['PASSEIO DE MOTO', 90, '🏍', 60], ['SPA / MASSAGEM', 260, '💆', 0], ['LIVRO NOVO (COMPRAR)', 140, '📖', 0], ['MARATONA DE SÉRIE (3 EPS)', 160, '📺', 150],
  ['PODCAST SEM CULPA', 50, '🎧', 45], ['COMPRINHA ONLINE (ATÉ R$ 100)', 200, '📦', 0], ['SKIN / GEMAS DO JOGO (ATÉ R$ 30)', 170, '💎', 0], ['DIA SEM NOTIFICAÇÃO', 120, '🔕', 0],
  ['DOMINGO SÓ DE SOFÁ', 300, '🛋', 0], ['VIAGEM CURTA DE FIM DE SEMANA', 600, '🧳', 0],
];
const NEW_FERREIRO = [
  ['PC', 'MONITOR ULTRAWIDE', 4, '🖥'], ['PC', 'TECLADO MECÂNICO', 2, '⌨'], ['PC', 'MOUSE ERGONÔMICO', 2, '🖱'], ['PC', 'MESA DIGITALIZADORA', 4, '🖊'], ['PC', 'PLACA DE VÍDEO NOVA', 8, '🎮'], ['PC', 'LICENÇA DE SOFTWARE (RENDER)', 5, '🔑', true],
  ['ARQUITETURA', 'CURSO DE VISUALIZAÇÃO (D5/ENSCAPE)', 3, '🏛'], ['ARQUITETURA', 'LIVRO DE ARQUITETURA', 1, '📚', true], ['ARQUITETURA', 'VIAGEM PRA VER UMA OBRA', 6, '✈'], ['ARQUITETURA', 'MAQUETE FÍSICA', 4, '🏗'],
  ['EU', 'TÊNIS DE TREINO', 3, '👟'], ['EU', 'ROUPAS NOVAS', 2, '👕'], ['EU', 'CONSULTA / EXAMES', 1, '🩺', true], ['EU', 'BARBEIRO', 1, '💈', true], ['EU', 'CURSO DE IDIOMA', 4, '🗣'], ['EU', 'PLANO TRIMESTRAL DA ACADEMIA', 2, '💪'], ['EU', 'RELÓGIO', 6, '⌚'],
  ['CASA', 'COLCHÃO / TRAVESSEIRO', 3, '🛏'], ['CASA', 'LUMINÁRIA DO ESCRITÓRIO', 2, '💡'], ['CASA', 'PLANTAS', 1, '🪴', true], ['CASA', 'QUADRO / OBRA DE ARTE', 2, '🖼'], ['CASA', 'CADEIRA ERGONÔMICA', 4, '🪑'], ['CASA', 'CAFETEIRA', 2, '☕'],
  ['MERCADO', 'ASSINATURA DE FERRAMENTA (ANO)', 3, '🧾'], ['MERCADO', 'IMPULSIONAR POST / ANÚNCIO', 3, '📣', true], ['MERCADO', 'IDENTIDADE VISUAL NOVA', 4, '🎨'], ['MERCADO', 'BOOK DE PORTFÓLIO IMPRESSO', 3, '📒'], ['MERCADO', 'FOTÓGRAFO PRA OBRA', 5, '📷'],
  ['MOTO', 'CAPACETE NOVO', 3, '🪖'], ['MOTO', 'REVISÃO DA MOTO', 1, '🔧', true], ['MOTO', 'JAQUETA DE MOTO', 4, '🧥'],
  ['JOGOS', 'JOGO NOVO (STEAM)', 2, '🎲', true], ['JOGOS', 'CONTROLE / HEADSET', 2, '🎧'], ['JOGOS', 'UPGRADE DO PC GAMER', 6, '🕹'],
];
export function startup() {
  const td = today();
  const limit = addDays(td, -7);
  const q = S.quests;
  const moved = new Set();
  const toArq = (month, kind, item) => {
    S.arq[month] ||= { v: 1, tasks: [], blocks: [] };
    S.arq[month][kind] ||= [];
    S.arq[month][kind].push({ ...item, archivedAt: td });
    moved.add('arq-' + month);
  };
  const end = (t) => t.doneAt || t.cancelAt || td;
  const closedBlocks = q.blocks.filter((b) => b.st === 'done' && (b.doneAt || td) < limit);
  for (const b of closedBlocks) {
    const m = (b.doneAt || td).slice(0, 7);
    toArq(m, 'blocks', b);
    for (const t of q.tasks.filter((t) => t.block === b.id)) toArq(m, 'tasks', { ...t, group: b.group, blockTitle: b.title });
  }
  const closedIds = new Set(closedBlocks.map((b) => b.id));
  const oldList = q.tasks.filter((t) => !t.block && (t.st === 'done' || t.st === 'cancel') && end(t) < limit);
  for (const t of oldList) toArq(end(t).slice(0, 7), 'tasks', t);
  const drop = new Set(oldList.map((t) => t.id));
  let changedQ = false, changedCore = false, changedCoreV4 = false;
  if (closedBlocks.length || oldList.length) {
    q.tasks = q.tasks.filter((t) => !drop.has(t.id) && !closedIds.has(t.block));
    q.blocks = q.blocks.filter((b) => !closedIds.has(b.id));
    S.core.archiveMonths = [...new Set([...(S.core.archiveMonths || []), ...[...moved].map((x) => x.slice(4))])].sort();
    changedQ = changedCore = true;
  }
  for (const d of Object.keys(S.core.missions || {})) if (d < addDays(td, -14)) { delete S.core.missions[d]; changedCore = true; }
  R.applyRules(S); // v4: regras que você editou
  if (dropVillage()) changedCoreV4 = true;
  if (cleanOld()) changedCoreV4 = true;
  // v3.2: aba GESTÃO (blocos laranja do TRABALHO) + boss do capítulo (entrada do apê, R$ 100 mil)
  S.core.migrations ||= [];
  if (!S.core.migrations.includes('shop4')) { // v4.2: mais coisas na loja, no seu gosto
    const have = (l, n) => l.some((x) => x.name.toUpperCase() === n);
    for (const [name, xp, icon, min] of NEW_TAVERNA) if (!have(S.loja.taverna, name)) S.loja.taverna.push({ id: uid('v'), name, xp, icon, ...(min ? { min } : {}) });
    for (const [cat, name, nv, icon, repeat] of NEW_FERREIRO) { if (!have(S.loja.ferreiro, name)) S.loja.ferreiro.push({ id: uid('f'), name, cat, nv, icon, repeat: !!repeat }); if (!S.loja.cats.includes(cat)) S.loja.cats.push(cat); }
    S.core.migrations.push('shop4'); S._lojaChanged = true; changedCore = true;
  }
  if (!S.core.migrations.includes('bosses4')) { // v4: cada boss ganha o seu bloco (grupo BOSSES) e sai do BREAKDOWN
    for (const boss of q.bosses) {
      let blk = boss.block ? B(boss.block) : R.bossBlock(S, boss);
      if (blk) { blk.group = 'bs'; blk.color = 'red'; }
      else { blk = { id: uid('k'), group: 'bs', title: boss.text.replace(/:\s*[\d.]+\s*XP.*$/i, ''), color: 'red', st: '', due: null, created: td, ord: maxOrd() + 1 }; q.blocks.push(blk); }
      boss.block = blk.id;
    }
    S.core.migrations.push('bosses4'); changedQ = changedCore = true;
  }
  if (!S.core.migrations.includes('gestao')) {
    for (const b of q.blocks) if (b.group === 'tr' && b.color === 'orange') { b.group = 'gs'; changedQ = true; }
    if (!S.core.chapter.goal) Object.assign(S.core.chapter, { goal: 100000, goalLabel: 'ENTRADA DO APÊ', start: S.core.chapter.start || S.core.startDate });
    S.core.migrations.push('gestao');
    changedCore = true;
  }
  // v3: área do baú MULHERES → HEVELIN (inclusive nos domingos já salvos)
  if ((S.core.milestones || []).includes('MULHERES')) {
    S.core.milestones = S.core.milestones.map((m) => (m === 'MULHERES' ? 'HEVELIN' : m));
    for (const x of S.core.sundays || []) if (x.notes && 'MULHERES' in x.notes) { x.notes.HEVELIN = x.notes.MULHERES; delete x.notes.MULHERES; }
    changedCore = true;
  }
  // caixa de entrada do Claude (core.inbox): o que ele combinou com você nas conversas. {text,area?,due?,block?} = tarefa nova ·
  // {op:'done', match} = concluir tarefa (XP normal) · {op:'note', text} = recado pro PRIMO. Tudo fica no histórico (core.claude.log).
  if (S.core.inbox?.length) {
    const c = (S.core.claude ||= { notes: [], log: [], suggest: [] }), logIt = (x) => c.log.push({ date: td, text: x });
    for (const it of S.core.inbox) {
      if (it.op === 'note') { c.notes.push({ id: uid('cn'), date: td, text: String(it.text || '').slice(0, 400), read: false }); logIt('📬 recado: ' + String(it.text || '').slice(0, 80)); continue; }
      if (it.op === 'done') { const t = q.tasks.find((x) => R.isOpen(x) && x.text.toLowerCase().includes(String(it.match || '').toLowerCase())); if (t) { completeTask(t, it.date || td); logIt('✅ concluiu: ' + t.text); } continue; }
      const text = normalizeText(it.text);
      if (!text || q.tasks.some((t) => t.text === text && R.isOpen(t))) continue;
      pushTask(it); logIt('➕ tarefa: ' + text);
    }
    c.log = c.log.slice(-60); c.notes = c.notes.slice(-30);
    delete S.core.inbox;
    changedQ = changedCore = true;
  }
  // tarefa nova sem data no IMEDIATOS/CURTO ganha prazo sozinha ao abrir (regra da planilha)
  S._epoch++;
  const auto = R.distributePlan(S, { onlyNew: true, today: td });
  for (const p of auto) { const t = T(p.id); if (t) { t.due = p.to; changedQ = true; } }
  S._autoDue = auto.length;
  S._epoch++;
  const extra = sync();
  const docs = [...moved];
  if (changedQ) docs.push('quests');
  if (changedCore || changedCoreV4 || extra.changed) docs.push('core');
  if (S._lojaChanged) { docs.push('loja'); S._lojaChanged = false; }
  if (docs.length) save(...docs);
  if (extra.achievements.length) feedbackFn({ xp: 0, achievements: extra.achievements });
}

// ───────────────────────── TAREFAS ─────────────────────────
const T = (id) => S.quests.tasks.find((t) => t.id === id);
const B = (id) => S.quests.blocks.find((b) => b.id === id);
const maxOrd = () => Math.max(0, ...S.quests.tasks.map((t) => t.ord || 0), ...S.quests.blocks.map((b) => b.ord || 0));
const container = (t) => S.quests.tasks.filter((x) => (t.block ? x.block === t.block : !x.block && x.area === t.area));

export function normalizeText(text) {
  let t = String(text || '').trim();
  if (t.startsWith('>')) t = '↳ ' + t.slice(1).trim();
  return t;
}

export function addTask({ text, area = 'imed', block = null, due = null, parent = null, after = null }) {
  text = normalizeText(text);
  if (!text) return null;
  return commit(['quests'], () => {
    const t = { id: uid('t'), area: block ? 'block' : area, text, st: '', due: due || null, created: today(), ord: maxOrd() + 1 };
    if (block) {
      t.block = block;
      const bl = B(block);
      if (bl?.st === 'done') reopenBlock(bl);
      const items = S.quests.tasks.filter((x) => x.block === block).sort((a, b) => a.ord - b.ord);
      if (text.startsWith('↳')) t.parent = parent || [...items].reverse().find((x) => !x.text.startsWith('↳'))?.id || null;
      if (!t.parent) delete t.parent;
    }
    // posição: logo depois de `after`, ou no fim dos passos ↳ do `parent`
    let anchor = after ? T(after) : null;
    if (!anchor && t.parent && parent) {
      anchor = S.quests.tasks.filter((x) => x.id === parent || x.parent === parent).sort((a, b) => b.ord - a.ord)[0];
    }
    if (anchor) {
      const c = container(anchor).sort((a, b) => a.ord - b.ord);
      const i = c.indexOf(anchor);
      const nextOrd = c[i + 1]?.ord ?? anchor.ord + 1;
      t.ord = (anchor.ord + nextOrd) / 2;
    }
    S.quests.tasks.push(t);
    return { task: t };
  });
}

function completeTask(t, d, auto = false) {
  const r = R.taskXp(S, t, d);
  if (t.cycle) {
    // 🔁 VAI E VOLTA: a rodada dá XP e a tarefa fica 📨 enviada, aguardando retorno
    t.rounds = [...(t.rounds || []), { doneAt: d, xp: r.xp, onTime: r.onTime, early: r.early }];
    t.st = 'sent';
    t.sentAt = d;
    S._epoch++;
    return [];
  }
  Object.assign(t, { st: 'done', doneAt: d, xp: r.xp, onTime: r.onTime, early: r.early });
  if (auto) t.auto = true; else delete t.auto;
  delete t.cancelAt;
  S._epoch++;
  const extra = [];
  if (t.parent) {
    const p = T(t.parent);
    const kids = S.quests.tasks.filter((x) => x.parent === t.parent);
    if (p && R.isOpen(p) && kids.every((k) => !R.isOpen(k))) { completeTask(p, d, true); extra.push(p); }
  }
  if (t.block) checkBlock(t.block, d);
  return extra;
}
function uncompleteTask(t) {
  if (t.st === 'sent' && t.rounds?.length) { t.rounds.pop(); delete t.sentAt; }
  removeLoot(t);
  t.st = '';
  for (const k of ['doneAt', 'xp', 'onTime', 'early', 'auto', 'cancelAt']) delete t[k];
  if (t.parent) {
    const p = T(t.parent);
    if (p && p.st === 'done' && p.auto) uncompleteTask(p);
  }
  if (t.block) { const b = B(t.block); if (b?.st === 'done') reopenBlock(b); }
}
function checkBlock(id, d) {
  const b = B(id);
  if (!b || b.st === 'done') return;
  const items = S.quests.tasks.filter((t) => t.block === id);
  if (items.length && items.every((t) => t.st === 'done' || t.st === 'cancel') && items.some((t) => t.st === 'done')) {
    Object.assign(b, { st: 'done', doneAt: d, xp: R.blockXp(b) });
    S._closedBlock = b;
    const boss = S.quests.bosses.find((x) => x.block === id && x.st !== 'done'); // v4: fechar o bloco do boss = boss derrotado
    if (boss) { Object.assign(boss, { st: 'done', doneAt: d, auto: true }); S._bossDown = boss; }
    const src = b.src && T(b.src); // v4: tarefa da lista ligada a este bloco conclui junto (sem XP: o XP é o do bloco)
    if (src && src.st !== 'done') Object.assign(src, { st: 'done', doneAt: d, xp: 0, linked: true });
  }
}
function reopenBlock(b) {
  b.st = '';
  delete b.doneAt;
  delete b.xp;
  const boss = S.quests.bosses.find((x) => x.block === b.id && x.st === 'done' && x.auto);
  if (boss) { boss.st = ''; delete boss.doneAt; delete boss.auto; }
  const src = b.src && T(b.src);
  if (src?.linked) { src.st = ''; delete src.doneAt; delete src.xp; delete src.linked; }
}

function addLoot(t, d) {
  const closed = t.block && B(t.block)?.st === 'done';
  const loot = R.lootRoll(S, t, d, closed);
  if (!loot) return null;
  S.core.bonus ||= [];
  S.core.bonus.push({ id: uid('lt'), date: d, taskId: t.id, kind: 'loot', xp: loot.xp || 0, tickets: loot.tickets || 0, label: loot.label });
  touch('core');
  if (loot.itemId) {
    const it = S.loja.taverna.find((x) => x.id === loot.itemId);
    S.loja.purchases.push({ id: uid('p'), date: d, item: it.name, itemId: it.id, kind: 'loot', qty: 1, xp: 0, gold: 0, tickets: 0, status: 'bag', lootOf: t.id });
    touch('loja');
  }
  return loot;
}
function removeLoot(t) {
  const n = (S.core.bonus || []).length;
  S.core.bonus = (S.core.bonus || []).filter((b) => !(b.kind === 'loot' && b.taskId === t.id));
  if (S.core.bonus.length !== n) touch('core');
  const m = S.loja.purchases.length;
  S.loja.purchases = S.loja.purchases.filter((p) => !(p.lootOf === t.id && p.status === 'bag'));
  if (S.loja.purchases.length !== m) touch('loja');
}

export function toggleDone(id, at) {
  const t = T(id);
  if (!t) return;
  const lb = t.link && B(t.link);
  if (lb && !t.linked && lb.st !== 'done') return { error: '🔗 Esta tarefa está no BREAKDOWN: conclua lá (toque no texto pra ir).' };
  if (t.linked) return { error: '🔗 Veio do BREAKDOWN: reabra a subtarefa lá.' };
  S._closedBlock = null; S._bossDown = null;
  return commit(['quests'], () => {
    if (t.st === 'done' || t.st === 'sent') { uncompleteTask(t); return { msg: null }; }
    const d = today();
    expBoost(R.C.X_TASK);
    const auto = completeTask(t, d);
    const loot = addLoot(t, d);
    const b = S._closedBlock;
    return { feedback: { closedBlock: b, autoDone: auto, task: t, loot, sent: t.st === 'sent', boss: S._bossDown || undefined } };
  }, { at });
}
/** 🔁 VAI E VOLTA: voltou com correções (nova rodada) ou foi aprovado (encerra) */
export function cycleBack(id) {
  const t = T(id);
  if (!t) return;
  return commit(['quests'], () => { t.st = ''; delete t.sentAt; t.due = t.due && t.due >= today() ? t.due : addDays(today(), 2); return { msg: `↩ ${t.text}: ${(t.rounds || []).length + 1}ª rodada` }; });
}
export function cycleApprove(id) {
  const t = T(id);
  if (!t) return;
  return commit(['quests'], () => {
    Object.assign(t, { st: 'done', doneAt: today(), xp: 0, approved: true, bonusXp: 20 });
    delete t.sentAt;
    if (t.block) checkBlock(t.block, today());
    return { msg: `✅ APROVADO E DESPACHADO: ${t.text} · +20 XP`, feedback: { closedBlock: S._closedBlock } };
  });
}

export function setStatus(id, st) {
  const t = T(id);
  if (!t || t.st === st) return;
  return commit(['quests'], () => {
    if (t.st === 'done' || t.st === 'sent') uncompleteTask(t);
    if (st === 'done') { completeTask(t, today()); addLoot(t, today()); return; }
    t.st = st;
    if (st === 'cancel') { t.cancelAt = today(); if (t.block) checkBlock(t.block, today()); }
    else delete t.cancelAt;
  });
}

/** custo de EMPURRAR o prazo de uma tarefa: 1ª vez RESCHED XP, depois dobra (até 16x). Antecipar ou dar prazo novo não custa. */
export function reschedBase(t, newDue) {
  if (!t || !t.due || !newDue || newDue <= t.due) return 0;
  return Math.min(R.C.RESCHED * 2 ** (t.rs || 0), R.C.RESCHED * 16);
}
/** 1 remarcação grátis por semana (vale a primeira que você fizer) */
export const freeResched = () => !S.core.freeResched?.[weekStart(today())];
export const reschedCost = (t, newDue) => (reschedBase(t, newDue) && freeResched() ? 0 : reschedBase(t, newDue));
const useFree = () => { (S.core.freeResched ||= {})[weekStart(today())] = true; };
function chargeResched(t, cost) {
  const id = uid('p');
  S.loja.purchases.push({ id, date: today(), item: `REMARCAR · ${String(t.text).replace(/^(↳|>)\s*/, '').slice(0, 40)}`, kind: 'remarca', qty: 1, xp: cost, gold: 0, tickets: 0, status: 'used', usedAt: today(), taskId: t.id });
  t.rs = (t.rs || 0) + 1;
  return id;
}
export function updateTask(id, patch) {
  const t = T(id);
  if (!t) return;
  const base = 'due' in patch ? reschedBase(t, patch.due || null) : 0, free = base > 0 && freeResched(), cost = free ? 0 : base;
  if (cost && R.totals(S).balance < cost) return { error: `Faltam ${cost - R.totals(S).balance} XP pra remarcar (custa ${cost} XP). Conclua algo ou mantenha o prazo.` };
  return commit(cost ? ['quests', 'loja'] : free ? ['quests', 'core'] : ['quests'], () => {
    if (cost) { chargeResched(t, cost); }
    if (free) { useFree(); t.rs = (t.rs || 0) + 1; }
    if ('text' in patch) patch.text = normalizeText(patch.text);
    if (patch.block !== undefined || patch.area !== undefined) {
      // mudar de lista/bloco: leva junto os passos ↳ e vai pro fim do destino
      const nb = patch.block || null, na = nb ? 'block' : patch.area ?? t.area;
      if (nb !== (t.block || null) || na !== t.area) {
        const moving = [t, ...S.quests.tasks.filter((x) => x.parent === t.id)];
        let ord = maxOrd() + 1;
        for (const k of moving) {
          k.area = na;
          if (nb) k.block = nb; else delete k.block;
          k.ord = ord++;
        }
        delete t.parent;
      }
      delete patch.block;
      delete patch.area;
    }
    Object.assign(t, patch);
    if (!t.due) t.due = null;
  });
}

export function deleteTask(id) {
  return commit(['quests'], () => {
    const kill = new Set([id, ...S.quests.tasks.filter((x) => x.parent === id).map((x) => x.id)]);
    const t = T(id);
    if (t?.link) { const lb = B(t.link); if (lb) delete lb.src; }
    S.quests.tasks = S.quests.tasks.filter((x) => !kill.has(x.id));
    if (t?.block) checkBlock(t.block, today());
    for (const d of Object.keys(S.core.missions || {})) S.core.missions[d] = S.core.missions[d].filter((x) => !kill.has(x));
  });
}

export function moveTask(id, dir) {
  const t = T(id);
  if (!t) return;
  return commit(['quests'], () => {
    const sameLevel = container(t).filter((x) => (t.parent ? x.parent === t.parent : !x.parent)).sort((a, b) => a.ord - b.ord);
    const i = sameLevel.indexOf(t), j = i + dir;
    if (j < 0 || j >= sameLevel.length) return;
    const o = sameLevel[j];
    // move junto os passos ↳ de cada um
    const withSteps = (x) => [x, ...container(t).filter((k) => k.parent === x.id).sort((a, b) => a.ord - b.ord)];
    const ga = withSteps(t), gb = withSteps(o);
    const first = dir < 0 ? gb : ga, second = dir < 0 ? ga : gb;
    const ords = [...first, ...second].map((x) => x.ord).sort((a, b) => a - b);
    [...second, ...first].forEach((x, k) => { x.ord = ords[k]; });
  });
}

// ───────────────────────── MISSÕES DO DIA ─────────────────────────

// ───────────────────────── BLOCOS ─────────────────────────
export function addBlock(group, title, extra = {}) {
  title = String(title || '').trim();
  if (!title) return null;
  return commit(['quests'], () => {
    const b = { id: uid('k'), group, title, color: extra.color || (group === 'tr' ? 'yellow' : 'green'), st: '', due: extra.due || null, created: today(), ord: maxOrd() + 1 };
    S.quests.blocks.push(b);
    return { block: b };
  });
}
export function updateBlock(id, patch) {
  const b = B(id);
  if (!b) return;
  return commit(['quests'], () => { Object.assign(b, patch); if (!b.due) b.due = null; });
}
export function deleteBlock(id) {
  return commit(['quests'], () => {
    const sb = B(id)?.src && T(B(id).src);
    if (sb) { delete sb.link; delete sb.linked; }
    S.quests.blocks = S.quests.blocks.filter((b) => b.id !== id);
    S.quests.tasks = S.quests.tasks.filter((t) => t.block !== id);
  });
}
export function moveBlock(id, dir) {
  const b = B(id);
  if (!b) return;
  return commit(['quests'], () => {
    const list = S.quests.blocks.filter((x) => x.group === b.group).sort((a, c) => a.ord - c.ord);
    const i = list.indexOf(b), o = list[i + dir];
    if (!o) return;
    [b.ord, o.ord] = [o.ord, b.ord];
  });
}
/** cria um bloco 🎯 com mini-bosses ⚔ e passos ↳ (usado pela IA e pelo modelo de meta) */
export function addGoalBlock(title, minis) {
  return commit(['quests'], () => {
    let ord = maxOrd() + 1;
    const b = { id: uid('k'), group: 'bd', title: '🎯 ' + title.replace(/^🎯\s*/, ''), color: 'green', st: '', due: null, created: today(), ord: ord++ };
    S.quests.blocks.push(b);
    for (const m of minis) {
      const mt = { id: uid('t'), area: 'block', block: b.id, text: `⚔ ${m.text.replace(/^⚔\s*/, '')} (${m.xp || 30}XP)`, st: '', due: null, created: today(), ord: ord++ };
      S.quests.tasks.push(mt);
      for (const st of m.steps || []) S.quests.tasks.push({ id: uid('t'), area: 'block', block: b.id, parent: mt.id, text: '↳ ' + st.replace(/^↳\s*/, ''), st: '', due: null, created: today(), ord: ord++ });
    }
    return { block: b };
  });
}

function pushTask(it) {
  const text = normalizeText(it.text);
  if (!text) return null;
  const t = { id: uid('t'), area: it.block ? 'block' : it.area || 'imed', ...(it.block ? { block: it.block } : {}), text, st: '', due: it.due || null, created: today(), ord: maxOrd() + 1 };
  S.quests.tasks.push(t);
  return t;
}
function pushBoss(text, xp) {
  const blk = { id: uid('k'), group: 'bs', title: text.trim().replace(/:\s*[\d.]+\s*XP.*$/i, ''), color: 'red', st: '', due: null, created: today(), ord: maxOrd() + 1 };
  S.quests.blocks.push(blk);
  S.quests.bosses.push({ id: uid('b'), text: text.trim(), xp: +xp || R.C.XP_BOSS, st: '', ord: maxOrd() + 1, block: blk.id });
}
// ───────────────────────── BOSSES ─────────────────────────
export function addBoss(text, xp) {
  if (!text?.trim()) return;
  return commit(['quests'], () => { pushBoss(text, xp); });
}
// ───────────────────────── CLAUDE COMO AUXILIAR ─────────────────────────
/** marca todos os recados do Claude como lidos (sem entrar no desfazer) */
export function claudeReadAll() {
  const c = S.core.claude;
  if (!c?.notes?.some((n) => !n.read)) return;
  commit(['core'], () => { c.notes.forEach((n) => { n.read = true; }); }, { noUndo: true });
}
/** aprova uma sugestão grande do Claude (boss, bloco ou tarefa) */
export function claudeApprove(id) {
  const c = S.core.claude, sg = c?.suggest?.find((x) => x.id === id);
  if (!sg) return { error: 'Essa sugestão não existe mais.' };
  return commit(['core', 'quests'], () => {
    const text = String(sg.text || '').trim().slice(0, 200);
    if (!text) return;
    if (sg.kind === 'boss') pushBoss(text, sg.xp);
    else if (sg.kind === 'block') S.quests.blocks.push({ id: uid('k'), group: R.GROUPS[sg.group] ? sg.group : 'bd', title: text, color: 'blue', st: '', due: sg.due || null, created: today(), ord: maxOrd() + 1 });
    else pushTask({ text, area: sg.area || 'imed', due: sg.due });
    c.suggest = c.suggest.filter((x) => x.id !== id);
    c.log.push({ date: today(), text: '✔ aprovado: ' + text.slice(0, 80) });
    c.log = c.log.slice(-60);
  });
}
/** recusa uma sugestão do Claude */
export function claudeReject(id) {
  const c = S.core.claude;
  if (!c?.suggest?.some((x) => x.id === id)) return;
  commit(['core'], () => { c.suggest = c.suggest.filter((x) => x.id !== id); c.log.push({ date: today(), text: '✖ recusado' }); c.log = c.log.slice(-60); });
}
export function toggleBoss(id, at) {
  const b = S.quests.bosses.find((x) => x.id === id);
  if (!b) return;
  return commit(['quests'], () => {
    if (b.st === 'done') { b.st = ''; delete b.doneAt; return; }
    b.st = 'done';
    b.doneAt = today();
    return { feedback: { boss: b } };
  }, { at });
}
export function updateBoss(id, patch) {
  const b = S.quests.bosses.find((x) => x.id === id);
  if (b) commit(['quests'], () => Object.assign(b, patch));
}
export function deleteBoss(id) {
  commit(['quests'], () => {
    const boss = S.quests.bosses.find((x) => x.id === id), blk = boss?.block && B(boss.block);
    if (blk?.group === 'bs') { S.quests.blocks = S.quests.blocks.filter((x) => x !== blk); S.quests.tasks = S.quests.tasks.filter((t) => t.block !== blk.id); }
    S.quests.bosses = S.quests.bosses.filter((x) => x.id !== id);
  });
}
/** 🔗 manda uma tarefa da lista pro BREAKDOWN: vira um bloco ligado; concluir o bloco conclui a tarefa (sem XP em dobro) */
export function toBreakdown(id) {
  const t = T(id);
  if (!t || t.block || t.link) return { error: 'Só tarefas das listas que ainda não estão ligadas.' };
  return commit(['quests'], () => {
    const blk = { id: uid('k'), group: 'bd', title: t.text.replace(/\s*\(\d+\s*XP\)/i, '').trim(), color: 'green', st: '', due: t.due || null, created: today(), ord: maxOrd() + 1, src: t.id };
    S.quests.blocks.push(blk);
    t.link = blk.id;
    return { block: blk, msg: '🔗 Foi pro BREAKDOWN. Toque na tarefa pra ir lá.' };
  });
}
export function unlinkTask(id) {
  const t = T(id);
  if (t?.link) commit(['quests'], () => { const b = B(t.link); if (b) delete b.src; delete t.link; delete t.linked; });
}

// ───────────────────────── HÁBITOS ─────────────────────────
function recomputeHabitXp(from) {
  const td = today();
  S._epoch++;
  for (let d = from, i = 0; d <= td && i < 4; d = addDays(d, 1), i++) {
    const day = S.marks.days[d];
    if (!day) continue;
    day.xp = R.habitXpForDay(S, d);
    if (!Object.keys(day.h || {}).length && !day.xp) delete S.marks.days[d];
  }
}
export function cycleHabit(d, hid, at) {
  return commit(['marks'], () => {
    S.marks.days[d] ||= { h: {}, xp: 0 };
    const h = S.marks.days[d].h;
    const cur = h[hid] || '';
    const next = hid === 'rd' ? (cur ? '' : 'x') : cur === '' ? 'x' : cur === 'x' ? '-' : '';
    if (next) h[hid] = next; else delete h[hid];
    recomputeHabitXp(d);
  }, { at });
}
export function setHabit(d, hid, val) {
  return commit(['marks'], () => {
    S.marks.days[d] ||= { h: {}, xp: 0 };
    if (val) S.marks.days[d].h[hid] = val; else delete S.marks.days[d].h[hid];
    recomputeHabitXp(d);
  });
}
export function updateHabits(list) {
  commit(['core'], () => { S.core.habits = list; });
}

// ───────────────────────── RITUAIS ─────────────────────────
export function ritualDone(rid, at) {
  const r = S.core.rituals.find((x) => x.id === rid);
  if (!r) return;
  return commit(['core'], () => {
    const td = today();
    if (r.last === td) return { msg: 'Já marcado hoje.' };
    S.core.ritualLog.push({ id: uid('rl'), rid, date: td, xp: R.ritualXp(r), prevLast: r.last || null });
    r.last = td;
  }, { at });
}
export function ritualUndo(rid) {
  const r = S.core.rituals.find((x) => x.id === rid);
  if (!r) return;
  return commit(['core'], () => {
    const i = S.core.ritualLog.findLastIndex((l) => l.rid === rid && l.date === today());
    if (i < 0) return;
    r.last = S.core.ritualLog[i].prevLast ?? r.last;
    S.core.ritualLog.splice(i, 1);
  });
}
export function saveRitual(data) {
  return commit(['core'], () => {
    const clean = { type: data.type, name: String(data.name || '').trim(), notes: data.notes || '' };
    if (data.mode === 'dom') { clean.dom = +data.dom || 1; } else { clean.every = Math.max(1, +data.every || 7); }
    if (!clean.name) return;
    const r = data.id && S.core.rituals.find((x) => x.id === data.id);
    if (r) { delete r.every; delete r.dom; Object.assign(r, clean); if (data.last !== undefined) r.last = data.last || null; }
    else S.core.rituals.push({ id: uid('r'), ...clean, last: data.last || null });
  });
}
export function deleteRitual(id) {
  commit(['core'], () => { S.core.rituals = S.core.rituals.filter((r) => r.id !== id); });
}

// ───────────────────────── LOJA ─────────────────────────
export function buyTaverna(itemId, useTicket, at) {
  const it = S.loja.taverna.find((x) => x.id === itemId);
  if (!it) return;
  const shop = R.shopState(S), tot = R.totals(S);
  if (shop.locked) return { error: '⏰ ATOLADO: loja trancada. Zere as atrasadas (concluir ou remarcar).' };
  const price = R.tavernaPrice(S, it);
  const tk = R.ticketCost(it);
  if (useTicket ? tot.tickets < tk : tot.balance < price) return { error: useTicket ? `Precisa de ${tk} 🎟.` : `Falta ${price - tot.balance} XP.` };
  return commit(['loja'], () => {
    const instant = /ANT[IÍ]DOTO/i.test(it.name);
    S.loja.purchases.push({ id: uid('p'), date: today(), item: it.name, itemId, kind: 'taverna', qty: 1, xp: useTicket ? 0 : price, gold: 0, tickets: useTicket ? tk : 0, status: instant ? 'used' : 'bag', usedAt: instant ? today() : undefined });
    return { feedback: { bought: it.name, bag: !instant } };
  }, { at });
}
export function buyMystery(useTicket) {
  const shop = R.shopState(S), tot = R.totals(S);
  if (shop.locked) return { error: '⏰ ATOLADO: loja trancada.' };
  if (useTicket ? tot.tickets < 1 : tot.balance < R.C.MYSTERY) return { error: useTicket ? 'Você não tem 🎟 ticket.' : `O baú custa ${R.C.MYSTERY} XP.` };
  const pool = S.loja.taverna.filter((x) => !/ANT[IÍ]DOTO/i.test(x.name));
  const it = pool[Math.floor(Math.random() * pool.length)];
  if (!it) return { error: 'A taverna está vazia.' };
  return commit(['loja'], () => {
    S.loja.purchases.push({ id: uid('p'), date: today(), item: it.name, itemId: it.id, kind: 'bau', qty: 1, xp: useTicket ? 0 : R.C.MYSTERY, gold: 0, tickets: useTicket ? 1 : 0, status: 'bag' });
    return { prize: it };
  });
}
export function buyFerreiro(itemId, gold) {
  const it = S.loja.ferreiro.find((x) => x.id === itemId);
  if (!it) return;
  const tot = R.totals(S), xp = R.ferreiroXp(it);
  if (R.shopState(S).locked) return { error: '⏰ ATOLADO: loja trancada.' };
  if (it.nv > tot.level) return { error: `🔒 Precisa do nível ${it.nv}.` };
  if (tot.balance < xp) return { error: `Falta ${xp - tot.balance} XP.` };
  return commit(['loja'], () => {
    S.loja.purchases.push({ id: uid('p'), date: today(), item: it.name, itemId, kind: 'ferreiro', qty: 1, xp, gold: Math.max(0, +gold || 0), tickets: 0 });
    return { feedback: { bought: it.name } };
  });
}
export function undoPurchase(id) {
  commit(['loja', 'core'], () => {
    S.loja.purchases = S.loja.purchases.filter((p) => p.id !== id);
    if (q) { v.q = v.q.filter((x) => x !== q); const b = v.b.find((x) => x.id === q.id); if (b && !b.lv) v.b = v.b.filter((x) => x !== b); }
  });
}
export function addGold({ date, from, amount }) {
  if (!(+amount > 0)) return;
  commit(['loja'], () => { S.loja.goldIn.push({ id: uid('g'), date: date || today(), from: String(from || '').trim(), amount: +amount }); });
}
export function deleteGold(id) {
  commit(['loja'], () => { S.loja.goldIn = S.loja.goldIn.filter((g) => g.id !== id); });
}
export function saveShopItem(kind, data) {
  return commit(['loja'], () => {
    const list = S.loja[kind];
    const clean = kind === 'taverna'
      ? { name: String(data.name).trim().toUpperCase(), xp: Math.max(1, +data.xp || 1), icon: String(data.icon ?? '').trim() || undefined, min: data.min !== undefined && data.min !== '' ? Math.max(0, +data.min) : undefined, tk: data.tk !== undefined && data.tk !== '' && +data.tk >= 1 ? Math.round(+data.tk) : undefined }
      : { name: String(data.name).trim().toUpperCase(), cat: data.cat, nv: Math.max(1, +data.nv || 1), repeat: !!data.repeat, icon: (data.icon || '').trim() || undefined };
    if (!clean.name) return;
    const it = data.id && list.find((x) => x.id === data.id);
    let id = it?.id;
    if (it) Object.assign(it, clean); else { id = uid(kind === 'taverna' ? 'v' : 'f'); list.push({ id, ...clean }); }
    if (kind === 'ferreiro' && !S.loja.cats.includes(clean.cat)) S.loja.cats.push(clean.cat);
    return { id };
  });
}
export function deleteShopItem(kind, id) {
  commit(['loja'], () => { S.loja[kind] = S.loja[kind].filter((x) => x.id !== id); });
}

// ───────────────────────── DOMINGO ─────────────────────────
export function sundayTarget(td = today()) {
  const w = weekday(td);
  if (w === 0) return td;
  if (w === 1) return addDays(td, -1); // segunda: ainda dá pra abrir o baú de ontem
  return null;
}
export function openSunday({ notes, rit, text }) {
  const date = sundayTarget();
  if (!date) return { error: 'O baú só abre no domingo (ou na segunda, atrasado).' };
  if ((S.core.sundays || []).some((x) => x.date === date)) return { error: 'O baú desta semana já foi aberto.' };
  return commit(['core'], () => {
    const xp = R.sundayXp(notes, rit);
    S.core.sundays.push({ date, notes, rit, text: text || '', xp });
    return { feedback: { sunday: xp } };
  });
}

// ───────────────────────── AGENDA / CAPÍTULO / AJUSTES ─────────────────────────
export function addCommitment(c) {
  if (!c.text?.trim() || !c.date) return;
  commit(['core'], () => { S.core.commitments.push({ id: uid('c'), text: c.text.trim(), date: c.date, start: c.start || '', end: c.end || '', type: c.type || 'PESSOAL' }); });
}
export function deleteCommitment(id) {
  commit(['core'], () => { S.core.commitments = S.core.commitments.filter((c) => c.id !== id); });
}
export function planCost(plan) {
  let free = freeResched();
  return plan.reduce((a, p) => { const t = T(p.id); const b = t ? reschedBase({ ...t, due: p.from ?? t.due }, p.to) : 0; if (b && free) { free = false; return a; } return a + b; }, 0);
}
export function applyPlan(plan) {
  const total = planCost(plan);
  if (total > R.totals(S).balance) return { error: `As remarcações custam ${total} XP e o saldo não cobre.` };
  return commit(['quests', 'core', ...(total ? ['loja'] : [])], () => {
    const pids = []; let free = freeResched();
    for (const p of plan) {
      const t = T(p.id); if (!t) continue;
      const b = reschedBase({ ...t, due: p.from ?? t.due }, p.to);
      t.due = p.to;
      if (b && free) { free = false; useFree(); t.rs = (t.rs || 0) + 1; } else if (b) pids.push(chargeResched(t, b));
    }
    S.core.lastPlan = plan.map((p) => ({ id: p.id, from: p.from, to: p.to }));
    S.core.lastPlanPids = pids;
    return { msg: `📅 ${plan.length} prazo(s) distribuído(s)${total ? ` · −${total} XP em remarcações` : ''}.` };
  });
}
export function undoPlan() {
  const plan = S.core.lastPlan || [], pids = new Set(S.core.lastPlanPids || []);
  return commit(['quests', 'core', 'loja'], () => {
    for (const p of plan) { const t = T(p.id); if (t && t.due === p.to) { t.due = p.from || null; if (pids.size && t.rs) t.rs -= 1; } }
    S.loja.purchases = S.loja.purchases.filter((x) => !pids.has(x.id));
    delete S.core.lastPlan; delete S.core.lastPlanPids;
    return { msg: `↺ ${plan.length} prazo(s) voltaram como estavam${pids.size ? ' e o XP foi devolvido' : ''}.` };
  });
}
export function updateChapter(ch) {
  return commit(['core'], () => {
    const old = S.core.chapter || {}, n = +ch.n || old.n || 1;
    let closed = null;
    if (n > (old.n || 1)) { // fim de capítulo: guarda a carta e começa o próximo
      const start = old.start || S.core.startDate;
      closed = { n: old.n, title: old.title, mission: old.mission, why: old.why, start, end: today(), stats: R.chapterStats(S, start, today()) };
      S.core.chapters = [...(S.core.chapters || []), closed];
      ch.start = today();
    }
    S.core.chapter = { ...old, ...ch, n };
    return { feedback: { chapterClosed: closed } };
  });
}
/** 💰 guardei: a parte poupada (a outra metade do projeto) dá dano no boss do capítulo */
export function addSaving(amount, note) {
  if (!(+amount > 0)) return;
  return commit(['core'], () => { S.core.savings ||= []; S.core.savings.push({ id: uid('sv'), date: today(), amount: +amount, note: String(note || '').trim() }); return { msg: `💰 R$ ${(+amount).toLocaleString('pt-BR')} guardados: dano no boss!` }; });
}
export function setWeekly(ids, ws = weekStart(today())) {
  return commit(['core'], () => { S.core.weekly ||= {}; S.core.weekly[ws] = ids.slice(0, 3); for (const k of Object.keys(S.core.weekly)) if (k < addDays(today(), -60)) delete S.core.weekly[k]; });
}
export function updateMilestones(list) {
  commit(['core'], () => { S.core.milestones = list.filter(Boolean); });
}
export function setSetting(k, v) {
  commit(['core'], () => { S.core.settings ||= {}; S.core.settings[k] = v; });
}

// ───────────────────────── NOVO JOGO ─────────────────────────
export function newGameDocs() {
  const td = today();
  const v = (name, xp) => ({ id: uid('v'), name, xp });
  return {
    core: {
      v: 1, startDate: td,
      chapter: { n: 1, title: 'O COMEÇO', mission: 'DEFINA A SUA MISSÃO PRINCIPAL', why: 'POR QUE ISSO IMPORTA', until: addDays(td, 90) },
      habits: [
        { id: 'noph', icon: '🤺', name: 'NO PH' }, { id: 'selfcare', icon: '🧴', name: 'SELFCARE' },
        { id: 'treino', icon: '💪', name: 'TREINO' }, { id: 'dieta', icon: '🍚', name: 'DIETA' },
        { id: 'suplementos', icon: '💊', name: 'SUPLEMENTOS' }, { id: 'sono', icon: '😴', name: 'SONO' },
        { id: 'casa', icon: '🧹', name: 'CASA' },
      ],
      milestones: ['RELACIONAMENTO', 'FAMÍLIA', 'AMIGOS', 'NETWORK', 'CONHECIMENTO', 'PRÁTICA', 'VÍCIOS', 'DINHEIRO', 'REDES SOCIAIS'],
      rituals: [], ritualLog: [], commitments: [], achievements: {}, weeks: {}, sundays: [], missions: {}, adjust: [], archiveMonths: [], settings: {},
    },
    quests: { v: 1, tasks: [], blocks: [], bosses: [] },
    marks: { v: 1, days: {} },
    loja: {
      v: 1,
      taverna: [v('1 HORA DE JOGO', 80), v('1 EPISÓDIO DE SÉRIE', 40), v('FILME', 120), v('DELIVERY', 180), v('SOBREMESA CAPRICHADA', 60), v('TARDE LIVRE SEM CULPA', 350), v('1 DIA DE FOLGA', 700), v('ANTIDOTO', 250)],
      ferreiro: [], cats: ['EU', 'CASA', 'TRABALHO'], purchases: [], goldIn: [],
    },
  };
}

// ───────────────────────── v2: QUADRO ─────────────────────────
/** 🔄 ATUALIZAR: arquiva já tudo que está ✔/✖ (listas e blocos fechados) */
export function archiveNow() {
  const td = today(), q = S.quests;
  return commit(['quests', 'core'], () => {
    const toArq = (kind, item) => {
      const m = (item.doneAt || item.cancelAt || td).slice(0, 7);
      S.arq[m] ||= { v: 1, tasks: [], blocks: [] };
      S.arq[m][kind] ||= [];
      S.arq[m][kind].push({ ...item, archivedAt: td });
      touch('arq-' + m);
      S.core.archiveMonths = [...new Set([...(S.core.archiveMonths || []), m])].sort();
    };
    const closed = q.blocks.filter((b) => b.st === 'done');
    for (const b of closed) { toArq('blocks', b); for (const t of q.tasks.filter((t) => t.block === b.id)) toArq('tasks', { ...t, group: b.group, blockTitle: b.title }); }
    const ids = new Set(closed.map((b) => b.id));
    const fin = q.tasks.filter((t) => !ids.has(t.block) && (t.st === 'done' || t.st === 'cancel') && !q.tasks.some((k) => k.parent === t.id && R.isOpen(k)));
    for (const t of fin) { const b = t.block ? B(t.block) : null; toArq('tasks', b ? { ...t, group: b.group, blockTitle: b.title } : t); }
    const drop = new Set(fin.map((t) => t.id));
    q.tasks = q.tasks.filter((t) => !drop.has(t.id) && !ids.has(t.block));
    q.blocks = q.blocks.filter((b) => !ids.has(b.id));
    return { msg: `🔄 ${fin.length + closed.length} item(ns) arquivado(s).` };
  });
}
/** organizar por data: ❗ prioridade, depois prazo, sem data no fim, ⏳ aguardando agrupado embaixo */
export function sortContainer({ area, block }) {
  return commit(['quests'], () => {
    const list = S.quests.tasks.filter((t) => (block ? t.block === block : !t.block && t.area === area));
    const tops = list.filter((t) => !t.parent);
    const key = (t) => [t.st === 'done' || t.st === 'cancel' ? 3 : t.st === 'wait' || t.st === 'sent' ? 2 : t.prio ? 0 : 1, t.due || '9999-99-99', t.ord];
    tops.sort((a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1].localeCompare(y[1]) || x[2] - y[2]; });
    const ords = list.map((t) => t.ord).sort((a, b) => a - b);
    let i = 0;
    for (const t of tops) {
      t.ord = ords[i++];
      for (const k of list.filter((k) => k.parent === t.id).sort((a, b) => a.ord - b.ord)) k.ord = ords[i++];
    }
  });
}
/** arrastar e soltar: move a tarefa (com os passos ↳) para outra lista/bloco, antes de `before` */
export function dropTask(id, { area, block, before }) {
  const t = T(id);
  if (!t) return;
  return commit(['quests'], () => {
    const moving = [t, ...S.quests.tasks.filter((k) => k.parent === t.id).sort((a, b) => a.ord - b.ord)];
    const target = before ? T(before) : null;
    if (target && moving.includes(target)) return;
    for (const k of moving) { k.area = block ? 'block' : area; if (block) k.block = block; else delete k.block; }
    if (t.parent && (!block || T(t.parent)?.block !== block)) delete t.parent;
    const dest = S.quests.tasks.filter((k) => !moving.includes(k) && (block ? k.block === block : !k.block && k.area === area)).sort((a, b) => a.ord - b.ord);
    const i = target ? dest.indexOf(target) : dest.length;
    const lo = i > 0 ? dest[i - 1].ord : (dest[0]?.ord ?? 1) - 1, hi = i < dest.length ? dest[i].ord : lo + moving.length + 1;
    moving.forEach((k, j) => { k.ord = lo + ((hi - lo) * (j + 1)) / (moving.length + 1); });
    const b = block ? B(block) : null;
    if (b?.st === 'done' && R.isOpen(t)) reopenBlock(b);
  });
}

// ───────────────────────── v2: MOCHILA ─────────────────────────
const P = (id) => S.loja.purchases.find((p) => p.id === id);
export function useItem(pid) {
  const p = P(pid);
  if (!p) return;
  return commit(['loja'], () => {
    const it = S.loja.taverna.find((x) => x.id === p.itemId) || { name: p.item };
    const { min } = R.itemMeta(it);
    if (min) Object.assign(p, { status: 'using', usedAt: today(), startedAt: Date.now(), endsAt: Date.now() + min * 60000 });
    else Object.assign(p, { status: 'used', usedAt: today() });
    return { feedback: { using: p } };
  });
}
export function finishItem(pid) {
  const p = P(pid);
  if (!p || p.status !== 'using') return;
  return commit(['loja'], () => { p.status = 'used'; p.endedAt = Date.now(); });
}
/** "fiz sem comprar": paga a recompensa depois, com multa x2 */
export function confessItem(itemId) {
  const it = S.loja.taverna.find((x) => x.id === itemId);
  if (!it) return;
  const price = R.tavernaPrice(S, it) * 2;
  return commit(['loja'], () => {
    S.loja.purchases.push({ id: uid('p'), date: today(), item: it.name, itemId, kind: 'taverna', qty: 1, xp: price, gold: 0, tickets: 0, status: 'used', usedAt: today(), debt: true });
    return { msg: `🧾 Dívida paga: ${it.name} por ${price} XP (x2). Da próxima vez, compre antes!` };
  });
}
export function setShopGoal(itemId) {
  return commit(['loja'], () => { S.loja.goal = S.loja.goal === itemId ? null : itemId; });
}

// ───────────────────────── v2: GOLD (metade do projeto) ─────────────────────────
export function confirmGold(pr, amount) {
  return commit(['loja', 'core'], () => {
    S.loja.goldIn.push({ id: uid('g'), date: today(), from: pr.title, amount: +amount, key: pr.key, block: pr.block });
    return { msg: `💰 +${amount} gold no baú` };
  });
}
export function snoozeGold(pr, forever = false) {
  return commit(['core'], () => {
    if (forever) { S.core.goldDone ||= {}; S.core.goldDone[pr.key] = today(); }
    else { S.core.goldSnooze ||= {}; S.core.goldSnooze[pr.key] = today(); }
  });
}

// ───────────────────────── v2: BÔNUS (SOS e micro-vitórias) ─────────────────────────
export function sosDone(taskId) {
  const td = today();
  if ((S.core.bonus || []).filter((b) => b.kind === 'sos' && b.date === td).length >= 3) return null;
  return commit(['core'], () => {
    S.core.bonus ||= [];
    S.core.bonus.push({ id: uid('sos'), date: td, kind: 'sos', xp: 5, label: '🆘 coragem', taskId: taskId || null });
  });
}

// ───────────────────────── v2: SURVIVAL / ROTINA ─────────────────────────
/** 🏕 dia de descanso (viagem, doença): todos os hábitos viram folga, sem punição */
export function restDay(d) {
  return commit(['marks'], () => {
    S.marks.days[d] ||= { h: {}, xp: 0 };
    for (const h of S.core.habits) if (!S.marks.days[d].h[h.id]) S.marks.days[d].h[h.id] = '-';
    S._epoch++;
    S.marks.days[d].xp = R.habitXpForDay(S, d);
    S.core.rests = [...new Set([...(S.core.rests || []), d])].slice(-60);
    touch('core');
    return { msg: '🏕 Dia de descanso na fogueira: nada quebra hoje. Amanhã: +20% nos hábitos.' };
  });
}
export function setRoutineCell(plan, key, text) {
  return commit(['core'], () => {
    const g = S.core.routine.plans[plan].grid;
    if (text) g[key] = text.toUpperCase(); else delete g[key];
  });
}
export function setRoutineList(kind, list) {
  return commit(['core'], () => { S.core.routine[kind] = list.map((x) => x.trim().toUpperCase()).filter(Boolean); });
}
export function setRoutinePlan(i) {
  return commit(['core'], () => { S.core.routine.active = i; });
}

export function initRoutine() {
  return commit(['core'], () => { S.core.routine = { plans: [{ name: 'PRINCIPAL', grid: {} }], active: 0, hours: Array.from({ length: 19 }, (_, i) => String(i + 5).padStart(2, '0')), atividades: [], controle: [] }; });
}

/** arrastar bloco: reordena na coluna ou muda de coluna (BREAKDOWN / TRABALHO / CAPTAÇÕES) */
export function dropBlock(id, { group, before }) {
  const b = B(id);
  if (!b || !group) return;
  return commit(['quests'], () => {
    b.group = group;
    const list = S.quests.blocks.filter((x) => x.group === group && x !== b).sort((x, y) => x.ord - y.ord);
    const i = before ? list.findIndex((x) => x.id === before) : list.length;
    list.splice(i < 0 ? list.length : i, 0, b);
    const ords = list.map((x) => x.ord).sort((x, y) => x - y);
    list.forEach((x, k) => { x.ord = ords[k] ?? (ords[ords.length - 1] || 0) + k + 1; });
    if (new Set(list.map((x) => x.ord)).size !== list.length) list.forEach((x, k) => { x.ord = (list[0].ord || 0) + k * 0.01; });
  });
}
// ───────────────────────── v3: COMPANHEIRO ─────────────────────────
export function renameCompanion(name) {
  return commit(['core'], () => { S.core.companion = { ...(S.core.companion || {}), name: String(name || '').trim().toUpperCase().slice(0, 12) || 'PRIMO' }; });
}
// ───────────────────────── v3: FOGUEIRA DE FOCO (estilo Forest) ─────────────────────────
export function focusDone(min, ok, taskId) {
  const td = today();
  return commit(['core'], () => {
    S.core.focus ||= [];
    S.core.focus.push({ date: td, min, ok, taskId: taskId || null });
    if (S.core.focus.length > 400) S.core.focus = S.core.focus.slice(-400);
    if (!ok) return { msg: '🪵 A fogueira apagou: você saiu do app. Sem XP desta vez.' };
    expBoost(Math.round((min / 25) * R.C.X_FOCUS));
    const today = (S.core.bonus || []).filter((b) => b.kind === 'foco' && b.date === td).reduce((a, b) => a + b.xp, 0);
    const xp = Math.min(Math.round((min / 25) * R.C.FOCUS_XP), Math.max(0, 60 - today));
    S.core.bonus ||= [];
    if (xp > 0) S.core.bonus.push({ id: uid('fc'), date: td, kind: 'foco', xp, label: `🔥 foco ${min} min` });
    return { msg: `🔥 ${min} min de foco com a fogueira acesa${xp ? ` · +${xp} XP` : ''}` };
  });
}

// ───────────────────────── v3: ARQUIVO ─────────────────────────
/** esvazia meses antigos do arquivo guardando XP e contagens num saldo histórico (nível e medalhas não caem) */
export function emptyArchive(beforeMonth) {
  const months = Object.keys(S.arq).filter((m) => m < beforeMonth);
  if (!months.length) return { error: 'Nada antigo pra esvaziar.' };
  return commit(['core'], () => {
    const L = (S.core.legacy ||= {});
    let xp = 0;
    for (const m of months) {
      const d = S.arq[m];
      for (const t of d.tasks || []) {
        const cs = R.completions(t);
        xp += cs.reduce((a, c) => a + (c.xp || 0), 0) + (t.bonusXp || 0);
        const p = R.parse(t.text);
        L.done = (L.done || 0) + cs.length; L.onTime = (L.onTime || 0) + cs.filter((c) => c.onTime).length; L.early = (L.early || 0) + cs.filter((c) => c.early).length;
        L.star = (L.star || 0) + (p.star ? cs.length : 0); L.home = (L.home || 0) + (p.home ? cs.length : 0); L.archived = (L.archived || 0) + 1;
      }
      for (const b of d.blocks || []) { xp += b.xp || 0; if (b.group === 'bd') L.bdClosed = (L.bdClosed || 0) + 1; if (b.group === 'tr') L.trClosed = (L.trClosed || 0) + 1; }
    }
    S.core.adjust ||= [];
    S.core.adjust.push({ id: uid('adj'), date: today(), xp, label: `arquivo esvaziado (${months.join(', ')})` });
    for (const m of months) { delete S.arq[m]; deleteDocs('arq-' + m); }
    S.core.archiveMonths = (S.core.archiveMonths || []).filter((m) => !months.includes(m));
    return { msg: `🗑 ${months.length} mês(es) esvaziado(s). XP e medalhas mantidos.` };
  });
}

// ───────────────────────── v3.5: O PRIMO VIVO ─────────────────────────
/** amizade com o PRIMO: +1 por tipo de carinho por dia (afagar, conversar, responder a pergunta do dia) */
export function bondTouch(kind) {
  const td = today(), b = S.core.bond || { pts: 0, last: {} };
  if (b.last?.[kind] === td) return null;
  return commit(['core'], () => {
    S.core.bond = { pts: (b.pts || 0) + 1, last: { ...(b.last || {}), [kind]: td } };
    return { feedback: { bond: kind } };
  });
}
/** pergunta do dia: guarda a resposta (até 240 letras, últimas 200 respostas) e dá +5 XP uma vez por dia */
export function answerQuestion(q, a) {
  const td = today(), text = String(a || '').trim().slice(0, 240);
  if (!text) return null;
  return commit(['core'], () => {
    S.core.journal ||= {};
    S.core.journal[td] = { q, a: text };
    const keys = Object.keys(S.core.journal).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - 200))) delete S.core.journal[k];
    S.core.bonus ||= [];
    const b = S.core.bond || { pts: 0, last: {} };
    if (b.last?.journal !== td) S.core.bond = { pts: (b.pts || 0) + 1, last: { ...(b.last || {}), journal: td } };
    if (!S.core.bonus.some((x) => x.kind === 'journal' && x.date === td)) { S.core.bonus.push({ id: uid('j'), date: td, kind: 'journal', xp: 5, label: '📔 pergunta do dia' }); return { msg: '📔 Guardado no diário · +5 XP' }; }
    return { msg: '📔 Resposta atualizada' };
  });
}


// ───────────────────────── v4: REGRAS EDITÁVEIS, DIÁRIO E HISTÓRICOS ─────────────────────────
export function setRule(key, value) {
  const v = +value;
  if (!isFinite(v) || R.ruleDefault(key) === undefined || v < 0) return { error: 'Valor inválido.' };
  return commit(['core'], () => {
    S.core.settings ||= {};
    S.core.settings.rules ||= {};
    if (v === R.ruleDefault(key)) delete S.core.settings.rules[key]; else S.core.settings.rules[key] = v;
    R.applyRules(S);
  });
}
export function resetRules() {
  return commit(['core'], () => { if (S.core.settings) delete S.core.settings.rules; R.applyRules(S); });
}
export function editJournal(date, a) {
  const text = String(a || '').trim().slice(0, 240);
  if (!text || !S.core.journal?.[date]) return null;
  return commit(['core'], () => { S.core.journal[date].a = text; return { msg: '📔 Página corrigida' }; });
}
/** apagar a página tira também os +5 XP daquele dia (dá pra responder de novo) */
export function deleteJournal(date) {
  return commit(['core'], () => {
    delete S.core.journal?.[date];
    S.core.bonus = (S.core.bonus || []).filter((b) => !(b.kind === 'journal' && b.date === date));
    return { msg: '🗑 Página apagada (Ctrl+Z desfaz)' };
  });
}
export function deleteBonus(id) {
  return commit(['core'], () => { S.core.bonus = (S.core.bonus || []).filter((b) => b.id !== id); return { msg: '🗑 Bônus apagado' }; });
}
export function deleteSunday(date) {
  return commit(['core'], () => { S.core.sundays = (S.core.sundays || []).filter((x) => x.date !== date); return { msg: '🗑 Baú apagado' }; });
}

// ───────────────────────── v4.3: a VILA saiu (o XP e o gold das obras voltam pro saldo) ─────────────────────────
function dropVillage() {
  const had = !!S.core.village || (S.loja?.purchases || []).some((p) => p.kind === 'vila');
  if (!had) return false;
  const back = (S.loja.purchases || []).filter((p) => p.kind === 'vila');
  S.loja.purchases = S.loja.purchases.filter((p) => p.kind !== 'vila');
  const xp = back.reduce((a, p) => a + (p.xp || 0), 0), gold = back.reduce((a, p) => a + (p.gold || 0), 0), tk = back.reduce((a, p) => a + (p.tickets || 0), 0);
  delete S.core.village;
  if (S.core.settings) delete S.core.settings.vcat;
  (S.core.migrations ||= []).push('vila-off');
  if (xp || gold || tk) S.core.vilaRefund = { xp, gold, tickets: tk };
  S._lojaChanged = true;
  return true;
}
/** tarefa concluída e foco encurtam a expedição do PRIMO (a regra de quanto está em rules.js: X_TASK, X_FOCUS) */
function expBoost(mins) {
  const e = S.core.primo?.exp;
  if (!e || e.claimed || !(mins > 0)) return;
  e.end = Math.max(Date.now(), e.end - mins * 60000);
  touch('core');
}

// ───────────────────────── PESO (REFLEXÃO) ─────────────────────────
export function saveWeight(date, kg) {
  const v = Math.round(+String(kg).replace(',', '.') * 10) / 10;
  if (!(v > 20 && v < 400)) return { error: 'Digite um peso válido (ex.: 78,4).' };
  return commit(['core'], () => { (S.core.weights ||= {})[date] = v; return { msg: `⚖ Peso de ${date.slice(8)}/${date.slice(5, 7)} anotado: ${String(v).replace('.', ',')} kg` }; });
}
export function deleteWeight(date) { return commit(['core'], () => { delete S.core.weights?.[date]; }); }

/** v5: o dono pediu pra apagar os dados antigos de PERGUNTA DO DIA e 3 MICRO-VITÓRIAS (os bônus de XP deles saem junto) */
function cleanOld() {
  S.core.migrations ||= [];
  if (S.core.migrations.includes('v5-clean')) return false;
  delete S.core.journal; delete S.core.wins;
  S.core.bonus = (S.core.bonus || []).filter((b) => b.kind !== 'journal' && b.kind !== 'wins');
  if (S.core.bond?.last) { delete S.core.bond.last.journal; delete S.core.bond.last.wins; }
  S.core.migrations.push('v5-clean');
  return true;
}
