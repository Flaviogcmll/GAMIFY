// ENTREVISTA DO DIA e REVISÃO DE RETORNO — o PRIMO conduz, em poucos passos, na primeira vez que você abre o app no dia.
// Dia normal: (1) hábitos de ontem que ficaram em branco, (2) o que ficou pra trás, (3) qual é a primeira de hoje.
// Depois de 3 ou mais dias sem abrir: começa perguntando se foi viagem (aí o modo VIAGEM congela esses dias) ou se é só retomar.
// Tudo aqui usa as ações que já existem (marcar hábito, concluir, aguardando, cancelar): nenhuma regra nova de XP.
import { S } from './store.js';
import * as A from './actions.js';
import * as R from './rules.js';
import { esc, today, addDays, fmtDM } from './util.js';
import { openModal, closeModal, modalOpen, toast } from './ui.js';
import { sfx } from './audio.js';
import { mountPortraits } from './primo.js';
import { say } from './v35.js';

const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
const GAP_DAYS = 3; // a partir de quantos dias sem abrir vira "revisão de retorno"
const clean = (t) => String(t || '').replace(/\s*\(\d+\s*XP\)/i, '');
/** subtarefa: o dia novo vai até o prazo do bloco */
const maxAttr = (t) => { const cap = t.block && R.dueCap(S.quests.blocks.find((b) => b.id === t.block)); return cap ? `max="${cap}"` : ''; };
const where = (t) => (t.block ? R.findBlock(S, t.block)?.title : R.areaName(t.area)) || '';

let st = null; // { steps, i, gap }

const late = () => R.overdueTasks(S).filter((t) => t.st !== 'wait').sort((a, b) => a.due.localeCompare(b.due));
const todays = () => R.openTasks(S).filter((t) => t.due && t.due <= today() && t.st !== 'wait');
const waiting = () => R.openTasks(S).filter((t) => t.st === 'wait');
const blanksYesterday = () => { const y = addDays(today(), -1); if (y < (S.core.startDate || y)) return []; const m = S.marks.days[y]?.h || {}; return S.core.habits.filter((h) => !m[h.id]); };

function buildSteps(gap) {
  const steps = [];
  if (gap >= GAP_DAYS) steps.push('gap');
  else if (blanksYesterday().length) steps.push('ontem');
  if (late().length) steps.push('atras');
  steps.push('hoje');
  return steps;
}

const VIEW = {
  gap: () => ({
    title: `${st.gap} dias fora`,
    line: `Uai, cê sumiu ${st.gap} dias, sô! Sem bronca: em dois minutinhos a gente bota o trem nos trilhos.`,
    body: `<p class="muted">Sua última visita foi em <b>${fmtDM(st.prev)}</b>. Os dias sem nenhum registro não quebram a sequência dos hábitos.</p>
      <div class="list">
        <button class="li rv-opt" data-rv="trip"><span class="lt">✈ FOI VIAGEM OU VISITA<small>Congela esses dias: sem multa de atraso, e os prazos que venceram andam pra frente sem custo.</small></span></button>
        <button class="li rv-opt" data-rv="next"><span class="lt">▶ SÓ SUMI, BORA RETOMAR<small>Seguimos a revisão: o que ficou pra trás e por onde recomeçar.</small></span></button></div>`,
    next: false,
  }),
  ontem: () => {
    const y = addDays(today(), -1), m = S.marks.days[y]?.h || {};
    const miss = S.core.habits.filter((h) => !m[h.id]).map((h) => h.name.toLowerCase());
    const lista = miss.length > 1 ? miss.slice(0, -1).join(', ') + ' e ' + miss.at(-1) : miss[0] || '';
    const BRONCA = [`Ô sô, ontem ficou ${lista} pra trás. Não quero saber de desculpa: hoje cê faz, uai.`, `Uai, cadê ${lista} de ontem? Corrente que arrebenta um elo, a gente emenda HOJE, sô.`,
      `Ontem cê deixou ${lista} na mão. Fiquei triste, mas não bravo... tá, um pouco bravo. Bora compensar hoje.`, `Ontem passou batido: ${lista}. Se fez e esqueceu de marcar, marca aí. Se não fez, hoje é dia de cumprir, uai.`];
    return {
      title: 'ontem',
      line: miss.length ? BRONCA[new Date().getDate() % BRONCA.length] : 'Ontem foi tudo marcadinho. Assim que eu gosto, sô.',
      body: `<p class="muted">Hábitos de ${fmtDM(y)}. Toque: ✓ fiz → – folga → vazio.</p>
        <div class="habs">${S.core.habits.map((h) => { const v = m[h.id] || ''; return `<button class="hab ${v === 'x' ? 'x' : v === '-' ? 'f' : ''}" data-rv="habit" data-h="${h.id}"><span class="hi">${h.icon}</span><span class="hn">${esc(h.name.slice(0, 9))}</span><span class="hs">${v === 'x' ? '✓' : v === '-' ? '–' : '·'}</span></button>`; }).join('')}</div>`,
    };
  },
  atras: () => {
    const l = late(), show = l.slice(0, 8);
    return {
      title: 'o que ficou pra trás',
      line: l.length ? `Tem ${l.length} atrasada${l.length > 1 ? 's' : ''}, uai. Olha uma por uma: fez, tá esperando alguém ou não vale mais?` : 'Uai, zerou as atrasadas! Trem bão demais, sô.',
      body: l.length ? `<p class="muted">📅 escolhe o dia novo · ✓ já fiz · ⏳ esperando alguém · ✕ não vale mais. O que você não mexer continua na lista HOJE.</p>
        <div class="list" style="max-height:44vh;overflow:auto">${show.map((t) => `<div class="li"><div class="lt">${esc(clean(t.text))}<small>${esc(where(t))} · venceu ${fmtDM(t.due)}</small></div>
          <span class="row" style="gap:4px;flex-wrap:nowrap"><input type="date" class="inp rv-date" data-rv-date data-id="${t.id}" min="${today()}" ${maxAttr(t)} title="Escolher o novo dia (remarcar custa ${A.reschedCost(t, addDays(today(), 1)) || 0} XP; a 1ª da semana é grátis)" aria-label="Novo prazo"><button class="btn sm good" data-rv="done" data-id="${t.id}" title="Já fiz">✓</button><button class="btn sm" data-rv="wait" data-id="${t.id}" title="Está aguardando alguém">⏳</button><button class="btn sm ghost" data-rv="cancel" data-id="${t.id}" title="Não vale mais: cancelar">✕</button></span></div>`).join('')}</div>
        ${l.length > show.length ? `<p class="meta">e mais ${l.length - show.length}.</p>` : ''}
        <p class="meta" style="margin:8px 0 0">Muita coisa? <a href="#" data-rv="dist">📅 DISTRIBUIR</a> remarca tudo de uma vez pelo seu ritmo.</p>` : '<div class="empty">nada atrasado. 👏</div>',
    };
  },
  hoje: () => {
    const l = todays(), w = waiting().length, doing = l.find((t) => t.st === 'doing');
    return {
      title: 'por onde começar',
      line: doing ? `Fechado: a primeira é "${clean(doing.text).slice(0, 60)}". O resto espera, sô.` : l.length ? 'Agora escolhe UMA pra ser a primeira. Só uma, uai.' : 'Hoje tá sem prazo marcado. Puxa uma coisa pequena pra começar o dia, sô.',
      body: `${l.length ? `<div class="list" style="max-height:38vh;overflow:auto">${l.slice(0, 10).map((t) => `<button class="li rv-opt ${t.st === 'doing' ? 'on' : ''}" data-rv="doing" data-id="${t.id}"><span class="lt">${t.st === 'doing' ? '▶ ' : ''}${esc(clean(t.text))}<small>${esc(where(t))}${t.due < today() ? ' · atrasada' : ''}</small></span><span class="chip xp">${R.taskXp(S, t).xp}</span></button>`).join('')}</div>` : '<div class="empty">nenhuma tarefa com prazo pra hoje.</div>'}
        ${w ? `<p class="meta" style="margin:8px 0 0">⏳ ${w} aguardando. Se alguma voltou, é só tirar o "aguardando" dela na lista AGUARDANDO.</p>` : ''}`,
      last: true,
    };
  },
};

function draw() {
  const m = document.querySelector('.modal');
  if (!m || !st) return;
  const key = st.steps[st.i], v = VIEW[key](), n = st.steps.length;
  m.innerHTML = `<div class="brief review"><canvas class="pcv pmini" data-portrait="mini" aria-hidden="true"></canvas>
    <div class="px meta" style="font-size:7px;text-align:center">${st.gap >= GAP_DAYS ? 'REVISÃO DE RETORNO' : 'ENTREVISTA DO DIA'} · PASSO ${st.i + 1} DE ${n}</div>
    <h2>${esc(v.title)}</h2><div class="speech" id="rv-say"></div>${v.body}
    <div class="actions"><div class="left"><button class="btn sm ghost" data-rv="skip">PULAR TUDO</button></div>
      ${st.i > 0 ? '<button class="btn" data-rv="prev">◄</button>' : ''}${v.next === false ? '' : `<button class="btn pri" data-rv="${v.last ? 'end' : 'next'}" autofocus>${v.last ? 'BORA ▶' : 'PRÓXIMO ►'}</button>`}</div>
    <label class="meta" style="display:block;text-align:center;margin-top:8px"><input type="checkbox" data-rv-off ${ls.get('gamify-ui:brief-off') === '1' ? 'checked' : ''}> não mostrar a entrevista do dia</label></div>`;
  mountPortraits(m);
  if (st.said !== key + v.line) { st.said = key + v.line; setTimeout(() => { const el = m.querySelector('#rv-say'); if (el) say(el, v.line, { voice: false }); }, 150); } else m.querySelector('#rv-say').textContent = v.line;
  window.__deaccent?.(m);
}

export function openReview(gap = 0, prev = null) {
  st = { gap, prev: prev || today(), steps: buildSteps(gap), i: 0, said: '' };
  const m = openModal('', { onClose: () => { st = null; } });
  m.addEventListener('change', (e) => { // escolheu o dia novo de uma atrasada: remarca na hora (segue a regra de custo)
    const el = e.target.closest?.('[data-rv-date]');
    if (!el || !el.value || !st) return;
    const t = S.quests.tasks.find((x) => x.id === el.dataset.id);
    const cost = t ? A.reschedCost(t, el.value) : 0, r = t && A.updateTask(t.id, { due: el.value });
    if (r?.error) toast(esc(r.error), 'bad'); else toast(`📅 Remarcada pra ${fmtDM(el.value)}${cost ? ` · −${cost} XP` : ''}.`);
    if (document.querySelector('.modal') === m) draw();
  });
  m.addEventListener('click', (e) => {
    const off = e.target.closest('[data-rv-off]');
    if (off) { ls.set('gamify-ui:brief-off', off.checked ? '1' : '0'); return; }
    const b = e.target.closest('[data-rv]');
    if (!b || !st) return;
    e.preventDefault();
    const k = b.dataset.rv, id = b.dataset.id;
    if (k === 'skip' || k === 'end') { if (k === 'end') sfx('ready'); closeModal(); return; }
    if (k === 'next') { st.i = Math.min(st.steps.length - 1, st.i + 1); sfx('tab'); }
    else if (k === 'prev') { st.i = Math.max(0, st.i - 1); sfx('tab'); }
    else if (k === 'trip') { const from = addDays(st.prev, 1); closeModal(); A.startTrip(from <= today() ? from : today(), null); document.querySelector('[data-act="trip-back"]')?.click(); return; }
    else if (k === 'dist') { closeModal(); document.querySelector('[data-act="distribute"]')?.click(); return; }
    else if (k === 'habit') A.cycleHabit(addDays(today(), -1), b.dataset.h);
    else if (k === 'done') A.setStatus(id, 'done');
    else if (k === 'wait') A.setStatus(id, 'wait');
    else if (k === 'cancel') A.setStatus(id, 'cancel');
    else if (k === 'doing') { for (const t of todays()) if (t.st === 'doing' && t.id !== id) A.setStatus(t.id, ''); A.setStatus(id, 'doing'); }
    if (document.querySelector('.modal') === m) draw(); // uma recompensa (ex.: subir de nível) pode ter trocado a janela
  });
  draw();
}

/** chamado a cada redesenho: abre sozinha uma vez por dia (ou a revisão de retorno, se você ficou dias fora) */
export function maybeReview() {
  const td = today();
  if (ls.get('gamify-ui:brief') === td || !ls.get('gamify-ui:tour') || modalOpen() || R.tripNow(S)) return;
  const gap = S._gap || 0, prev = S._prevOpen;
  if (ls.get('gamify-ui:brief-off') === '1' && gap < GAP_DAYS) return; // desligou a entrevista: só o retorno continua aparecendo
  ls.set('gamify-ui:brief', td);
  setTimeout(() => { if (!modalOpen()) openReview(gap, prev); }, 700);
}

export function extendReview(ACTIONS) {
  Object.assign(ACTIONS, { review: () => openReview(0) });
}
