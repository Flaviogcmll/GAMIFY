// AGENDA — controle de prazos, linha do tempo de 6 semanas (◄ ► troca a semana), fila com filtro.
import { S } from '../store.js';
import { ritualRow } from './survival.js';

import * as R from '../rules.js';
import { esc, today, fmtDM, DOW, addDays, range, weekday, weekStart, holidayName } from '../util.js';
import { dueChip } from '../ui.js';


function timelineCard(ui) {
  const td = today();
  const start = addDays(weekStart(td), (ui.tlWeek || 0) * 7);
  const days = range(start, 42);
  const tl = R.timeline(S, start, 42), rit = R.ritualDates(S, start, 42);
  const head1 = [0, 1, 2, 3, 4, 5].map((w) => `<th class="wk" colspan="7">SEM ${fmtDM(days[w * 7])}</th>`).join('');
  const head2 = days.map((d) => `<th class="${d === td ? 'today' : ''}" title="${holidayName(d) || ''}">${DOW[weekday(d)][0]}<br>${d.slice(8)}</th>`).join('');
  const cell = (d, n, extra = '') => {
    const we = weekday(d) === 0 || weekday(d) === 6 || holidayName(d);
    return `<td class="${d === td ? 'today' : we ? 'we' : ''} ${n ? 'n' : ''} ${n && d < td ? 'late' : ''} ${extra}">${n || ''}</td>`;
  };
  const rows = tl.rows.map((r, i) => `<tr class="rowc-${i >= 4 ? i + 1 : i}"><td class="name">${esc(r.name)}</td>${days.map((d) => cell(d, r.counts[d])).join('')}</tr>`).join('');
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
    <div class="tl"><table><thead><tr><th></th>${head1}</tr><tr><th></th>${head2}</tr></thead><tbody>${rows}<tr class="rowc-5"><td class="name"><b>🔁 RITUAIS</b></td>${days.map((d) => { const l = rit[d] || []; return `<td class="${d === td ? 'today' : ''} ${l.length ? 'n' : ''}" title="${esc(l.map((r) => r.name).join(', '))}">${l.length || ''}</td>`; }).join('')}</tr>
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
  const where = (t) => (t.block ? R.findBlock(S, t.block)?.title : R.areaName(t.area)) || '';
  const q = (ui.agQ || '').toLowerCase();
  const fb = ui.agB || '';
  let queue = R.deadlineQueue(S, td);
  if (q) queue = queue.filter((t) => (t.text + ' ' + where(t)).toLowerCase().includes(q));
  if (fb === 'late') queue = queue.filter((t) => t.due && t.due < td);
  if (fb === 'today') queue = queue.filter((t) => t.due === td);
  if (fb === 'week') queue = queue.filter((t) => t.due && t.due >= td && t.due <= addDays(td, 7));
  const hol = range(td, 30).filter(holidayName).slice(0, 3);
  const blow = R.blowState(S), blowPct = Math.round((R.BLOW_MULT - 1) * 100);
  return `<div class="page-title"><div><h1><em>agenda</em>.</h1></div>
      <button class="btn pri" data-act="distribute">📅 DISTRIBUIR PRAZOS</button></div>
    <div class="stats">
      <div class="stat"><small>⏰ Atrasadas</small><b class="${over.length ? 'bad' : ''}">${over.length}</b><span>${over.length >= 3 ? 'ATOLADO: loja trancada' : '3+ tranca a loja'}</span></div>
      <div class="stat"><small>Hoje</small><b class="${dueToday.length ? 'warn' : ''}">${dueToday.length}</b><span>${DOW[weekday(td)]} ${fmtDM(td)}</span></div>
      <div class="stat"><small>Próx. 7 dias</small><b>${next7.length}</b></div>
      <div class="stat"><small>Pontualidade 30d</small><b>${punct == null ? '—' : punct + '%'}</b></div>
      <div class="stat"><small>🎯 No prazo seguidas</small><b>${seq}</b><span>${seq >= 5 ? '⏰ RELÓGIO SUÍÇO' : '5 = relógio suíço'}</span></div>
      <div class="stat"><small>💥 Estourados</small><b class="${blow.active ? 'bad' : ''}">${blow.n % R.BLOW_EVERY}/${R.BLOW_EVERY}</b><span>${blow.active ? `CASTIGO: loja +${blowPct}%` : `${R.BLOW_EVERY} = loja +${blowPct}% por ${R.BLOW_DAYS} dias`}</span></div>
    </div>
    <div class="grid">${timelineCard(ui)}
      <div class="card c7"><header><h2>⏰ Fila de prazos</h2></header>
        <div class="row" style="margin-bottom:8px"><input class="inp grow" data-input="agQ" value="${esc(ui.agQ || '')}" placeholder="🔍 filtrar por nome, projeto…" aria-label="Filtrar"><div class="seg">${[['', 'TUDO'], ['late', 'ATRASADAS'], ['today', 'HOJE'], ['week', '7 DIAS']].map(([k, n]) => `<button class="fb-${k || 'all'} ${fb === k ? 'on' : ''}" data-act="ag-filter" data-b="${k}">${n}</button>`).join('')}</div></div>
        <div class="list">${queue.slice(0, 80).map((t) => `<div class="li"><div class="lt" data-act="jump" data-id="${t.id}" style="cursor:pointer">${t.st === 'doing' ? '▶ ' : ''}${t.prio ? '<b class="bad">!</b> ' : ''}${esc(t.text)}<small>${esc(where(t))}</small></div>
          <div class="row" style="flex-wrap:nowrap;gap:6px">${dueChip(t.due, false, true)}<button class="icon-btn" data-act="prio" data-id="${t.id}" title="Prioridade">${t.prio ? '★' : '☆'}</button></div></div>`).join('') || '<div class="empty">nada encontrado.</div>'}</div></div>
      <div class="c5" style="display:flex;flex-direction:column;gap:16px">
        <div class="card"><header><h2>🔁 Rituais · próximos 14 dias</h2><a class="meta" href="#survival">todos →</a></header>
          <div class="list">${(S.core.rituals || []).map((r) => ({ r, s: R.ritualStatus(r, td) })).filter((x) => x.s.left != null && x.s.left <= 14).sort((a, b) => a.s.left - b.s.left).map((x) => ritualRow(x.r, td)).join('') || '<div class="empty">nenhum ritual nos próximos 14 dias.</div>'}</div>
          ${hol.length ? `<p class="meta" style="margin:8px 0 0">feriados: ${hol.map((d) => `${fmtDM(d)} ${esc(holidayName(d))}`).join(' · ')}</p>` : ''}</div>
      </div></div>`;
}
