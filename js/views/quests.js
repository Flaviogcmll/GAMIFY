// QUESTS — a casa e o painel (como na planilha): listas + BOSS em cima, blocos embaixo, painel à direita.
import { S } from '../store.js';
import * as R from '../rules.js';
import { esc, fmtDM, fmtN, today, diffDays, weekday, addDays } from '../util.js';
import { taskRow, segBar, statusChips, dueChip } from '../ui.js';
import { px } from '../icons.js';
import { isCollapsed, companionCard } from '../v3.js';
import { arrange } from '../v35.js';

const sortOrd = (a, b) => a.ord - b.ord;
const visible = (t) => R.isOpen(t) || t.st === 'sent' || (t.doneAt || t.cancelAt) === today();

function listCard(area, ui) {
  const all = S.quests.tasks.filter((t) => (!t.block && t.area === area) || t.pin === area).sort(sortOrd);
  const open = all.filter(R.isOpen), hidden = all.filter((t) => !visible(t));
  const show = ui.showDone ? all : all.filter(visible);
  const noDue = area === 'imed' || area === 'curto' ? open.filter((t) => !t.due && t.st !== 'wait').length : 0;
  return `<section class="list-card ${isCollapsed('l:' + area) ? 'collapsed' : ''}" data-drop-area="${area}"><header><h2 data-act="collapse" data-k="l:${area}" style="cursor:pointer"><span class="chev">${isCollapsed('l:' + area) ? '▸' : '▾'}</span> ${R.AREAS[area]}</h2>
      <span class="row" style="gap:4px"><span class="meta">${open.length}${noDue ? ` · <span class="warn">${noDue} s/ prazo</span>` : ''}</span><button class="icon-btn" data-act="sort" data-area="${area}" title="Organizar por data (⏳ agrupado embaixo)">⇅</button></span></header>
    <ul class="tasks">${show.map((t) => taskRow(t, { list: true, sub: t.pin === area && t.block ? '↗ ' + (R.findBlock(S, t.block)?.title || '') : '' })).join('') || '<div class="empty">vazio.</div>'}</ul>
    ${!ui.showDone && hidden.length ? `<button class="more" data-act="toggle-done">✓ ${hidden.length} feitas · mostrar</button>` : ''}
    <form class="addline" data-form="add-task" data-area="${area}" autocomplete="off"><input class="inp" name="text" placeholder="+ adicionar" aria-label="Adicionar em ${R.AREAS[area]}"></form>
  </section>`;
}

function bossPanel(ui) {
  const ordOf = (b) => R.findBlock(S, b.block)?.ord ?? b.ord, list = [...S.quests.bosses].sort((a, z) => ordOf(a) - ordOf(z)).sort((a, z) => (a.st === 'done') - (z.st === 'done'));
  const card = (b) => {
    const hp = R.bossHp(S, b), blk = hp?.block, done = b.st === 'done';
    const items = blk ? S.quests.tasks.filter((t) => t.block === blk.id).sort(sortOrd) : [];
    const show = ui.showDone || done ? items : items.filter((t) => visible(t) || (t.parent && R.isOpen(items.find((p) => p.id === t.parent) || {})));
    const ck = blk?.id || b.id;
    return `<article class="block boss-b ${done ? 'closed' : ''} ${isCollapsed('b:' + ck) ? 'collapsed' : ''}" data-color="red" ${blk ? `data-drop-block="${blk.id}"` : ''}>
      <div class="bh"><div class="stripe"></div><div class="bt" data-act="edit-boss" data-id="${b.id}"><h3>👹 ${esc(b.text.replace(/:\s*[\d.]+\s*XP.*$/i, ''))}</h3>
        <div class="bm"><span class="acc">${fmtN(b.xp)} XP + 1🎟</span>${hp && hp.total ? `<span>HP ${fmtN(hp.left)}/${fmtN(hp.total)}</span>` : '<span>quebre em subtarefas ↓</span>'}${done ? `<span class="good">DERROTADO ${fmtDM(b.doneAt)}</span>` : b.st === 'wait' ? '<span>⏳ aguardando</span>' : ''}</div>
        ${hp && hp.total && !done ? segBar(hp.pct, 'hp') : ''}</div>
       <div style="display:flex;flex-direction:column;padding:4px 2px;align-items:center"><button class="icon-btn" data-act="collapse" data-k="b:${ck}" aria-label="Recolher boss"><span class="chev">${isCollapsed('b:' + ck) ? '▸' : '▾'}</span></button>${blk ? `<span class="handle" data-handle="block" data-id="${blk.id}" title="Segure e arraste">⠿</span>` : ''}<button class="icon-btn" data-act="boss-toggle" data-id="${b.id}" aria-label="${done ? 'Reabrir' : 'Derrotar'} boss" title="${done ? 'Reabrir' : 'Derrotar na hora'}">${done ? '↺' : '⚔'}</button><button class="icon-btn" data-act="edit-boss" data-id="${b.id}" aria-label="Editar boss">⋯</button></div></div>
      <div class="bbody"><ul class="tasks">${show.map((t) => taskRow(t, { showPin: true })).join('') || '<div class="empty">sem subtarefas.</div>'}</ul>
        ${blk && !done ? `<form class="addline" data-form="add-task" data-block="${blk.id}" autocomplete="off"><input class="inp" name="text" placeholder="+ subtarefa do boss  (⚔ mini-boss · ↳ passo)" aria-label="Adicionar subtarefa do boss"></form>` : ''}</div></article>`;
  };
  const col = isCollapsed('g:bs');
  return `<div class="group wide ${col ? 'collapsed' : ''}" data-group="bs"><div class="band" data-act="collapse" data-k="g:bs"><span><span class="chev">${col ? '▸' : '▾'}</span> BOSSES</span><span class="meta">${list.filter((b) => b.st !== 'done').length} em aberto</span></div>
    <form class="row" data-form="add-boss" autocomplete="off"><input class="inp grow" name="text" placeholder="+ novo boss (META: 500 XP)" aria-label="Novo boss"></form>
    ${list.map(card).join('') || '<div class="empty">nenhum boss. Dê um nome à meta grande e quebre em subtarefas.</div>'}</div>`;
}

function blockCard(b, ui) {
  const items = S.quests.tasks.filter((t) => t.block === b.id).sort(sortOrd);
  const open = items.filter(R.isOpen), done = items.filter((t) => t.st === 'done'), counted = items.filter((t) => t.st !== 'cancel');
  const show = ui.showDone || b.st === 'done' ? items : items.filter((t) => visible(t) || (t.parent && R.isOpen(items.find((p) => p.id === t.parent) || {})));
  const dues = open.map((t) => t.due).filter(Boolean).sort();
  const xpLeft = open.reduce((a, t) => a + R.taskXp(S, t).xp, 0) + (b.st === 'done' ? 0 : R.blockXp(b));
  return `<article class="block ${b.st === 'done' ? 'closed' : ''} ${isCollapsed('b:' + b.id) ? 'collapsed' : ''}" data-color="${b.color}" data-drop-block="${b.id}">
    <div class="bh"><div class="stripe"></div>
      <div class="bt" data-act="edit-block" data-id="${b.id}"><h3>${esc(b.title)}</h3>
        <div class="bm"><span>${done.length}/${counted.length}</span>${b.src && S.quests.tasks.find((x) => x.id === b.src) ? `<button class="chip cyc" data-act="jump" data-id="${b.src}" title="Tarefa ligada nas listas">🔗 LISTA</button>` : ''}${b.st === 'done' ? `<span class="good">FECHADO ${fmtDM(b.doneAt)} · +${b.xp}</span>` : `<span>${b.st === 'wait' ? '⏳ aguardando · ' : ''}${b.due ? '◆ ' + fmtDM(b.due) : dues[0] ? 'próx. ' + fmtDM(dues[0]) : 'sem prazo'}</span><span class="acc">${fmtN(xpLeft)} XP</span>`}</div>
        ${segBar(counted.length ? done.length / counted.length : 0, 'good sm')}</div>
      <div style="display:flex;flex-direction:column;padding:4px 2px;align-items:center"><button class="icon-btn" data-act="collapse" data-k="b:${b.id}" aria-label="Recolher bloco"><span class="chev">${isCollapsed('b:' + b.id) ? '▸' : '▾'}</span></button><span class="handle" data-handle="block" data-id="${b.id}" title="Segure e arraste">⠿</span><button class="icon-btn" data-act="edit-block" data-id="${b.id}" aria-label="Editar bloco">⋯</button><button class="icon-btn" data-act="sort" data-block="${b.id}" title="Organizar por data">⇅</button></div>
    </div>
    <div class="bbody"><ul class="tasks">${show.map((t) => taskRow(t, { showPin: true })).join('') || '<div class="empty">sem itens.</div>'}</ul>
      ${!ui.showDone && b.st !== 'done' && items.length > show.length ? `<button class="more" data-act="toggle-done">✓ ${items.length - show.length} feitas · mostrar</button>` : ''}
      <form class="addline" data-form="add-task" data-block="${b.id}" autocomplete="off"><input class="inp" name="text" placeholder="+ subtarefa  (> passo · ⚔ mini-boss)" aria-label="Adicionar subtarefa"></form></div>
  </article>`;
}

function group(g, ui) {
  const blocks = S.quests.blocks.filter((b) => b.group === g).sort(sortOrd);
  const active = blocks.filter((b) => b.color !== 'black' || ui.showDone);
  return `<div class="group ${isCollapsed('g:' + g) ? 'collapsed' : ''}" data-group="${g}"><div class="band" data-act="collapse" data-k="g:${g}"><span><span class="chev">${isCollapsed('g:' + g) ? '▸' : '▾'}</span> ${R.GROUPS[g].name}</span><span class="meta">${blocks.filter((b) => b.st !== 'done').length} blocos</span></div>
    <form class="row" data-form="add-block" data-group="${g}" autocomplete="off"><input class="inp grow" name="title" placeholder="+ novo bloco${g === 'bd' ? ' (🎯 meta)' : ' (3000💰 · / MES DIA 05)'}" aria-label="Novo bloco"></form>
    ${g === 'bd' ? `<button class="btn sm" data-act="ai-breakdown">🤖 QUEBRAR META COM IA</button>` : ''}
    ${active.map((b) => blockCard(b, ui)).join('') || '<div class="empty">nenhum bloco.</div>'}
    ${blocks.length > active.length ? `<button class="more" data-act="toggle-done">⬛ ${blocks.length - active.length} parado(s) · mostrar</button>` : ''}</div>`;
}

function habitsCard(td) {
  const ev = R.eventOfDay(S, td);
  const m = S.marks.days[td]?.h || {};
  const blanks = S.core.habits.filter((h) => !m[h.id]).length;
  return `<div class="card"><header><h2>Hábitos de hoje</h2><span class="meta">${blanks ? `faltam ${blanks}` : R.isPerfect(S, td) ? '🌟 PERFEITO x2' : 'tudo marcado'} · +${S.marks.days[td]?.xp || 0} XP</span></header>
    <div class="habs">${S.core.habits.map((h) => {
      const v = m[h.id] || '', sk = R.streak(S, h.id, td);
      return `<button class="hab ${v === 'x' ? 'x' : v === '-' ? 'f' : ''} ${ev?.type === 'habit' && ev.habit === h.id ? 'ev' : ''}" data-act="habit" data-d="${td}" data-h="${h.id}" title="${esc(h.name)} · ${sk.forged ? 'forjado' : `${sk.total}/66`}"><span class="hi">${h.icon}</span><span class="hn">${esc(h.name.slice(0, 9))}</span><span class="hs">🔥${sk.streak}${sk.mult > 1 ? ' x' + String(sk.mult).replace('.', ',') : ''}</span></button>`;
    }).join('')}
      <button class="hab ${m.rd ? 'x' : ''}" data-act="redemption"><span class="hi">⚔</span><span class="hn">REDENÇÃO</span><span class="hs">+30 · cura</span></button></div>
    <p class="meta" style="margin:8px 0 0">toque: ✓ fiz → – folga → vazio</p></div>`;
}

function filaCard(td) {
  const q = R.deadlineQueue(S, td).slice(0, 12);
  const where = (t) => (t.block ? R.findBlock(S, t.block)?.title : R.AREAS[t.area]) || '';
  return `<div class="card"><header><h2>⏰ Fila de prazos</h2><a class="meta" href="#agenda">agenda →</a></header>
    <div class="list">${q.map((t) => `<div class="li" data-act="jump" data-id="${t.id}" style="cursor:pointer"><div class="lt">${t.st === 'doing' ? '▶ ' : ''}${t.prio ? '<b class="bad">!</b> ' : ''}${esc(t.text.replace(/\s*\(\d+\s*XP\)/i, ''))}<small>${esc(where(t))}</small></div><div class="row" style="flex-wrap:nowrap">${dueChip(t.due, false, true)}</div></div>`).join('') || '<div class="empty">nenhuma tarefa com prazo.</div>'}</div></div>`;
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
      <tr><td>⚔ ↳</td><td>⚔ mini-boss = a vitória · ↳ passo (escreva > no começo) = 3 XP; todos os ↳ feitos marcam o ⚔ sozinho</td></tr>
      <tr><td>📅 🐦</td><td>no prazo x1,5 · 2+ dias antes x2 · atrasou = sem bônus</td></tr>
      <tr><td>🟥🟨🟩🟧⬛</td><td>cor do bloco/tarefa: urgente · andamento · pessoal · gestão · parado</td></tr>
      <tr><td>LISTA</td><td>subtarefa 5 · lista 10 · fechar bloco: breakdown 100 · 🎯 meta 200 · captação 150 · trabalho 300</td></tr>
    </table>`;
}

function goldCard(td) {
  const prs = R.goldPrompts(S, td);
  if (!prs.length) return '';
  return `<div class="card" style="background:var(--warn-soft)"><header><h2>💰 Baú de ouro</h2></header>${prs.map((p) => `<div class="li"><div class="lt"><b>${esc(p.title)}</b><small>${esc(p.label)} · sua metade</small></div>
    <div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn sm pri" data-act="gold-yes" data-key="${esc(p.key)}">RECEBI ${fmtN(p.amount)}</button><button class="btn sm" data-act="gold-later" data-key="${esc(p.key)}">AINDA NÃO</button></div></div>`).join('')}</div>`;
}

export function sidePanel(ui) {
  const td = today(), tot = R.totals(S), st = R.dayStatus(S, td), al = R.alerts(S, td), ch = S.core.chapter || {};
  const open = R.openTasks(S), over = open.filter((t) => t.due && t.due < td).length, hoje = open.filter((t) => t.due === td).length;
  const w7 = open.filter((t) => t.due > td && t.due <= addDays(td, 7)).length;
  const left = ch.until ? diffDays(td, ch.until) : null;
  const night = document.documentElement.dataset.mode === 'night';
  // v3.5: cada cartão do painel pode ser recolhido (toque no título), arrastado (alça ⠿) e escondido (⚙ PERSONALIZAR)
  return `<aside class="side">${arrange('side', [
    ['status', '🎭 Status do dia', `<div class="card"><header><h2>🎭 Status do dia</h2><span class="meta">toque pra ver o que é</span></header><div class="status-line">${statusChips(st, al) || '<span class="meta">nenhum buff nem debuff hoje.</span>'}</div></div>`],
    ['primo', '🔥 PRIMO', companionCard()],
    ['ouro', '💰 Baú de ouro (quando tem)', goldCard(td)],
    ['habitos', '✓ Hábitos de hoje', habitsCard(td)],
    ['comandos', '🎮 Comandos', `<div class="card"><header><h2>🎮 Comandos</h2></header><div class="cmds">
      <button class="btn" data-act="archive-now">🔄<span>ATUALIZAR</span></button>
      <a class="btn" href="#agenda">${px('agenda', 14)}<span>AGENDA</span></a>
      <a class="btn" href="#survival">${px('survival', 14)}<span>SURVIVAL</span></a>
      <a class="btn" href="#filtro">${px('filtro', 14)}<span>FILTRO</span></a>
      <a class="btn" href="#domingo">${px('domingo', 14)}<span>BAÚ</span></a>
      <button class="btn" data-act="redemption">${px('sword', 14)}<span>REDENÇÃO</span></button>
      <a class="btn" href="#shop">${px('shop', 14)}<span>SHOP</span></a>
      <a class="btn" href="#conquistas">${px('conquistas', 14)}<span>CONQUISTAS</span></a>
      <button class="btn pri" data-act="primo-hub">${px('fire', 14)}<span>PRIMO</span></button>
      <button class="btn" data-act="sos">${px('sos', 14)}<span>SOS TRAVEI</span></button>
      <a class="btn" href="#regras">${px('regras', 14)}<span>REGRAS</span></a></div></div>`],
    ['fila', '⏰ Fila de prazos', filaCard(td)],
  ])}
    <p class="meta" style="text-align:center">${weekday(td) === 5 ? '⚠ sexta-feira: o dia em que mais se quebra sequência. marque os hábitos!' : ''}</p>
  </aside>`;
}

const QT_ALL = [['listas', 'LISTAS'], ['boss', 'BOSSES'], ['bd', 'BREAKDOWN'], ['tr', 'TRABALHO'], ['cap', 'CAPTAÇÕES'], ['gs', 'GESTÃO']];
/** a ordem das janelas é sua: arraste um nome de janela sobre outro (PC) */
function qtabs() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('gamify-ui:qtabs')) || []; } catch { /* */ }
  const ids = QT_ALL.map((x) => x[0]), order = [...saved.filter((i) => ids.includes(i)), ...ids.filter((i) => !saved.includes(i))];
  return order.map((id) => QT_ALL.find((x) => x[0] === id));
}
export function viewQuests(ui) {
  const QTABS = qtabs();
  const tab = QTABS.some(([k]) => k === ui.qtab) ? ui.qtab : 'listas';
  const n = {
    listas: S.quests.tasks.filter((t) => !t.block && R.isOpen(t)).length,
    bd: S.quests.blocks.filter((b) => b.group === 'bd' && b.st !== 'done').length, tr: S.quests.blocks.filter((b) => b.group === 'tr' && b.st !== 'done').length,
    cap: S.quests.blocks.filter((b) => b.group === 'cap' && b.st !== 'done').length, gs: S.quests.blocks.filter((b) => b.group === 'gs' && b.st !== 'done').length, boss: S.quests.bosses.filter((b) => b.st !== 'done').length,
  };
  const lists = arrange('lists', ['imed', 'curto', 'longo', 'sem'].map((a) => [a, R.AREAS[a], listCard(a, ui)]), { button: false });
  const body = tab === 'listas' ? `<div class="lists four">${lists}</div>`
    : tab === 'boss' ? bossPanel(ui)
    : group(tab, ui).replace('class="group ', 'class="group wide ');
  return `<div class="quests"><div class="board">
      <div class="band qbar"><div class="seg">${QTABS.map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" data-act="qtab" data-tab="${k}" draggable="true" title="arraste pra mudar a ordem">${t}${n[k] != null ? ' · ' + n[k] : ''}</button>`).join('')}</div>
        <span class="row" style="gap:6px"><button class="btn sm" data-act="distribute">📅 DISTRIBUIR</button><button class="btn sm ghost" data-act="toggle-done">${ui.showDone ? 'ESCONDER FEITAS' : 'MOSTRAR FEITAS'}</button></span></div>
      ${chapterDue()}${topStrip()}${body}
    </div>${sidePanel(ui)}</div>`;
}

function chapterDue() {
  const ch = S.core.chapter || {}, td = today();
  return ch.until && ch.until < td ? `<div class="banner info" style="margin-bottom:12px">📖 O capítulo <b>${esc(ch.title)}</b> venceu em ${fmtDM(ch.until)}. Em <a href="#regras">PERKS AND RULES</a> troque o número, o título, a missão e a data pra começar o próximo (a carta do capítulo é guardada).</div>` : '';
}
function topStrip() {
  const sunday = new Date().getDay() === 0, wm = R.weeklyMissions(S, sunday ? addDays(today(), 1) : today()), boss = R.chapterBoss(S);
  return `<div class="topstrip">
    <div class="card"><header><h2>📌 Missões da ${sunday ? 'próxima semana' : 'semana'}</h2><span class="meta">${wm.done}/3 · cada uma x1,5 · as 3 = +100 XP +1 🎟 <button class="btn sm" data-act="weekly-pick">ESCOLHER</button></span></header>
      ${wm.tasks.length ? `<ul class="tasks">${wm.tasks.map((t) => taskRow(t, { sub: t.block ? R.findBlock(S, t.block)?.title : R.AREAS[t.area] })).join('')}</ul>` : '<div class="empty">Escolha as 3 pedras grandes da semana. O resto é backlog, sem culpa.</div>'}</div>
    ${boss ? `<div class="card boss-r"><header><h2>👹 Boss do capítulo</h2><span class="meta">${esc(boss.label)} <button class="btn sm pri" data-act="save-money">💰 GUARDEI</button></span></header>
      <div class="num" style="font-size:12px">R$ ${fmtN(boss.left)} <span class="meta">de vida</span></div>${segBar(boss.pct, 'hp')}<p class="meta" style="margin:6px 0 0">o que você guarda dá dano · R$ ${fmtN(boss.got)} guardados de R$ ${fmtN(boss.target)}</p></div>` : ''}
  </div>`;
}
