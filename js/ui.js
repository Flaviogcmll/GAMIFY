// COMPONENTES DE TELA: janela (modal), pergunta sim/não, avisos e pedaços de HTML reaproveitados.
import { esc, fmtDM, diffDays, today, fmtN, addDays } from './util.js';
import * as R from './rules.js';
import { S } from './store.js';

// ───── modal ─────
let modalClose = null;
export function openModal(html, { onClose, wide } = {}) {
  closeModal();
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" ${wide ? 'style="width:min(820px,100%)"' : ''}>${html}</div>`;
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) { document.activeElement?.blur?.(); closeModal(); } }); // blur antes: o texto em edição é salvo
  document.body.appendChild(ov);
  modalClose = () => { ov.remove(); modalClose = null; onClose?.(); };
  setTimeout(() => { ov.querySelector('[autofocus]')?.focus(); window.__deaccent?.(ov); }, 0);
  return ov.querySelector('.modal');
}
export function closeModal() {
  // sai do campo antes de fechar: o texto que estava sendo editado é salvo (evento "change"), feche como fechar
  const a = document.activeElement;
  if (modalClose && a && a !== document.body && a.closest?.('.overlay')) a.blur();
  modalClose?.();
}
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
// v5.16 (Q3): um aviso por vez. Os iguais se juntam (×2, ×3…), os outros esperam na fila e, se a fila crescer,
// os avisos simples saem primeiro (conquista, loot e erro nunca se perdem). Tocar no aviso fecha.
let toastBox = null, cur = null, curT = 0, curEnd = 0;
const queue = [], MAX_QUEUE = 3;
const lifeOf = (kind) => (kind ? 3600 : 2600);
function showNext() {
  cur = null;
  const n = queue.shift();
  if (!n) return;
  if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; toastBox.setAttribute('aria-live', 'polite'); document.body.appendChild(toastBox); }
  const t = document.createElement('div');
  t.className = 'toast ' + n.kind;
  t.innerHTML = n.html + (n.n > 1 ? ` <b class="tx">×${n.n}</b>` : '');
  t.addEventListener('click', () => hide(t));
  toastBox.appendChild(t);
  cur = { el: t, html: n.html, kind: n.kind, n: n.n };
  arm(queue.length ? 1600 : lifeOf(n.kind));
}
function arm(ms, onlySooner = false) {
  if (onlySooner && Date.now() + ms >= curEnd) return;
  clearTimeout(curT); curEnd = Date.now() + ms;
  const el = cur?.el; curT = setTimeout(() => hide(el), ms);
}
function hide(el) {
  if (!el || el !== cur?.el) return;
  clearTimeout(curT);
  el.style.transition = 'opacity .25s'; el.style.opacity = '0';
  setTimeout(() => { el.remove(); showNext(); }, 250);
}
export function toast(html, kind = '') {
  if (cur && cur.html === html) { // igual ao que está na tela: só conta
    cur.n++; let b = cur.el.querySelector('.tx');
    if (!b) { b = document.createElement('b'); b.className = 'tx'; cur.el.append(' ', b); }
    b.textContent = '×' + cur.n; arm(lifeOf(kind)); return;
  }
  const same = queue.find((q) => q.html === html);
  if (same) { same.n++; return; }
  queue.push({ html, kind, n: 1 });
  while (queue.length > MAX_QUEUE) { const i = queue.findIndex((q) => !q.kind); queue.splice(i >= 0 ? i : 0, 1); }
  if (!cur) showNext(); else arm(1200, true); // tem fila: o atual sai mais cedo
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
    else cls = 'later';
  }
  // v5.14: a cor do prazo é a mesma da lista onde a tarefa cai (HOJE vermelho, AMANHÃ laranja, SEMANA amarelo, DEPOIS azul)
  void colored;
  return `<span class="chip ${cls}">${label}</span>`;
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
  // tarefa da lista que virou bloco em outra janela: mostra o NOME e a COR da janela onde o bloco está
  const lb = t.link ? R.findBlock(S, t.link) : null, lw = lb ? R.winOf(S, lb) : null;
  const wname = lb ? (lw ? lw.name : lb.group === 'bs' ? R.TAB_NAMES.boss : R.GROUPS[lb.group]?.short || '') : '';
  const col = t.st === 'wait' ? 'purple' : t.color; // v5.16: AGUARDANDO = roxo (a mesma cor da lista)
  const cat = lb ? (lb.group === 'bs' ? 'bs' : lw ? 'win' : lb.group) : ''; // v6.1: de qual janela a tarefa é (faixinha de cor no começo da linha)
  const pg = R.isOpen(t) ? R.pragaOf(S, t.id) : null; // v6.5: A PRAGA
  return `<li class="${cls}" data-id="${t.id}" ${col ? `data-color="${col}"` : ''} ${cat ? `data-cat="${cat}"` : ''} ${pg ? `data-praga="${pg.phase}" title="🐛 A Praga: atrasada há ${pg.days} dia(s) · fase ${pg.phase} de 4 (${R.PRAGA_NAMES[pg.phase]})"` : ''}><span class="handle" data-handle="task" data-id="${t.id}" title="Segure e arraste">⠿</span>
    <button class="check" data-act="toggle" data-id="${t.id}" aria-label="Concluir ${esc(t.text)}">${CHECK[t.st] || ''}</button>
    <div class="txt" data-act="${opts.go ? 'jump' : 'edit-task'}" data-id="${t.id}" ${opts.go ? 'title="Toque pra ir até a tarefa"' : ''}>${t.link ? `<button class="lnk-dot" data-g="${lb?.group === 'bs' ? 'bs' : lw ? 'win' : lb?.group || 'bd'}" data-act="jump-block" data-id="${t.link}" title="Está na janela ${esc(wname || 'BREAKDOWN')}. Toque pra ir lá." aria-label="Ir pro bloco em ${esc(wname || 'BREAKDOWN')}"></button>` : ''}${esc(t.text.replace(/\s*\(\d+\s*XP\)/i, ''))}${sub}${sent}</div>
    <div class="info">${!t.link && opts.list && !p.step && R.isOpen(t) ? `<button class="icon-btn mini" data-act="to-breakdown" data-id="${t.id}" title="Mandar pra uma janela (BREAKDOWN, TRABALHO, GESTÃO…)" aria-label="Mandar pra uma janela">⤴</button>` : ''}${t.who || t.dep ? `<span class="chip wait" title="aguardando: ${esc(R.waitingOn(S, t).label)}">⏳ ${esc((t.who || '🔗').slice(0, 14))}</span>` : ''}${t.prio ? '<span class="chip prio">!</span>' : ''}${t.box && R.isOpen(t) ? `<span class="chip box" title="time box: horário e duração combinados">⏰ ${esc(t.box.at || '')}${t.box.min ? ' · ' + t.box.min + 'min' : ''}</span>` : ''}${t.cycle ? `<span class="chip cyc" title="vai e volta">🔁${rounds ? ' ' + rounds : ''}</span>` : ''}${t.imgs?.length ? `<span class="chip" title="${t.imgs.length} imagem(ns): abra a tarefa pra ver">🖼${t.imgs.length > 1 ? ' ' + t.imgs.length : ''}</span>` : ''}${t.pin && opts.showPin ? '<span class="chip">↗</span>' : ''}${opts.list && (t.due === today() || t.due === addDays(today(), 1)) && R.isOpen(t) ? '' : dueChip(t.due, !R.isOpen(t))}${xp ? `<span class="chip xp">${xp}</span>` : ''}</div>
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
