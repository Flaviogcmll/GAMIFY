// COMPONENTES DE TELA: janela (modal), pergunta sim/não, avisos e pedaços de HTML reaproveitados.
import { esc, fmtDM, diffDays, today, fmtN } from './util.js';
import * as R from './rules.js';
import { S } from './store.js';

// ───── modal ─────
let modalClose = null;
export function openModal(html, { onClose, wide } = {}) {
  closeModal();
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" ${wide ? 'style="width:min(820px,100%)"' : ''}>${html}</div>`;
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) closeModal(); });
  document.body.appendChild(ov);
  modalClose = () => { ov.remove(); modalClose = null; onClose?.(); };
  setTimeout(() => { ov.querySelector('[autofocus]')?.focus(); window.__deaccent?.(ov); }, 0);
  return ov.querySelector('.modal');
}
export function closeModal() { modalClose?.(); }
export const modalOpen = () => !!modalClose;

/** pergunta sim/não dentro da página (o claude.ai bloqueia confirm()) */
export function ask(title, text, okLabel = 'CONFIRMAR', danger = false) {
  return new Promise((resolve) => {
    let answered = false;
    const m = openModal(`<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
      <div class="actions"><button class="btn" data-x="no">CANCELAR</button><button class="btn ${danger ? 'danger' : 'pri'}" data-x="yes" autofocus>${esc(okLabel)}</button></div>`,
    { onClose: () => { if (!answered) resolve(false); } });
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-x]');
      if (!b) return;
      answered = true;
      closeModal();
      resolve(b.dataset.x === 'yes');
    });
  });
}

// ───── avisos ─────
let toastBox = null;
export function toast(html, kind = '') {
  if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; document.body.appendChild(toastBox); }
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.innerHTML = html;
  toastBox.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3800);
}

// ───── pedaços de HTML ─────
export function dueChip(due, done = false, colored = false) {
  if (!due) return '';
  const d = diffDays(today(), due);
  let cls = '', label = fmtDM(due);
  if (!done) {
    if (d < 0) { cls = 'late'; label = `${fmtDM(due)} -${-d}D`; }
    else if (d === 0) { cls = 'today'; label = 'HOJE'; }
    else if (d === 1) { cls = 'tomorrow'; label = 'AMANHÃ'; }
    else if (d <= 3) cls = 'near';
    else if (d <= 7) cls = 'week';
  }
  // mesma data = mesma cor (as urgentes seguem vermelho/laranja)
  const h = (Number(due.replace(/-/g, '')) * 47) % 360, st = colored && !done && d > 1 ? ` style="background:hsl(${h} 55% 42% / .25);border-color:hsl(${h} 55% 52%);color:hsl(${h} 70% 70%)"` : '';
  return `<span class="chip ${cls}"${st}>${label}</span>`;
}
const CHECK = { done: '✓', doing: '▶', wait: '…', sent: '✉', cancel: '✕' };

/** uma linha de tarefa: [check] texto [prazo] [xp] — arrastável no PC */
export function taskRow(t, opts = {}) {
  const p = R.parse(t.text);
  const cls = ['task', t.st, p.step ? 'step' : '', p.mini ? 'mini' : ''].filter(Boolean).join(' ');
  const rounds = (t.rounds || []).length;
  const xp = t.st === 'done' ? `+${t.xp || 0}` : t.st === 'cancel' ? '' : t.st === 'sent' ? '' : `${R.taskXp(S, t).xp}`;
  const sub = opts.sub ? `<small>${esc(opts.sub)}</small>` : '';
  const sent = t.st === 'sent' ? `<small class="info">📨 enviada ${fmtDM(t.sentAt)} · aguardando retorno</small>
    <span class="row" style="gap:6px;margin-top:5px"><button class="btn sm" data-act="cycle-back" data-id="${t.id}">↩ VOLTOU</button><button class="btn sm good" data-act="cycle-ok" data-id="${t.id}">✓ APROVADO</button></span>` : '';
  return `<li class="${cls}" data-id="${t.id}" ${t.color ? `data-color="${t.color}"` : ''}><span class="handle" data-handle="task" data-id="${t.id}" title="Segure e arraste">⠿</span>
    <button class="check" data-act="toggle" data-id="${t.id}" aria-label="Concluir ${esc(t.text)}">${CHECK[t.st] || ''}</button>
    <div class="txt" ${t.link && R.isOpen(t) ? `data-act="jump-block" data-id="${t.link}" title="Ir pro BREAKDOWN"` : `data-act="edit-task" data-id="${t.id}"`}>${esc(t.text.replace(/\s*\(\d+\s*XP\)/i, ''))}${sub}${sent}</div>
    <div class="info">${t.link ? `<button class="chip cyc" data-act="jump-block" data-id="${t.link}" title="No BREAKDOWN MACHINE">🔗 BREAKDOWN</button><button class="icon-btn mini" data-act="edit-task" data-id="${t.id}" title="Editar" aria-label="Editar">✎</button>` : opts.list && !p.step && R.isOpen(t) ? `<button class="icon-btn mini" data-act="to-breakdown" data-id="${t.id}" title="Mandar pro BREAKDOWN MACHINE (fica ligada)" aria-label="Mandar pro breakdown">⤴</button>` : ''}${t.prio ? '<span class="chip prio">!</span>' : ''}${t.cycle ? `<span class="chip cyc" title="vai e volta">🔁${rounds ? ' ' + rounds : ''}</span>` : ''}${t.pin && opts.showPin ? '<span class="chip">↗</span>' : ''}${dueChip(t.due, !R.isOpen(t))}${xp ? `<span class="chip xp">${xp}</span>` : ''}</div>
  </li>`;
}

export const segBar = (pct, cls = '') => `<div class="seg-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, pct * 100)).toFixed(1)}%"></i></div>`;
export const pbar = (label, value, goal, extra = '') => {
  const ok = value >= goal;
  return `<div class="bar-row"><span>${label}</span><b class="num ${ok ? 'good' : ''}" style="font-size:8px">${ok ? '✓ ' : ''}${fmtN(Math.min(value, goal))}/${fmtN(goal)}${extra}</b>${segBar(value / goal, ok ? 'good sm' : 'sm')}</div>`;
};

export function statusChips(st, alerts = []) {
  const chips = [];
  if (st.event) chips.push(`<button class="st-chip event" data-act="explain" data-k="event">🎲 ${esc(st.event.desc)}</button>`);
  for (const x of st.list) chips.push(`<button class="st-chip ${x.kind}" data-act="explain" data-k="${x.key}">${x.icon} ${esc(x.name)}</button>`);
  for (const a of alerts) chips.push(`<button class="st-chip alert" data-act="explain-text" data-n="${esc(a.icon + ' ' + a.name)}" data-d="${esc(a.desc)}">${a.icon} ${esc(a.name)}</button>`);
  return chips.join('');
}

/** gráfico de linha simples */
export function spark(values) {
  const w = 300, h = 56, max = Math.max(10, ...values), n = values.length;
  if (n < 2) return '';
  const pts = values.map((v, i) => [(i / (n - 1)) * (w - 8) + 4, h - 6 - (v / max) * (h - 14)]);
  const line = pts.map((p) => p.map((x) => x.toFixed(1)).join(',')).join(' ');
  const last = pts[n - 1];
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:56px;display:block" aria-hidden="true">
    <line x1="0" x2="${w}" y1="${h - 6}" y2="${h - 6}" stroke="var(--line)" stroke-width="1"/>
    <polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" shape-rendering="crispEdges"/>
    <rect x="${last[0] - 3}" y="${last[1] - 3}" width="6" height="6" fill="var(--accent)"/></svg>`;
}
