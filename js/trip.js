// VIAGEM / VISITAS — botão que congela o jogo enquanto você está fora e ajuda a voltar rápido.
// Enquanto dura: hábitos viram folga (a sequência não quebra), a meta do dia não conta e não há multa de atraso.
// Na volta: os prazos que venceram andam pra frente sem custo e o app oferece as tarefas de "chegar em casa".
// As regras ficam em rules.js (tripNow, tripDay) e as mudanças de dados em actions.js (startTrip, endTrip).
import { S } from './store.js';
import * as A from './actions.js';
import * as R from './rules.js';
import { esc, today, addDays, fmtDM } from './util.js';
import { openModal, closeModal } from './ui.js';
import { sfx } from './audio.js';
import { primoReact } from './primo.js';

/** tarefas sugeridas na volta (dá pra desmarcar ou escrever outra na hora) */
const BACK_TASKS = ['DESFAZER E GUARDAR AS MALAS', 'LAVAR A ROUPA DA VIAGEM', 'REVISAR AGENDA E PRAZOS DA SEMANA', 'RESPONDER MENSAGENS E PENDÊNCIAS QUE FICARAM', 'ESCOLHER AS 3 MISSÕES DA SEMANA'];

/** faixa no topo enquanto a viagem está ligada */
export function tripBanner() {
  const p = A.tripPreview();
  if (!p) return '';
  return `<div class="banner info">✈ <b>EM VIAGEM</b> desde ${fmtDM(p.from)}${p.days ? ` (${p.days} dia${p.days > 1 ? 's' : ''})` : ''}${p.until ? ` · volta prevista ${fmtDM(p.until)}` : ''}. Jogo congelado: hábitos em folga, sem multa de atraso.
    <span class="row" style="margin-top:8px"><button class="btn sm pri" data-act="trip-back">🏠 VOLTEI</button></span></div>`;
}

function startModal() {
  const td = today();
  openModal(`<form data-tripform="start" autocomplete="off"><h2>✈ viagem / visitas</h2>
    <p class="muted">O jogo fica congelado enquanto você estiver fora: os hábitos viram folga (a sequência não quebra), a meta do dia não conta e ninguém leva multa de atraso. Na volta, os prazos que venceram andam pra frente sem custo.</p>
    <div class="row"><div class="grow"><label class="lbl" for="trip-from">Saí em</label><input class="inp" type="date" id="trip-from" name="from" value="${td}" max="${td}" min="${addDays(td, -30)}"></div>
      <div class="grow"><label class="lbl" for="trip-until">Volto em (se souber)</label><input class="inp" type="date" id="trip-until" name="until" min="${td}"></div></div>
    <p class="meta" style="margin:8px 0 0">Esqueceu de ligar antes de sair? É só colocar a data em que saiu.</p>
    <div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">✈ INICIAR VIAGEM</button></div></form>`);
}
function backModal() {
  const p = A.tripPreview();
  if (!p) return;
  openModal(`<form data-tripform="back" autocomplete="off"><h2>🏠 de volta!</h2>
    <p class="muted">Você ficou <b>${p.days} dia${p.days === 1 ? '' : 's'}</b> fora (desde ${fmtDM(p.from)}). Ao confirmar: os hábitos desses dias ficam como folga${p.late ? ` e <b>${p.late} prazo${p.late > 1 ? 's' : ''}</b> que vence${p.late > 1 ? 'ram' : 'u'} na viagem anda${p.late > 1 ? 'm' : ''} ${p.days} dia${p.days === 1 ? '' : 's'} pra frente, sem custo` : ''}.</p>
    <label class="lbl">Tarefas de volta (desmarque o que não precisa)</label>
    <div class="list">${BACK_TASKS.map((t) => `<label class="li" style="cursor:pointer"><span class="lt"><input type="checkbox" name="bt" value="${esc(t)}" checked> ${esc(t)}</span></label>`).join('')}</div>
    <input class="inp" name="extra" placeholder="+ outra tarefa de volta (opcional)" aria-label="Outra tarefa de volta" style="margin-top:8px">
    <p class="meta" style="margin:8px 0 0">Elas entram na lista de hoje. Depois, o botão 📅 DISTRIBUIR reorganiza o resto dos prazos.</p>
    <div class="actions"><button type="button" class="btn" data-close>AINDA NÃO</button><button class="btn pri" autofocus>🏠 VOLTAR AO JOGO</button></div></form>`);
}

/** chamado depois de abrir o app: se a data de volta já passou, pergunta se você voltou */
export function tripCheck() {
  const tr = R.tripNow(S);
  if (tr?.until && tr.until < today()) setTimeout(backModal, 900);
}

export function extendTrip(ACTIONS) {
  Object.assign(ACTIONS, {
    trip: () => (R.tripNow(S) ? backModal() : startModal()),
    'trip-back': () => backModal(),
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest?.('form[data-tripform]');
    if (!f) return;
    e.preventDefault();
    if (f.dataset.tripform === 'start') { A.startTrip(f.from.value, f.until.value); closeModal(); sfx('tab'); primoReact('viagem_ida'); }
    else {
      const texts = [...f.querySelectorAll('[name=bt]:checked')].map((x) => x.value);
      if (f.extra.value.trim()) texts.push(f.extra.value.trim());
      A.endTrip(texts); closeModal(); sfx('level'); primoReact('viagem_volta');
    }
  });
}
