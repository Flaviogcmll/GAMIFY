// v5.16 — BULLET JOURNAL (Ryder Carroll) + PRATICIDADE. Tudo liga/desliga em PERKS → 🧠 (settings.neuro).
// Q1 anotar rápido (botão + e tecla +) · Q2 v7.1: segurar e arrastar no celular conclui várias
// F HOJE cheio demais (atenção residual) · G pato de borracha no SOS.
// A migração do mês e o boss parado ficam na entrevista do dia (review.js); o time box na janela da tarefa (app.js).
import { destOptions, destBlock } from './organiza.js';
import { fig, quem } from './elenco.js';
import { S } from './store.js';
import * as A from './actions.js';
import * as R from './rules.js';
import { esc, today, addDays, fmtDM } from './util.js';
import { openModal, closeModal, modalOpen, toast, ask } from './ui.js';
import { sfx } from './audio.js';

const clean = (t) => String(t || '').replace(/\s*\(\d+\s*XP\)/i, '').trim();

// ───────────── Q1: ANOTAR RÁPIDO ─────────────
export function quickAdd(text = '', where = '') {
  if (modalOpen()) return;
  const td = today();
  // v9.5 (pedido do dono): a COR sai do prazo sozinha, então o anotar rápido pergunta o DIA e ONDE a tarefa mora (janela/bloco)
  openModal(`<form data-form="quick" autocomplete="off">${quem('brasinha', Math.max(0, Math.min(4, S.core.brasinha?.stage ?? 0)) + 1, 'Piu! Escreve com a minha pena: nada fica sem casa.')}<h2>✎ anotar rápido</h2>
    <input class="inp" name="text" placeholder="o que veio na cabeça?" aria-label="Tarefa" autofocus data-kbd maxlength="200" value="${esc(text)}">
    <label class="lbl">É</label><div class="row seg qtipo">${[['task', '✎ UMA TAREFA'], ['block', '📦 UM BLOCO NOVO']].map(([v, n], i) => `<label class="btn sm ghost"><input type="radio" name="tipo" value="${v}" ${i ? '' : 'checked'}> ${n}</label>`).join('')}</div>
    <label class="lbl">Dia <span class="meta">· a cor vem do prazo: hoje ou atrasada PRA HOJE, até 7 dias ESSA SEMANA, depois MAIS PRA FRENTE</span></label><div class="row seg qwhen">${[[td, 'HOJE'], [addDays(td, 1), 'AMANHÃ'], ['outro', 'OUTRO'], ['', 'SEM PRAZO']].map(([d, n], i) => `<label class="btn sm ghost"><input type="radio" name="due" value="${d}" ${i ? '' : 'checked'}> ${n}</label>`).join('')}<input class="inp" type="date" name="dia" aria-label="Outro dia" style="width:auto"></div>
    <label class="lbl">Onde mora</label><select class="inp" name="dest" aria-label="Janela e bloco">${destOptions(where || 'new:bd')}</select>
    <label class="lbl">Marcadores <span class="meta">· o 🐸 SAPO é a que importa (o PRIMO cobra primeiro); ⭐ chata vale x2</span></label><div class="pills qmarks">${[['prio', '🐸 SAPO'], ['star', '⭐ CHATA'], ['home', '🛡 CASA'], ['money', '$ DINHEIRO']].map(([k, n]) => `<label class="pill"><input type="checkbox" name="mk-${k}"><span>${n}</span></label>`).join('')}</div>
    <label class="row" style="gap:6px;margin-top:8px"><input type="checkbox" name="wait"> ⏳ aguardando alguém</label>
    <div class="actions"><button type="button" class="btn" data-close>FECHAR</button><button class="btn pri">ANOTAR</button></div></form>`);
}

// ───────────── F: HOJE CHEIO DEMAIS ─────────────
/** faixa curta no topo da lista HOJE (vazia quando está tudo bem) */
export function overflowBar() {
  const o = R.hojeOverflow(S);
  if (!o) return '';
  // v9.0 (guia 10.5): a ROSEMIA aparece em cima das caixas quando a lista enche demais
  return `<div class="cheio">${fig('rosemia', 4, 'cheio-art', 'ROSEMIA: as cartas avisaram, tá cheio demais', true)}<span>HOJE tem <b>${o.count}</b> (seu limite é ${o.max}). A ROSEMIA viu nas cartas: cada tarefa a mais deixa resíduo de atenção.</span>${o.suggest.length ? `<button class="btn sm" data-act="cheio">EMPURRAR ${o.suggest.length} PRA AMANHÃ</button>` : '<button class="btn sm" data-act="distribute" title="As atrasadas ganham dias novos pelo seu ritmo">📅 DISTRIBUIR</button>'}</div>`;
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
  openModal(`<form data-form="duck" data-id="${taskId || ''}" autocomplete="off">${quem('frog-lipe', 1, 'Calma, calabreso. Me conta direitinho onde travou que a gente desenrola.')}<h2>🦆 pato de borracha</h2>
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

// ───────────── v7.1: SEGURAR E ARRASTAR (celular) ─────────────
// Segure o dedo numa tarefa (~0,4 s), arraste por cima das outras e solte: o app pergunta e conclui todas de uma vez (↩ desfaz).
// Substitui o arrastar pro lado (← concluía, → mandava pra amanhã), a pedido do dono. Liga/desliga: PERKS → 🧠 (chave 'swipe').
const HOLD = 420;
let sel = null, eatClick = 0;
const selClear = () => { document.querySelectorAll('li.task.sel-on').forEach((x) => x.classList.remove('sel-on')); document.body.classList.remove('selecting'); };
function selAdd(li) { if (!li || li.classList.contains('done') || !li.dataset.id || sel.ids.has(li.dataset.id)) return; sel.ids.add(li.dataset.id); li.classList.add('sel-on'); }
function selStart(e) {
  if (!S.core || !R.neuroOn(S, 'swipe') || modalOpen() || e.touches.length !== 1) return;
  const li = e.target.closest?.('li.task[data-id]');
  if (!li || li.classList.contains('done') || e.target.closest('.handle, .check, input, textarea, select, .addline, button, a')) return;
  const t0 = e.touches[0];
  sel = { x: t0.clientX, y: t0.clientY, ids: new Set(), on: false };
  sel.timer = setTimeout(() => { if (!sel) return; sel.on = true; document.body.classList.add('selecting'); selAdd(li); navigator.vibrate?.(15); sfx('pick'); }, HOLD);
}
function selMove(e) {
  if (!sel) return;
  const t0 = e.touches[0];
  if (!sel.on) { if (Math.hypot(t0.clientX - sel.x, t0.clientY - sel.y) > 10) { clearTimeout(sel.timer); sel = null; } return; } // mexeu antes: é rolagem
  e.preventDefault(); // segurando: o dedo seleciona, a tela não rola
  selAdd(document.elementFromPoint(t0.clientX, t0.clientY)?.closest?.('li.task[data-id]'));
  if (t0.clientY < 80) scrollBy(0, -10); else if (t0.clientY > innerHeight - 90) scrollBy(0, 10);
}
async function selEnd() {
  if (!sel) return;
  const { on, ids, timer } = sel; clearTimeout(timer); sel = null;
  if (!on) return;
  eatClick = Date.now();
  const list = [...ids];
  if (!list.length) { selClear(); return; }
  const ok = await ask('Concluir?', `Marca ${list.length === 1 ? 'esta tarefa' : `estas ${list.length} tarefas`} como feita${list.length > 1 ? 's' : ''}. O ↩ desfaz.`, `✓ CONCLUIR ${list.length}`);
  selClear();
  if (!ok) return;
  const r = A.doneMany(list);
  if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); } else sfx('ready');
}

// ───────────── liga tudo ─────────────
export function extendBujo(ACTIONS, FORMS) {
  Object.assign(ACTIONS, {
    'quick-add': quickAdd,
    cheio: cheioModal,
    duck: (d) => { closeModal(); duckModal(d.id || null); },
  });
  Object.assign(FORMS, {
    'win-add': (f) => { const text = f.text.value.trim(); if (!text) return; f.text.value = ''; quickAdd(text, 'new:' + f.dataset.win); }, // v9.5: a linha do topo de cada janela
    quick: (f) => {
      let text = f.text.value.trim();
      // v9.9: os marcadores entram no texto (⭐ chata, 🛡 casa, 💰 dinheiro); o 🐸 SAPO fica em t.prio
      if (text && f['mk-money']?.checked && !/💰/.test(text)) text += ' 💰';
      if (text && f['mk-home']?.checked && !/🛡/.test(text)) text = '🛡 ' + text;
      if (text && f['mk-star']?.checked && !/⭐/.test(text)) text = '⭐ ' + text;
      const prio = !!f['mk-prio']?.checked;
      if (!text) return;
      let due = f.querySelector('[name=due]:checked')?.value || null;
      if (due === 'outro' || f.dia.value) due = f.dia.value || null; // digitou uma data: ela vale
      // v9.7 (pedido do dono): a mesma linha cria um BLOCO novo, na janela escolhida em "Onde mora"
      if (f.querySelector('[name=tipo]:checked')?.value === 'block') {
        const v = f.dest.value, ob = !v.startsWith('new:') && S.quests.blocks.find((x) => x.id === v);
        const key = v.startsWith('new:') ? v.slice(4) : ob ? (ob.win ? 'w:' + ob.win : ob.group) : 'bd';
        const w = key.startsWith('w:') && R.windows(S).find((x) => x.id === key.slice(2));
        const r = A.addBlock(w ? w.base : key, text, { win: w ? w.id : undefined, due });
        if (r?.block && f.wait.checked) A.updateBlock(r.block.id, { st: 'wait' });
        closeModal(); sfx('tab'); toast(`📦 Bloco novo: <b>${esc(text)}</b>${due ? ' · prazo ' + fmtDM(due) : ''}.`);
        return;
      }
      const block = destBlock(f.dest.value);
      const r = A.addTask({ text, block, due, area: 'block' });
      if (prio && r?.task) A.toggleMark(r.task.id, 'prio');
      if (f.wait.checked && r?.task) A.setStatus(r.task.id, 'wait');
      closeModal(); sfx('tab');
      const b = block && S.quests.blocks.find((x) => x.id === block);
      toast(`✎ Anotado em <b>${esc(b?.title || '')}</b>${due ? ` · ${due === today() ? 'HOJE' : due === addDays(today(), 1) ? 'AMANHÃ' : due.slice(8) + '/' + due.slice(5, 7)}` : ' · sem prazo'}.`);
    },
    cheio: (f) => { const ids = [...f.querySelectorAll('[name=id]:checked')].map((x) => x.value); closeModal(); if (ids.length) { A.pushTomorrow(ids); sfx('tab'); } },
    duck: (f) => {
      A.saveDuck(f.dataset.id || null, { tried: f.tried.value.trim(), ok: f.ok.value.trim(), nok: f.nok.value.trim() });
      closeModal(); sfx('ready');
      toast(`🦆 ${DUCK_REPLY[new Date().getDate() % DUCK_REPLY.length]}`, 'good');
    },
  });
  document.addEventListener('touchstart', selStart, { passive: true });
  document.addEventListener('touchmove', selMove, { passive: false });
  document.addEventListener('touchend', selEnd);
  document.addEventListener('touchcancel', () => { if (sel) { clearTimeout(sel.timer); sel = null; selClear(); } });
  document.addEventListener('contextmenu', (e) => { if (sel || document.body.classList.contains('selecting')) e.preventDefault(); }); // segurar não abre o menu do navegador
  // o toque que terminou um arrasto não abre a tarefa
  document.addEventListener('click', (e) => { if (Date.now() - eatClick < 400 && e.target.closest?.('li.task')) { e.stopPropagation(); e.preventDefault(); } }, true);
}
/** chamado a cada redesenho */
export function afterRenderBujo() { document.getElementById('qadd')?.remove(); } // v6: o botão + de anotar rápido saiu (pedido do dono)
