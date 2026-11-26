// v8.7 (pedidos do dono, rodada 6): o DIA POR HORAS na AGENDA (tipo Google Agenda: as horas, a rotina daquela hora
// e as tarefas com horário), o PLANEJAR AMANHÃ (o app pergunta à noite, antes de dormir) e a MUDANÇA DE PLANOS
// (hoje → amanhã: concluir, empurrar, mudar a cor ou cancelar, tudo numa janela só, rápido).
import { S } from './store.js';
import * as R from './rules.js';
import * as A from './actions.js';
import { esc, today, addDays, fmtDM, weekday, DOW, lightNow } from './util.js';
import { openModal, closeModal, modalOpen, toast } from './ui.js';
import { sfx } from './audio.js';
import { vitrine, fig, NOMES } from './elenco.js';
import { tone } from './views/rotina.js';

const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const clean = (t) => String(t || '').replace(/\s*\(\d+\s*XP\)/i, '');
const toMin = (h) => { const [a, b] = String(h).split(':'); return +a * 60 + (+b || 0); };
const hourOf = (t) => t.at || t.box?.at || '';
const dayName = (d) => (d === today() ? 'HOJE' : d === addDays(today(), 1) ? 'AMANHÃ' : d === addDays(today(), -1) ? 'ONTEM' : DOW[weekday(d)]);

/** as tarefas abertas de um dia (com horário e sem), mais os rituais marcados pra ele */
function dayItems(d) {
  const td = today(), hoje = d === td; // v9.0: HOJE também traz o que está atrasado (é do dia: precisa de um horário)
  const tasks = R.openTasks(S).filter((t) => t.due && (hoje ? t.due <= d : t.due === d) && t.st !== 'wait' && !t.who && !t.mother);
  const rits = (S.core.rituals || []).filter((r) => { const n = R.ritualStatus(r, td).next; return n && (hoje ? n <= d : n === d); });
  return { timed: tasks.filter(hourOf).sort((a, b) => toMin(hourOf(a)) - toMin(hourOf(b))), loose: tasks.filter((t) => !hourOf(t)), rits };
}

/** v9.0 (pedido do dono): o MEU DIA virou BANNER, com o visual da ROTINA (cada hora com a cor da atividade) e, do lado,
 *  a BAGUNÇA: o que é do dia e ainda não tem horário fica solto, meio torto, esperando ser arrumado. Arraste (mouse) ou
 *  toque e depois toque na hora (celular) pra encaixar; arrastar de volta pra bagunça tira o horário. Os TREM do dia
 *  (FEI, CUSTOSO, TRAPAIADO) ficam ali, um por tarefa, cada um numa pose. */
const seed = (str) => [...String(str)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const tremLevel = (t, td) => { const tr = R.tremOf(S, t, td); return !tr ? 0 : tr.k === 'praga' ? 3 : tr.k === 'custoso' ? 2 : tr.moscas ? 1 : 0; };
let picked = null; // celular: a tarefa escolhida esperando a hora
export function diaCard(ui, shut = false) {
  const td = today(), d = addDays(td, ui.agDay || 0), r = S.core.routine, plan = r?.plans?.[Math.min(r.active ?? 0, (r.plans?.length || 1) - 1)];
  const hours = r?.hours?.length ? r.hours : ['07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22'];
  const wd = WD[weekday(d)], { timed, loose, rits } = dayItems(d);
  const now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
  const slotOf = (hm) => [...hours].reverse().find((h) => toMin(h) <= toMin(hm)) || hours[0];
  const bySlot = {}; for (const t of timed) (bySlot[slotOf(hourOf(t))] ||= []).push(t);
  const cur = d === td ? [...hours].reverse().find((h) => toMin(h) <= nowM) : null;
  const chip = (t) => `<button class="dia-t dia-drag" data-act="edit-task" data-id="${t.id}" data-color="${R.colorOfTask(S, t) || ''}" title="Toque pra abrir · arraste pra outra hora ou de volta pra bagunça"><b>${esc(hourOf(t))}</b> ${esc(clean(t.text))}</button>`;
  const rows = hours.map((h) => { const rot = plan?.grid?.[`${wd}|${h}`] || '', items = bySlot[h] || [], past = d < td || (d === td && cur && toMin(h) < toMin(cur));
    return `<div class="dia-h ${h === cur ? 'now' : ''} ${past ? 'past' : ''} ${items.length ? 'has' : ''}" data-dia-h="${esc(h)}"><span class="dia-hh">${esc(h)}${String(h).includes(':') ? '' : 'h'}</span><span class="dia-rot" style="${rot ? tone(rot) : ''}" title="${esc(rot)}">${esc(rot)}</span><span class="dia-ts">${items.map(chip).join('')}</span></div>`; }).join('');
  // a bagunça: posição e inclinação "aleatórias" mas fixas por tarefa (não pulam a cada redesenho)
  const mess = loose.map((t, i) => { const k = seed(t.id), rot = (k % 9) - 4, dx = (k >> 4) % 9, dy = (k >> 9) % 7;
    return `<button class="dia-t dia-drag solto ${picked === t.id ? 'picked' : ''}" data-act="dia-pick" data-id="${t.id}" data-color="${R.colorOfTask(S, t) || ''}" style="--r:${rot}deg;--dx:${i % 2 ? dx : -dx}px;--dy:${dy}px" title="Arraste até uma hora (no celular: toque aqui e depois na hora)">${esc(clean(t.text))}</button>`; }).join('');
  const ritsH = rits.map((x) => `<button class="dia-t rit solto" data-act="jump-rit" data-id="${x.id}" style="--r:${(seed(x.id) % 7) - 3}deg" title="Ritual do dia: toque pra ir até ele">🔁 ${esc(x.name)}</button>`).join('');
  const lv = [...timed, ...loose].map((t) => tremLevel(t, td)).filter(Boolean);
  const nT = [1, 2, 3].map((n) => lv.filter((x) => x === n).length);
  const trens = [3, 2, 1].flatMap((n) => Array.from({ length: Math.min(nT[n - 1], 4) }, (_, i) => fig('trem-' + n, (i % 3) + 1, 'dia-trem', `${NOMES['trem-' + n]}${nT[n - 1] > 1 ? ` (${nT[n - 1]} no dia)` : ''}`, true))).slice(0, 8).join('');
  const resumo = [nT[2] && `${nT[2]} TRAPAIADO`, nT[1] && `${nT[1]} CUSTOSO`, nT[0] && `${nT[0]} FEI`].filter(Boolean).join(' · ');
  const nav = `<div class="row dia-nav"><button class="btn sm" data-act="ag-dia" data-dir="-1" aria-label="Dia anterior">◄</button><span class="meta dia-n"><b>${dayName(d)}</b> ${fmtDM(d)}</span><button class="btn sm" data-act="ag-dia" data-dir="1" aria-label="Próximo dia">►</button>${ui.agDay ? '<button class="btn sm ghost" data-act="ag-dia" data-dir="0">HOJE</button>' : ''}<span class="grow"></span><button class="btn sm" data-act="plan-tomorrow">🌙 PLANEJAR AMANHÃ</button><button class="btn sm" data-act="plan-change">🔀 MUDANÇA DE PLANOS</button></div>`;
  const body = `${nav}<div class="dia-wrap"><div class="dia-grid rot-look">${rows}</div>
    <aside class="dia-mess" data-dia-mess="1"><header><b>🧺 BAGUNÇA DO DIA</b><small class="meta">${loose.length ? `${loose.length} sem horário: arraste pra uma hora${picked ? ' · agora toque na hora' : ''}` : 'tudo encaixado. Trem bão!'}</small></header>
      <div class="mess-pile">${mess}${ritsH}${loose.length || rits.length ? '' : '<p class="meta" style="margin:6px 0">Nada solto. Arraste uma tarefa da hora pra cá pra tirar o horário.</p>'}</div>
      ${trens ? `<div class="dia-trens" title="Os TREM do dia: quanto mais perto do prazo, mais feio">${trens}</div><small class="meta dia-tr-n">${resumo}</small>` : ''}</aside></div>`;
  return vitrine({ k: 'c:agenda:meu-dia', v: 'meu-dia', title: `🗓 MEU DIA · ${dayName(d)} ${fmtDM(d)}`, sub: `${timed.length} com hora · ${loose.length} na bagunça${rits.length ? ` · ${rits.length} ritual(is)` : ''}`, topo: `assets/topo/rotina-${lightNow() === 'noite' ? 'noite' : 'dia'}.webp`, host: ['primo', 3, 'PRIMO com a lista do dia'], shut, body });
}

/** encaixa a tarefa numa hora (ou tira a hora, h = '') */
function placeAt(id, h) {
  const at = h ? (String(h).includes(':') ? String(h).padStart(5, '0') : String(h).padStart(2, '0') + ':00') : undefined;
  const t = S.quests.tasks.find((x) => x.id === id); if (!t) return;
  const patch = { at }; if (!at && t.box?.at) patch.box = { ...t.box, at: '' };
  const r = A.updateTask(id, patch); picked = null;
  if (r?.error) { toast(esc(r.error), 'bad'); sfx('error'); } else { sfx('tab'); toast(at ? `🕐 Encaixada às ${at}.` : '🧺 Voltou pra bagunça (sem horário).'); }
  window.__render?.();
}
// arrastar com o mouse (no celular: tocar e depois tocar na hora; o dedo continua rolando a tela normalmente)
let drag = null;
function onDown(e) {
  const el = e.target.closest?.('.dia-drag'); if (!el || e.pointerType !== 'mouse' || e.button !== 0) return;
  drag = { el, id: el.dataset.id, x: e.clientX, y: e.clientY, on: false };
}
function onMove(e) {
  if (!drag) return;
  if (!drag.on) { if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return; drag.on = true; drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add('dia-ghost'); document.body.appendChild(drag.ghost); drag.el.classList.add('dragging'); }
  drag.ghost.style.left = e.clientX + 8 + 'px'; drag.ghost.style.top = e.clientY + 8 + 'px';
  document.querySelectorAll('.dia-h.over,.dia-mess.over').forEach((x) => x.classList.remove('over'));
  document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.dia-h,.dia-mess')?.classList.add('over');
  if (e.clientY < 80) scrollBy(0, -14); else if (e.clientY > innerHeight - 60) scrollBy(0, 14); // perto da borda, a tela rola
}
function onUp(e) {
  const d = drag; drag = null; if (!d?.on) return;
  d.ghost.remove(); d.el.classList.remove('dragging'); document.querySelectorAll('.dia-h.over,.dia-mess.over').forEach((x) => x.classList.remove('over'));
  const tgt = document.elementFromPoint(e.clientX, e.clientY);
  const row = tgt?.closest?.('[data-dia-h]'), mess = tgt?.closest?.('[data-dia-mess]');
  // o clique que vem depois de soltar não pode abrir a tarefa
  addEventListener('click', (c) => { c.stopPropagation(); c.preventDefault(); }, { capture: true, once: true });
  if (row) placeAt(d.id, row.dataset.diaH); else if (mess) placeAt(d.id, '');
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
    // v9.0: na BAGUNÇA, tocar escolhe (e tocar de novo abre a tarefa); depois tocar numa hora encaixa
    'dia-pick': (d) => { if (picked === d.id) { picked = null; ACTIONS['edit-task']?.({ id: d.id }); return; } picked = d.id; sfx('tab'); window.__render?.(); },
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
  addEventListener('pointerdown', onDown); addEventListener('pointermove', onMove); addEventListener('pointerup', onUp);
  // celular: com uma tarefa escolhida na bagunça, tocar numa hora encaixa ela ali
  document.addEventListener('click', (e) => {
    if (!picked) return; const row = e.target.closest?.('[data-dia-h]'); if (!row || e.target.closest('.dia-t')) return;
    e.stopPropagation(); placeAt(picked, row.dataset.diaH);
  }, true);
  // horário digitado no PLANEJAR AMANHÃ e outro dia escolhido na MUDANÇA DE PLANOS
  document.addEventListener('change', (e) => {
    const at = e.target.closest?.('[data-plan-at]');
    if (at) { A.updateTask(at.dataset.planAt, { at: at.value || undefined }); sfx('tab'); return; }
    const pd = e.target.closest?.('[data-pc-due]');
    if (pd && pd.value) { const r = A.updateTask(pd.dataset.pcDue, { due: pd.value }); if (r?.error) { toast(esc(r.error), 'bad'); sfx('error'); } redraw(); }
  });
}
