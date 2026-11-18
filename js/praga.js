// v6.5 — A PRAGA: tarefa ou ritual atrasado vira uma praga que se espalha pelo app (regras em rules.js → praga()).
// Aqui fica a parte que se vê: a faixa nas abas, a cor da tela por fase e as janelas que pulam (incomodam de propósito).
// Janelas: com o app na fase 3 ou mais, CADA infectada aparece dentro de 7 minutos (com 3 infectadas, uma a cada ~2 min).
// Nunca por cima de outra janela, nunca enquanto você digita, nunca depois da hora de dormir. Tudo desliga em PERKS → 🧠.
import { S } from './store.js';
import * as R from './rules.js';
import * as A from './actions.js';
import { esc, today, addDays } from './util.js';
import { openModal, closeModal, toast, modalOpen } from './ui.js';
import { sfx } from './audio.js';
import { mountPortraits } from './primo.js';

const LINES = [
  'Tô passando mal, primo… essa aqui tá me deixando doente.',
  'Cof, cof… resolve essa pra mim? Tô ficando verde.',
  'Essa atrasada tá espalhando a praga na roça toda.',
  'Me ajuda? Uma feita e eu já melhoro.',
  'Tá ardendo… faz, remarca ou larga, mas não deixa ela aí.',
];
const shown = new Map(); // id → quando apareceu pela última vez
let lastPop = 0;

/** a cor da tela, a FAÍSCA e o PRIMO seguem a PIOR fase (chamado em todo render) */
export function pragaPaint() {
  const pg = R.praga(S), root = document.documentElement;
  if (pg.phase) root.dataset.praga = pg.phase; else delete root.dataset.praga;
  return pg;
}
/** faixa no topo de todas as abas a partir da fase 3 */
export function pragaBanner() {
  const pg = R.praga(S);
  if (pg.phase < 3) return '';
  const w = pg.worst, more = pg.list.length - 1;
  return `<div class="banner praga-b" data-praga="${pg.phase}">🐛 <b>A PRAGA ${pg.phase >= 4 ? 'TOMOU CONTA' : 'ESTÁ SE ESPALHANDO'}</b> · ${esc(w.text.slice(0, 60))} (atrasada há ${w.days} dia${w.days > 1 ? 's' : ''})${more > 0 ? ` e mais ${more}` : ''}. O PRIMO está doente${pg.phase >= 4 ? ', a loja trancou e o XP caiu 20%' : ' e o XP caiu 10%'}.
    <button class="btn sm pri" data-act="praga-pop" data-id="${w.id}">💉 CURAR</button></div>`;
}
/** o que o PRIMO fala quando está infectado */
export function pragaLine() {
  const pg = R.praga(S);
  if (pg.phase < 2) return null;
  return `${LINES[Math.floor(Date.now() / 60e3) % LINES.length]} (${pg.worst.text.slice(0, 40)})`;
}
const item = (id) => R.praga(S).list.find((x) => x.id === id);
function popHtml(x) {
  const pg = R.praga(S), isT = x.kind === 'task';
  return `<div class="praga-pop" data-praga="${x.phase}"><h2>🐛 A PRAGA · fase ${x.phase} de 4: ${R.PRAGA_NAMES[x.phase]}</h2>
    <div class="pp-row"><canvas class="pcv" data-portrait="mini" aria-hidden="true"></canvas>
      <div><p class="pp-t"><b>${esc(x.text)}</b></p><p class="meta">atrasada há ${x.days} dia${x.days > 1 ? 's' : ''}${pg.list.length > 1 ? ` · ${pg.list.length} infectadas no total` : ''}</p>
      <p class="speech">${esc(LINES[Math.floor(Math.random() * LINES.length)])}</p></div></div>
    <p class="meta">Fazer agora dá <b>💉 +${R.PRAGA_XP[x.phase]} XP de antídoto</b>. Remarcar (com motivo) ou cancelar também cura, mas sem antídoto. Depois de curar: 🛡 vacina de 24 h.</p>
    <div class="actions">${isT ? `<button class="btn" data-act="praga-cancel" data-id="${x.id}">✕ CANCELAR</button><button class="btn" data-act="praga-resched" data-id="${x.id}">📅 REMARCAR</button><button class="btn pri" data-act="praga-go" data-id="${x.id}">✅ FAZER AGORA</button>`
      : `<button class="btn" data-close>DEPOIS</button><button class="btn pri" data-act="ritual-done" data-id="${x.id}" data-close>✓ FIZ O RITUAL</button>`}</div>
    ${isT ? '<p class="meta" style="text-align:right;margin:6px 0 0"><a href="#" data-close>agora não</a></p>' : ''}</div>`;
}
export function pragaPop(id) {
  const x = item(id) || R.praga(S).worst;
  if (!x) return;
  shown.set(x.id, Date.now()); lastPop = Date.now();
  openModal(popHtml(x));
  sfx('error');
  setTimeout(() => { try { mountPortraits(document.querySelector('.praga-pop')); } catch { /* */ } }, 30);
}
/** relógio das janelas: roda a cada 20 s */
function tick() {
  const pg = R.praga(S);
  if (pg.phase < 3 || document.hidden || modalOpen()) return;
  const a = document.activeElement;
  if (a && (a.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(a.tagName))) return;
  if (R.neuroOn(S, 'curfew') && ['recolher', 'sono'].includes(R.bodyClock(S).key)) return;
  const gap = Math.max(60e3, R.PRAGA_POP_MS / pg.list.length); // cada infectada aparece dentro de 7 min
  if (Date.now() - lastPop < gap) return;
  const next = [...pg.list].sort((x, y) => (shown.get(x.id) || 0) - (shown.get(y.id) || 0) || y.phase - x.phase)[0];
  pragaPop(next.id);
}
export function extendPraga(ACTIONS, FORMS, jump) {
  lastPop = Date.now() - R.PRAGA_POP_MS + 90e3; // a 1ª janela vem 1 min e meio depois de abrir o app
  setInterval(tick, 20e3);
  Object.assign(ACTIONS, {
    'praga-pop': (d) => pragaPop(d.id),
    'praga-go': (d) => { closeModal(); jump(d.id); },
    'praga-cancel': async (d) => { closeModal(); A.setStatus(d.id, 'cancel'); },
    'praga-resched': (d) => {
      const t = S.quests.tasks.find((y) => y.id === d.id); if (!t) return;
      openModal(`<form data-form="praga-resched" data-id="${t.id}"><h2>📅 remarcar · ${esc(String(t.text).slice(0, 50))}</h2>
        <label class="lbl">Nova data</label><input class="inp" type="date" name="due" required min="${today()}" value="${addDays(today(), 1)}">
        <label class="lbl">Por que atrasou? (obrigatório: é o que cura)</label><input class="inp" name="why" required minlength="4" maxlength="120" placeholder="ex.: dependia do cliente, subestimei o tempo…" autofocus>
        <p class="meta">Remarcar custa o XP normal de remarcar. O motivo fica guardado na tarefa.</p>
        <div class="actions"><button type="button" class="btn" data-close>VOLTAR</button><button class="btn pri">REMARCAR E CURAR</button></div></form>`);
    },
  });
  FORMS['praga-resched'] = (f) => {
    const id = f.dataset.id, due = f.due.value, why = f.why.value.trim();
    if (!due || why.length < 4) { toast('Escreva o motivo (é ele que cura).', 'bad'); return; }
    const t = S.quests.tasks.find((y) => y.id === id); if (!t) return;
    const r = A.updateTask(id, { due, pragaLog: [...(t.pragaLog || []), { d: today(), why }].slice(-10) });
    if (r?.error) { toast(r.error, 'bad'); return; }
    closeModal();
  };
}
