// QUESTS — a casa e o painel (como na planilha): listas + BOSS em cima, blocos embaixo, painel à direita.
import { S } from '../store.js';
import * as R from '../rules.js';
import { esc, fmtDM, fmtN, today, diffDays, weekday, addDays } from '../util.js';
import { taskRow, segBar, dueChip } from '../ui.js';
import { px } from '../icons.js';
import { isCollapsed, companionCard } from '../v3.js';
import { primoHead } from '../primo.js';
import { arrange } from '../v35.js';
import { moscasHtml, moscaMortaHtml } from '../moscas.js';
import { soltas } from '../organiza.js';
import { tresCard } from '../tres.js';

const sortOrd = (a, b) => a.ord - b.ord;
/** v7.1: ORDENAR pelo menu ≡ (só na tela: a ordem guardada não muda). Uma escolha por janela, lembrada no aparelho.
 *  'date' = prazo mais perto em cima · 'urg' = pela cor da urgência (vermelho, laranja, amarelo, verde, cinza, roxo) */
export function qsortOf(ui, tab) {
  if (!ui.qsort) { try { ui.qsort = JSON.parse(localStorage.getItem('gamify-ui:qsort')) || {}; } catch { ui.qsort = {}; } }
  return ''; // v9.5 (pedido do dono): ORDENAR por data/urgência saiu do ≡ (a cor já vem do prazo); a ordem é a que você arrasta
}
const URG_RANK = { hoje: 0, amanha: 1, semana: 2, depois: 3, sem: 4, wait: 5 };
const byDue = (a, b) => (a.due || '9').localeCompare(b.due || '9') || sortOrd(a, b);
/** v7.7: nas janelas de blocos o ≡ ORDENAR mexe nos BLOCOS inteiros (as subtarefas ficam na ordem delas). Só na tela. */
const taskSorter = () => sortOrd;
const blockDate = (b) => { const ds = S.quests.tasks.filter((t) => t.block === b.id && R.isOpen(t) && t.due).map((t) => t.due); if (b.due) ds.push(b.due); return ds.sort()[0] || '9999'; };
const BLOCK_URG = { red: 1, yellow: 2, green: 3, purple: 4, black: 5 };
const blockRank = (b, td) => (S.quests.tasks.some((t) => t.block === b.id && R.isOpen(t) && t.due && t.due < td) ? 0 : b.st === 'wait' ? 4 : BLOCK_URG[b.color] ?? 3);
function sortBlocks(list, mode, td = today()) {
  if (mode === 'date') return [...list].sort((a, b) => blockDate(a).localeCompare(blockDate(b)) || a.ord - b.ord);
  if (mode === 'urg') return [...list].sort((a, b) => blockRank(a, td) - blockRank(b, td) || blockDate(a).localeCompare(blockDate(b)) || a.ord - b.ord);
  return list;
}
/** blocos em 3 colunas fixas: abrir um bloco só empurra os de baixo dele.
 *  v7.0: o bloco guarda a coluna (b.col, 0 a 2) quando você arrasta ele pra outra; sem isso, fica na coluna i % 3 (como antes) */
// v9.2 (resposta do dono, 11): 3 colunas sempre; os blocos ficaram maiores na VERTICAL (linhas mais altas e letra um pouco maior, no CSS)
const NCOL = () => 3;
const colOf = (b, i, n = NCOL()) => (Number.isInteger(b?.col) && b.col >= 0 ? b.col % n : i % n);
const cols3 = (items, blocks = []) => {
  const n = NCOL(), cs = Array.from({ length: n }, () => []);
  items.forEach((h, i) => cs[colOf(blocks[i], i, n)].push(`<div class="mitem" style="order:${i}">${h}</div>`));
  return cs.map((c, k) => `<div class="mcol" data-col="${k}">${c.join('')}</div>`).join('');
};
/** sem MOSTRAR FEITAS: some tudo que foi feito ou cancelado (o ↩ desfaz um clique errado) */
const visible = (t) => R.isOpen(t) || t.st === 'sent';
/** botão REVISADO (selo de 24 h) no fim de uma lista ou bloco */
const revBtn = (act, attr, on) => `<button class="rev-btn ${on ? 'on' : ''}" data-act="${act}" ${attr} title="${on ? 'Tirar o selo de revisado' : 'Olhei e está tudo em ordem. O selo dura 24 horas.'}">${on ? '👁 revisado · tirar' : '👁 marcar como revisado'}</button>`;
/** ⬛ parado: só aparece com MOSTRAR PARADOS ligado */
const stalledOff = (ui) => (t) => t.color !== 'black' || ui.showStalled;

function bossPanel(ui) {
  const ordOf = (b) => R.findBlock(S, b.block)?.ord ?? b.ord, list = [...S.quests.bosses].sort((a, z) => ordOf(a) - ordOf(z)).sort((a, z) => (a.st === 'done') - (z.st === 'done'));
  const bqs = qsortOf(ui, 'boss'); if (bqs) { const blk = (b) => R.findBlock(S, b.block) || { id: b.id, ord: b.ord, color: 'red' }; const sorted = sortBlocks(list.map(blk), bqs); list.sort((a, z) => (a.st === 'done') - (z.st === 'done') || sorted.indexOf(blk(a)) - sorted.indexOf(blk(z))); }
  const card = (b) => {
    const hp = R.bossHp(S, b), blk = hp?.block, done = b.st === 'done', paused = R.bossPaused(b), idle = R.bossIdle(S, b);
    const items = blk ? S.quests.tasks.filter((t) => t.block === blk.id).sort(taskSorter(ui)) : [];
    const show = ui.showDone || done ? items : items.filter(visible);
    const ck = blk?.id || b.id;
    return `<article class="block boss-b ${done ? 'closed' : ''} ${paused ? 'paused' : ''} ${isCollapsed('b:' + ck) ? 'collapsed' : ''}" data-color="red" ${blk ? `data-drop-block="${blk.id}"` : ''}>
      <div class="bh"><div class="stripe"></div><button class="icon-btn bchev" data-act="collapse" data-k="b:${ck}" aria-label="Recolher boss"><span class="chev">${isCollapsed('b:' + ck) ? '▸' : '▾'}</span></button><div class="bt" data-act="edit-boss" data-id="${b.id}"><h3>👹 ${esc(b.text.replace(/:\s*[\d.]+\s*XP.*$/i, ''))}</h3>
        <div class="bm"><span class="acc">${fmtN(b.xp)} XP + 1🎟</span>${hp && hp.total ? `<span>HP ${fmtN(hp.left)}/${fmtN(hp.total)}</span>` : '<span>quebre em subtarefas ↓</span>'}${done ? `<span class="good">RESOLVIDO ${fmtDM(b.doneAt)}</span>` : paused ? `<span class="info">⏸ volta ${fmtDM(b.pause)}</span>` : b.st === 'wait' ? '<span>⏳ aguardando</span>' : idle >= R.BOSS_IDLE_DAYS && R.neuroOn(S, 'why') ? `<span class="warn">💤 ${idle} dias parado</span>` : ''}</div>
        ${!done && b.why && R.neuroOn(S, 'why') ? `<p class="bwhy">💡 ${esc(b.why)}</p>` : ''}
        ${hp && hp.total && !done ? segBar(hp.pct, 'hp') : ''}</div>
       <div class="bbtns">${blk ? `<span class="handle" data-handle="block" data-id="${blk.id}" title="Segure e arraste">⠿</span>` : ''}<button class="icon-btn" data-act="boss-toggle" data-id="${b.id}" aria-label="${done ? 'Reabrir' : 'Resolver'} boss" title="${done ? 'Reabrir' : 'Resolver na hora'}">${done ? '↺' : '⚔'}</button>${blk ? `<button class="icon-btn" data-act="sort" data-block="${blk.id}" title="Organizar por data">⇅</button>` : ''}</div></div>
      <div class="bbody">${blk && !done ? `<form class="addline" data-form="add-task" data-block="${blk.id}" autocomplete="off"><input class="inp" name="text" placeholder="+ subtarefa do boss  (⚔ mini-boss · ↳ passo)" aria-label="Adicionar subtarefa do boss"></form>` : ''}
        <ul class="tasks">${show.map((t) => taskRow(t, { showPin: true })).join('') || '<div class="empty">sem subtarefas.</div>'}</ul>
        ${blk && !done ? revBtn('review-block', `data-id="${blk.id}"`, R.reviewed(blk)) : ''}</div></article>`; // v8.4: BOSS também tem REVISADO
  };
  const col = isCollapsed('g:bs');
  return `<div class="group wide ${col ? 'collapsed' : ''}" data-group="bs"><div class="band" data-act="collapse" data-k="g:bs"><span><span class="chev">${col ? '▸' : '▾'}</span> BOSSES</span><span class="meta">${list.filter((b) => b.st !== 'done').length} em aberto</span></div>
    <details class="bhelp"><summary>❔ como funciona</summary><p>👹 <b>BOSS</b> = uma meta grande, inimigo especial. Não vai pras LISTAS: ele é a própria mãe.<br>❤ <b>Vida (HP)</b> = o que falta fazer nele. Cada item feito é dano; zerou, ele cai (XP + 1🎟).<br>⚔ <b>mini-boss</b> = uma vitória no caminho (vale ${R.C.XP_MINI} XP e solta fogos). ↳ <b>passo</b> = ação pequena embaixo dela.<br>Escreva começando com ⚔ ou &gt;, ou marque o tipo ao editar a tarefa.</p></details>
    <form class="row" data-form="add-boss" autocomplete="off"><input class="inp grow" name="text" placeholder="+ novo boss (ex.: 90 KG SECO)" aria-label="Novo boss"></form>
    ${list.length ? `<div class="mcols">${cols3(list.map(card), bqs ? [] : list.map((b) => R.findBlock(S, b.block)))}</div>` : '<div class="empty">nenhum boss. Dê um nome à meta grande e quebre em subtarefas.</div>'}</div>`;
}

function blockCard(b, ui, opts = {}) {
  const items = S.quests.tasks.filter((t) => t.block === b.id).sort(taskSorter(ui));
  const open = items.filter(R.isOpen), done = items.filter((t) => t.st === 'done'), counted = items.filter((t) => t.st !== 'cancel');
  const shown = ui.showDone || b.st === 'done' ? items : items.filter(visible);
  const show = shown.filter(stalledOff(ui)), stalled = shown.length - show.length; // a conta do bloco (feitas/total) não muda ao ocultar parados
  const dues = open.map((t) => t.due).filter(Boolean).sort();
  const xpLeft = open.reduce((a, t) => a + R.taskXp(S, t).xp, 0) + (b.st === 'done' ? 0 : R.blockXp(b));
  const rev = R.reviewed(b);
  return `<article class="block ${b.st === 'done' ? 'closed' : ''} ${isCollapsed('b:' + b.id) ? 'collapsed' : ''} ${rev ? 'reviewed' : ''}" data-color="${b.st === 'wait' ? 'purple' : b.color}" data-drop-block="${b.id}">
    <div class="bh"><div class="stripe"></div>
      <button class="icon-btn bchev" data-act="collapse" data-k="b:${b.id}" aria-label="Recolher bloco"><span class="chev">${isCollapsed('b:' + b.id) ? '▸' : '▾'}</span></button><div class="bt" data-act="edit-block" data-id="${b.id}"><h3>${esc(b.title)}</h3>
        <div class="bm">${b.color === 'black' && b.st !== 'done' ? moscaMortaHtml('Mosca morta: este bloco está PARADO (o PRIMO lembra dele a cada 7 dias)') : ''}<span>${done.length}/${counted.length}</span>${rev ? `<span class="chip rev" title="Revisado: vale até ${new Date(b.rev + 864e5).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}">👁 REVISADO</span>` : ''}${b.src && S.quests.tasks.find((x) => x.id === b.src) ? `<button class="lnk-dot" data-g="lista" data-act="jump" data-id="${b.src}" title="Esta tarefa também está nas LISTAS. Toque pra ir lá." aria-label="Ir pra tarefa nas listas"></button>` : ''}${b.st === 'done' ? `<span class="good">FECHADO ${fmtDM(b.doneAt)} · +${b.xp}</span>` : `<span>${b.due ? '◆ ' + fmtDM(b.due) : dues[0] ? 'próx. ' + fmtDM(dues[0]) : 'sem prazo'}</span><span class="acc">${fmtN(xpLeft)} XP</span>`}</div>
        ${segBar(counted.length ? done.length / counted.length : 0, 'good sm')}</div>
      <div class="bbtns">${b.st !== 'done' && S.quests.tasks.some((t) => t.block === b.id && R.isOpen(t)) ? `<button class="icon-btn done-all" data-act="done-all" data-id="${b.id}" title="Concluir todas as tarefas deste bloco" aria-label="Concluir tudo">✓</button>` : ''}<span class="handle" data-handle="block" data-id="${b.id}" title="Segure e arraste">⠿</span><button class="icon-btn" data-act="sort" data-block="${b.id}" title="Organizar por data">⇅</button><button class="icon-btn ${pinned.includes(b.id) ? 'on' : ''}" data-act="pin-block" data-id="${b.id}" title="${pinned.includes(b.id) ? 'Tirar do painel da direita' : 'Fixar no painel da direita (fica sempre à mão)'}" aria-label="Fixar bloco">📌</button></div>
    </div>
    <div class="bbody"><form class="addline" data-form="add-task" data-block="${b.id}" autocomplete="off"><input class="inp" name="text" placeholder="+ subtarefa  (> passo · ⚔ mini-boss)" aria-label="Adicionar subtarefa"></form>
      <ul class="tasks">${show.map((t) => taskRow(t, { showPin: true })).join('') || '<div class="empty">sem itens.</div>'}</ul>
      ${!ui.showDone && b.st !== 'done' && items.length > shown.length ? `<button class="more" data-act="toggle-done">✓ ${items.length - shown.length} feitas · mostrar</button>` : ''}
      ${stalled ? `<button class="more" data-act="toggle-stalled">⬛ ${stalled} parada(s) · mostrar</button>` : ''}
      ${b.st === 'done' ? '' : revBtn('review-block', `data-id="${b.id}"`, rev)}</div>
  </article>`;
}

/** `g` = tipo-base (bd, tr, cap, gs). `win` = janela criada pelo dono (só os blocos guardados nela) */
function group(g, ui, win = null) {
  const blocks = R.tabBlocks(S, win ? 'w:' + win.id : g).sort(sortOrd);
  const qs = qsortOf(ui, win ? 'w:' + win.id : g), active = sortBlocks(blocks.filter(stalledOff(ui)), qs); // v7.7: ordenado = em sequência nas 3 colunas (a coluna guardada vale sem ordenar)
  // v9.5 (pedido do dono): toda janela tem no topo a linha de escrever (pergunta o dia e o bloco), o ORGANIZAR e o 🔥 das urgentes
  const key = win ? 'w:' + win.id : g, urg = S.quests.tasks.filter((t) => t.block && R.isOpen(t) && t.st !== 'wait' && t.color === 'red' && R.catOf(S, t) === key).length;
  return `<div class="group" data-group="${g}">
    <div class="todas-top"><form class="addline todas-add" data-form="win-add" data-win="${key}" autocomplete="off"><input class="inp" name="text" placeholder="+ escrever (Enter: tarefa ou bloco novo, o app pergunta o dia e onde)" aria-label="Nova tarefa ou bloco nesta janela"></form><button class="btn sm" data-act="organizar" title="Dar prazo pro que está sem">🗂 ORGANIZAR</button><button class="btn sm ${urg ? 'urg-n' : ''}" data-act="urg-open" title="As URGENTES (vencem até amanhã)">🔥 ${urg}</button></div>
    ${active.length ? `<div class="mcols">${cols3(active.map((b) => blockCard(b, ui)), qs ? [] : active)}</div>` : '<div class="empty">nenhum bloco.</div>'}
    ${blocks.length > active.length ? `<button class="more" data-act="toggle-stalled">⬛ ${blocks.length - active.length} parado(s) · mostrar</button>` : ''}</div>`;
}


export function filaCard(td) {
  const q = R.deadlineQueue(S, td); // v6.1: completa (antes eram só 12); o cartão rola
  const where = (t) => (t.block ? R.findBlock(S, t.block)?.title : R.areaName(t.area)) || '';
  // v8.3 (pedido do dono): os RITUAIS dos próximos 14 dias também entram na fila, na ordem da data (são coisas a fazer)
  const rits = (S.core.rituals || []).map((r) => ({ r, s: R.ritualStatus(r, td) })).filter((x) => x.s.next && x.s.left != null && x.s.left <= 14);
  const rows = [...q.map((t) => ({ t, k: t.due || '9999' })), ...rits.map((x) => ({ ...x, k: x.s.next }))].sort((a, b) => a.k.localeCompare(b.k));
  const taskLi = (t) => `<div class="li" data-act="jump" data-id="${t.id}" data-list="${R.listOf(t, td)}" style="cursor:var(--cur-hand,pointer)"><div class="lt">${t.st === 'doing' ? '▶ ' : ''}${t.prio ? '<b class="bad">!</b> ' : ''}${esc(t.text.replace(/\s*\(\d+\s*XP\)/i, ''))}<small>${esc(where(t))}</small></div><div class="row" style="flex-wrap:nowrap;gap:4px">${((m) => moscasHtml(m.n, m.title))(R.moscasOf(S, t, td))}${dueChip(t.due, false, true)}</div></div>`;
  const ritLi = (r, st) => { const pg = R.pragaOf(S, r.id); return `<div class="li rit" data-rit="${r.id}" ${pg ? `data-praga="${pg.phase}"` : ''} data-act="jump-rit" data-id="${r.id}" style="cursor:var(--cur-hand,pointer)" title="Ir até o ritual"><div class="lt">${esc(r.name)}<small>ritual${st.plan ? ' · dia marcado' : ''}</small></div><div class="row" style="flex-wrap:nowrap;gap:4px">${((m) => moscasHtml(m.n, m.title))(R.moscasRit(r))}<span class="chip ${st.left < 0 ? 'late' : st.left <= 1 ? 'week' : 'rit'}">${esc(st.label)}</span></div></div>`; };
  return `<div class="card fila-q"><header><h2 title="Tudo que tem prazo, do mais perto pro mais longe (rituais incluídos)">⏰ Fila de prazos</h2><span class="meta">${rows.length}</span></header>
    <div class="list">${rows.map((x) => (x.t ? taskLi(x.t) : ritLi(x.r, x.s))).join('') || '<div class="empty">nenhuma tarefa com prazo.</div>'}</div></div>`;
}

export function legendHtml() {
  return `    <table class="legend" style="margin-top:10px">
      <tr><td>✓</td><td>feito: ganha o XP (e às vezes um baú de loot)</td></tr>
      <tr><td>▶</td><td>fazendo agora: sobe pro topo da fila</td></tr>
      <tr><td>…</td><td>aguardando alguém (laranja): sai da conta de atrasadas</td></tr>
      <tr><td>✉ 🔁</td><td>vai e volta: concluiu a rodada, aguarda retorno. ↩ voltou = nova rodada · ✓ aprovado = encerra (+20)</td></tr>
      <tr><td>✕</td><td>cancelada: sem XP e sem punição</td></tr>
      <tr><td>!</td><td>prioridade: topo da fila e da agenda</td></tr>
      <tr><td>⭐</td><td>chata/adiada: XP x2 (escreva ⭐ no texto)</td></tr>
      <tr><td>🛡</td><td>casa/família: vale 50</td></tr>
      <tr><td>💰</td><td>dinheiro: x1,5 (TRABALHO e CAPTAÇÃO já têm). No título do bloco, 3000💰 = valor do projeto: quando fecha, o app pergunta se a sua metade (1500) entrou no baú de ouro. "1900💰 / MES (DIA 05)" = recorrente: todo dia 5 ele pergunta</td></tr>
      <tr><td>(60XP)</td><td>no texto: define o valor da tarefa</td></tr>
      <tr><td>⚔ ↳</td><td>⚔ mini-boss = a vitória · ↳ passo (escreva > no começo) = ${R.C.XP_STEP} XP; todos os ↳ feitos marcam o ⚔ sozinho</td></tr>
      <tr><td>📅 🐦</td><td>no prazo x1,5 · 2+ dias antes x2 · atrasou = sem bônus</td></tr>
      <tr><td>🟥🟨🟩⬛</td><td>cor do bloco: urgente · fazendo · estável · parado</td></tr>
      <tr><td>LISTA</td><td>subtarefa ${R.C.XP_SUB} · lista ${R.C.XP_LIST} · fechar bloco: breakdown 100 · 🎯 meta 200 · captação 150 · trabalho 300</td></tr>
    </table>`;
}

function goldCard(td) {
  const prs = R.goldPrompts(S, td);
  if (!prs.length) return '';
  return `<div class="card" style="background:var(--warn-soft)"><header><h2>💰 Carteira</h2></header>${prs.map((p) => `<div class="li"><div class="lt"><b>${esc(p.title)}</b><small>${esc(p.label)} · sua metade</small></div>
    <div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn sm pri" data-act="gold-yes" data-key="${esc(p.key)}">RECEBI ${fmtN(p.amount)}</button><button class="btn sm" data-act="gold-later" data-key="${esc(p.key)}">AINDA NÃO</button></div></div>`).join('')}</div>`;
}

// ───── bloco fixado no painel da direita (preferência deste aparelho) ─────
const PIN_KEY = 'gamify-ui:pinblock';
// v7.5: VÁRIOS post-its (até PIN_MAX blocos fixados). Antes era um id só; o formato antigo (texto) vira lista sozinho.
const PIN_MAX = 4;
let pinned = (() => { try { const v = localStorage.getItem(PIN_KEY); if (!v) return []; return v.startsWith('[') ? JSON.parse(v) : [v]; } catch { return []; } })();
export function togglePin(id) {
  pinned = pinned.includes(id) ? pinned.filter((x) => x !== id) : [...pinned, id].slice(-PIN_MAX);
  try { if (pinned.length) localStorage.setItem(PIN_KEY, JSON.stringify(pinned)); else localStorage.removeItem(PIN_KEY); } catch { /* */ }
  return pinned.includes(id);
}
export const pinnedBlockIds = () => pinned;
export function sidePanel(ui) {
  const td = today(), tot = R.totals(S), st = R.dayStatus(S, td), al = R.alerts(S, td), ch = S.core.chapter || {};
  const open = R.openTasks(S), over = open.filter((t) => t.due && t.due < td).length, hoje = open.filter((t) => t.due === td).length;
  const w7 = open.filter((t) => t.due > td && t.due <= addDays(td, 7)).length;
  const left = ch.until ? diffDays(td, ch.until) : null;
  // v3.5: cada cartão do painel pode ser recolhido (toque no título), arrastado (alça ⠿) e escondido (⚙ PERSONALIZAR)
  // um bloco fixado (📌) fica sempre no topo do painel, à mão enquanto você mexe no resto
  // v6: o bloco fixado virou um post-it flutuante (postit.js), visível em todas as abas (v7.5: vários)
  return `<aside class="side">${primoHead()}${arrange('side', [
    // v8 (pedido do dono, sem redundância): o relógio do corpo entrou no FOCO AGORA (a fase do dia e a dica); ele não sugere mais tarefa
    // v7.2: STATUS DO DIA (em ícones) e COMANDOS moram dentro do cartão do PRIMO
    ['primo', '🔥 PRIMO', companionCard()],
    ['ouro', '💰 Carteira (quando tem)', goldCard(td)],
    ['fila', '⏰ Fila de prazos', filaCard(td)],
  ])}
    <p class="meta" style="text-align:center">${weekday(td) === 5 ? '⚠ sexta-feira: o dia em que mais se quebra sequência. marque os hábitos!' : ''}</p>
  </aside>`;
}

/** janelas do QUESTS: LISTAS é a janela mãe; depois as fixas e, por fim, as que você criou (chave "w:<id>") */
const qtAll = () => [['boss', R.TAB_NAMES.boss], ['bd', R.GROUPS.bd.short], ['tr', R.GROUPS.tr.short], ['cap', R.GROUPS.cap.short], ['gs', R.GROUPS.gs.short], ...R.windows(S).map((w) => ['w:' + w.id, w.name])];
/** a ordem das janelas é sua: arraste um nome de janela sobre outro (PC). LISTAS fica sempre na frente: é dela que tudo deriva. */
function qtabs() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('gamify-ui:qtabs')) || []; } catch { /* */ }
  const all = qtAll(), ids = all.map((x) => x[0]), order = [...saved.filter((i) => ids.includes(i)), ...ids.filter((i) => !saved.includes(i))];
  return order.map((id) => all.find((x) => x[0] === id)).filter(Boolean); // v9.5: a TODAS saiu (só as janelas)
}
// ───────────── v5.14: relógio do corpo e toque de recolher (neurociência) ─────────────
const CURFEW_KEY = 'gamify-ui:curfew-off';
/** "ver as listas mesmo assim" vale 15 minutos */
const curfewOff = () => { try { return +localStorage.getItem(CURFEW_KEY) > Date.now(); } catch { return false; } };
export const curfewSkip = () => { try { localStorage.setItem(CURFEW_KEY, String(Date.now() + 15 * 60e3)); } catch { /* */ } };
export const inCurfew = () => R.neuroOn(S, 'curfew') && ['recolher', 'sono'].includes(R.bodyClock(S).key) && !curfewOff();
/** depois da hora: no lugar das listas, o fechamento do dia (o que fiz, o que fica pra amanhã, hábitos) */
function closingView() {
  const td = today(), c = R.bodyClock(S), done = S.quests.tasks.filter((t) => t.st === 'done' && t.doneAt === td);
  const xp = R.idx(S).xpByDay[td] || 0, tom = R.openTasks(S).filter((t) => !t.block && t.due === addDays(td, 1));
  const habits = (S.core.habits || []).filter((h) => !S.marks.days[td]?.h?.[h.id]).length;
  return `<div class="closing card"><header><h2>${c.icon} ${c.name}: fechamento do dia</h2></header>
    <p class="clock-tip">${esc(c.tip)}</p>
    <div class="closing-grid">
      <div><h3>✓ Hoje você fez ${done.length} · +${fmtN(xp)} XP</h3><ul class="tasks">${done.slice(0, 8).map((t) => `<li class="task done"><span></span><div class="txt">${esc(t.text.replace(/\s*\(\d+\s*XP\)/i, ''))}</div></li>`).join('') || '<div class="empty">nada concluído hoje. Amanhã é outro jogo.</div>'}</ul></div>
      <div><h3>☀ Amanhã · ${tom.length}</h3><ul class="tasks">${tom.slice(0, 6).map((t) => `<li class="task"><span></span><div class="txt">${esc(t.text.replace(/\s*\(\d+\s*XP\)/i, ''))}</div></li>`).join('') || '<div class="empty">nada marcado pra amanhã.</div>'}</ul>
        ${habits ? `<p class="meta">✓ ${habits} hábito(s) de hoje sem marcar · <a href="#survival">marcar agora</a></p>` : '<p class="meta">✓ hábitos de hoje marcados.</p>'}</div>
    </div>
    <p class="meta">😴 Deitar às ${c.bed} e acordar às ${c.wake} = ${String(c.sleepH).replace('.', ',')} h de sono. ${c.sleepH < 7 ? '<b class="bad">Menos de 7 h: ajuste em PERKS.</b>' : 'Dentro dos 7 a 9 h.'}</p>
    <div class="row"><button class="btn sm pri" data-act="plan-tomorrow">🌙 PLANEJAR AMANHÃ</button><button class="btn sm ghost" data-act="curfew-skip">VER AS LISTAS MESMO ASSIM (15 MIN)</button></div></div>`;
}

export function viewQuests(ui) {
  if (inCurfew()) return `<div class="quests"><div class="board">${closingView()}</div>${sidePanel(ui)}</div>`;
  const QTABS = qtabs();
  const tab = QTABS.some(([k]) => k === ui.qtab) ? ui.qtab : 'bd'; // v9.5: sem a TODAS, a janela padrão é a GERAL
  const win = tab.startsWith('w:') ? R.windows(S).find((w) => 'w:' + w.id === tab) : null;
  const n = { listas: S.quests.tasks.filter((t) => !t.block && !t.mother && !t.link && R.isOpen(t)).length, boss: S.quests.bosses.filter((b) => b.st !== 'done').length };
  for (const [k] of QTABS) if (!(k in n)) n[k] = R.tabBlocks(S, k).filter((b) => b.st !== 'done').length;
  // RECOLHER TUDO: vale para o que está na janela aberta (listas, blocos ou bosses)
  const ckeys = tab === 'boss' ? S.quests.bosses.map((b) => 'b:' + (b.block || b.id))
    : R.tabBlocks(S, tab).filter(stalledOff(ui)).map((b) => 'b:' + b.id);
  // v6.4: também recolhe MISSÕES DA SEMANA e BOSS DO CAPÍTULO (cartões do topo)
  ckeys.push(new Date().getDay() === 0 ? 'c:quests:missoes-da-proxima-semana' : 'c:quests:missoes-da-semana'); if (R.chapterBoss(S)) ckeys.push('c:quests:boss-do-capitulo');
  const qs = qsortOf(ui, tab);
  const allCol = ckeys.length > 0 && ckeys.every(isCollapsed); // v6.1: o botão voltou (pedido do dono); tocar de novo na janela aberta continua sendo o memento mori
  const sem = soltas().length; // v9.5: tarefas sem casa (eram da TODAS): o app pergunta pra onde vão
  const mudanca = sem ? `<div class="banner info mud-b">📦 <b>${sem} tarefa${sem === 1 ? '' : 's'} sem casa</b> (eram da janela TODAS, que saiu). <button class="btn sm pri" data-act="mudanca">ESCOLHER PRA ONDE VÃO</button></div>` : '';
  const body = tab === 'boss' ? bossPanel(ui)
    : group(win ? win.base : tab, ui, win).replace('class="group ', 'class="group wide ');
  return `<div class="quests"><div class="board">
      <div class="band qbar"><div class="seg">${QTABS.map(([k, t]) => `<button class="${tab === k ? 'on' : ''} ${k === 'listas' ? 'mae' : 'filha'} ${R.tabReviewed(S, k) ? 'allrev' : ''}" data-act="qtab" data-tab="${k}" ${k === 'listas' ? 'title="Janela mãe: tudo passa por aqui"' : 'draggable="true" title="arraste pra mudar a ordem"'}>${k === 'listas' ? '◆ ' : ''}${esc(t)}${n[k] != null ? ' · ' + n[k] : ''}</button>`).join('')}<button class="qadd" data-act="win-new" title="Criar uma janela nova">＋</button></div>
        <div class="qtools">${win ? `<button class="btn sm ghost" data-act="win-edit" data-id="${win.id}" title="Renomear ou apagar esta janela (${esc(win.name)})">✎</button>` : ''}<button class="btn sm ghost qcol" data-act="collapse-all" title="Recolhe ou abre tudo desta janela de uma vez">${allCol ? '▾ ABRIR' : '▸ RECOLHER'}</button>
        <details class="qmenu"><summary class="btn sm ghost qham" title="Abrir/recolher, ordenar, concluir e o que aparece">≡${qs ? `<small class="qh-m">${qs === 'urg' ? 'URGÊNCIA' : 'DATA'}</small>` : ''}${ui.showDone || ui.showStalled ? '<small class="qh-m">👁</small>' : ''}</summary><div class="qpop">
            <small class="qpop-h">MOSTRAR</small>
            <button class="btn sm ${ui.showDone ? 'pri' : 'ghost'}" data-act="toggle-done">${ui.showDone ? '☑' : '☐'} FEITAS</button>
            <button class="btn sm ${ui.showStalled ? 'pri' : 'ghost'}" data-act="toggle-stalled" title="⬛ parados: blocos e tarefas com a cor PARADO">${ui.showStalled ? '☑' : '☐'} PARADOS</button>
            <small class="qpop-h">Dica: Shift + clique no ☐ conclui um intervalo inteiro${matchMedia('(pointer: coarse)').matches ? ' · no celular: segure numa tarefa e arraste o dedo' : ''}</small></div></details></div></div>
      ${ui.mm ? mementoCard(ui) : `${chapterDue()}${mudanca}${tresCard()}${topStrip()}${body}`}
    </div>${sidePanel(ui)}</div>`;
}

function chapterDue() {
  const ch = S.core.chapter || {}, td = today();
  return ch.until && ch.until < td ? `<div class="banner info" style="margin-bottom:12px">📖 O capítulo <b>${esc(ch.title)}</b> venceu em ${fmtDM(ch.until)}. Em <a href="#regras">PERKS AND RULES</a> troque o número, o título, a missão e a data pra começar o próximo (a carta do capítulo é guardada).</div>` : '';
}
// v9.0 (pedido do dono): o FOCO AGORA saiu (confundia: o que fazer está na FILA DE PRAZOS e no FILTRO). As dicas do relógio do corpo viraram fala do PRIMO (primo.js → primoTip).
/** v6 MEMENTO MORI: tocar de novo na janela aberta recolhe tudo e mostra o tempo passando (lembra de parar de procrastinar) */
const MM_LINES = ['Memento mori: o tempo não volta. Faça hoje o que importa.', 'Cada minuto aqui é um minuto a menos lá fora. Escolha UMA coisa.', 'O dia está passando agora, enquanto você lê isto.', 'Você não tem todo o tempo do mundo. Tem o de hoje.'];
function mementoCard(ui) {
  const c = R.bodyClock(S), n = R.neuro(S), now = new Date(), wake = R.hm(n.wake), bed = R.hm(n.bed), t = now.getHours() * 60 + now.getMinutes();
  const awake = (bed - wake + 1440) % 1440 || 960, gone = Math.min(awake, (t - wake + 1440) % 1440), pct = gone / awake;
  const h = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
  // v7.1: o FOCO AGORA é o grande (é o que fazer com o tempo que resta); o relógio fica pequeno, embaixo
  return `<div class="memento v71 card" data-act="mm-off" title="Toque pra voltar">
    <div class="mm-row"><span class="mm-art">${px('hourglass', 56)}</span>
    <div class="mm-col"><div class="mm-clock" data-clock>${now.toLocaleTimeString('pt-BR')}</div>
      <div class="mm-bar">${segBar(pct, 'sm')}</div>
      <p class="mm-k">${c.key === 'sono' ? 'Hora de dormir.' : `Já se foi ${Math.round(pct * 100)}% do seu dia acordado. Faltam <b>${h(Math.max(0, awake - gone))}</b> pra dormir.`}</p>
      <p class="mm-l">${MM_LINES[now.getDate() % MM_LINES.length]}</p><p class="meta">toque pra voltar</p></div></div></div>`;
}
function topStrip() {
  const sunday = new Date().getDay() === 0, wm = R.weeklyMissions(S, sunday ? addDays(today(), 1) : today()), boss = R.chapterBoss(S);
  return `<div class="topstrip">
    <div class="card"><header><h2>📌 Missões da ${sunday ? 'próxima semana' : 'semana'}</h2><span class="meta" title="cada uma vale x1,5 · as 3 feitas = +100 XP e +1 🎟">${wm.done}/3 <button class="btn sm" data-act="weekly-pick">ESCOLHER</button></span></header>
      ${wm.tasks.length ? `<ul class="tasks">${wm.tasks.map((t) => taskRow(t, { go: true, sub: t.block ? R.findBlock(S, t.block)?.title : R.areaName(t.area) })).join('')}</ul>` : '<div class="empty">Escolha as 3 pedras grandes da semana. O resto é backlog, sem culpa.</div>'}</div>
    ${boss ? `<div class="card boss-r"><header><h2>👹 Boss do capítulo</h2><span class="meta">${esc(boss.label)} <span class="row" style="gap:4px;justify-content:flex-end;margin-top:4px"><button class="btn sm pri" data-act="save-money">💰 GUARDEI</button>${boss.got > 0 ? '<button class="btn sm" data-act="take-money" title="Tirei dinheiro do que estava guardado: o boss recupera vida">↩ RETIREI</button>' : ''}</span></span></header>
      <div class="num" style="font-size:12px">R$ ${fmtN(boss.left)} <span class="meta">de vida</span></div>${segBar(boss.pct, 'hp')}<p class="meta" style="margin:6px 0 0">o que você guarda dá dano · R$ ${fmtN(boss.got)} guardados de R$ ${fmtN(boss.target)}${boss.out ? ` · <span class="bad">R$ ${fmtN(boss.out)} retirados</span>` : ''}${boss.moves.length ? ` · <a href="#" data-act="money-log">histórico (${boss.moves.length})</a>` : ''}</p></div>` : ''}
  </div>`;
}
