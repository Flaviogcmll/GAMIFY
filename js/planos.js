// v8.7 (pedidos do dono, rodada 6): o DIA POR HORAS na AGENDA (tipo Google Agenda: as horas, a rotina daquela hora
// e as tarefas com horário), o PLANEJAR AMANHÃ (o app pergunta à noite, antes de dormir) e a MUDANÇA DE PLANOS
// (hoje → amanhã: concluir, empurrar, mudar a cor ou cancelar, tudo numa janela só, rápido).
import { S } from './store.js';
import * as R from './rules.js';
import * as A from './actions.js';
import { esc, today, addDays, fmtDM, weekday, DOW } from './util.js';
import { openModal, closeModal, modalOpen, toast } from './ui.js';
import { sfx } from './audio.js';

const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const clean = (t) => String(t || '').replace(/\s*\(\d+\s*XP\)/i, '');
const toMin = (h) => { const [a, b] = String(h).split(':'); return +a * 60 + (+b || 0); };
const hourOf = (t) => t.at || t.box?.at || '';
const dayName = (d) => (d === today() ? 'HOJE' : d === addDays(today(), 1) ? 'AMANHÃ' : d === addDays(today(), -1) ? 'ONTEM' : DOW[weekday(d)]);

/** as tarefas abertas de um dia (com horário e sem), mais os rituais marcados pra ele */
function dayItems(d) {
  const tasks = R.openTasks(S).filter((t) => t.due === d && t.st !== 'wait' && !t.mother);
  const rits = (S.core.rituals || []).filter((r) => R.ritualStatus(r, today()).next === d);
  return { timed: tasks.filter(hourOf).sort((a, b) => toMin(hourOf(a)) - toMin(hourOf(b))), loose: tasks.filter((t) => !hourOf(t)), rits };
}

/** 🗓 MEU DIA: as horas do dia (as da ROTINA), o que a rotina manda em cada hora e as tarefas com horário. ◄ ► troca o dia. */
export function diaCard(ui) {
  const td = today(), d = addDays(td, ui.agDay || 0), r = S.core.routine, plan = r?.plans?.[Math.min(r.active ?? 0, (r.plans?.length || 1) - 1)];
  const hours = r?.hours?.length ? r.hours : ['07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22'];
  const wd = WD[weekday(d)], { timed, loose, rits } = dayItems(d);
  const now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
  const slotOf = (hm) => [...hours].reverse().find((h) => toMin(h) <= toMin(hm)) || hours[0];
  const bySlot = {}; for (const t of timed) (bySlot[slotOf(hourOf(t))] ||= []).push(t);
  const cur = d === td ? [...hours].reverse().find((h) => toMin(h) <= nowM) : null;
  const chip = (t) => `<button class="dia-t" data-act="edit-task" data-id="${t.id}" data-color="${R.colorOfTask(S, t) || ''}" title="Abrir a tarefa (dá pra mudar o horário lá)"><b>${esc(hourOf(t))}</b> ${esc(clean(t.text))}</button>`;
  const rows = hours.map((h) => { const rot = plan?.grid?.[`${wd}|${h}`] || '', items = bySlot[h] || [];
    return `<div class="dia-h ${h === cur ? 'now' : ''} ${items.length ? 'has' : ''}"><span class="dia-hh">${esc(h)}${String(h).includes(':') ? '' : 'h'}</span><span class="dia-rot">${esc(rot)}</span><span class="dia-ts">${items.map(chip).join('')}</span></div>`; }).join('');
  return `<div class="card c12 dia-card" data-gk="meu-dia"><header><h2>🗓 Meu dia</h2>
      <div class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn sm" data-act="ag-dia" data-dir="-1" aria-label="Dia anterior">◄</button><span class="meta dia-n"><b>${dayName(d)}</b> ${fmtDM(d)}</span><button class="btn sm" data-act="ag-dia" data-dir="1" aria-label="Próximo dia">►</button>${ui.agDay ? '<button class="btn sm ghost" data-act="ag-dia" data-dir="0">HOJE</button>' : ''}</div></header>
    <div class="dia-actions"><button class="btn sm" data-act="plan-tomorrow">🌙 PLANEJAR AMANHÃ</button><button class="btn sm" data-act="plan-change">🔀 MUDANÇA DE PLANOS</button></div>
    <div class="dia-grid">${rows}</div>
    ${loose.length || rits.length ? `<div class="dia-loose"><small class="meta">sem horário (toque pra marcar a hora)</small>${loose.map((t) => `<button class="dia-t" data-act="edit-task" data-id="${t.id}" data-color="${R.colorOfTask(S, t) || ''}">${esc(clean(t.text))}</button>`).join('')}${rits.map((x) => `<button class="dia-t rit" data-act="edit-ritual" data-id="${x.id}">🔁 ${esc(x.name)}</button>`).join('')}</div>` : `<p class="meta" style="margin:8px 0 0">${timed.length ? '' : 'Nada marcado pra esse dia.'}</p>`}</div>`;
}

// ───── 🌙 PLANEJAR AMANHÃ: o que vai pra amanhã, com horário, e o que sobrou de hoje ─────
function planHtml() {
  const td = today(), tm = addDays(td, 1), items = R.openTasks(S).filter((t) => t.due === tm && t.st !== 'wait' && !t.mother).sort((a, b) => (hourOf(a) || '99').localeCompare(hourOf(b) || '99'));
  const left = R.openTasks(S).filter((t) => t.due && t.due <= td && t.st !== 'wait' && !t.mother);
  return `<div class="planos"><h2>🌙 planejar amanhã <small class="meta">${DOW[weekday(tm)]} ${fmtDM(tm)}</small></h2>
    <p class="meta" style="margin:0 0 8px">Dê um horário pro que importa: amanhã cedo é só seguir o MEU DIA na AGENDA.</p>
    <div class="list">${items.map((t) => `<div class="li"><div class="lt">${esc(clean(t.text))}<small>${esc(R.COR_NAMES[R.corOf(S, t)] || '')}</small></div><input class="inp" type="time" value="${esc(hourOf(t))}" data-plan-at="${t.id}" aria-label="Horário" style="width:auto"></div>`).join('') || '<div class="empty">nada marcado pra amanhã ainda.</div>'}</div>
    <form class="addline" data-form="plan-add" autocomplete="off" style="margin-top:8px"><input class="inp" name="text" placeholder="+ mais uma pra amanhã (Enter)" aria-label="Nova tarefa pra amanhã"></form>
    ${left.length ? `<h3 class="px" style="font-size:8px;margin:14px 0 6px">SOBROU DE HOJE (${left.length})</h3><div class="list">${left.map((t) => `<div class="li"><div class="lt">${esc(clean(t.text))}<small>${t.due < td ? 'atrasada' : 'hoje'}</small></div><span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn sm good" data-act="plan-done" data-id="${t.id}" title="Já fiz">✓</button><button class="btn sm" data-act="plan-move" data-id="${t.id}" data-d="${tm}" title="Vai pra amanhã">→ AMANHÃ</button></span></div>`).join('')}</div>` : ''}
    <div class="actions"><button class="btn pri" data-close>BOA NOITE ▸</button></div></div>`;
}
export function openPlanTomorrow() { ls.set('gamify-ui:plan-ask', today()); openModal(planHtml(), { wide: true }); }
/** à noite (DESACELERAR ou TOQUE DE RECOLHER), uma vez por dia, o app pergunta o plano de amanhã (pedido do dono) */
export function maybePlanAsk() {
  if (!R.neuroOn(S, 'clock') || modalOpen() || ls.get('gamify-ui:plan-ask') === today() || ls.get('gamify-ui:plan-ask-off') === '1') return;
  if (!['desacelerar', 'recolher'].includes(R.bodyClock(S).key)) return;
  setTimeout(() => { if (!modalOpen()) openPlanTomorrow(); }, 1500);
}

// ───── 🔀 MUDANÇA DE PLANOS: HOJE e AMANHÃ numa janela; cada tarefa com ✓, empurrar, cor e ✕ ─────
let pcTab = 'hoje';
function changeHtml() {
  const td = today(), tm = addDays(td, 1);
  const list = R.openTasks(S).filter((t) => t.st !== 'wait' && !t.mother && t.due && (pcTab === 'hoje' ? t.due <= td : t.due === tm)).sort((a, b) => (a.due || '').localeCompare(b.due || '') || (hourOf(a) || '99').localeCompare(hourOf(b) || '99'));
  const dot = (t, cor, c) => `<button class="pc-cor ${R.corOf(S, t) === cor ? 'on' : ''}" data-act="pc-cor" data-id="${t.id}" data-cor="${cor}" data-c="${c}" title="${R.COR_NAMES[cor]}"></button>`;
  return `<div class="planos"><h2>🔀 mudança de planos</h2>
    <div class="seg" style="margin:6px 0 10px"><button class="${pcTab === 'hoje' ? 'on' : ''}" data-act="pc-tab" data-v="hoje">HOJE ${fmtDM(td)}</button><button class="${pcTab === 'amanha' ? 'on' : ''}" data-act="pc-tab" data-v="amanha">AMANHÃ ${fmtDM(tm)}</button></div>
    <div class="list">${list.map((t) => `<div class="li pc-row"><div class="lt">${esc(clean(t.text))}<small>${t.due < td ? '⏰ atrasada · ' : ''}${esc(R.COR_NAMES[R.corOf(S, t)] || '')}${hourOf(t) ? ' · ' + esc(hourOf(t)) : ''}</small></div>
      <span class="row pc-acts">${dot(t, 'urg', 'red')}${dot(t, 'chega', 'yellow')}${dot(t, 'estavel', 'green')}
        <button class="btn sm good" data-act="plan-done" data-id="${t.id}" title="Feita">✓</button>
        ${pcTab === 'hoje' ? `<button class="btn sm" data-act="plan-move" data-id="${t.id}" data-d="${tm}" title="Empurrar pra amanhã">→ AMANHÃ</button>` : `<button class="btn sm" data-act="plan-move" data-id="${t.id}" data-d="${td}" title="Trazer pra hoje">← HOJE</button>`}
        <input class="inp pc-date" type="date" value="${t.due}" min="${td}" data-pc-due="${t.id}" aria-label="Outro dia">
        <button class="btn sm ghost" data-act="plan-cancel" data-id="${t.id}" title="Não vale mais: cancelar">✕</button></span></div>`).join('') || `<div class="empty">nada ${pcTab === 'hoje' ? 'pra hoje' : 'pra amanhã'}. 👏</div>`}</div>
    <form class="addline" data-form="plan-add" data-d="${pcTab === 'hoje' ? td : tm}" autocomplete="off" style="margin-top:8px"><input class="inp" name="text" placeholder="+ coisa nova pra ${pcTab === 'hoje' ? 'hoje' : 'amanhã'} (Enter)" aria-label="Nova tarefa"></form>
    <p class="meta" style="margin:8px 0 0">Empurrar segue a regra de sempre (a 1ª remarcação da semana é grátis). Mudança na hora: a janela se atualiza sozinha.</p>
    <div class="actions"><button class="btn pri" data-close>PRONTO</button></div></div>`;
}
export function openPlanChange(tab = 'hoje') { pcTab = tab; openModal(changeHtml(), { wide: true }); }
const redraw = () => { const m = document.querySelector('.modal .planos'); if (!m) return; m.outerHTML = m.querySelector('[data-act="pc-tab"]') ? changeHtml() : planHtml(); window.__deaccent?.(document.querySelector('.modal')); };

export function extendPlanos(ACTIONS, FORMS) {
  Object.assign(ACTIONS, {
    'ag-dia': (d) => { const ui = window.__ui; if (!ui) return; ui.agDay = +d.dir === 0 ? 0 : (ui.agDay || 0) + +d.dir; window.__render?.(); },
    'plan-tomorrow': () => openPlanTomorrow(),
    'plan-change': () => openPlanChange('hoje'),
    'pc-tab': (d) => { pcTab = d.v; redraw(); },
    'pc-cor': (d) => { A.setCor(d.id, d.cor); redraw(); },
    'plan-done': (d) => { A.setStatus(d.id, 'done'); setTimeout(redraw, 30); },
    'plan-cancel': (d) => { A.setStatus(d.id, 'cancel'); setTimeout(redraw, 30); },
    'plan-move': (d) => { const r = A.updateTask(d.id, { due: d.d }); if (r?.error) { toast(esc(r.error), 'bad'); sfx('error'); if (r.locked) { closeModal(); setTimeout(() => ACTIONS['edit-task']?.({ id: d.id }), 60); return; } } redraw(); }, // travada (remarcada 3x): abre a tarefa, que tem o time box
  });
  FORMS['plan-add'] = (f) => {
    const text = f.text.value.trim(); if (!text) return; f.text.value = '';
    const d = f.dataset.d || addDays(today(), 1);
    const r = A.addTask({ text, area: 'sem', due: d, color: d <= addDays(today(), 1) ? 'red' : null });
    if (r?.task && d !== r.task.due) A.updateTask(r.task.id, { due: d });
    sfx('tab'); redraw(); setTimeout(() => document.querySelector('.modal form[data-form="plan-add"] input')?.focus(), 40);
  };
  // horário digitado no PLANEJAR AMANHÃ e outro dia escolhido na MUDANÇA DE PLANOS
  document.addEventListener('change', (e) => {
    const at = e.target.closest?.('[data-plan-at]');
    if (at) { A.updateTask(at.dataset.planAt, { at: at.value || undefined }); sfx('tab'); return; }
    const pd = e.target.closest?.('[data-pc-due]');
    if (pd && pd.value) { const r = A.updateTask(pd.dataset.pcDue, { due: pd.value }); if (r?.error) { toast(esc(r.error), 'bad'); sfx('error'); } redraw(); }
  });
}
