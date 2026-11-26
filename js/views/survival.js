// SURVIVAL — grade de 2 semanas dos hábitos (anda com a data) + RITUAIS.
import { S } from '../store.js';

import * as R from '../rules.js';
import { tiles } from '../telas.js';
import { esc, today, fmtDM, DOW, addDays, weekStart, range, weekday, lightNow } from '../util.js';
import { pbar, segBar, statusChips } from '../ui.js';
import { reflexaoBanner, resumoSemana } from './extras.js';
import { vitrine } from '../elenco.js';
import { isCollapsed } from '../v3.js';
const topoOf = (k) => `assets/topo/${k}-${lightNow() === 'noite' ? 'noite' : 'dia'}.webp`;


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
    if (h.id === 'rd') info = `total: ${R.totalX(S, 'rd')} · +${R.C.RD_XP} cada`;
    else {
      const sk = R.streak(S, h.id, td);
      info = `🔥${sk.streak} ${sk.mult > 1 ? `x${String(sk.mult).replace('.', ',')}` : ''} · <span title="recorde: maior sequência que você já fez">🏆${R.bestStreak(S, h.id, td)}</span> · <span title="Em média, 66 dias de repetição pra um hábito ficar automático (varia de 18 a 254). Pouco todo dia vence muito de vez em quando.">⚒ ${sk.forged ? 'FORJADO' : `${sk.total}/66`}</span>`;
    }
    return `<tr><th class="hn" title="${esc(h.name)}">${h.icon} <span class="hname">${esc(h.name)}</span></th>${cells}<td class="info">${info}</td></tr>`;
  }).join('');
  const xpRow = days.map((d, i) => `${i === 7 ? '<td class="sep"></td>' : ''}<td style="text-align:center;font:700 12px var(--f-display);color:var(--accent-2)">${S.marks.days[d]?.xp || ''}</td>`).join('');
  const stRow = days.map((d, i) => `${i === 7 ? '<td class="sep"></td>' : ''}<td style="text-align:center;font-size:12px;cursor:var(--cur-hand,pointer)" data-act="day-status" data-d="${d}" title="${R.dayStatus(S, d).list.map((x) => x.name).join(', ')}">${d <= td ? R.dayStatus(S, d).list.filter((x) => x.key !== 'sabado').map((x) => x.icon).join('') : ''}</td>`).join('');
  // v9.0 (pedido do dono): HÁBITOS e RITUAIS ganharam banner (com personagem), como a REFLEXÃO
  return vitrine({ k: 'c:survival:habitos', v: 'habitos', title: '✓ HÁBITOS', sub: 'Toque na casinha: ✓ fiz → – folga → vazio. 66 dias forjam um hábito.', topo: topoOf('survival'), host: ['eve-la', 3, 'EVE LÃ: cuidar de si também é tarefa'], shut: isCollapsed('c:survival:habitos'), body: `
      <div class="row hweek-nav"><button class="btn sm" data-act="hweek" data-dir="-1" aria-label="Semana anterior">◄</button><span class="meta">${fmtDM(days[0])} – ${fmtDM(days[6])}</span><button class="btn sm" data-act="hweek" data-dir="1" aria-label="Próxima semana" ${(ui.hweek || 0) >= 0 ? 'disabled' : ''}>►</button></div>
    <div class="grid2w"><table class="hg"><thead><tr><th></th>${head}<th></th></tr></thead><tbody>${body}
      <tr><th class="hn dim">XP DO DIA</th>${xpRow}<td></td></tr><tr><th class="hn dim">STATUS <span class="meta">(toque)</span></th>${stRow}<td></td></tr></tbody></table></div>
    <div class="hleg" title="Toque na casinha: ✓ fiz → – folga → vazio"><span class="chip soon">✓ fez</span><span class="chip late">✕ falhou</span><span class="chip calm">🛡 perdoada</span><span class="chip">🔥 sequência · 🏆 recorde</span></div>
  <div class="wk-split">${weekCard(today(), ui, true)}${resumoSemana()}</div>` }); // v8.6: DESAFIOS na metade, RESUMO DA SEMANA ao lado
}

export function viewSurvival(ui) {
  const td = today();
  const st = R.dayStatus(S, td);
  let perfectRun = 0;
  for (let d = addDays(td, -1); R.isPerfect(S, d); d = addDays(d, -1)) perfectRun++;
  if (R.isPerfect(S, td)) perfectRun++;
  return `<div class="page-title"><div><h1><em>survival</em>.</h1></div></div>
    <div class="page-actions"><button class="btn" data-act="rest-day">🏕 DESCANSO HOJE</button><button class="btn ${R.tripNow(S) ? 'pri' : ''}" data-act="trip" title="Viagem ou visitas: congela o jogo enquanto você está fora">✈ ${R.tripNow(S) ? 'VOLTEI' : 'VIAGEM'}</button><button class="btn" data-act="edit-habits">✎ HÁBITOS</button><button class="btn" data-act="revisao" title="Domingo, 10 minutos: arquivar, esvaziar a caixa de entrada, escolher as 3 missões e planejar a segunda">🧭 REVISÃO DA SEMANA</button></div> <!-- v7.7: os botões vêm antes dos quadrinhos -->
    ${tiles([
      { label: '🌟 Perfeitos seguidos', value: perfectRun, tone: 'ok', tip: 'Dias seguidos com todos os hábitos feitos' },
      { label: '✓ Hábitos hoje', value: `${R.countX(S, td)}/${S.core.habits.length}`, tone: 'ok' },
      { label: '✨ XP hoje', value: S.marks.days[td]?.xp || 0, cls: 'gold', tone: 'premio', tip: `Multiplicador dos hábitos hoje: x${st.habitMult.toFixed(2).replace('.', ',')}` },
    ])}
    <div class="card status-sv"><header><h2 title="Toque num status pra ver o que é e como resolver">🎭 Status do dia</h2></header><div class="status-line">${statusChips(st, R.alerts(S, td)) || '<span class="meta">nenhum buff nem debuff hoje.</span>'}</div></div>
    ${grid(ui)}${ritualsMini(td)}
    ${reflexaoBanner()}`;
}

/** v7.4: os DESAFIOS DA SEMANA moram DENTRO da janela SEMANA (inside = sem cartão próprio) */
function weekCard(td, ui, inside = false) {
  const ws = addDays(weekStart(td), (ui.hweek || 0) * 7), wc = R.weekChallenges(S, ws, td), g = R.dailyGoal(S), wm = R.weeklyMissions(S, td);
  const xpd = R.idx(S).xpByDay, hit = range(ws, 7).filter((d) => d <= td && (xpd[d] || 0) >= g.goal).length;
  return `<div class="${inside ? 'wk-ch' : 'card c12'}"><${inside ? 'h3' : 'header><h2'} title="Os 5 desafios = 🏆 semana LENDÁRIA (+50 XP). Semana passada lendária = 👑 +25% nos hábitos.">🏆 Desafios da semana</${inside ? 'h3' : 'h2></header'}>
    <div class="bars">${wc.list.map((c) => c.key === 'prazo'
      ? `<div class="bar-row"><span>${c.icon} ${c.name}</span><b class="num ${c.done ? 'good' : ''}" style="font-size:8px">${c.done ? '✓ +50' : esc(c.live || '—')}</b>${segBar(wc.dueTotal ? wc.dueOk / wc.dueTotal : 0, c.done ? 'good sm' : 'sm')}</div>`
      : pbar(`${c.icon} ${c.name} · +${c.xp}`, c.value, c.goal)).join('')}${pbar('🏆 LENDÁRIA · +50', wc.n, 5)}
      ${pbar('🔥 Dias batendo a meta (' + g.goal + ' XP)', hit, 5)}${pbar('📌 Missões da semana', wm.done, 3)}</div></div>`;
}

const RIT_ICON = { pessoa: '👥', rotina: '🔁', trabalho: '💼' };
/** uma linha de ritual: nome, quando, selo, 📅 marcar o dia e ✓ FIZ */
export function ritualRow(r, td = today()) {
  const s = R.ritualStatus(r, td);
  return `<div class="li" data-rit="${r.id}"><div class="lt" data-act="edit-ritual" data-id="${r.id}" style="cursor:var(--cur-hand,pointer)">${RIT_ICON[r.type] || '🔁'} ${esc(r.name)}<small>${s.next ? DOW[weekday(s.next)] + ' ' + fmtDM(s.next) : '—'}${s.plan ? ' · dia marcado por você' : ' · ' + R.ritualRepete(r)}${r.at ? ` · às ${esc(r.at)}` : ''}</small></div>
      <div class="row" style="flex-wrap:nowrap;gap:6px"><span class="chip ${s.left != null && s.left <= 0 ? 'late' : s.tone === 'bad' ? 'late' : s.tone === 'warn' || (s.left != null && s.left <= 1) ? 'week' : 'soon'}">${esc(s.label)}</span><button class="btn sm ghost" data-act="ritual-plan" data-id="${r.id}" title="Marcar o dia em que vou fazer">📅</button>${r.last === td ? `<button class="btn sm ghost" data-act="ritual-undo" data-id="${r.id}" title="Desfazer">↺</button>` : `<button class="btn sm" data-act="ritual-done" data-id="${r.id}">✓ FIZ</button>`}</div></div>`;
}
function ritualsMini(td) {
  const list = [...S.core.rituals].sort((a, b) => (R.ritualStatus(a, td).left ?? 99) - (R.ritualStatus(b, td).left ?? 99));
  return vitrine({ k: 'c:survival:rituais', v: 'rituais', title: '🔁 RITUAIS', sub: 'O que volta de tempos em tempos: gente, casa, trabalho.', topo: topoOf('rotina'), host: ['tia-mia', 2, 'TIA MIA: o chá é toda tarde, sem falta'], shut: isCollapsed('c:survival:rituais'), body: `<div class="row" style="justify-content:flex-end;margin-bottom:8px"><button class="btn sm" data-act="edit-ritual">+ RITUAL</button></div>
    <div class="list">${list.map((r) => ritualRow(r, td)).join('') || '<div class="empty">nenhum ritual.</div>'}</div>` });
}

