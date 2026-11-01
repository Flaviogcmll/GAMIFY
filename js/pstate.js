// O PRIMO — estado e regras: expedições, pedido do dia, armário, mascote (FAÍSCA) e diário. Tudo em core.primo.
// core.primo = { exp:{id,start,end,claimed}, expN, ask:{date,k,n,done}, wear:{hat,eyes,neck,back}, diary:[{wk,text,expr}] }
import { S, save } from './store.js';
import * as R from './rules.js';
import { commit } from './actions.js';
import { uid, today, addDays, weekStart, weekday, hash, fmtDM, DOW } from './util.js';

export const P = () => S.core?.primo || {};
const ensure = () => (S.core.primo ||= {});

// ───────────────────────── EXPEDIÇÕES (substituem as obras da vila) ─────────────────────────
export const EXPS = [
  { id: 'passeio', ico: '🚶', name: 'Passeio no bairro', min: 30, xp: [10, 20], tk: 0, flavor: ['Dei uma volta no quarteirão e achei uma moeda perto do ponto de ônibus.', 'Vi um cachorro caramelo e conversei com ele. Ele concordou comigo.', 'Passei na padaria. Trouxe a sensação de pão quente.'] },
  { id: 'feira', ico: '🛒', name: 'Feira livre', min: 120, xp: [30, 60], tk: 0, flavor: ['A feira tava cheia de gente e de pastel. Barganhei um troco pra você.', 'Um senhor me ensinou a escolher abacate. Aprendi, juro.', 'Achei um mapa antigo dentro de uma caixa de laranjas. Parecia de arquiteto.'] },
  { id: 'viagem', ico: '🚌', name: 'Viagem a trabalho', min: 480, xp: [90, 150], tk: 0.3, flavor: ['Fui até a cidade vizinha ver um terreno. Tinha vista bonita e muito barro.', 'Participei de uma reunião de condomínio sem perder a paciência. Mereço medalha.', 'Visitei uma obra e voltei com ideias novas pro APÊ.'] },
  { id: 'aventura', ico: '🏔', name: 'Aventura na serra', min: 1440, xp: [250, 400], tk: 1, flavor: ['Subi a serra inteira. A vista do topo faz qualquer prazo parecer pequeno.', 'Acampei sob as estrelas e escrevi três ideias de projeto. Uma é boa.', 'Achei uma cachoeira escondida. Não conto onde fica, é segredo mineiro.'] },
];
export const expOf = (id) => EXPS.find((x) => x.id === id);
export function expState(now = Date.now()) {
  const e = P().exp;
  if (!e || e.claimed) return { cur: null };
  const def = expOf(e.id);
  if (!def) return { cur: null };
  return { cur: e, def, left: Math.max(0, e.end - now), ready: now >= e.end, pct: Math.min(1, (now - e.start) / Math.max(1, e.end - e.start)) };
}
export function sendExp(id) {
  const def = expOf(id), es = expState();
  if (!def) return { error: 'Expedição desconhecida.' };
  if (es.cur) return { error: 'Ele já está na estrada. Espere ou use um 🎟.' };
  if (R.shopState(S).locked) return { error: '⏰ ATOLADO: as expedições param até você zerar as atrasadas.' };
  return commit(['core'], () => { ensure().exp = { id, start: Date.now(), end: Date.now() + def.min * 60000, claimed: false }; return { msg: `${def.ico} O PRIMO partiu: ${def.name} (${fmtMin(def.min)})` }; });
}
export function finishExpTicket() {
  const es = expState(), tot = R.totals(S);
  if (!es.cur || es.ready) return { error: 'Sem expedição em andamento.' };
  if (tot.tickets < 1) return { error: 'Você não tem 🎟 ticket.' };
  return commit(['core', 'loja'], () => {
    S.loja.purchases.push({ id: uid('p'), date: today(), item: 'EXPEDIÇÃO · acelerar', kind: 'expedicao', qty: 1, xp: 0, gold: 0, tickets: 1, status: 'used', usedAt: today() });
    P().exp.end = Date.now();
  });
}
/** acontecimento da estrada: o PRIMO pergunta e você escolhe o caminho seguro ou o arriscado */
export const EVENTS = [
  ['Achei uma ponte velha no caminho.', 'Dar a volta', 'Atravessar'], ['Um sujeito vendia um "mapa do tesouro" por uns trocados.', 'Ignorar', 'Comprar'],
  ['Tem uma trilha curta cheia de mato e outra comprida e limpa.', 'Trilha comprida', 'Trilha curta'], ['Vi uma árvore de jabuticaba carregada, mas o dono tava perto.', 'Passar reto', 'Colher'],
  ['Choveu e o rio subiu um pouco.', 'Esperar secar', 'Vadear'], ['Achei uma caverna escura.', 'Seguir viagem', 'Entrar'],
];
export const eventOf = (e) => EVENTS[hash(e.id + e.start) % EVENTS.length];
/** recompensa: o sorteio é fixo por expedição. choice: 'safe' (XP normal) ou 'risk' (50%: dobro · 50%: metade) */
export function claimExp(choice = 'safe') {
  const es = expState();
  if (!es.cur || !es.ready) return null;
  const e = es.cur, def = es.def, k = hash(e.id + e.start);
  let xp = def.xp[0] + (k % (def.xp[1] - def.xp[0] + 1));
  const win = choice === 'risk' ? hash('r' + e.start) % 2 === 0 : null;
  if (choice === 'risk') xp = win ? xp * 2 : Math.max(1, Math.round(xp / 2));
  const tk = def.tk >= 1 ? 1 : def.tk > 0 && (k % 10) / 10 < def.tk ? 1 : 0;
  const card = def.flavor[k % def.flavor.length] + (choice === 'risk' ? (win ? ' Arrisquei e deu certo, uai!' : ' Arrisquei e deu ruim... mas voltei inteiro.') : '');
  return commit(['core'], () => {
    e.claimed = true; e.card = card; e.xp = xp; e.tk = tk;
    const p = ensure(); p.expN = (p.expN || 0) + 1;
    (S.core.bonus ||= []).push({ id: uid('ex'), date: today(), kind: 'expedicao', xp, tickets: tk, label: `${def.ico} ${def.name}` });
    return { feedback: { postcard: e } };
  });
}

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

// ───────────────────────── MASCOTE: FAÍSCA (cresce com os dias batendo a meta; nunca volta atrás) ─────────────────────────
export const PET_STAGES = [[0, 'OVO'], [2, 'FAÍSCA'], [5, 'BRASINHA'], [10, 'CHAMINHA'], [20, 'CHAMA'], [35, 'FOGUEIRA'], [60, 'FÊNIX'], [100, 'FÊNIX LENDÁRIA']];
export function goalDays(s = S) {
  const g = s.core?.settings?.dailyGoal || R.C.DAILY_GOAL, xp = R.idx(s).xpByDay;
  return Object.values(xp).filter((v) => v >= g).length;
}
export function petState(s = S) {
  const n = goalDays(s), prev = s.core?.primo?.petMax || 0;
  let i = 0; PET_STAGES.forEach(([d], j) => { if (n >= d) i = j; });
  const stage = Math.max(i, prev), next = PET_STAGES[stage + 1];
  return { days: n, stage, name: PET_STAGES[stage][1], next: next ? next[0] : null, left: next ? Math.max(0, next[0] - n) : 0 };
}
/** guarda o maior estágio (se você apagar dados, ela não encolhe) e avisa quando evolui */
export function petSync() {
  const st = petState(), p = ensure();
  if (st.stage > (p.petMax || 0)) { const first = p.petMax == null; p.petMax = st.stage; save('core'); return first ? null : st; }
  if (p.petMax == null) { p.petMax = st.stage; save('core'); }
  return null;
}

// ───────────────────────── ARMÁRIO ─────────────────────────
export const SLOTS = [['hat', 'CABEÇA'], ['eyes', 'ÓCULOS'], ['neck', 'PESCOÇO'], ['back', 'COSTAS']];
export const WARDROBE = [
  { id: 'bone', slot: 'hat', name: 'Boné vermelho', need: { lv: 1 } }, { id: 'palha', slot: 'hat', name: 'Chapéu de palha', need: { lv: 2 } },
  { id: 'gorro', slot: 'hat', name: 'Gorro de lã', need: { lv: 3 } }, { id: 'bandana', slot: 'hat', name: 'Bandana', need: { lv: 6 } },
  { id: 'capacete', slot: 'hat', name: 'Capacete de obra', need: { exp: 3 } }, { id: 'fone', slot: 'hat', name: 'Fones de ouvido', need: { lv: 5 } },
  { id: 'cartola', slot: 'hat', name: 'Cartola', need: { lv: 8 } }, { id: 'mago', slot: 'hat', name: 'Chapéu de mago', need: { lv: 15 } }, { id: 'coroa', slot: 'hat', name: 'Coroa', need: { lv: 20 } },
  { id: 'oculos', slot: 'eyes', name: 'Óculos redondos', need: { lv: 1 } }, { id: 'sol', slot: 'eyes', name: 'Óculos escuros', need: { lv: 4 } }, { id: 'monoculo', slot: 'eyes', name: 'Monóculo', need: { lv: 12 } },
  { id: 'cachecol', slot: 'neck', name: 'Cachecol', need: { lv: 1 } }, { id: 'gravata', slot: 'neck', name: 'Gravata borboleta', need: { lv: 7 } }, { id: 'medalha', slot: 'neck', name: 'Medalha dourada', need: { ach: 'elite' } },
  { id: 'mochila', slot: 'back', name: 'Mochila de aventura', need: { lv: 2 } }, { id: 'capa', slot: 'back', name: 'Capa vermelha', need: { lv: 10 } }, { id: 'capaazul', slot: 'back', name: 'Capa de herói', need: { boss: 3 } },
];
export function wardrobeOk(it, s = S) {
  const n = it.need || {}, tot = R.totals(s), st = R.stats(s);
  if (n.lv) return { ok: tot.level >= n.lv, hint: `nível ${n.lv}` };
  if (n.exp) return { ok: (s.core?.primo?.expN || 0) >= n.exp, hint: `${n.exp} expedições` };
  if (n.boss) return { ok: (st.bossDone || 0) >= n.boss, hint: `${n.boss} bosses` };
  if (n.ach) return { ok: !!s.core?.achievements?.[n.ach], hint: 'conquista PONTUALIDADE DE ELITE' };
  return { ok: true, hint: '' };
}
export const wearing = () => ({ hat: null, eyes: null, neck: null, back: null, ...(P().wear || {}) });
export function setWear(slot, id) {
  if (id) { const it = WARDROBE.find((x) => x.id === id); if (!it || it.slot !== slot || !wardrobeOk(it).ok) return { error: 'Ainda não liberou esse item.' }; }
  return commit(['core'], () => { const p = ensure(); p.wear = { ...(p.wear || {}), [slot]: id || null }; });
}

// ───────────────────────── DIÁRIO DO PRIMO (um resumo por semana que terminou) ─────────────────────────
const CLOSE = {
  otima: [['festa', 'Semana de campeão! Se eu tivesse chapéu, tirava.'], ['orgulhoso', 'Eu só queria dizer: tenho orgulho de ser seu primo.'], ['animado', 'Assim o APÊ sai antes do previsto.']],
  boa: [['feliz', 'Semana sólida. Dá pra confiar no ritmo.'], ['orgulhoso', 'Foi uma semana boa. A próxima pode ser ainda melhor.'], ['piscada', 'Constância é o nome do jogo e você jogou bem.']],
  media: [['pensativo', 'Semana de altos e baixos. Dá pra aprender com os baixos.'], ['neutro', 'Foi razoável. Com uma ou duas mudanças pequenas vira ótima.'], ['feliz', 'O importante é que a corrente não quebrou de vez.']],
  fraca: [['triste', 'Semana difícil. Tudo bem: recomeçar também é avançar.'], ['preocupado', 'Foi pouco, mas pouco ainda é mais que zero. Bora de novo.'], ['cansado', 'A semana pesou. Descansa e volta com calma.']],
};
export function weekSummary(ws) {
  const xp = R.idx(S).xpByDay, done = R.idx(S).doneByDay, g = S.core?.settings?.dailyGoal || R.C.DAILY_GOAL;
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
