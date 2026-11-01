// v4 — conforto: desfazer (Ctrl+Z), clique exato, sons em tudo, editores de regras e loja (PERKS AND RULES),
// diário/históricos que dá pra corrigir e cartões que você arrasta em todas as abas.
import { S, exportAll } from './store.js';

import * as A from './actions.js';
import * as R from './rules.js';
import { esc, fmtDM, fmtN, DOW, weekday, today } from './util.js';
import { openModal, closeModal, ask, toast } from './ui.js';

import { sfx, sfxNav, sfxMilestone, setLofiTheme } from './audio.js';

import { primoReact } from './primo.js';


const ls = {
  get: (k, d = null) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* */ } },
};

// ───────────────────────── CLIQUE EXATO ─────────────────────────
// Texto clicável que ocupa a linha inteira "vazava": clicar no vazio à direita contava. Agora só vale perto do texto.
const BOXED = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL|SUMMARY|OPTION)$/;
function hasBox(el) {
  const cs = getComputedStyle(el);
  return cs.backgroundImage !== 'none' || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderBottomWidth) > 0;
}
function textRects(el) {
  const out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const r = document.createRange(); r.selectNodeContents(n); out.push(...r.getClientRects());
  }
  return out;
}
document.addEventListener('click', (e) => {
  const el = e.target.closest?.('[data-act]');
  if (!el || BOXED.test(el.tagName) || e.detail === 0 || hasBox(el)) return;
  const rs = textRects(el), pad = 10;
  if (!rs.length) return;
  if (!rs.some((b) => e.clientX >= b.left - pad && e.clientX <= b.right + pad && e.clientY >= b.top - pad && e.clientY <= b.bottom + pad)) { e.stopImmediatePropagation(); e.preventDefault(); }
}, true);

// ───────────────────────── DESFAZER ─────────────────────────
// Os botões ↩ ↪ ficam no cabeçalho (não flutuam mais por cima do conteúdo, principalmente no celular).
let renderFn = () => {};
function pillUpdate(st = A.undoState()) {
  document.querySelectorAll('[data-undo-btn]').forEach((b) => { b.disabled = !st.undo; b.title = st.undo ? `Desfazer: ${st.next} (Ctrl+Z)` : 'nada a desfazer'; });
  document.querySelectorAll('[data-redo-btn]').forEach((b) => { b.hidden = !st.redo; b.title = st.redo ? `Refazer: ${st.nextRedo}` : ''; });
}
function doUndo() {
  const l = A.undo();
  if (l === null) { sfx('error'); return; }
  sfx('undo'); toast(`↩ Desfeito: <b>${esc(l)}</b>`); renderFn();
}
function doRedo() {
  const l = A.redo();
  if (l === null) { sfx('error'); return; }
  sfx('redo'); toast(`↪ Refeito: <b>${esc(l)}</b>`); renderFn();
}
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const t = document.activeElement;
  if (/INPUT|TEXTAREA|SELECT/.test(t?.tagName) || t?.isContentEditable) return; // dentro de um campo vale o desfazer do próprio campo
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); } else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); doRedo(); }
});

// ───────────────────────── SONS EM TUDO ─────────────────────────
const ACT_SOUND = [
  [/^(del|undo-buy|arq-empty|shop-del|journal-del|hist-del)/, 'trash'],
  [/^(ltab|qtab|fcat|tl-week|ag-filter|collapse|arrange|vtab|xp-preset)/, 'tick'],
];
let lastClick = 0;
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest?.('button,[data-act],a[href],summary');
  if (!el || el.disabled) return;
  const now = performance.now();
  if (now - lastClick < 35) return;
  lastClick = now;
  const hit = ACT_SOUND.find(([re]) => re.test(el.dataset.act || ''));
  sfx(hit ? hit[1] : 'click');
}, true);
document.addEventListener('change', (e) => { if (e.target.matches?.('input[type=checkbox],input[type=radio],select')) sfx('tick'); });
new MutationObserver((muts) => {
  for (const m of muts) {
    for (const n of m.addedNodes) if (n.classList?.contains('overlay')) sfx('open');
    for (const n of m.removedNodes) if (n.classList?.contains('overlay')) sfx('close');
  }
}).observe(document.body, { childList: true });
const TABS = ['quests', 'survival', 'agenda', 'shop', 'domingo', 'conquistas', 'filtro', 'rotina', 'regras', 'arquivo'];
window.addEventListener('hashchange', () => { const r = location.hash.replace('#', '') || 'quests'; sfxNav(Math.max(0, TABS.indexOf(r))); setLofiTheme(r); });
setLofiTheme(location.hash.replace('#', '') || 'quests');

// ───────────────────────── NÃO PERDER O FOCO AO REDESENHAR ─────────────────────────
export function captureFocus() {
  const a = document.activeElement;
  const sel = a?.dataset && (a.dataset.v4rule ? `[data-v4rule="${a.dataset.v4rule}"]` : a.dataset.v4vil ? `[data-v4vil="${a.dataset.v4vil}"][data-k="${a.dataset.k}"][data-i="${a.dataset.i}"]` : a.dataset.v4item ? `[data-v4item="${a.dataset.v4item}"][data-id="${a.dataset.id}"][data-f="${a.dataset.f}"]` : '');
  return () => { if (sel) { const el = document.querySelector(sel); if (el && el !== document.activeElement) { el.focus(); try { el.select?.(); } catch { /* */ } } } };
}

// ───────────────────────── EDITORES (PERKS AND RULES) ─────────────────────────
export function rulesEditor() {
  const custom = Object.keys(S.core.settings?.rules || {}).length;
  return `<div class="card c12" data-gk="xp-regras"><header><h2>⚙ XP e multiplicadores</h2><button class="btn sm ghost" data-act="rules-reset" ${custom ? '' : 'disabled'}>↺ VOLTAR AO PADRÃO${custom ? ` (${custom})` : ''}</button></header>
    <div class="rgrid">${R.RULE_FIELDS.map(([g, fs]) => `<div><label class="lbl">${esc(g)}</label>${fs.map(([k, n]) => {
      const v = R.ruleValue(k), d = R.ruleDefault(k), dec = k.startsWith('M_') || k === 'OFFER';
      return `<label class="rrow ${v !== d ? 'chg' : ''}"><span>${esc(n)}</span><input class="inp" type="number" min="0" step="${dec ? 0.05 : 1}" value="${v}" data-v4rule="${k}" aria-label="${esc(n)}"><small title="padrão">${d}</small></label>`;
    }).join('')}</div>`).join('')}</div></div>`;
}
const fld = (kind, it, f, { type = 'text', w = '', ph = '', val } = {}) => `<input class="inp" ${w ? `style="width:${w}"` : ''} type="${type}" ${type === 'number' ? 'min="0"' : ''} value="${esc(val ?? it[f] ?? '')}" placeholder="${esc(ph)}" aria-label="${esc(f)}" data-v4item="${kind}" data-id="${it.id}" data-f="${f}">`;
export function shopEditor() {
  const tav = [...S.loja.taverna].sort((a, b) => a.xp - b.xp);
  const fer = [...S.loja.ferreiro].sort((a, b) => (a.cat || '').localeCompare(b.cat || '') || a.nv - b.nv);
  return `<div class="card c12" data-gk="loja-itens"><header><h2>🛒 Loja · itens e preços</h2><div class="row"><button class="btn sm" data-act="shop-add" data-kind="taverna">+ TAVERNA</button><button class="btn sm" data-act="shop-add" data-kind="ferreiro">+ FERREIRO</button></div></header>
    <label class="lbl">Taverna · preço em XP · cronômetro (min) · 🎟 tickets (vazio = automático)</label>
    <div class="srows">${tav.map((it) => `<div class="srow">${fld('taverna', it, 'icon', { w: '54px' })}${fld('taverna', it, 'name')}${fld('taverna', it, 'xp', { type: 'number', w: '84px' })}${fld('taverna', it, 'min', { type: 'number', w: '72px', ph: 'min', val: it.min ?? '' })}${fld('taverna', it, 'tk', { type: 'number', w: '62px', ph: R.ticketCost(it) + '🎟', val: it.tk ?? '' })}<button class="icon-btn" data-act="shop-del" data-kind="taverna" data-id="${it.id}" aria-label="Apagar ${esc(it.name)}">🗑</button></div>`).join('')}</div>
    <label class="lbl" style="margin-top:14px">Ferreiro · categoria · nível (XP = nível × ${R.C.FERREIRO_XP}) · recorrente</label>
    <div class="srows">${fer.map((it) => `<div class="srow">${fld('ferreiro', it, 'icon', { w: '54px' })}${fld('ferreiro', it, 'name')}${fld('ferreiro', it, 'cat', { w: '110px' })}${fld('ferreiro', it, 'nv', { type: 'number', w: '62px' })}<label class="chk" title="recorrente"><input type="checkbox" ${it.repeat ? 'checked' : ''} data-v4item="ferreiro" data-id="${it.id}" data-f="repeat"> ↻</label><button class="icon-btn" data-act="shop-del" data-kind="ferreiro" data-id="${it.id}" aria-label="Apagar ${esc(it.name)}">🗑</button></div>`).join('')}</div></div>`;
}

let lastBal = null;
function animateProgress() {
  // o XP do topo conta até o valor novo
  const el = document.querySelector('.coin .acc');
  if (el) {
    const to = +el.textContent.replace(/\D/g, '') || 0;
    if (lastBal != null && lastBal !== to && Math.abs(to - lastBal) < 5000) {
      const from = lastBal, t0 = performance.now(), dur = 600; let n = 0;
      const step = (now) => { const k = Math.min(1, (now - t0) / dur); el.textContent = fmtN(Math.round(from + (to - from) * k)); if (to > from && (n++ % 4) === 0) sfx('count'); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
    lastBal = to;
  }
}
/** marcos da meta do dia (25 · 50 · 75 · 100%): toca, avisa e não repete no mesmo dia */
export function checkMilestones() {
  const g = R.dailyGoal(S), td = today(); let st = { d: td, hit: [] };
  try { const o = JSON.parse(ls.get('gamify-ui:ms')); if (o?.d === td) st = o; } catch { /* */ }
  const marks = [0.25, 0.5, 0.75, 1];
  marks.forEach((m, i) => { if (g.pct >= m && !st.hit.includes(m)) { st.hit.push(m); if (g.today > 0 && !(st.first)) { sfxMilestone(i); setTimeout(() => primoReact(m >= 1 ? 'meta_batida' : m >= 0.75 ? 'meta_perto' : 'meta_meio'), 900); toast(`🔥 ${Math.round(m * 100)}% da meta de hoje · ${fmtN(g.today)}/${fmtN(g.goal)} XP`, 'good'); } } });
  st.first = false; ls.set('gamify-ui:ms', JSON.stringify(st));
}
// ───────────────────────── DIÁRIO E HISTÓRICOS ─────────────────────────
export function historyCard() {
  const bonus = [...(S.core.bonus || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 25);
  const suns = [...(S.core.sundays || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const jr = Object.entries(S.core.journal || {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 15);
  const del = (k, id) => `<button class="icon-btn" data-act="hist-del" data-k="${k}" data-id="${esc(id)}" aria-label="Apagar">🗑</button>`;
  return `<details class="card hist" style="margin-bottom:14px"><summary class="px">🧹 CORRIGIR HISTÓRICOS</summary>
    <label class="lbl">Bônus de XP</label><div class="list">${bonus.map((b) => `<div class="li"><div class="lt">${esc(b.label || b.kind)}<small>${fmtDM(b.date)} · +${b.xp || 0} XP${b.tickets ? ` · +${b.tickets}🎟` : ''}</small></div>${del('bonus', b.id)}</div>`).join('') || '<div class="empty">nada.</div>'}</div>
    <label class="lbl">Baús de domingo</label><div class="list">${suns.map((x) => `<div class="li"><div class="lt">${fmtDM(x.date)}<small>+${x.xp} XP</small></div>${del('sunday', x.date)}</div>`).join('') || '<div class="empty">nada.</div>'}</div>
    <label class="lbl">Diário</label><div class="list">${jr.map(([d, x]) => `<div class="li"><div class="lt">${esc(x.a)}<small>${fmtDM(d)} · ${esc(x.q)}</small></div>${del('journal', d)}</div>`).join('') || '<div class="empty">nada.</div>'}</div></details>`;
}

// ───────────────────────── CARTÕES ARRASTÁVEIS EM TODAS AS ABAS ─────────────────────────
const unitsOf = (g) => [...g.children].filter((c) => c.nodeType === 1 && (c.classList.contains('card') || c.dataset.gk || c.querySelector(':scope > .card')));
const unitId = (u) => u.dataset.gk || (u.querySelector('h2')?.textContent || '').trim().slice(0, 40);
const visualOrder = (g) => unitsOf(g).filter((u) => u.dataset.gid).sort((a, b) => (+a.style.order || 0) - (+b.style.order || 0));
export function afterRender4(cur) {
  animateProgress();
  if (cur === 'quests') return; // o QUESTS já tem a própria organização
  document.querySelectorAll('#main .grid').forEach((g, gi) => {
    const units = unitsOf(g);
    if (units.length < 2 || g.querySelector('.sitem')) return;
    let saved = [];
    try { saved = JSON.parse(ls.get(`gamify-ui:gorder:${cur}:${gi}`, '[]')) || []; } catch { /* */ }
    units.forEach((u, i) => {
      const id = unitId(u);
      u.dataset.gid = id; u.dataset.gkey = `${cur}:${gi}`;
      const si = saved.indexOf(id);
      u.style.order = si >= 0 ? si : saved.length + i;
      const h = u.querySelector('header') || u.querySelector('h2')?.parentElement;
      if (h && !h.querySelector('.ghandle')) h.insertAdjacentHTML('afterbegin', '<span class="ghandle" data-handle="grid" title="Arraste pra reordenar" aria-label="Arrastar">⠿</span>');
    });
  });
}
let gd = null;
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest?.('[data-handle="grid"]');
  if (!h) return;
  const src = h.closest('[data-gid]');
  if (!src) return;
  e.preventDefault();
  gd = { src, grid: src.parentElement, x0: e.clientX, y0: e.clientY, on: false, target: null };
  h.setPointerCapture?.(e.pointerId);
});
document.addEventListener('pointermove', (e) => {
  if (!gd) return;
  if (!gd.on) {
    if (Math.hypot(e.clientX - gd.x0, e.clientY - gd.y0) < 6) return;
    gd.on = true; sfx('pick');
    gd.ghost = gd.src.cloneNode(true); gd.ghost.classList.add('drag-ghost'); gd.ghost.style.width = Math.min(gd.src.offsetWidth, 340) + 'px'; gd.ghost.style.maxHeight = '130px'; gd.ghost.style.overflow = 'hidden'; gd.ghost.style.order = '';
    document.body.appendChild(gd.ghost); gd.src.classList.add('dragging');
  }
  gd.ghost.style.left = e.clientX - 20 + 'px'; gd.ghost.style.top = e.clientY - 14 + 'px';
  gd.ghost.style.display = 'none';
  const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-gid]');
  gd.ghost.style.display = '';
  document.querySelectorAll('.gdrop-before,.gdrop-after').forEach((x) => x.classList.remove('gdrop-before', 'gdrop-after'));
  gd.target = null;
  if (under && under !== gd.src && under.parentElement === gd.grid) {
    const r = under.getBoundingClientRect(), after = (e.clientY - r.top) / r.height + (e.clientX - r.left) / r.width > 1;
    under.classList.add(after ? 'gdrop-after' : 'gdrop-before');
    gd.target = { el: under, after };
  }
  if (e.clientY < 70) scrollBy(0, -12); else if (e.clientY > innerHeight - 70) scrollBy(0, 12);
});
document.addEventListener('pointerup', () => {
  if (!gd) return;
  const d = gd; gd = null;
  d.ghost?.remove(); d.src.classList.remove('dragging');
  document.querySelectorAll('.gdrop-before,.gdrop-after').forEach((x) => x.classList.remove('gdrop-before', 'gdrop-after'));
  if (!d.on || !d.target) return;
  const units = visualOrder(d.grid).filter((u) => u !== d.src);
  units.splice(units.indexOf(d.target.el) + (d.target.after ? 1 : 0), 0, d.src);
  units.forEach((u, i) => { u.style.order = i; });
  ls.set(`gamify-ui:gorder:${d.src.dataset.gkey}`, JSON.stringify(units.map((u) => u.dataset.gid)));
  sfx('drop');
});

// ───────────────────────── ARRASTAR TAREFA DA FILA PARA UM DIA (PC) ─────────────────────────
let dragTid = null;
document.addEventListener('dragstart', (e) => {
  const li = e.target.closest?.('[data-tid]');
  if (!li) return;
  dragTid = li.dataset.tid; e.dataTransfer.setData('text/plain', dragTid); e.dataTransfer.effectAllowed = 'move'; sfx('pick');
});
document.addEventListener('dragover', (e) => { if (!dragTid) return; const d = e.target.closest?.('.day[data-d]'); document.querySelectorAll('.day.over').forEach((x) => x !== d && x.classList.remove('over')); if (d) { e.preventDefault(); d.classList.add('over'); } });
document.addEventListener('dragend', () => { dragTid = null; document.querySelectorAll('.day.over').forEach((x) => x.classList.remove('over')); });
document.addEventListener('drop', (e) => {
  if (!dragTid) return;
  const d = e.target.closest?.('.day[data-d]');
  if (!d) return;
  e.preventDefault();
  const id = dragTid; dragTid = null;
  const t = S.quests.tasks.find((x) => x.id === id), due = d.dataset.d;
  (async () => {
    if (t && !(await confirmResched(t, due))) return;
    const cost = A.reschedCost(t, due), r = A.updateTask(id, { due });
    if (r?.error) { toast(esc(r.error), 'bad'); return; }
    sfx('drop'); toast(`📅 Prazo: <b>${fmtDM(due)}</b>${cost ? ` · −${cost} XP` : ''}`);
    if (cost) primoReact('remarcou', { xp: cost });
  })();
});

// ───────────────────────── ORDEM DAS JANELAS DO QUESTS (arrastar o nome da janela) ─────────────────────────
let dragTab = null;
document.addEventListener('dragstart', (e) => { const b = e.target.closest?.('[data-act="qtab"]'); if (b) { dragTab = b.dataset.tab; e.dataTransfer.setData('text/plain', dragTab); e.dataTransfer.effectAllowed = 'move'; sfx('pick'); } });
document.addEventListener('dragover', (e) => { if (dragTab && e.target.closest?.('[data-act="qtab"]')) e.preventDefault(); });
document.addEventListener('drop', (e) => {
  const t = dragTab && e.target.closest?.('[data-act="qtab"]');
  if (!t) return;
  e.preventDefault();
  if (t.dataset.tab !== dragTab) {
    const ids = [...document.querySelectorAll('[data-act="qtab"]')].map((x) => x.dataset.tab).filter((i) => i !== dragTab);
    ids.splice(ids.indexOf(t.dataset.tab), 0, dragTab);
    ls.set('gamify-ui:qtabs', JSON.stringify(ids)); sfx('drop'); renderFn();
  }
  dragTab = null;
});
document.addEventListener('dragend', () => { dragTab = null; });

// ───────────────────────── BUSCA NAS LISTAS (missão da semana etc.) ─────────────────────────
document.addEventListener('input', (e) => {
  const el = e.target.closest?.('[data-v4filter]');
  if (!el) return;
  const q = el.value.trim().toLowerCase();
  document.querySelectorAll(`${el.dataset.v4filter} > *`).forEach((x) => { x.style.display = q && !x.textContent.toLowerCase().includes(q) ? 'none' : ''; });
});

// ───────────────────────── EDIÇÃO (campos que salvam ao sair) ─────────────────────────
document.addEventListener('change', (e) => {
  const rule = e.target.closest?.('[data-v4rule]');
  if (rule) { const r = A.setRule(rule.dataset.v4rule, rule.value); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); } return; }
  const vil = e.target.closest?.('[data-v4vil]');
  if (vil) { A.setVcat(vil.dataset.v4vil, vil.dataset.k, vil.dataset.i, vil.value); return; }
  const it = e.target.closest?.('[data-v4item]');
  if (it) {
    const kind = it.dataset.v4item, cur = S.loja[kind].find((x) => x.id === it.dataset.id);
    if (!cur) return;
    A.saveShopItem(kind, { ...cur, id: cur.id, [it.dataset.f]: it.type === 'checkbox' ? it.checked : it.value });
  }
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest?.('form[data-v4form]');
  if (!f) return;
  e.preventDefault();
  if (f.dataset.v4form === 'weight') { const r = A.saveWeight(f.d.value, f.kg.value); if (r?.error) toast(esc(r.error), 'bad'); else sfx('coin'); return; }
  if (f.dataset.v4form === 'journal-edit') { A.editJournal(f.dataset.d, f.a.value); closeModal(); }
});

// ───────────────────────── AÇÕES ─────────────────────────
export function extend4(ACTIONS, render) {
  renderFn = render;
  A.onUndoChange(pillUpdate);
  Object.assign(ACTIONS, {
    undo: () => doUndo(),
    redo: () => doRedo(),
    'rules-reset': async () => { if (await ask('Voltar as regras ao padrão?', 'XP e multiplicadores voltam aos valores originais. A loja não muda. (Ctrl+Z desfaz.)', 'VOLTAR')) A.resetRules(); },
    'shop-add': (d) => {
      const first = S.loja.cats?.[0] || 'EU';
      const r = d.kind === 'taverna' ? A.saveShopItem('taverna', { name: 'NOVO ITEM', xp: 100, icon: '🎁', min: 0 }) : A.saveShopItem('ferreiro', { name: 'NOVO ITEM', cat: first, nv: 1, icon: '🛠' });
      setTimeout(() => { const el = r?.id && document.querySelector(`[data-v4item="${d.kind}"][data-id="${r.id}"][data-f="name"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); el.select(); } }, 30);
    },
    'shop-del': async (d) => {
      const it = S.loja[d.kind]?.find((x) => x.id === d.id);
      if (it && await ask(`Apagar "${it.name}"?`, 'O item some da loja. O histórico de compras continua. (Ctrl+Z desfaz.)', 'APAGAR', true)) A.deleteShopItem(d.kind, d.id);
    },
    'explain-text': (d) => openModal(`<h2>${esc(d.n)}</h2><p>${esc(d.d)}</p><div class="actions"><button class="btn pri" data-close autofocus>OK</button></div>`),
    'backup-download': () => {
      try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(exportAll())], { type: 'application/json' })); a.download = `gamify-backup-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove(); toast('⬇ Backup baixado (se o navegador bloquear, use COPIAR BACKUP)', 'good'); }
      catch { toast('Não consegui baixar. Use COPIAR BACKUP.', 'bad'); }
    },
    'journal-edit': (d) => {
      const x = S.core.journal?.[d.d];
      if (x) openModal(`<form data-v4form="journal-edit" data-d="${esc(d.d)}" autocomplete="off"><h2>📔 ${fmtDM(d.d)} · ${DOW[weekday(d.d)]}</h2><p class="muted">${esc(x.q)}</p><textarea class="inp" name="a" rows="4" maxlength="240" autofocus aria-label="Resposta">${esc(x.a)}</textarea><div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">SALVAR</button></div></form>`);
    },
    'journal-del': (d) => A.deleteJournal(d.d),
    'weight-del': (d) => A.deleteWeight(d.d),
    'goal-apply': (d) => { A.setRule('DAILY_GOAL', +d.v); sfx('coin'); },
    'hist-del': async (d) => {
      if (d.k === 'bonus') A.deleteBonus(d.id);
      else if (d.k === 'journal') A.deleteJournal(d.id);
      else if (d.k === 'sunday' && await ask('Apagar este baú de domingo?', 'O XP dele sai da conta e você pode abrir outro nesse domingo. (Ctrl+Z desfaz.)', 'APAGAR', true)) A.deleteSunday(d.id);
    },
    'xp-preset': (d, e, el) => {
      const f = el.closest('form'); f.xp.value = d.v;
      f.querySelectorAll('[data-act="xp-preset"]').forEach((b) => b.classList.toggle('on', b === el));
    },
    'gorder-reset': () => { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k?.startsWith('gamify-ui:gorder:')) ls.del(k); } render(); toast('Ordem dos cartões restaurada'); },
  });
}

/** empurrar o prazo custa XP: mostra o preço e pergunta antes (devolve true se pode seguir) */
export async function confirmResched(t, due) {
  const cost = A.reschedCost(t, due || null);
  if (!cost) return true;
  const bal = R.totals(S).balance;
  if (bal < cost) { sfx('error'); toast(`Faltam ${cost - bal} XP pra remarcar (custa ${cost} XP).`, 'bad'); return false; }
  return ask('Remarcar custa XP', `Empurrar o prazo de "${String(t.text).replace(/\s*\(\d+\s*XP\)/i, '')}" custa ${cost} XP (a próxima vez custa ${cost * 2}). Seu saldo: ${fmtN(bal)} XP. Dar prazo realista evita isso.`, `PAGAR ${cost} XP`);
}
