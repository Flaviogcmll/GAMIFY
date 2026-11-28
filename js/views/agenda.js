// AGENDA — controle de prazos, linha do tempo de 6 semanas (◄ ► troca a semana), fila com filtro.
import { S } from '../store.js';
import { isCollapsed } from '../v3.js';
import { miniMosca } from '../moscas.js';
import { tiles } from '../telas.js';
import { filtroBody } from './filtro.js';

import * as R from '../rules.js';
import { esc, today, fmtDM, DOW, addDays, range, weekday, weekStart, holidayName, lightNow } from '../util.js';
import { diaCard } from '../planos.js';


/** v10 (pedido do dono: "organiza a linha do tempo de um jeito melhor"): 6 SEMANAS em linhas. Cada semana mostra um mini-gráfico da
 *  carga de cada dia (quantas tarefas vencem) e, em ordem de data, o que importa: ◆ prazo final dos blocos, 🔁 rituais e 🐸 SAPOS.
 *  Cor = a da data (PRA HOJE / ESSA SEMANA / MAIS PRA FRENTE). Tocar leva até a coisa; tocar num dia do gráfico abre o dia. */
function timelineCard(ui) {
  const td = today(), start = addDays(weekStart(td), (ui.tlWeek || 0) * 7);
  const rit = R.ritualDates(S, start, 42), load = R.loadByDay(S);
  const blocks = S.quests.blocks.filter((b) => b.st !== 'done' && b.color !== 'black' && b.due);
  const sapos = R.openTasks(S).filter((t) => t.prio && t.due && t.st !== 'wait');
  const cor = (d) => (d < td ? 'late' : R.autoCor(S, d, td) || '');
  const chip = (x) => `<button type="button" class="tlc ${x.k} ${cor(x.d)}" data-act="${x.k === 'blk' ? 'jump-block' : x.k === 'rit' ? 'jump-rit' : 'jump'}" data-id="${x.id}" title="${esc(x.txt)}"><b>${DOW[weekday(x.d)].slice(0, 3)} ${x.d.slice(8)}</b> ${x.k === 'blk' ? '◆' : x.k === 'rit' ? '🔁' : '🐸'} ${esc(String(x.txt).replace(/\s*\(\d+\s*XP\)/i, '').slice(0, 42))}${x.n > 1 ? ` <em>×${x.n}</em>` : ''}</button>`;
  const late = (ui.tlWeek || 0) === 0 ? blocks.filter((b) => b.due < td).map((b) => ({ d: b.due, k: 'blk', id: b.id, txt: b.title })) : [];
  const weeks = [0, 1, 2, 3, 4, 5].map((w) => {
    const a = addDays(start, w * 7), z = addDays(a, 6), days = range(a, 7);
    const items = [...blocks.filter((b) => b.due >= a && b.due <= z).map((b) => ({ d: b.due, k: 'blk', id: b.id, txt: b.title })),
      // ritual que repete várias vezes na semana vira UMA pílula com "×N" (a 1ª data); antes enchia a semana de repetição
      ...Object.values(Object.entries(rit).filter(([d]) => d >= a && d <= z).sort().reduce((m, [d, rs]) => { for (const r of rs) { const x = (m[r.id] ||= { d, k: 'rit', id: r.id, txt: r.name, n: 0 }); x.n++; } return m; }, {})),
      ...sapos.filter((t) => t.due >= a && t.due <= z).map((t) => ({ d: t.due, k: 'sapo', id: t.id, txt: t.text }))].sort((x, y) => (x.k === 'rit') - (y.k === 'rit') || x.d.localeCompare(y.d));
    const tot = days.reduce((n, d) => n + (load[d] || 0), 0), max = Math.max(4, ...days.map((d) => load[d] || 0));
    const bars = days.map((d) => { const n = load[d] || 0; return `<button type="button" class="tlb ${d === td ? 'today' : ''} ${d < td ? 'past' : ''} ${holidayName(d) || weekday(d) === 0 || weekday(d) === 6 ? 'off' : ''}" data-act="ag-day" data-d="${d}" title="${DOW[weekday(d)]} ${fmtDM(d)}: ${n} tarefa(s)${holidayName(d) ? ' · ★ ' + holidayName(d) : ''}"><i style="height:${Math.round((n / max) * 100)}%" class="${n >= 6 ? 'l6' : n >= 4 ? 'l4' : n ? 'l1' : ''}"></i><small>${DOW[weekday(d)][0]}</small></button>`; }).join('');
    const cur = td >= a && td <= z;
    return `<div class="tlw ${cur ? 'cur' : ''}"><div class="tlw-h"><b>${cur ? 'ESTA SEMANA' : w === 1 && !ui.tlWeek ? 'PRÓXIMA' : 'SEM'} <small>${fmtDM(a)}–${fmtDM(z)}</small></b><span class="meta">${tot} tarefa${tot === 1 ? '' : 's'}</span><div class="tlw-bars">${bars}</div></div>
      <div class="tlw-items">${items.map(chip).join('') || '<span class="meta">nada marcado: semana livre pra adiantar</span>'}</div></div>`;
  }).join('');
  return `<div class="cal-part c12"><div class="cal-h"><h3>🗓 Linha do tempo · 6 semanas</h3>
      <div class="row"><button class="btn sm" data-act="tl-week" data-dir="-1" aria-label="Semana anterior">◄</button><button class="btn sm" data-act="tl-week" data-dir="0">HOJE</button><button class="btn sm" data-act="tl-week" data-dir="1" aria-label="Próxima semana">►</button></div></div>
    <p class="meta" style="margin:0 0 8px">◆ prazo final do bloco · 🔁 ritual · 🐸 SAPO. As barrinhas = quantas tarefas vencem em cada dia (toque pra ver).</p>
    ${late.length ? `<div class="tlw late"><div class="tlw-h"><b>⚠ BLOCOS ATRASADOS</b></div><div class="tlw-items">${late.map(chip).join('')}</div></div>` : ''}
    <div class="tlws">${weeks}</div></div>`;
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

