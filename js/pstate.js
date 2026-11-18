// O PRIMO — estado e regras: pedido do dia, a BRASINHA (mascote) e diário. Tudo em core.primo.
// core.primo = { ask:{date,k,n,done}, petMax, diary:[{wk,text,expr}] }  (exp e wear saíram na v7.2)
import { S, save } from './store.js';
import * as R from './rules.js';
import { commit } from './actions.js';
import { uid, today, addDays, weekStart, weekday, hash, fmtDM, DOW } from './util.js';

export const P = () => S.core?.primo || {};
const ensure = () => (S.core.primo ||= {});

// v7.2: a EXPEDIÇÃO saiu (pedido do dono). Os dados antigos (core.primo.exp) são limpos pela migração v7-primo; o XP que ela já deu continua valendo.

// ───────────────────────── PEDIDO DO DIA ─────────────────────────
const doneToday = (td) => R.allTasks(S).filter((t) => t.st === 'done' && t.doneAt === td && !/^(↳|>)/.test(t.text));
export const ASKS = [
  { k: 'tarefas', n: (h) => 2 + (h % 3), text: (n) => `Feche ${n} tarefas hoje`, xp: (n) => 10 * n + 5, ev: (td, n) => [doneToday(td).length, n] },
  { k: 'estrela', n: () => 1, text: () => 'Conclua 1 tarefa ⭐ (a chata) hoje', xp: () => 40, ev: (td) => [doneToday(td).filter((t) => R.parse(t.text).star).length, 1], ok: () => R.openTasks(S).some((t) => R.parse(t.text).star) },
  { k: 'habitos', n: () => 1, text: () => 'Marque todos os hábitos de hoje', xp: () => 30, ev: (td) => { const hs = S.core.habits || []; const m = S.marks.days[td]?.h || {}; return [hs.filter((h) => m[h.id]).length, hs.length || 1]; } },
  { k: 'atrasada', n: () => 1, text: () => 'Conclua 1 tarefa atrasada', xp: () => 45, ev: (td) => [doneToday(td).filter((t) => t.due && t.due < td).length, 1], ok: () => R.overdueTasks(S).length > 0 },
  { k: 'foco', n: () => 1, text: () => 'Faça 1 rodada de foco (25 min)', xp: () => 30, ev: (td) => [(S.core.focus || []).filter((f) => f.date === td && f.ok && f.min >= 25).length, 1] },
  { k: 'meta', n: () => 1, text: () => 'Bata a meta do dia', xp: () => 30, ev: () => { const g = R.dailyGoal(S); return [Math.min(g.today, g.goal), g.goal]; } },
  { k: 'pontual', n: () => 1, text: () => 'Conclua 1 tarefa no dia exato do prazo', xp: () => 35, ev: (td) => [doneToday(td).filter((t) => t.due === td).length, 1], ok: () => R.openTasks(S).some((t) => t.due === today()) },
];
/** escolhe o pedido de hoje (e grava, pra não mudar durante o dia) */
export function askToday() {
  const td = today(), p = ensure();
  if (p.ask?.date === td && ASKS.some((a) => a.k === p.ask.k)) return p.ask;
  const list = ASKS.filter((a) => !a.ok || a.ok()), h = hash('pedido' + td);
  const a = list[h % list.length], n = a.n(h);
  p.ask = { date: td, k: a.k, n, xp: a.xp(n), done: false };
  save('core');
  return p.ask;
}
export function askInfo() {
  const ask = askToday(), def = ASKS.find((x) => x.k === ask.k), [v, t] = def.ev(ask.date, ask.n);
  return { ...ask, text: def.text(ask.n), value: Math.min(v, t), target: t, ok: v >= t };
}
export function claimAsk() {
  const i = askInfo();
  if (i.done) return { error: 'Você já pegou o presente de hoje.' };
  if (!i.ok) return { error: 'Ainda falta cumprir o pedido.' };
  return commit(['core'], () => {
    ensure().ask.done = true;
    (S.core.bonus ||= []).push({ id: uid('pd'), date: today(), kind: 'pedido', xp: i.xp, label: '🎯 pedido do PRIMO' });
    const b = S.core.bond || { pts: 0, last: {} };
    S.core.bond = { pts: (b.pts || 0) + 1, last: { ...(b.last || {}), pedido: today() } };
    return { msg: `🎯 Pedido cumprido! +${i.xp} XP`, feedback: { pedido: i } };
  });
}

// ───────────────────────── MASCOTE: a BRASINHA (v7.3b: cresce com o CALOR; regras em rules.js → brasinha, dados em core.brasinha) ─────────────────────────
/** o que a tela usa: frame = quadro da arte; stage = fase 0 (OVO) a 4 (FÊNIX) */
export function petState(s = S) {
  const b = R.brasinha(s);
  return { ...b, frame: b.frame, bstage: b.stage, next: !b.max, title: `BRASINHA · ${b.name}${b.max ? '' : ` · 🔥 ${Math.max(0, b.calor + b.hoje)}/${b.need} de calor${b.hoje ? ` (${b.hoje > 0 ? '+' : ''}${b.hoje} hoje)` : ''}`}` };
}

// ───────────────────────── CHAPÉU DE PALHA ─────────────────────────
// v7.2: o chapéu é PARTE do desenho do PRIMO (não é acessório): sempre na cabeça. O botão CHAPÉU e core.primo.wear saíram.
export const wearing = () => ({ hat: 'palha' });

// ───────────────────────── DIÁRIO DO PRIMO (um resumo por semana que terminou) ─────────────────────────
const CLOSE = {
  otima: [['festa', 'Semana de campeão! Se eu tivesse chapéu, tirava.'], ['orgulhoso', 'Eu só queria dizer: tenho orgulho de ser seu primo.'], ['animado', 'Assim o APÊ sai antes do previsto.']],
  boa: [['feliz', 'Semana sólida. Dá pra confiar no ritmo.'], ['orgulhoso', 'Foi uma semana boa. A próxima pode ser ainda melhor.'], ['piscada', 'Constância é o nome do jogo e você jogou bem.']],
  media: [['pensativo', 'Semana de altos e baixos. Dá pra aprender com os baixos.'], ['neutro', 'Foi razoável. Com uma ou duas mudanças pequenas vira ótima.'], ['feliz', 'O importante é que a corrente não quebrou de vez.']],
  fraca: [['triste', 'Semana difícil. Tudo bem: recomeçar também é avançar.'], ['preocupado', 'Foi pouco, mas pouco ainda é mais que zero. Bora de novo.'], ['cansado', 'A semana pesou. Descansa e volta com calma.']],
};
export function weekSummary(ws) {
  const xp = R.idx(S).xpByDay, done = R.idx(S).doneByDay, g = R.goalAt(S, ws);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const tot = days.reduce((a, d) => a + (xp[d] || 0), 0), n = days.reduce((a, d) => a + (done[d] || 0), 0), hit = days.filter((d) => (xp[d] || 0) >= g).length;
  const best = days.reduce((b, d) => ((xp[d] || 0) > (xp[b] || 0) ? d : b), days[0]);
  const exps = (S.core.bonus || []).filter((b) => b.kind === 'expedicao' && b.date >= ws && b.date <= addDays(ws, 6)).length;
  const lvl = hit >= 5 ? 'otima' : hit >= 3 ? 'boa' : hit >= 1 || tot > g ? 'media' : 'fraca';
  const [expr, tail] = CLOSE[lvl][hash('dia' + ws) % 3];
  const text = tot || n ? `Semana de ${fmtDM(ws)}: ${tot} XP, ${n} tarefa(s) fechada(s), ${hit} dia(s) na meta. Melhor dia: ${DOW[weekday(best)]} ${fmtDM(best)} (${xp[best] || 0} XP).${exps ? ` Fiz ${exps} expedição(ões).` : ''} ${tail}` : null;
  return text ? { wk: ws, text, expr, xp: tot } : null;
}
/** gera o diário das semanas que já acabaram (as últimas 8) e guarda */
export function diarySync() {
  const p = ensure(), td = today(), cur = weekStart(td);
  const have = new Set((p.diary || []).map((d) => d.wk));
  const add = [];
  for (let i = 1; i <= 8; i++) { const ws = addDays(cur, -7 * i); if (!have.has(ws)) { const s = weekSummary(ws); if (s) add.push(s); } }
  if (add.length) { p.diary = [...(p.diary || []), ...add].sort((a, b) => a.wk.localeCompare(b.wk)).slice(-40); save('core'); }
  return p.diary || [];
}
export const fmtMin = (m) => (m >= 1440 ? `${Math.round(m / 144) / 10} dia` : m >= 60 ? `${Math.round(m / 6) / 10} h`.replace('.', ',') : `${m} min`);
