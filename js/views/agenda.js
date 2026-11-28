// AGENDA — controle de prazos, linha do tempo de 6 semanas (◄ ► troca a semana), fila com filtro.
import { S } from '../store.js';
import { isCollapsed } from '../v3.js';
import { miniMosca } from '../moscas.js';
import { tiles } from '../telas.js';
import { filtroBody } from './filtro.js';

import * as R from '../rules.js';
import { esc, today, fmtDM, DOW, addDays, range, weekday, weekStart, holidayName, lightNow } from '../util.js';
import { diaCard } from '../planos.js';


/** v10.1 (pedido do dono: "antes tava bom, só precisava melhorar, não mudar tudo"): a TABELA de 6 semanas voltou, mais fácil de ler:
 *  coluna de nomes presa à esquerda, separador em cada semana, coluna de HOJE destacada de cima a baixo, blocos em ordem de prazo,
 *  e duas seções novas: 🔁 RITUAIS (um por linha, 🔁 nos dias dele) e 🐸 SAPOS (quantos vencem em cada dia). Toque no nome = vai até ele. */
function timelineCard(ui) {
  const td = today();
  const start = addDays(weekStart(td), (ui.tlWeek || 0) * 7);
  const days = range(start, 42);
  const tl = R.timeline(S, start, 42);
  const off = (d) => (holidayName(d) ? 'hol' : weekday(d) === 0 || weekday(d) === 6 ? 'we' : '');
  const wk = (d) => (weekday(d) === 1 ? 'wk0' : ''); // segunda-feira: linha grossa separando as semanas
  const head1 = [0, 1, 2, 3, 4, 5].map((w) => `<th class="wk" colspan="7">${days[w * 7] <= td && td <= days[w * 7 + 6] ? 'ESTA SEMANA' : 'SEM ' + fmtDM(days[w * 7])}</th>`).join('');
  const head2 = days.map((d) => `<th class="${d === td ? 'today' : off(d)} ${wk(d)}" title="${esc(holidayName(d) || '')}">${DOW[weekday(d)][0]}<br>${d.slice(8)}${holidayName(d) ? '<i class="holm">★</i>' : ''}</th>`).join('');
  const cell = (d, inner = '', extra = '') => `<td class="${d === td ? 'today' : off(d)} ${wk(d)} ${extra}">${inner}</td>`;
  const name = (act, id, txt, sub = '') => `<td class="name" data-act="${act}" data-id="${id}" title="${esc(txt)}" style="cursor:var(--cur-hand,pointer)">${esc(txt)}${sub ? `<small>${esc(sub)}</small>` : ''}</td>`;
  const sec = (t) => `<tr class="tl-sec"><td class="name">${t}</td><td colspan="42"></td></tr>`;
  // ▣ BLOCOS: a faixa colorida vai de hoje até o prazo final (a cor é a da data); o número = tarefas que vencem no dia; ◆ = prazo final
  const blocks = [...tl.blocks].sort((a, b) => (a.due || Object.keys(a.counts).sort().at(-1) || '9').localeCompare(b.due || Object.keys(b.counts).sort().at(-1) || '9')).map((b) => {
    const dues = Object.keys(b.counts).sort(), endD = b.due || dues[dues.length - 1];
    return `<tr>${name('jump-block', b.block, b.title || b.name, b.due ? '◆ ' + fmtDM(b.due) : '')}${days.map((d) => {
      const inSpan = endD && d >= td && d <= endD, left = inSpan ? Math.round((new Date(endD) - new Date(d)) / 864e5) : 0;
      const heat = !inSpan ? '' : left <= 0 ? 'h-urg' : left <= 7 ? 'h-atencao' : 'h-ok';
      const n = b.counts[d] || 0;
      return cell(d, n ? `<b>${n}</b>` : b.due === d ? '◆' : '', `${inSpan ? 'span ' + heat : ''} ${b.due === d ? 'end' : ''} ${n && d < td ? 'late' : ''}`);
    }).join('')}</tr>`;
  }).join('');
  // 🔁 RITUAIS: um por linha, com o 🔁 em cada dia que ele cai
  const rd = R.ritualDates(S, start, 42), byRit = {};
  for (const [d, rs] of Object.entries(rd)) for (const r of rs) (byRit[r.id] ||= { r, ds: new Set() }).ds.add(d);
  const rits = Object.values(byRit).sort((a, b) => [...a.ds].sort()[0].localeCompare([...b.ds].sort()[0])).map(({ r, ds }) => `<tr class="tl-rit">${name('jump-rit', r.id, r.name, R.ritualStatus(r, td).label)}${days.map((d) => cell(d, ds.has(d) ? '🔁' : '', ds.has(d) ? 'rit' + (d < td ? ' late' : '') : '')).join('')}</tr>`).join('');
  // 🐸 SAPOS: quantos SAPOS (prioridade) vencem em cada dia
  const sap = {}; for (const t of R.openTasks(S)) if (t.prio && t.due && t.st !== 'wait') sap[t.due] = (sap[t.due] || 0) + 1;
  const sapos = Object.keys(sap).some((d) => d >= days[0] && d <= days[41]) ? `<tr class="tl-sapo"><td class="name">🐸 SAPOS</td>${days.map((d) => cell(d, sap[d] ? `<b>${sap[d]}</b>` : '', sap[d] ? 'sapo' : '')).join('')}</tr>` : '';
  return `<div class="cal-part c12"><div class="cal-h"><h3>Linha do tempo · 6 semanas</h3>
      <div class="row"><button class="btn sm" data-act="tl-week" data-dir="-1" aria-label="Semana anterior">◄</button><button class="btn sm" data-act="tl-week" data-dir="0">HOJE</button><button class="btn sm" data-act="tl-week" data-dir="1" aria-label="Próxima semana">►</button></div></div>
    <p class="meta tl-leg">faixa = de hoje até o prazo do bloco (🟥 vence hoje · 🟨 essa semana · 🟩 mais pra frente) · número = tarefas que vencem no dia · ◆ prazo final · 🔁 ritual</p>
    <div class="tl tl2"><table><thead><tr><th class="name"></th>${head1}</tr><tr><th class="name"></th>${head2}</tr></thead>
      <tbody>${sapos}${blocks ? sec('▣ BLOCOS') + blocks : ''}${rits ? sec('🔁 RITUAIS') + rits : ''}</tbody></table></div></div>`;
}

export function viewAgenda(ui) {
  const td = today();
  const open = R.openTasks(S);
  const over = open.filter((t) => t.due && t.due < td);
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
  // v6: os rituais dos próximos 14 dias entram na fila, em azul (azul = ritual/destaque), na ordem da data
  const rits = (S.core.rituals || []).map((r) => ({ r, s: R.ritualStatus(r, td) })).filter((x) => x.s.next && x.s.left <= 14 && (!q || x.r.name.toLowerCase().includes(q)) && (fb !== 'late' || x.s.left < 0) && (fb !== 'today' || x.s.left === 0) && (fb !== 'week' || x.s.left <= 7));
  const rows = [...queue.slice(0, 80).map((t) => ({ t, k: t.due || '9999' })), ...rits.map((x) => ({ ...x, k: x.s.next }))].sort((a, b) => a.k.localeCompare(b.k));
  const blow = R.blowState(S), blowPct = Math.round((R.BLOW_MULT - 1) * 100);
  return `<div class="page-title"><div><h1><em>agenda</em>.</h1></div></div>
    <div class="page-actions"><button class="btn pri" data-act="distribute">📅 DISTRIBUIR PRAZOS</button><button class="btn" data-act="plan-change">🔀 MUDANÇA DE PLANOS</button><button class="btn" data-act="plan-tomorrow">🌙 PLANEJAR AMANHÃ</button></div> <!-- v7.7: os botões vêm antes dos quadrinhos -->
    ${tiles([
      { label: 'Pontualidade 30d', value: punct == null ? '—' : punct + '%', tone: 'ok', tip: 'Das tarefas com prazo concluídas nos últimos 30 dias, quantas saíram no prazo.' },
      { label: '🎯 No prazo seguidas', value: seq, tone: 'ok', tip: seq >= 5 ? 'RELÓGIO SUÍÇO!' : '5 seguidas no prazo = RELÓGIO SUÍÇO' },
      { label: '💥 Estourados', value: `${blow.n % R.BLOW_EVERY}/${R.BLOW_EVERY}`, cls: blow.active ? 'bad' : '', tone: 'urg', tip: blow.active ? `Castigo ativo: loja +${blowPct}%. Resolva 1 atrasada antiga pra cancelar.` : `A cada ${R.BLOW_EVERY} prazos estourados, a loja fica ${blowPct}% mais cara por ${R.BLOW_DAYS} dias.` },
    ])}
    ${diaCard(ui, isCollapsed('c:agenda:meu-dia'))}
    <section class="vitrine cal-v ${isCollapsed('c:agenda:calendario') ? 'shut' : ''}" data-v="calendario"><header class="vit-h" data-act="collapse" data-k="c:agenda:calendario" title="Toque pra recolher ou abrir o CALENDÁRIO" style="--img:url('${new URL(`assets/topo/${CAL_ART ? 'calendario' : 'agenda'}-${lightNow() === 'noite' ? 'noite' : 'dia'}.webp`, document.baseURI).href}')"><div><h2><span class="chev">${isCollapsed('c:agenda:calendario') ? '▸' : '▾'}</span> 📅 CALENDÁRIO</h2><p>A carga de cada dia e a linha do tempo dos blocos, juntas. 🪰 = o dia em que o TREM fica trapaiado.</p></div></header>
      ${isCollapsed('c:agenda:calendario') ? '' : `<div class="vit-b">${dayStrip()}<div class="grid">${timelineCard(ui)}</div></div>`}</section>
    <section class="vitrine filtro-v ${isCollapsed('c:agenda:filtro') ? 'shut' : ''}" id="filtro-v" data-v="filtro"><header class="vit-h" data-act="collapse" data-k="c:agenda:filtro" title="Toque pra recolher ou abrir o FILTRO" style="--img:url('${new URL(`assets/topo/filtro-${lightNow() === 'noite' ? 'noite' : 'dia'}.webp`, document.baseURI).href}')"><div><h2><span class="chev">${isCollapsed('c:agenda:filtro') ? '▸' : '▾'}</span> 🔍 FILTRO</h2><p>Tudo em aberto, numa tabela. Toque num quadrinho pra filtrar, no cabeçalho pra ordenar, na linha pra abrir.</p></div></header>
      ${isCollapsed('c:agenda:filtro') ? '' : `<div class="vit-b">${filtroBody(ui)}</div>`}</section>`;
}

/** faixa de dias (volta na v5.15, a pedido do dono): rola pro lado; o número é a carga do dia e a cor diz se pesa */
/** v7.4: CARGA DO DIA + LINHA DO TEMPO numa seção só (CALENDÁRIO). true quando existir assets/topo/calendario-<dia|noite>.webp (arte B-14) */
const CAL_ART = false;
/** v7.0: a 💀 só aparece nos próximos N dias (o inimigo que está chegando de verdade). Caveira em todo dia vira papel de parede. */
const SKULL_DAYS = 3;
function dayStrip() {
  const td = today(), load = R.loadByDay(S), rit = R.ritualDates(S, addDays(td, -3), 45);
  const hols = range(td, 60).filter(holidayName).slice(0, 4);
  return `<div class="cal-part" style="margin-bottom:16px"><div class="cal-h"><h3>📊 Carga do dia · 6 semanas</h3><span class="meta" title="Toque num dia pra ver as tarefas dele. Arraste uma tarefa da fila até um dia pra mudar o prazo.">${hols.length ? `★ ${hols.map((d) => `${fmtDM(d)} ${esc(holidayName(d))}`).join(' · ')}` : ''}</span></div>
    <div class="daystrip">${((pd) => (S.quests.tasks.filter((t) => R.isOpen(t) && t.due && t.st !== 'wait' && !t.who && !t.mother).forEach((t) => { const x = R.neuroOn(S, 'praga') ? R.pragaDay(S, t.due, 1) : null; /* v7.0: a caveira avisa ANTES: o dia em que a tarefa vira TREM TRAPAIADO */ if (x) (pd[x] ||= []).push(t.text.replace(/\s*\(\d+\s*XP\)/i, '')); }), (window.__pragaDays = pd), ''))({})}${range(addDays(td, -3), 45).map((d) => {
      const n = load[d] || 0, hol = holidayName(d), we = weekday(d) === 0 || weekday(d) === 6;
      return `<div class="day ${d === td ? 'today' : ''} ${hol ? 'hol off' : we ? 'off' : ''} ${d < td ? 'past' : ''}" data-act="ag-day" data-d="${d}"><small>${DOW[weekday(d)]} ${fmtDM(d)}</small><div class="n ${n >= 6 ? 'l6' : n >= 4 ? 'l4' : n ? 'l1' : ''}">${n || '·'}</div>${window.__pragaDays?.[d] && d >= td && d <= addDays(td, SKULL_DAYS) ? `<i class="pg-skull" title="🪰 O TREM chega aqui. Se ninguém fizer até a véspera, neste dia vira TREM TRAPAIADO: ${esc(window.__pragaDays[d].slice(0, 4).join(' · ').slice(0, 160))}">${miniMosca(window.__pragaDays[d].length)}</i>` : ''}<small>${rit[d] ? `<span title="${esc(rit[d].map((r) => r.name).join(', '))}">🔁${rit[d].length}</span> ` : ''}${((bs) => (bs.length ? `<span class="rit-n blk-n" title="Prazo final: ${esc(bs.map((b) => b.title).join(', '))}">◆${bs.length}</span> ` : ''))(S.quests.blocks.filter((b) => b.st !== 'done' && b.due === d))}${hol ? `<b class="holn" title="${esc(hol)}">★ ${esc(hol.split(' ')[0])}</b>` : ''}</small></div>`;
    }).join('')}</div></div>`;
}

