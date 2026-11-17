// AGENDA — controle de prazos, linha do tempo de 6 semanas (◄ ► troca a semana), fila com filtro.
import { S } from '../store.js';
import { tiles } from '../telas.js';

import * as R from '../rules.js';
import { esc, today, fmtDM, DOW, addDays, range, weekday, weekStart, holidayName } from '../util.js';
import { dueChip } from '../ui.js';


function timelineCard(ui) {
  const td = today();
  const start = addDays(weekStart(td), (ui.tlWeek || 0) * 7);
  const days = range(start, 42);
  const tl = R.timeline(S, start, 42);
  const head1 = [0, 1, 2, 3, 4, 5].map((w) => `<th class="wk" colspan="7">SEM ${fmtDM(days[w * 7])}</th>`).join('');
  // v5.16: fim de semana e feriado em destaque (azul = descanso); o feriado mostra o nome ao passar o mouse
  const off = (d) => (holidayName(d) ? 'hol' : weekday(d) === 0 || weekday(d) === 6 ? 'we' : '');
  const head2 = days.map((d) => `<th class="${d === td ? 'today' : off(d)}" title="${esc(holidayName(d) || '')}">${DOW[weekday(d)][0]}<br>${d.slice(8)}${holidayName(d) ? '<i class="holm">★</i>' : ''}</th>`).join('');
  const cell = (d, n, extra = '') => `<td class="${d === td ? 'today' : off(d)} ${n ? 'n' : ''} ${n && d < td ? 'late' : ''} ${extra}">${n || ''}</td>`;
  // v5.15: as linhas das listas e dos rituais saíram daqui (a carga de cada dia fica na faixa de cima); ficam as datas e os blocos
  const blocks = tl.blocks.map((b) => {
    const dues = Object.keys(b.counts).sort();
    const endD = b.due || dues[dues.length - 1];
    return `<tr><td class="name" data-act="jump-block" data-id="${b.block}" style="cursor:pointer">${esc(b.title || b.name)}</td>${days.map((d) => {
      const inSpan = endD && d >= td && d <= endD;
      return cell(d, b.counts[d], `${inSpan ? 'span' : ''} ${b.due === d ? 'end' : ''}`).replace('></td>', `>${b.due === d && !b.counts[d] ? '◆' : ''}</td>`);
    }).join('')}</tr>`;
  }).join('');
  return `<div class="card c12"><header><h2>Linha do tempo dos blocos · 6 semanas</h2>
      <div class="row"><button class="btn sm" data-act="tl-week" data-dir="-1" aria-label="Semana anterior">◄</button><button class="btn sm" data-act="tl-week" data-dir="0">HOJE</button><button class="btn sm" data-act="tl-week" data-dir="1" aria-label="Próxima semana">►</button></div></header>
    <div class="tl"><table><thead><tr><th></th>${head1}</tr><tr><th></th>${head2}</tr></thead><tbody>${blocks}</tbody></table></div></div>`;
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
  return `<div class="page-title"><div><h1><em>agenda</em>.</h1></div></div>
    ${tiles([
      { label: '⏰ Atrasadas', value: over.length, cls: over.length ? 'bad' : '', tone: 'urg', tip: over.length >= 3 ? 'A loja está trancada: resolva ou remarque 1 atrasada pra abrir.' : 'Com 3 ou mais atrasadas a loja tranca (resolver 1 já destranca).' },
      { label: 'Hoje', value: dueToday.length, tone: 'urg', tip: `${DOW[weekday(td)]} ${fmtDM(td)}` },
      { label: 'Próx. 7 dias', value: next7.length, tone: 'atencao' },
      { label: 'Pontualidade 30d', value: punct == null ? '—' : punct + '%', tone: 'ok', tip: 'Das tarefas com prazo concluídas nos últimos 30 dias, quantas saíram no prazo.' },
      { label: '🎯 No prazo seguidas', value: seq, tone: 'ok', tip: seq >= 5 ? 'RELÓGIO SUÍÇO!' : '5 seguidas no prazo = RELÓGIO SUÍÇO' },
      { label: '💥 Estourados', value: `${blow.n % R.BLOW_EVERY}/${R.BLOW_EVERY}`, cls: blow.active ? 'bad' : '', tone: 'urg', tip: blow.active ? `Castigo ativo: loja +${blowPct}%. Resolva 1 atrasada antiga pra cancelar.` : `A cada ${R.BLOW_EVERY} prazos estourados, a loja fica ${blowPct}% mais cara por ${R.BLOW_DAYS} dias.` },
    ])}
    <div class="page-actions"><button class="btn pri" data-act="distribute">📅 DISTRIBUIR PRAZOS</button></div>
    ${dayStrip()}
    <div class="grid">${timelineCard(ui)}
      <div class="card c12"><header><h2>⏰ Fila de prazos</h2><span class="meta" title="Arraste uma tarefa até um dia da faixa CARGA DO DIA pra mudar o prazo">arraste pra um dia ↑</span></header>
        <div class="row" style="margin-bottom:8px"><input class="inp grow" data-input="agQ" value="${esc(ui.agQ || '')}" placeholder="🔍 filtrar por nome, projeto…" aria-label="Filtrar"><div class="seg">${[['', 'TUDO'], ['late', 'ATRASADAS'], ['today', 'HOJE'], ['week', '7 DIAS']].map(([k, n]) => `<button class="fb-${k || 'all'} ${fb === k ? 'on' : ''}" data-act="ag-filter" data-b="${k}">${n}</button>`).join('')}</div></div>
        <div class="list qcols">${queue.slice(0, 80).map((t) => `<div class="li" data-list="${R.listOf(t)}" draggable="true" data-tid="${t.id}" title="Arraste até um dia da faixa pra mudar o prazo"><div class="lt" data-act="jump" data-id="${t.id}" style="cursor:pointer">${t.st === 'doing' ? '▶ ' : ''}${t.prio ? '<b class="bad">!</b> ' : ''}${esc(t.text)}<small>${esc(where(t))}</small></div>
          <div class="row" style="flex-wrap:nowrap;gap:6px">${dueChip(t.due, false, true)}<button class="icon-btn" data-act="prio" data-id="${t.id}" title="Prioridade">${t.prio ? '★' : '☆'}</button></div></div>`).join('') || '<div class="empty">nada encontrado.</div>'}</div></div>
      </div>`;
}

/** faixa de dias (volta na v5.15, a pedido do dono): rola pro lado; o número é a carga do dia e a cor diz se pesa */
function dayStrip() {
  const td = today(), load = R.loadByDay(S), rit = R.ritualDates(S, addDays(td, -3), 45);
  const hols = range(td, 60).filter(holidayName).slice(0, 4);
  return `<div class="card" style="margin-bottom:16px"><header><h2>📊 Carga do dia · 6 semanas</h2><span class="meta" title="Toque num dia pra ver as tarefas dele. Arraste uma tarefa da fila até um dia pra mudar o prazo.">${hols.length ? `★ ${hols.map((d) => `${fmtDM(d)} ${esc(holidayName(d))}`).join(' · ')}` : ''}</span></header>
    <div class="daystrip">${range(addDays(td, -3), 45).map((d) => {
      const n = load[d] || 0, hol = holidayName(d), we = weekday(d) === 0 || weekday(d) === 6;
      return `<div class="day ${d === td ? 'today' : ''} ${hol ? 'hol off' : we ? 'off' : ''} ${d < td ? 'past' : ''}" data-act="ag-day" data-d="${d}"><small>${DOW[weekday(d)]} ${fmtDM(d)}</small><div class="n ${n >= 6 ? 'l6' : n >= 4 ? 'l4' : n ? 'l1' : ''}">${n || '·'}</div><small>${rit[d] ? `<span title="${esc(rit[d].map((r) => r.name).join(', '))}">🔁${rit[d].length}</span> ` : ''}${hol ? `<b class="holn" title="${esc(hol)}">★ ${esc(hol.split(' ')[0])}</b>` : ''}</small></div>`;
    }).join('')}</div></div>`;
}

