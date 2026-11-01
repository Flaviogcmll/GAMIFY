// SURVIVAL — grade de 2 semanas dos hábitos (anda com a data) + RITUAIS.
import { S } from '../store.js';

import * as R from '../rules.js';
import { esc, today, fmtDM, DOW, addDays, weekStart, range, weekday } from '../util.js';
import { pbar, segBar } from '../ui.js';


function grid(ui) {
  const td = today();
  const start = addDays(weekStart(td), (ui.hweek || 0) * 7);
  const days = range(start, 7);
  const rows = [...S.core.habits, { id: 'rd', icon: '⚔', name: 'REDENÇÃO' }];
  const head = days.map((d, i) => `${i === 7 ? '<th class="sep"></th>' : ''}<th>${DOW[weekday(d)]}<br>${fmtDM(d)}</th>`).join('');
  const body = rows.map((h) => {
    const cells = days.map((d, i) => {
      const v = S.marks.days[d]?.h?.[h.id] || '';
      const future = d > td;
      let cls = v === 'x' ? 'x' : v === '-' ? 'f' : '';
      if (!v && h.id !== 'rd' && d < td && R.failed(S, h.id, d)) cls = R.forgiven(S, h.id, d) ? 'forg' : 'fail';
      if (d === td) cls += ' today';
      if (weekday(d) === 6) cls += ' sat';
      if (future) cls += ' future';
      const tip = cls.includes('forg') ? '🛡 falha perdoada (1 por semana)' : cls.includes('fail') ? 'falhou' : '';
      return `${i === 7 ? '<td class="sep"></td>' : ''}<td class="c ${cls}" ${future ? '' : `data-act="habit" data-d="${d}" data-h="${h.id}"`} title="${tip}">${v === 'x' ? '✓' : v === '-' ? '–' : cls.includes('forg') ? '🛡' : ''}</td>`;
    }).join('');
    let info = '';
    if (h.id === 'rd') info = `total: ${R.totalX(S, 'rd')} · +30 cada`;
    else {
      const sk = R.streak(S, h.id, td);
      info = `🔥${sk.streak} ${sk.mult > 1 ? `x${String(sk.mult).replace('.', ',')}` : ''} · ⚒ ${sk.forged ? 'FORJADO' : `${sk.total}/66`}`;
    }
    return `<tr><th class="hn" title="${esc(h.name)}">${h.icon} <span class="hname">${esc(h.name)}</span></th>${cells}<td class="info">${info}</td></tr>`;
  }).join('');
  const xpRow = days.map((d, i) => `${i === 7 ? '<td class="sep"></td>' : ''}<td style="text-align:center;font:700 12px var(--f-display);color:var(--accent-2)">${S.marks.days[d]?.xp || ''}</td>`).join('');
  const stRow = days.map((d, i) => `${i === 7 ? '<td class="sep"></td>' : ''}<td style="text-align:center;font-size:12px;cursor:pointer" data-act="day-status" data-d="${d}" title="${R.dayStatus(S, d).list.map((x) => x.name).join(', ')}">${d <= td ? R.dayStatus(S, d).list.filter((x) => x.key !== 'sabado').map((x) => x.icon).join('') : ''}</td>`).join('');
  return `<div class="card c12"><header><h2>Semana</h2>
      <div class="row"><button class="btn sm" data-act="hweek" data-dir="-1" aria-label="Semana anterior">◄</button><span class="meta">${fmtDM(days[0])} – ${fmtDM(days[6])}</span><button class="btn sm" data-act="hweek" data-dir="1" aria-label="Próxima semana" ${(ui.hweek || 0) >= 0 ? 'disabled' : ''}>►</button></div></header>
    <div class="grid2w"><table class="hg"><thead><tr><th></th>${head}<th></th></tr></thead><tbody>${body}
      <tr><th class="hn dim">XP DO DIA</th>${xpRow}<td></td></tr><tr><th class="hn dim">STATUS <span class="meta">(toque)</span></th>${stRow}<td></td></tr></tbody></table></div>
    <div class="hleg"><span class="chip">toque: ✓ fiz → – folga → vazio</span><span class="chip soon">verde = fez</span><span class="chip late">vermelho = falhou</span><span class="chip today">🛡 perdoada</span></div>
  </div>`;
}

export function viewSurvival(ui) {
  const td = today();
  const st = R.dayStatus(S, td);
  let perfectRun = 0;
  for (let d = addDays(td, -1); R.isPerfect(S, d); d = addDays(d, -1)) perfectRun++;
  if (R.isPerfect(S, td)) perfectRun++;
  return `<div class="page-title"><div><h1><em>survival</em>.</h1></div>
      <div class="row"><button class="btn" data-act="rest-day">🏕 DESCANSO HOJE</button><button class="btn" data-act="redemption">⚔ REDENÇÃO</button><button class="btn" data-act="edit-habits">✎ HÁBITOS</button></div></div>
    <div class="stats" style="margin-bottom:14px">
      <div class="stat"><small>🌟 Perfeitos seguidos</small><b>${perfectRun}</b></div>
      <div class="stat"><small>Hoje</small><b>${R.countX(S, td)}/${S.core.habits.length}</b><span>hábitos</span></div>
      <div class="stat"><small>XP hoje</small><b class="acc">${S.marks.days[td]?.xp || 0}</b><span>x${st.habitMult.toFixed(2).replace('.', ',')}</span></div>
      <div class="stat"><small>Status</small><b style="font-size:16px">${st.list.map((x) => x.icon).join(' ') || '✅'}</b></div>
    </div>
    <div class="grid">${grid(ui)}${weekCard(td, ui)}${ritualsMini(td)}</div>`;
}

function weekCard(td, ui) {
  const ws = addDays(weekStart(td), (ui.hweek || 0) * 7), wc = R.weekChallenges(S, ws, td), g = R.dailyGoal(S), wm = R.weeklyMissions(S, td);
  const xpd = R.idx(S).xpByDay, hit = range(ws, 7).filter((d) => d <= td && (xpd[d] || 0) >= g.goal).length;
  return `<div class="card c12"><header><h2>Desafios da semana</h2><span class="meta">os 5 = 🏆 LENDÁRIA +50 · semana passada lendária = 👑 +25% nos hábitos</span></header>
    <div class="bars">${wc.list.map((c) => c.key === 'prazo'
      ? `<div class="bar-row"><span>${c.icon} ${c.name}</span><b class="num ${c.done ? 'good' : ''}" style="font-size:8px">${c.done ? '✓ +50' : esc(c.live || '—')}</b>${segBar(wc.dueTotal ? wc.dueOk / wc.dueTotal : 0, c.done ? 'good sm' : 'sm')}</div>`
      : pbar(`${c.icon} ${c.name} · +${c.xp}`, c.value, c.goal)).join('')}${pbar('🏆 LENDÁRIA · +50', wc.n, 5)}
      ${pbar('🔥 Dias batendo a meta (' + g.goal + ' XP)', hit, 5)}${pbar('📌 Missões da semana', wm.done, 3)}</div></div>`;
}

function ritualsMini(td) {
  const icon = { pessoa: '👥', rotina: '🔁', trabalho: '💼' };
  const list = [...S.core.rituals].map((r) => ({ r, s: R.ritualStatus(r, td) })).sort((a, b) => (a.s.left ?? 99) - (b.s.left ?? 99));
  return `<div class="card c12"><header><h2>🔁 Rituais</h2><button class="btn sm" data-act="edit-ritual">+ RITUAL</button></header>
    <div class="list">${list.map(({ r, s }) => `<div class="li"><div class="lt" data-act="edit-ritual" data-id="${r.id}" style="cursor:pointer">${icon[r.type] || '🔁'} ${esc(r.name)}<small>${s.next ? DOW[weekday(s.next)] + ' ' + fmtDM(s.next) : '—'}</small></div>
      <div class="row" style="flex-wrap:nowrap;gap:6px"><span class="chip ${s.tone === 'bad' ? 'late' : s.tone === 'warn' ? 'today' : 'soon'}">${esc(s.label)}</span>${r.last === td ? `<button class="btn sm ghost" data-act="ritual-undo" data-id="${r.id}" title="Desfazer">↺</button>` : `<button class="btn sm" data-act="ritual-done" data-id="${r.id}">✓ FIZ</button>`}</div></div>`).join('') || '<div class="empty">nenhum ritual.</div>'}</div>
</div>`;
}
