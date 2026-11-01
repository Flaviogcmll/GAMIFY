// AGENDA — controle de prazos, linha do tempo de 6 semanas (◄ ► troca a semana), fila com filtro e compromissos.
import { S } from '../store.js';

import * as R from '../rules.js';
import { esc, today, fmtDM, DOW, addDays, range, weekday, weekStart, holidayName } from '../util.js';
import { dueChip } from '../ui.js';


function timelineCard(ui) {
  const td = today();
  const start = addDays(weekStart(td), (ui.tlWeek || 0) * 7);
  const days = range(start, 42);
  const tl = R.timeline(S, start, 42);
  const head1 = [0, 1, 2, 3, 4, 5].map((w) => `<th class="wk" colspan="7">SEM ${fmtDM(days[w * 7])}</th>`).join('');
  const head2 = days.map((d) => `<th class="${d === td ? 'today' : ''}" title="${holidayName(d) || ''}">${DOW[weekday(d)][0]}<br>${d.slice(8)}</th>`).join('');
  const cell = (d, n, extra = '') => {
    const we = weekday(d) === 0 || weekday(d) === 6 || holidayName(d);
    return `<td class="${d === td ? 'today' : we ? 'we' : ''} ${n ? 'n' : ''} ${n && d < td ? 'late' : ''} ${extra}">${n || ''}</td>`;
  };
  const rows = tl.rows.map((r, i) => `<tr class="rowc-${i >= 4 ? i + 1 : i}"><td class="name">${esc(r.name)}</td>${days.map((d) => cell(d, r.counts[d])).join('')}</tr>`).join('');
  const load = `<tr class="rowc-6"><td class="name"><b>📊 CARGA DO DIA</b></td>${days.map((d) => { const n = tl.load[d] || 0; return `<td class="${d === td ? 'today' : ''} n ${n >= 6 ? 'load-6' : n >= 4 ? 'load-4' : 'load-1'}">${n || ''}</td>`; }).join('')}</tr>`;
  const blocks = tl.blocks.map((b) => {
    const dues = Object.keys(b.counts).sort();
    const endD = b.due || dues[dues.length - 1];
    return `<tr><td class="name" data-act="jump-block" data-id="${b.block}" style="cursor:pointer">${esc(b.title || b.name)}</td>${days.map((d) => {
      const inSpan = endD && d >= td && d <= endD;
      return cell(d, b.counts[d], `${inSpan ? 'span' : ''} ${b.due === d ? 'end' : ''}`).replace('></td>', `>${b.due === d && !b.counts[d] ? '◆' : ''}</td>`);
    }).join('')}</tr>`;
  }).join('');
  return `<div class="card c12"><header><h2>Linha do tempo · 6 semanas</h2>
      <div class="row"><button class="btn sm" data-act="tl-week" data-dir="-1" aria-label="Semana anterior">◄</button><button class="btn sm" data-act="tl-week" data-dir="0">HOJE</button><button class="btn sm" data-act="tl-week" data-dir="1" aria-label="Próxima semana">►</button></div></header>
    <div class="tl"><table><thead><tr><th></th>${head1}</tr><tr><th></th>${head2}</tr></thead><tbody>${rows}${load}
      <tr><td class="name px" style="font-size:7px;background:var(--ink);color:var(--bg)">BLOCOS</td><td colspan="42" style="background:var(--ink)"></td></tr>${blocks}</tbody></table></div></div>`;
}

export function viewAgenda(ui) {
  const td = today();
  const open = R.openTasks(S);
  const over = open.filter((t) => t.due && t.due < td);
  const dueToday = open.filter((t) => t.due === td);
  const next7 = open.filter((t) => t.due && t.due > td && t.due <= addDays(td, 7));
  const done = R.idx(S).comps.filter((c) => c.onTime !== undefined);
  const d30 = R.allTasks(S).filter((t) => t.st === 'done' && t.due && t.doneAt >= addDays(td, -30));
  const punct = d30.length ? Math.round((d30.filter((t) => t.onTime).length / d30.length) * 100) : null;
  let seq = 0;
  for (const c of [...done].sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1))) { if (c.onTime) seq++; else break; }
  const where = (t) => (t.block ? R.findBlock(S, t.block)?.title : R.AREAS[t.area]) || '';
  const q = (ui.agQ || '').toLowerCase();
  const fb = ui.agB || '';
  let queue = R.deadlineQueue(S, td);
  if (q) queue = queue.filter((t) => (t.text + ' ' + where(t)).toLowerCase().includes(q));
  if (fb === 'late') queue = queue.filter((t) => t.due && t.due < td);
  if (fb === 'today') queue = queue.filter((t) => t.due === td);
  if (fb === 'week') queue = queue.filter((t) => t.due && t.due >= td && t.due <= addDays(td, 7));
  const coms = [...(S.core.commitments || [])].sort((a, b) => ((a.date + a.start) < (b.date + b.start) ? -1 : 1));
  const upcoming = coms.filter((c) => c.date >= td), past = coms.filter((c) => c.date < td).slice(-4);
  const comRow = (c, isPast) => `<div class="li" style="${isPast ? 'opacity:.5' : ''}"><div class="lt">📌 ${esc(c.text)}<small>${DOW[weekday(c.date)]} ${fmtDM(c.date)}${c.start ? ` · ${esc(c.start)}${c.end ? '–' + esc(c.end) : ''}` : ' · dia todo'} · ${esc(c.type || '')}</small></div>
    <div class="row" style="flex-wrap:nowrap">${c.date === td ? '<span class="chip today">HOJE</span>' : ''}<button class="icon-btn" data-act="del-commit" data-id="${c.id}" aria-label="Apagar">×</button></div></div>`;
  const hol = range(td, 30).filter(holidayName).slice(0, 3);
  return `<div class="page-title"><div><h1><em>agenda</em>.</h1></div>
      <button class="btn pri" data-act="distribute">📅 DISTRIBUIR PRAZOS</button></div>
    <div class="stats">
      <div class="stat"><small>⏰ Atrasadas</small><b class="${over.length ? 'bad' : ''}">${over.length}</b><span>${over.length >= 3 ? 'ATOLADO: loja trancada' : '3+ tranca a loja'}</span></div>
      <div class="stat"><small>Hoje</small><b class="${dueToday.length ? 'warn' : ''}">${dueToday.length}</b><span>${DOW[weekday(td)]} ${fmtDM(td)}</span></div>
      <div class="stat"><small>Próx. 7 dias</small><b>${next7.length}</b></div>
      <div class="stat"><small>Pontualidade 30d</small><b>${punct == null ? '—' : punct + '%'}</b></div>
      <div class="stat"><small>🎯 No prazo seguidas</small><b>${seq}</b><span>${seq >= 5 ? '⏰ RELÓGIO SUÍÇO' : '5 = relógio suíço'}</span></div>
    </div>
    ${dayStrip()}
    <div class="grid">${timelineCard(ui)}
      <div class="card c7"><header><h2>⏰ Fila de prazos</h2><span class="meta">arraste pra um dia ↑</span></header>
        <div class="row" style="margin-bottom:8px"><input class="inp grow" data-input="agQ" value="${esc(ui.agQ || '')}" placeholder="🔍 filtrar por nome, projeto…" aria-label="Filtrar"><div class="seg">${[['', 'TUDO'], ['late', 'ATRASADAS'], ['today', 'HOJE'], ['week', '7 DIAS']].map(([k, n]) => `<button class="fb-${k || 'all'} ${fb === k ? 'on' : ''}" data-act="ag-filter" data-b="${k}">${n}</button>`).join('')}</div></div>
        <div class="list">${queue.slice(0, 80).map((t) => `<div class="li" draggable="true" data-tid="${t.id}" title="Arraste até um dia da faixa pra mudar o prazo"><div class="lt" data-act="jump" data-id="${t.id}" style="cursor:pointer">${t.st === 'doing' ? '▶ ' : ''}${t.prio ? '<b class="bad">!</b> ' : ''}${esc(t.text)}<small>${esc(where(t))}</small></div>
          <div class="row" style="flex-wrap:nowrap;gap:6px">${dueChip(t.due, false, true)}<button class="icon-btn" data-act="prio" data-id="${t.id}" title="Prioridade">${t.prio ? '★' : '☆'}</button></div></div>`).join('') || '<div class="empty">nada encontrado.</div>'}</div></div>
      <div class="c5" style="display:flex;flex-direction:column;gap:16px">
        <div class="card"><header><h2>📆 Compromissos</h2></header>
          <form data-form="commit" autocomplete="off"><input class="inp" name="text" placeholder="compromisso / com quem / onde" aria-label="Compromisso" required>
            <div class="row" style="margin-top:6px"><input class="inp grow" type="date" name="date" value="${td}" required aria-label="Data"><input class="inp" type="time" name="start" style="width:auto" aria-label="Início"><input class="inp" type="time" name="end" style="width:auto" aria-label="Fim"></div>
            <div class="row" style="margin-top:6px"><select class="inp grow" name="type" aria-label="Tipo"><option>PESSOAL</option><option>CLIENTE</option><option>PREFEITURA</option><option>REUNIÃO</option><option>SAÚDE</option></select><button class="btn pri">+ ADICIONAR</button></div></form>
          <div class="list" style="margin-top:8px">${upcoming.map((c) => comRow(c, false)).join('') || '<div class="empty">nenhum compromisso pela frente.</div>'}${past.map((c) => comRow(c, true)).join('')}</div>
          ${hol.length ? `<p class="meta" style="margin:8px 0 0">feriados: ${hol.map((d) => `${fmtDM(d)} ${esc(holidayName(d))}`).join(' · ')}</p>` : ''}</div>
      </div></div>`;
}

/** faixa de dias (como na v1): rola pra esquerda/direita, cor = carga do dia */
function dayStrip() {
  const td = today(), load = R.loadByDay(S);
  return `<div class="card" style="margin-bottom:16px"><header><h2>📊 Carga do dia · 6 semanas</h2><span class="meta">arraste uma tarefa da fila até o dia</span></header>
    <div class="daystrip">${range(addDays(td, -3), 45).map((d) => {
      const n = load[d] || 0, hol = holidayName(d), we = weekday(d) === 0 || weekday(d) === 6;
      return `<div class="day ${d === td ? 'today' : ''} ${we || hol ? 'off' : ''}" data-act="ag-day" data-d="${d}"><small>${DOW[weekday(d)]} ${fmtDM(d)}</small><div class="n ${n >= 6 ? 'l6' : n >= 4 ? 'l4' : n ? 'l1' : ''}">${n || '·'}</div><small>${hol ? esc(hol.split(' ')[0]) : we ? 'fim de sem.' : d < td ? 'passou' : ''}</small></div>`;
    }).join('')}</div></div>`;
}
