// v5.16 — BULLET JOURNAL (Ryder Carroll) + PRATICIDADE. Tudo liga/desliga em PERKS → 🧠 (settings.neuro).
// Q1 anotar rápido (botão + e tecla +) · Q2 arrastar a tarefa no celular (← conclui, → amanhã)
// F HOJE cheio demais (atenção residual) · G pato de borracha no SOS.
// A migração do mês e o boss parado ficam na entrevista do dia (review.js); o time box na janela da tarefa (app.js).
import { S } from './store.js';
import * as A from './actions.js';
import * as R from './rules.js';
import { esc, today, addDays, fmtDM } from './util.js';
import { openModal, closeModal, modalOpen, toast } from './ui.js';
import { sfx } from './audio.js';

const clean = (t) => String(t || '').replace(/\s*\(\d+\s*XP\)/i, '').trim();

// ───────────── Q1: ANOTAR RÁPIDO ─────────────
function quickAdd() {
  if (modalOpen()) return;
  const td = today();
  openModal(`<form data-form="quick" autocomplete="off"><h2>✎ anotar rápido</h2>
    <input class="inp" name="text" placeholder="o que veio na cabeça?" aria-label="Tarefa" autofocus maxlength="200">
    <div class="row seg qwhen" style="margin-top:8px">${[['', 'SEM PRAZO'], [td, 'HOJE'], [addDays(td, 1), 'AMANHÃ']].map(([d, n], i) => `<label class="btn sm ghost"><input type="radio" name="due" value="${d}" ${i ? '' : 'checked'}> ${n}</label>`).join('')}</div>
    <p class="meta" style="margin:6px 0 0">Enter salva. Depois você dá data e lugar com calma.</p>
    <div class="actions"><button type="button" class="btn" data-close>FECHAR</button><button class="btn pri">ANOTAR</button></div></form>`);
}
function fab() {
  let b = document.getElementById('qadd');
  if (!b) {
    b = document.createElement('button');
    b.id = 'qadd'; b.className = 'qadd'; b.type = 'button';
    b.setAttribute('aria-label', 'Anotar rápido'); b.title = 'Anotar rápido (tecla +)';
    b.textContent = '+';
    b.addEventListener('click', quickAdd);
    document.body.appendChild(b);
  }
  b.hidden = !S.core || !R.neuroOn(S, 'quick');
}

// ───────────── F: HOJE CHEIO DEMAIS ─────────────
/** faixa curta no topo da lista HOJE (vazia quando está tudo bem) */
export function overflowBar() {
  const o = R.hojeOverflow(S);
  if (!o) return '';
  return `<div class="cheio"><span>🧠 HOJE tem <b>${o.count}</b> (seu limite é ${o.max}). Cada tarefa a mais deixa resíduo de atenção.</span>${o.suggest.length ? `<button class="btn sm" data-act="cheio">EMPURRAR ${o.suggest.length} PRA AMANHÃ</button>` : '<button class="btn sm" data-act="distribute" title="As atrasadas ganham dias novos pelo seu ritmo">📅 DISTRIBUIR</button>'}</div>`;
}
function cheioModal() {
  const o = R.hojeOverflow(S);
  if (!o?.suggest.length) return;
  openModal(`<form data-form="cheio"><h2>🧠 aliviar o HOJE</h2><p class="muted">As menos importantes vão pra AMANHÃ, sem custo. Desmarque o que precisa ficar.</p>
    <div class="list">${o.suggest.map((t) => `<label class="li"><input type="checkbox" name="id" value="${t.id}" checked> <span class="lt">${esc(clean(t.text))}</span><span class="chip xp">${R.taskXp(S, t).xp}</span></label>`).join('')}</div>
    <div class="actions"><button type="button" class="btn" data-close>DEIXAR ASSIM</button><button class="btn pri">EMPURRAR</button></div></form>`);
}

// ───────────── G: PATO DE BORRACHA ─────────────
function duckModal(taskId) {
  const t = taskId && S.quests.tasks.find((x) => x.id === taskId);
  const last = (t?.duck || []).at(-1);
  openModal(`<form data-form="duck" data-id="${taskId || ''}" autocomplete="off"><h2>🦆 pato de borracha</h2>
    <p class="muted">Explique pro PRIMO como se ele não soubesse nada. Escrever o problema em voz alta costuma mostrar a saída.${t ? `<br><b>${esc(clean(t.text))}</b>` : ''}</p>
    <label class="lbl" for="dk-t">O que eu tentei</label><textarea class="inp" id="dk-t" name="tried" rows="2" autofocus></textarea>
    <label class="lbl" for="dk-o">O que funcionou</label><textarea class="inp" id="dk-o" name="ok" rows="1"></textarea>
    <label class="lbl" for="dk-n">O que não funcionou / onde travou</label><textarea class="inp" id="dk-n" name="nok" rows="2"></textarea>
    ${last ? `<p class="meta" style="margin:8px 0 0">da última vez (${fmtDM(last.date)}): ${esc([last.tried, last.nok].filter(Boolean).join(' · ').slice(0, 160))}</p>` : ''}
    <div class="actions"><button type="button" class="btn" data-close>FECHAR</button><button class="btn pri">EXPLIQUEI</button></div></form>`);
}
const DUCK_REPLY = [
  'Uai, olha só: cê mesmo achou o nó. Agora escolhe o menor pedaço e faz 10 minutinhos, sô.',
  'Falar em voz alta desembola o trem. Qual é o próximo passo de 10 minutos?',
  'O que não funcionou já é informação boa. Tenta o contrário, ou pede ajuda pra alguém, uai.',
];

// ───────────── Q2: ARRASTAR A TAREFA NO CELULAR ─────────────
// ← (esquerda) conclui · → (direita) empurra pra amanhã. Só no toque: no PC continua o arrastar pela alça ⠿.
const SWIPE = 80;
let sw = null, eatClick = 0;
function swipeStart(e) {
  if (e.pointerType !== 'touch' || !S.core || !R.neuroOn(S, 'swipe') || modalOpen()) return;
  const li = e.target.closest?.('li.task[data-id]');
  if (!li || e.target.closest('.handle, input, textarea, select, .addline')) return;
  sw = { li, id: li.dataset.id, x: e.clientX, y: e.clientY, dx: 0, on: false };
}
function swipeMove(e) {
  if (!sw || e.pointerType !== 'touch') return;
  const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
  if (!sw.on) {
    if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; } // é rolagem
    if (Math.abs(dx) < 14 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    sw.on = true; sw.li.classList.add('swiping');
  }
  sw.dx = Math.max(-140, Math.min(140, dx));
  sw.li.style.transform = `translateX(${sw.dx}px)`;
  sw.li.classList.toggle('sw-done', sw.dx <= -SWIPE);
  sw.li.classList.toggle('sw-next', sw.dx >= SWIPE);
}
function swipeEnd(e, ACTIONS) {
  if (!sw) return;
  const { li, id, dx, on } = sw;
  sw = null;
  if (!on) return;
  eatClick = Date.now();
  li.style.transform = ''; li.classList.remove('swiping', 'sw-done', 'sw-next');
  const t = S.quests.tasks.find((x) => x.id === id);
  if (!t) return;
  if (dx <= -SWIPE) { ACTIONS.toggle({ id }, e); return; }
  if (dx >= SWIPE) {
    if (!R.isOpen(t)) return;
    const tm = addDays(today(), 1);
    if (t.due && t.due >= tm) { toast('Já está pra amanhã ou depois.'); return; }
    const cost = A.reschedCost(t, tm), r = A.updateTask(id, { due: tm });
    if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); if (r.locked) ACTIONS['edit-task']({ id }); return; }
    sfx('tab'); toast(`→ AMANHÃ: <b>${esc(clean(t.text).slice(0, 50))}</b>${cost ? ` · −${cost} XP` : ''}. ↩ desfaz.`);
  }
}

// ───────────── liga tudo ─────────────
export function extendBujo(ACTIONS, FORMS) {
  Object.assign(ACTIONS, {
    'quick-add': quickAdd,
    cheio: cheioModal,
    duck: (d) => { closeModal(); duckModal(d.id || null); },
  });
  Object.assign(FORMS, {
    quick: (f) => {
      const text = f.text.value.trim();
      if (!text) return;
      const due = f.querySelector('[name=due]:checked')?.value || null;
      A.addTask({ text, area: due ? R.listOf({ due }) : 'sem', due });
      closeModal(); sfx('tab');
      toast(`✎ Anotado em <b>${esc(R.AREAS[due ? R.listOf({ due }) : 'sem'])}</b>.`);
    },
    cheio: (f) => { const ids = [...f.querySelectorAll('[name=id]:checked')].map((x) => x.value); closeModal(); if (ids.length) { A.pushTomorrow(ids); sfx('tab'); } },
    duck: (f) => {
      A.saveDuck(f.dataset.id || null, { tried: f.tried.value.trim(), ok: f.ok.value.trim(), nok: f.nok.value.trim() });
      closeModal(); sfx('ready');
      toast(`🦆 ${DUCK_REPLY[new Date().getDate() % DUCK_REPLY.length]}`, 'good');
    },
  });
  document.addEventListener('pointerdown', swipeStart, { passive: true });
  document.addEventListener('pointermove', swipeMove, { passive: true });
  document.addEventListener('pointerup', (e) => swipeEnd(e, ACTIONS));
  document.addEventListener('pointercancel', () => { if (sw) { sw.li.style.transform = ''; sw.li.classList.remove('swiping', 'sw-done', 'sw-next'); sw = null; } });
  // o toque que terminou um arrasto não abre a tarefa
  document.addEventListener('click', (e) => { if (Date.now() - eatClick < 400 && e.target.closest?.('li.task')) { e.stopPropagation(); e.preventDefault(); } }, true);
}
/** chamado a cada redesenho */
export function afterRenderBujo() { document.getElementById('qadd')?.remove(); } // v6: o botão + de anotar rápido saiu (pedido do dono)
