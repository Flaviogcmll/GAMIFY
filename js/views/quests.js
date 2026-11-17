// QUESTS — a casa e o painel (como na planilha): listas + BOSS em cima, blocos embaixo, painel à direita.
import { S } from '../store.js';
import * as R from '../rules.js';
import { esc, fmtDM, fmtN, today, diffDays, weekday, addDays } from '../util.js';
import { taskRow, segBar, statusChips, dueChip } from '../ui.js';
import { px } from '../icons.js';
import { isCollapsed, companionCard } from '../v3.js';
import { arrange, inColumns } from '../v35.js';
import { overflowBar } from '../bujo.js';

const sortOrd = (a, b) => a.ord - b.ord;
/** blocos em 3 colunas fixas (o bloco i fica sempre na coluna i % 3: abrir um bloco só empurra os de baixo dele) */
const cols3 = (items) => inColumns(items.map((h, i) => `<div class="mitem" style="order:${i}">${h}</div>`), 3);
/** sem MOSTRAR FEITAS: some tudo que foi feito ou cancelado (o ↩ desfaz um clique errado) */
const visible = (t) => R.isOpen(t) || t.st === 'sent';
/** botão REVISADO (selo de 24 h) no fim de uma lista ou bloco */
const revBtn = (act, attr, on) => `<button class="rev-btn ${on ? 'on' : ''}" data-act="${act}" ${attr} title="${on ? 'Tirar o selo de revisado' : 'Olhei e está tudo em ordem. O selo dura 24 horas.'}">${on ? '👁 revisado · tirar' : '👁 marcar como revisado'}</button>`;
/** ⬛ parado: só aparece com MOSTRAR PARADOS ligado */
const stalledOff = (ui) => (t) => t.color !== 'black' || ui.showStalled;

/** dica de cada lista (aparece no "+ adicionar") */
const LIST_HINT = { hoje: 'pra hoje', amanha: 'pra amanhã', semana: 'pra esta semana', depois: 'pra depois', sem: 'sem prazo', wait: 'aguardando alguém' };
function listCard(area, ui) {
  const td = today(), wait = area === 'wait';
  const own = S.quests.tasks.filter((t) => !t.block && t.area === area);
  // AGUARDANDO mostra só as tarefas principais (as das LISTAS). Subtarefas em espera ficam dentro do bloco delas, na janela delas.
  // as tarefas andam pelas listas com o tempo: dentro de cada lista, a ordem é a da data (a mais próxima em cima)
  const every = [...own].sort(area === 'wait' || area === 'sem' ? sortOrd : (a, b) => (a.due || '9').localeCompare(b.due || '9') || sortOrd(a, b));
  const all = every.filter(stalledOff(ui)), stalled = every.length - all.length;
  const open = all.filter(visible), show = ui.showDone ? all : open, nHidden = all.length - open.length;
  const late = area === 'hoje' ? open.filter((t) => t.due && t.due < td).length : 0;
  const sub = (t) => (wait ? [R.waitingOn(S, t).label && '⏳ ' + R.waitingOn(S, t).label, t.link && R.findBlock(S, t.link)?.st === 'wait' && 'o bloco dela está aguardando'].filter(Boolean).join(' · ') : '');
  const rv = R.listReviewed(S, area);
  return `<section class="list-card ${isCollapsed('l:' + area) ? 'collapsed' : ''} ${rv ? 'reviewed' : ''}" data-list="${area}" data-drop-area="${area}"><header><h2 data-act="collapse" data-k="l:${area}" style="cursor:pointer"><span class="chev">${isCollapsed('l:' + area) ? '▸' : '▾'}</span> ${R.AREAS[area]}</h2>
      <span class="row" style="gap:4px"><span class="meta">${open.length}${late ? ` · <span class="bad">${late} atrasada${late > 1 ? 's' : ''}</span>` : ''}</span><button class="icon-btn" data-act="sort" data-area="${area}" title="Organizar por data">⇅</button></span></header>
    ${area === 'hoje' ? overflowBar() : ''}<ul class="tasks">${show.map((t) => taskRow(t, { list: true, sub: sub(t) })).join('')}${show.length ? '' : `<div class="empty">${wait ? 'ninguém te segurando. 👏' : 'vazio.'}</div>`}</ul>
    ${!ui.showDone && nHidden ? `<button class="more" data-act="toggle-done">✓ ${nHidden} feitas · mostrar</button>` : ''}
    ${stalled ? `<button class="more" data-act="toggle-stalled">⬛ ${stalled} parada(s) · mostrar</button>` : ''}
    <form class="addline" data-form="add-task" data-area="${area}" autocomplete="off"><input class="inp" name="text" placeholder="+ adicionar ${LIST_HINT[area]}" aria-label="Adicionar em ${R.AREAS[area]}"></form>
    ${revBtn('review-list', `data-k="${area}"`, rv)}
  </section>`;
}

function bossPanel(ui) {
  const ordOf = (b) => R.findBlock(S, b.block)?.ord ?? b.ord, list = [...S.quests.bosses].sort((a, z) => ordOf(a) - ordOf(z)).sort((a, z) => (a.st === 'done') - (z.st === 'done'));
  const card = (b) => {
    const hp = R.bossHp(S, b), blk = hp?.block, done = b.st === 'done', paused = R.bossPaused(b), idle = R.bossIdle(S, b);
    const items = blk ? S.quests.tasks.filter((t) => t.block === blk.id).sort(sortOrd) : [];
    const show = ui.showDone || done ? items : items.filter(visible);
    const ck = blk?.id || b.id;
    return `<article class="block boss-b ${done ? 'closed' : ''} ${paused ? 'paused' : ''} ${isCollapsed('b:' + ck) ? 'collapsed' : ''}" data-color="red" ${blk ? `data-drop-block="${blk.id}"` : ''}>
      <div class="bh"><div class="stripe"></div><div class="bt" data-act="edit-boss" data-id="${b.id}"><h3>👹 ${esc(b.text.replace(/:\s*[\d.]+\s*XP.*$/i, ''))}</h3>
        <div class="bm"><span class="acc">${fmtN(b.xp)} XP + 1🎟</span>${hp && hp.total ? `<span>HP ${fmtN(hp.left)}/${fmtN(hp.total)}</span>` : '<span>quebre em subtarefas ↓</span>'}${done ? `<span class="good">DERROTADO ${fmtDM(b.doneAt)}</span>` : paused ? `<span class="info">⏸ volta ${fmtDM(b.pause)}</span>` : b.st === 'wait' ? '<span>⏳ aguardando</span>' : idle >= R.BOSS_IDLE_DAYS && R.neuroOn(S, 'why') ? `<span class="warn">💤 ${idle} dias parado</span>` : ''}</div>
        ${!done && b.why && R.neuroOn(S, 'why') ? `<p class="bwhy">💡 ${esc(b.why)}</p>` : ''}
        ${hp && hp.total && !done ? segBar(hp.pct, 'hp') : ''}</div>
       <div class="bbtns">${blk ? `<span class="handle" data-handle="block" data-id="${blk.id}" title="Segure e arraste">⠿</span>` : ''}<button class="icon-btn" data-act="boss-toggle" data-id="${b.id}" aria-label="${done ? 'Reabrir' : 'Derrotar'} boss" title="${done ? 'Reabrir' : 'Derrotar na hora'}">${done ? '↺' : '⚔'}</button><button class="icon-btn" data-act="collapse" data-k="b:${ck}" aria-label="Recolher boss"><span class="chev">${isCollapsed('b:' + ck) ? '▸' : '▾'}</span></button></div></div>
      <div class="bbody"><ul class="tasks">${show.map((t) => taskRow(t, { showPin: true })).join('') || '<div class="empty">sem subtarefas.</div>'}</ul>
        ${blk && !done ? `<form class="addline" data-form="add-task" data-block="${blk.id}" autocomplete="off"><input class="inp" name="text" placeholder="+ subtarefa do boss  (⚔ mini-boss · ↳ passo)" aria-label="Adicionar subtarefa do boss"></form>` : ''}</div></article>`;
  };
  const col = isCollapsed('g:bs');
  return `<div class="group wide ${col ? 'collapsed' : ''}" data-group="bs"><div class="band" data-act="collapse" data-k="g:bs"><span><span class="chev">${col ? '▸' : '▾'}</span> BOSSES</span><span class="meta">${list.filter((b) => b.st !== 'done').length} em aberto</span></div>
    <details class="bhelp"><summary>❔ como funciona</summary><p>👹 <b>BOSS</b> = uma meta grande, inimigo especial. Não vai pras LISTAS: ele é a própria mãe.<br>❤ <b>Vida (HP)</b> = o que falta fazer nele. Cada item feito é dano; zerou, ele cai (XP + 1🎟).<br>⚔ <b>mini-boss</b> = uma vitória no caminho (vale ${R.C.XP_MINI} XP e solta fogos). ↳ <b>passo</b> = ação pequena embaixo dela.<br>Escreva começando com ⚔ ou &gt;, ou marque o tipo ao editar a tarefa.</p></details>
    <form class="row" data-form="add-boss" autocomplete="off"><input class="inp grow" name="text" placeholder="+ novo boss (ex.: 90 KG SECO)" aria-label="Novo boss"></form>
    ${list.length ? `<div class="mcols">${cols3(list.map(card))}</div>` : '<div class="empty">nenhum boss. Dê um nome à meta grande e quebre em subtarefas.</div>'}</div>`;
}

function blockCard(b, ui, opts = {}) {
  const items = S.quests.tasks.filter((t) => t.block === b.id).sort(sortOrd);
  const open = items.filter(R.isOpen), done = items.filter((t) => t.st === 'done'), counted = items.filter((t) => t.st !== 'cancel');
  const shown = ui.showDone || b.st === 'done' ? items : items.filter(visible);
  const show = shown.filter(stalledOff(ui)), stalled = shown.length - show.length; // a conta do bloco (feitas/total) não muda ao ocultar parados
  const dues = open.map((t) => t.due).filter(Boolean).sort();
  const xpLeft = open.reduce((a, t) => a + R.taskXp(S, t).xp, 0) + (b.st === 'done' ? 0 : R.blockXp(b));
  const rev = R.reviewed(b);
  return `<article class="block ${b.st === 'done' ? 'closed' : ''} ${isCollapsed('b:' + b.id) ? 'collapsed' : ''} ${rev ? 'reviewed' : ''}" data-color="${b.st === 'wait' ? 'purple' : b.color}" data-drop-block="${b.id}">
    <div class="bh"><div class="stripe"></div>
      <div class="bt" data-act="edit-block" data-id="${b.id}"><h3>${esc(b.title)}</h3>
        <div class="bm"><span>${done.length}/${counted.length}</span>${rev ? `<span class="chip rev" title="Revisado: vale até ${new Date(b.rev + 864e5).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}">👁 REVISADO</span>` : ''}${b.src && S.quests.tasks.find((x) => x.id === b.src) ? `<button class="lnk-dot" data-g="lista" data-act="jump" data-id="${b.src}" title="Esta tarefa também está nas LISTAS. Toque pra ir lá." aria-label="Ir pra tarefa nas listas"></button>` : ''}${b.st === 'done' ? `<span class="good">FECHADO ${fmtDM(b.doneAt)} · +${b.xp}</span>` : `<span>${b.due ? '◆ ' + fmtDM(b.due) : dues[0] ? 'próx. ' + fmtDM(dues[0]) : 'sem prazo'}</span><span class="acc">${fmtN(xpLeft)} XP</span>`}</div>
        ${segBar(counted.length ? done.length / counted.length : 0, 'good sm')}</div>
      <div class="bbtns"><span class="handle" data-handle="block" data-id="${b.id}" title="Segure e arraste">⠿</span><button class="icon-btn" data-act="sort" data-block="${b.id}" title="Organizar por data">⇅</button><button class="icon-btn ${opts.pinned ? 'on' : ''}" data-act="pin-block" data-id="${b.id}" title="${opts.pinned ? 'Tirar do painel da direita' : 'Fixar no painel da direita (fica sempre à mão)'}" aria-label="Fixar bloco">📌</button><button class="icon-btn" data-act="collapse" data-k="b:${b.id}" aria-label="Recolher bloco"><span class="chev">${isCollapsed('b:' + b.id) ? '▸' : '▾'}</span></button></div>
    </div>
    <div class="bbody"><ul class="tasks">${show.map((t) => taskRow(t, { showPin: true })).join('') || '<div class="empty">sem itens.</div>'}</ul>
      ${!ui.showDone && b.st !== 'done' && items.length > shown.length ? `<button class="more" data-act="toggle-done">✓ ${items.length - shown.length} feitas · mostrar</button>` : ''}
      ${stalled ? `<button class="more" data-act="toggle-stalled">⬛ ${stalled} parada(s) · mostrar</button>` : ''}
      <form class="addline" data-form="add-task" data-block="${b.id}" autocomplete="off"><input class="inp" name="text" placeholder="+ subtarefa  (> passo · ⚔ mini-boss)" aria-label="Adicionar subtarefa"></form>
      ${b.st === 'done' ? '' : revBtn('review-block', `data-id="${b.id}"`, rev)}</div>
  </article>`;
}

/** `g` = tipo-base (bd, tr, cap, gs). `win` = janela criada pelo dono (só os blocos guardados nela) */
function group(g, ui, win = null) {
  const blocks = R.tabBlocks(S, win ? 'w:' + win.id : g).sort(sortOrd);
  const active = blocks.filter(stalledOff(ui));
  return `<div class="group ${isCollapsed('g:' + g) ? 'collapsed' : ''}" data-group="${g}"><div class="band" data-act="collapse" data-k="g:${g}"><span><span class="chev">${isCollapsed('g:' + g) ? '▸' : '▾'}</span> ${win ? esc(win.name) : R.GROUPS[g].name}</span><span class="meta">${blocks.filter((b) => b.st !== 'done').length} blocos${win ? ` · funciona como ${esc(R.GROUPS[g].short)} <button class="btn sm ghost" data-act="win-edit" data-id="${win.id}" title="Renomear, mudar o tipo ou apagar esta janela">✎</button>` : ''}</span></div>
    <form class="row" data-form="add-block" data-group="${g}" ${win ? `data-win="${win.id}"` : ''} autocomplete="off"><input class="inp grow" name="title" placeholder="+ novo bloco${g === 'bd' ? ' (🎯 meta)' : ' (3000$ · / MES DIA 05)'}" aria-label="Novo bloco"></form>
    ${active.length ? `<div class="mcols">${cols3(active.map((b) => blockCard(b, ui)))}</div>` : '<div class="empty">nenhum bloco.</div>'}
    ${blocks.length > active.length ? `<button class="more" data-act="toggle-stalled">⬛ ${blocks.length - active.length} parado(s) · mostrar</button>` : ''}</div>`;
}

function habitsCard(td) {
  const ev = R.eventOfDay(S, td);
  const m = S.marks.days[td]?.h || {};
  const blanks = S.core.habits.filter((h) => !m[h.id]).length;
  return `<div class="card"><header><h2>Hábitos de hoje</h2><span class="meta">${blanks ? `faltam ${blanks}` : R.isPerfect(S, td) ? '🌟 PERFEITO x2' : 'tudo marcado'} · +${S.marks.days[td]?.xp || 0} XP</span></header>
    <div class="habs">${S.core.habits.map((h) => {
      const v = m[h.id] || '', sk = R.streak(S, h.id, td);
      return `<button class="hab ${v === 'x' ? 'x' : v === '-' ? 'f' : ''} ${ev?.type === 'habit' && ev.habit === h.id ? 'ev' : ''}" data-act="habit" data-d="${td}" data-h="${h.id}" title="${esc(h.name)} · recorde 🏆${R.bestStreak(S, h.id, td)} · ${sk.forged ? 'forjado' : `${sk.total}/66`}"><span class="hi">${h.icon}</span><span class="hn">${esc(h.name.slice(0, 9))}</span><span class="hs">🔥${sk.streak}${sk.mult > 1 ? ' x' + String(sk.mult).replace('.', ',') : ''}</span></button>`;
    }).join('')}
      <button class="hab ${m.rd ? 'x' : ''}" data-act="redemption"><span class="hi">⚔</span><span class="hn">REDENÇÃO</span><span class="hs">+${R.C.RD_XP} · cura</span></button></div>
    <p class="meta" style="margin:8px 0 0">toque: ✓ fiz → – folga → vazio</p></div>`;
}

function filaCard(td) {
  const q = R.deadlineQueue(S, td).slice(0, 12);
  const where = (t) => (t.block ? R.findBlock(S, t.block)?.title : R.areaName(t.area)) || '';
  return `<div class="card"><header><h2>⏰ Fila de prazos</h2><a class="meta" href="#agenda">agenda →</a></header>
    <div class="list">${q.map((t) => `<div class="li" data-act="jump" data-id="${t.id}" data-list="${R.listOf(t, td)}" style="cursor:pointer"><div class="lt">${t.st === 'doing' ? '▶ ' : ''}${t.prio ? '<b class="bad">!</b> ' : ''}${esc(t.text.replace(/\s*\(\d+\s*XP\)/i, ''))}<small>${esc(where(t))}</small></div><div class="row" style="flex-wrap:nowrap">${dueChip(t.due, false, true)}</div></div>`).join('') || '<div class="empty">nenhuma tarefa com prazo.</div>'}</div></div>`;
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
  return `<div class="card" style="background:var(--warn-soft)"><header><h2>💰 Baú de ouro</h2></header>${prs.map((p) => `<div class="li"><div class="lt"><b>${esc(p.title)}</b><small>${esc(p.label)} · sua metade</small></div>
    <div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn sm pri" data-act="gold-yes" data-key="${esc(p.key)}">RECEBI ${fmtN(p.amount)}</button><button class="btn sm" data-act="gold-later" data-key="${esc(p.key)}">AINDA NÃO</button></div></div>`).join('')}</div>`;
}

// ───── bloco fixado no painel da direita (preferência deste aparelho) ─────
const PIN_KEY = 'gamify-ui:pinblock';
let pinnedId = (() => { try { return localStorage.getItem(PIN_KEY); } catch { return null; } })();
/** fixa o bloco no painel (ou tira, se já estava); devolve true se ficou fixado */
export function togglePin(id) {
  pinnedId = pinnedId === id ? null : id;
  try { if (pinnedId) localStorage.setItem(PIN_KEY, pinnedId); else localStorage.removeItem(PIN_KEY); } catch { /* */ }
  return !!pinnedId;
}
export function sidePanel(ui) {
  const td = today(), tot = R.totals(S), st = R.dayStatus(S, td), al = R.alerts(S, td), ch = S.core.chapter || {};
  const open = R.openTasks(S), over = open.filter((t) => t.due && t.due < td).length, hoje = open.filter((t) => t.due === td).length;
  const w7 = open.filter((t) => t.due > td && t.due <= addDays(td, 7)).length;
  const left = ch.until ? diffDays(td, ch.until) : null;
  const night = document.documentElement.dataset.mode === 'night';
  // v3.5: cada cartão do painel pode ser recolhido (toque no título), arrastado (alça ⠿) e escondido (⚙ PERSONALIZAR)
  // um bloco fixado (📌) fica sempre no topo do painel, à mão enquanto você mexe no resto
  const pinB = pinnedId && S.quests.blocks.find((x) => x.id === pinnedId && x.st !== 'done');
  return `<aside class="side">${clockCard()}${pinB ? `<div class="pinned">${blockCard(pinB, ui, { pinned: true })}</div>` : ''}${arrange('side', [
    ['status', '🎭 Status do dia', `<div class="card"><header><h2 title="toque num status pra ver o que é">🎭 Status do dia</h2></header><div class="status-line">${statusChips(st, al) || '<span class="meta">nenhum buff nem debuff hoje.</span>'}</div></div>`],
    ['primo', '🔥 PRIMO', companionCard()],
    ['ouro', '💰 Baú de ouro (quando tem)', goldCard(td)],
    ['habitos', '✓ Hábitos de hoje', habitsCard(td)],
    ['comandos', '🎮 Comandos', `<div class="card"><header><h2>🎮 Comandos</h2></header><div class="cmds">
      <button class="btn" data-act="archive-now" title="Arquiva o que já foi feito e recalcula tudo">🔄<span>ATUALIZAR</span></button>
      <button class="btn ${R.tripNow(S) ? 'pri' : ''}" data-act="trip" title="Viagem ou visitas: congela o jogo enquanto você está fora">✈<span>${R.tripNow(S) ? 'VOLTEI' : 'VIAGEM'}</span></button>
      <button class="btn" data-act="rest-day" title="Doença ou dia puxado: os hábitos de hoje viram folga">🏕<span>DESCANSO</span></button>
      <button class="btn" data-act="redemption">${px('sword', 14)}<span>REDENÇÃO</span></button>
      <button class="btn" data-act="sos">${px('sos', 14)}<span>SOS TRAVEI</span></button>
      <button class="btn" data-act="backup-download" title="Baixa um arquivo com todos os seus dados">⬇<span>BACKUP</span></button>
      <button class="btn" data-act="review" title="O PRIMO revisa o dia com você: hábitos de ontem, atrasadas e a primeira de hoje" style="grid-column:1 / -1">☀<span>REVISAR O DIA COM O PRIMO</span></button></div></div>`],
    ['fila', '⏰ Fila de prazos', filaCard(td)],
  ])}
    <p class="meta" style="text-align:center">${weekday(td) === 5 ? '⚠ sexta-feira: o dia em que mais se quebra sequência. marque os hábitos!' : ''}</p>
  </aside>`;
}

/** janelas do QUESTS: LISTAS é a janela mãe; depois as fixas e, por fim, as que você criou (chave "w:<id>") */
const qtAll = () => [['listas', R.TAB_NAMES.listas], ['boss', R.TAB_NAMES.boss], ['bd', R.GROUPS.bd.short], ['tr', R.GROUPS.tr.short], ['cap', R.GROUPS.cap.short], ['gs', R.GROUPS.gs.short], ...R.windows(S).map((w) => ['w:' + w.id, w.name])];
/** a ordem das janelas é sua: arraste um nome de janela sobre outro (PC). LISTAS fica sempre na frente: é dela que tudo deriva. */
function qtabs() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('gamify-ui:qtabs')) || []; } catch { /* */ }
  const all = qtAll(), ids = all.map((x) => x[0]), order = [...saved.filter((i) => ids.includes(i)), ...ids.filter((i) => !saved.includes(i))];
  return ['listas', ...order.filter((i) => i !== 'listas')].map((id) => all.find((x) => x[0] === id));
}
// ───────────── v5.14: relógio do corpo e toque de recolher (neurociência) ─────────────
const CURFEW_KEY = 'gamify-ui:curfew-off';
/** "ver as listas mesmo assim" vale 15 minutos */
const curfewOff = () => { try { return +localStorage.getItem(CURFEW_KEY) > Date.now(); } catch { return false; } };
export const curfewSkip = () => { try { localStorage.setItem(CURFEW_KEY, String(Date.now() + 15 * 60e3)); } catch { /* */ } };
export const inCurfew = () => R.neuroOn(S, 'curfew') && ['recolher', 'sono'].includes(R.bodyClock(S).key) && !curfewOff();
function clockCard() {
  if (!R.neuroOn(S, 'clock')) return '';
  const c = R.bodyClock(S), heavy = c.key === 'foco' ? R.heaviestTask(S) : null;
  const h = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}` : `${m} min`);
  return `<div class="card clock" data-phase="${c.key}"><header><h2>${c.icon} ${c.name}</h2><span class="meta" title="seus horários: acordar ${c.wake} · dormir ${c.bed} (PERKS)">${c.key === 'sono' ? `acordar ${c.wake}` : `dormir ${c.bed} · faltam ${h(c.toBed)}`}</span></header>
    <p class="clock-tip">${esc(c.tip)}</p>
    ${heavy ? `<button class="btn sm pri" data-act="jump" data-id="${heavy.id}" title="A mais pesada pra fazer agora">🎯 ${esc(heavy.text.replace(/\s*\(\d+\s*XP\)/i, '').slice(0, 44))}</button>` : ''}
    <div class="clock-meta">${c.meal ? `<span>🍽 refeição às ${c.meal.at}${c.meal.in ? ` (em ${h(c.meal.in)})` : ' (agora)'}</span>` : ''}${['despertar', 'foco', 'vale'].includes(c.key) ? `<span>☕ último café até ${c.coffeeUntil}</span>` : ''}${['vale', 'pico2'].includes(c.key) ? `<span>🏋 treino até ${c.trainUntil}</span>` : ''}</div></div>`;
}
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
    <div class="row"><button class="btn sm ghost" data-act="curfew-skip">VER AS LISTAS MESMO ASSIM (15 MIN)</button></div></div>`;
}

export function viewQuests(ui) {
  if (inCurfew()) return `<div class="quests"><div class="board">${closingView()}</div>${sidePanel(ui)}</div>`;
  const QTABS = qtabs();
  const tab = QTABS.some(([k]) => k === ui.qtab) ? ui.qtab : 'listas';
  const win = tab.startsWith('w:') ? R.windows(S).find((w) => 'w:' + w.id === tab) : null;
  const n = { listas: S.quests.tasks.filter((t) => !t.block && R.isOpen(t)).length, boss: S.quests.bosses.filter((b) => b.st !== 'done').length };
  for (const [k] of QTABS) if (!(k in n)) n[k] = R.tabBlocks(S, k).filter((b) => b.st !== 'done').length;
  // RECOLHER TUDO: vale para o que está na janela aberta (listas, blocos ou bosses)
  const ckeys = tab === 'listas' ? R.AREA_KEYS.map((a) => 'l:' + a)
    : tab === 'boss' ? S.quests.bosses.map((b) => 'b:' + (b.block || b.id))
    : R.tabBlocks(S, tab).filter(stalledOff(ui)).map((b) => 'b:' + b.id);
  const allCol = ckeys.length > 0 && ckeys.every(isCollapsed);
  const lists = arrange('lists', R.AREA_KEYS.map((a) => [a, R.AREAS[a], listCard(a, ui)]), { button: false, cols: 3 });
  const body = tab === 'listas' ? `<div class="lists six">${lists}</div>`
    : tab === 'boss' ? bossPanel(ui)
    : group(win ? win.base : tab, ui, win).replace('class="group ', 'class="group wide ');
  return `<div class="quests"><div class="board">
      <div class="band qbar"><div class="seg">${QTABS.map(([k, t]) => `<button class="${tab === k ? 'on' : ''} ${k === 'listas' ? 'mae' : 'filha'} ${R.tabReviewed(S, k) ? 'allrev' : ''}" data-act="qtab" data-tab="${k}" ${k === 'listas' ? 'title="Janela mãe: tudo passa por aqui"' : 'draggable="true" title="arraste pra mudar a ordem"'}>${k === 'listas' ? '◆ ' : ''}${esc(t)}${n[k] != null ? ' · ' + n[k] : ''}</button>`).join('')}<button class="qadd" data-act="win-new" title="Criar uma janela nova">＋</button></div>
        <span class="row" style="gap:6px"><button class="btn sm ghost" data-act="collapse-all" title="Recolhe ou abre tudo desta janela de uma vez">${allCol ? '▾ ABRIR TUDO' : '▸ RECOLHER TUDO'}</button><button class="btn sm" data-act="distribute">📅 DISTRIBUIR</button>
          <details class="qmenu"><summary class="btn sm ghost" title="Escolha o que aparece nesta tela">MOSTRAR${ui.showDone || ui.showStalled ? ' · ' + (!!ui.showDone + !!ui.showStalled) : ''} ▾</summary><div class="qpop">
            <button class="btn sm ${ui.showDone ? 'pri' : 'ghost'}" data-act="toggle-done">${ui.showDone ? '☑' : '☐'} FEITAS</button>
            <button class="btn sm ${ui.showStalled ? 'pri' : 'ghost'}" data-act="toggle-stalled" title="⬛ parados: blocos e tarefas com a cor PARADO">${ui.showStalled ? '☑' : '☐'} PARADOS</button></div></details></span></div>
      ${chapterDue()}${focusCard(ui)}${topStrip()}${body}
    </div>${sidePanel(ui)}</div>`;
}

function chapterDue() {
  const ch = S.core.chapter || {}, td = today();
  return ch.until && ch.until < td ? `<div class="banner info" style="margin-bottom:12px">📖 O capítulo <b>${esc(ch.title)}</b> venceu em ${fmtDM(ch.until)}. Em <a href="#regras">PERKS AND RULES</a> troque o número, o título, a missão e a data pra começar o próximo (a carta do capítulo é guardada).</div>` : '';
}
/** v5.16 (2E + 5A) FOCO AGORA: uma tarefa só, e o porquê (o app junta prazo, boss parado, missão, horário do corpo e prioridade) */
function focusCard(ui) {
  if (!R.neuroOn(S, 'foco')) return '';
  const f = R.focusNow(S, today(), ui.focusSkip || []);
  if (!f) return `<div class="focus-now card empty-f"><span class="fn-k">🎯 FOCO AGORA</span><span class="meta">nada urgente: escolha você ${ui.focusSkip?.length ? '<a href="#" data-act="focus-reset">ver de novo as sugestões</a>' : ''}</span></div>`;
  const t = f.task, b = t.block && R.findBlock(S, t.block);
  return `<div class="focus-now card"><span class="fn-k" title="O PRIMO escolhe UMA tarefa pra você não perder tempo decidindo">🎯 FOCO AGORA</span>
    <button class="check" data-act="toggle" data-id="${t.id}" aria-label="Concluir">${t.st === 'doing' ? '▶' : ''}</button>
    <div class="fn-t" data-act="jump" data-id="${t.id}" title="Toque pra ir até a tarefa"><b>${esc(t.text.replace(/\s*\(\d+\s*XP\)/i, ''))}</b><small>${b ? esc(b.title) + ' · ' : ''}porque ${esc(f.why)}</small></div>
    <span class="chip xp">${R.taskXp(S, t).xp}</span><button class="btn sm ghost" data-act="focus-skip" data-id="${t.id}" title="Agora não: mostra outra sugestão">OUTRA ▸</button></div>`;
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
