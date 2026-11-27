// ENTREVISTA DO DIA e REVISÃO DE RETORNO — o PRIMO conduz, em poucos passos, na primeira vez que você abre o app no dia.
// Dia normal: (1) hábitos de ontem que ficaram em branco, (2) o que ficou pra trás, (3) qual é a primeira de hoje.
// Depois de 3 ou mais dias sem abrir: começa perguntando se foi viagem (aí o modo VIAGEM congela esses dias) ou se é só retomar.
// Tudo aqui usa as ações que já existem (marcar hábito, concluir, aguardando, cancelar): nenhuma regra nova de XP.
import { fig } from './elenco.js';
import { setDue } from './remarcar.js';
import { S } from './store.js';
import * as A from './actions.js';
import * as R from './rules.js';
import { esc, today, addDays, fmtDM } from './util.js';
import { openModal, closeModal, modalOpen, toast } from './ui.js';
import { sfx } from './audio.js';
import { mountPortraits } from './primo.js';
import { say } from './v35.js';

const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
const GAP_DAYS = R.WELCOME_GAP; // v9.7: a partir de 2 dias sem abrir vira BOAS-VINDAS (era 3)
const clean = (t) => String(t || '').replace(/\s*\(\d+\s*XP\)/i, '');
/** subtarefa: o dia novo vai até o prazo do bloco */
const where = (t) => (t.block ? R.findBlock(S, t.block)?.title : R.areaName(t.area)) || '';

let st = null; // { steps, i, gap }

const late = () => R.overdueTasks(S).filter((t) => t.st !== 'wait').sort((a, b) => a.due.localeCompare(b.due));
const todays = () => R.openTasks(S).filter((t) => t.due && t.due <= today() && t.st !== 'wait');
const waiting = () => R.openTasks(S).filter((t) => t.st === 'wait');
const blanksYesterday = () => { const y = addDays(today(), -1); if (y < (S.core.startDate || y)) return []; const m = S.marks.days[y]?.h || {}; return S.core.habits.filter((h) => !m[h.id]); };

const BOSS_NUDGE = 'gamify-ui:boss-nudge'; // o lembrete do boss parado aparece no máximo 1 vez por semana
const bossNudgeDue = () => { const l = ls.get(BOSS_NUDGE); return !l || l <= addDays(today(), -7); };
function buildSteps(gap, only) {
  if (only) return [only];
  const steps = [];
  if (R.migrationPending(S)) steps.push('mes');
  if (gap >= GAP_DAYS) steps.push('gap');
  else if (blanksYesterday().length) steps.push('ontem');
  if (late().length) steps.push('atras');
  if (R.staleBosses(S).length && bossNudgeDue()) steps.push('boss');
  if (R.moscaMorta(S).length) steps.push('mosca'); // v8: o PARADO não some mais de todo aviso
  steps.push('hoje');
  return steps;
}

// v5.16 A) MIGRAÇÃO DO MÊS: uma tarefa por vez, ✓ ainda vale (ganha data) · ✕ cancela · ⏭ pula
let mig = { skip: new Set() };
const migList = () => R.migrationCandidates(S).filter((t) => !mig.skip.has(t.id));
const VIEW = {
  mes: () => {
    const l = migList(), t = l[0], td = today(), total = l.length + mig.skip.size;
    return {
      title: 'migração do mês',
      line: t ? 'Mês novo, caderno novo, sô. Se não vale reescrever, não vale fazer: ✓ ainda vale ou ✕ larga mão?' : 'Pronto, caderno limpo! O que ficou é o que vale, uai.',
      body: t ? `<p class="meta">${total - l.length + 1} de ${total} · pode parar quando quiser (PRÓXIMO).</p>
        <div class="migcard"><b>${esc(clean(t.text))}</b><small>${esc(where(t))} · anotada ${fmtDM(t.created || td)}${t.due ? ' · prazo ' + fmtDM(t.due) : ''}</small>
          <div class="row" style="gap:6px;margin-top:10px;justify-content:center">${t.due ? '' : `<input type="date" class="inp" id="mig-due" value="${addDays(td, 7)}" min="${td}" aria-label="Nova data" style="width:auto">`}
            <button class="btn good" data-rv="mig-ok" data-id="${t.id}">✓ AINDA VALE</button><button class="btn danger" data-rv="mig-no" data-id="${t.id}">✕ CANCELA</button><button class="btn ghost sm" data-rv="mig-skip" data-id="${t.id}" title="Deixa como está">⏭</button></div></div>` : '<div class="empty">nada parado. 👏</div>',
    };
  },
  boss: () => {
    const x = R.staleBosses(S)[0];
    if (!x) return { title: 'bosses', line: 'Os bosses tão andando. Trem bão, sô.', body: '' };
    const b = x.boss, name = clean(b.text.replace(/:\s*[\d.]+\s*XP.*$/i, ''));
    return {
      title: 'boss parado',
      line: b.why ? `O boss "${name}" tá parado faz ${x.days} dias. Cê mesmo escreveu por que ele importa, lembra?` : `O boss "${name}" tá parado faz ${x.days} dias. Por que ele importa mesmo, sô?`,
      body: `${b.why ? `<p class="bwhy">💡 ${esc(b.why)}</p>` : ''}${b.fear ? `<p class="bwhy fear">⚠ se eu não fizer: ${esc(b.fear)}</p>` : ''}
        ${!b.why && !b.fear ? '<p class="muted">Dá pra escrever o porquê e o medo dele ao editar o boss.</p>' : ''}
        <div class="list"><button class="li rv-opt" data-rv="boss-go" data-id="${b.id}"><span class="lt">⚔ PUXAR UM PASSO DELE<small>Abre o boss: escolha UMA subtarefa e dê uma data.</small></span></button>
        <button class="li rv-opt" data-rv="boss-pause" data-id="${b.id}"><span class="lt">⏸ PAUSAR 2 SEMANAS<small>Não é desistir: os prazos andam junto e ele volta sozinho.</small></span></button>
        <button class="li rv-opt" data-rv="boss-edit" data-id="${b.id}"><span class="lt">✎ EDITAR O BOSS<small>Escrever o porquê, mudar a meta ou apagar.</small></span></button></div>`,
    };
  },
  mosca: () => {
    if (!st.mosca) { st.mosca = R.moscaMorta(S); if (st.mosca.length) setTimeout(() => A.moscaSeen(st.mosca.map((x) => x.id)), 0); } // viu = só lembra de novo daqui a 7 dias
    const still = (x) => (x.kind === 'block' ? S.quests.blocks.find((b) => b.id === x.id)?.color === 'black' : S.quests.tasks.find((t) => t.id === x.id)?.color === 'black');
    const l = st.mosca.filter(still);
    return {
      title: 'mosca morta',
      line: l.length ? `Ó, sô: ${l.length > 1 ? `tem ${l.length} trem PARADO` : 'tem um trem PARADO'} faz tempo. Mosca morta, mas não esquecida. Continua parado ou volta a andar?` : 'Nada parado esquecido. Trem bão, sô.',
      body: l.length ? `<div class="list" style="max-height:38vh;overflow:auto">${l.map((x) => `<div class="li"><div class="lt">🪰 ${esc(clean(x.text))}<small>${x.kind === 'block' ? 'bloco' : 'tarefa'} parado${x.last ? ` · último lembrete ${fmtDM(x.last)}` : ''}</small></div>
          <span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn sm good" data-rv="mosca-wake" data-id="${x.id}" title="Sai do PARADO e vira ESQUENTANDO">▶ VOLTAR</button><button class="btn sm ghost" data-rv="mosca-go" data-id="${x.id}" data-k="${x.kind}" title="Ir até ele">↗</button></span></div>`).join('')}</div>
        <p class="meta" style="margin:8px 0 0">O que ficar parado continua parado (só você muda). Eu lembro de novo daqui a ${R.MOSCA_DIAS} dias.</p>` : '',
      last: st.steps.at(-1) === 'mosca',
    };
  },
  gap: () => ({
    title: 'boas-vindas!',
    line: `Ô DE CASA! Cê voltou, sô! ${st.gap} dias fora e o BARRANCO BAIXO inteiro sentiu falta. Sem bronca nenhuma: bora recomeçar devagarinho.`,
    body: `<div class="bv-festa" aria-hidden="true">${[['eve-la', 3], ['primo', 2], ['cajulina', 2]].map(([n, p]) => fig(n, p, 'bv-f', '', false)).join('')}</div>
      <p class="bv-bonus">🏠 Faça <b>UMA coisa qualquer</b> hoje (uma tarefa ou um hábito) e ganha <b>+${R.WELCOME_XP} XP de boas-vindas</b>.</p>
      <p class="muted">Sua última visita foi em <b>${fmtDM(st.prev)}</b>. Os dias sem nenhum registro não quebram a sequência dos hábitos.</p>
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
          <span class="row" style="gap:4px;flex-wrap:nowrap"><input type="date" class="inp rv-date" data-rv-date data-id="${t.id}" min="${today()}" title="Escolher o novo dia (remarcar custa ${A.reschedCost(t, addDays(today(), 1)) || 0} XP; a 1ª da semana é grátis)" aria-label="Novo prazo"><button class="btn sm good" data-rv="done" data-id="${t.id}" title="Já fiz">✓</button><button class="btn sm" data-rv="wait" data-id="${t.id}" title="Está aguardando alguém">⏳</button><button class="btn sm ghost" data-rv="cancel" data-id="${t.id}" title="Não vale mais: cancelar">✕</button></span></div>`).join('')}</div>
        ${l.length > show.length ? `<p class="meta">e mais ${l.length - show.length}.</p>` : ''}
        <p class="meta" style="margin:8px 0 0">Muita coisa? <a href="#" data-rv="dist">📅 DISTRIBUIR</a> remarca tudo de uma vez pelo seu ritmo.</p>` : '<div class="empty">nada atrasado. 👏</div>',
    };
  },
  hoje: () => {
    const l = todays(), w = waiting().length, doing = l.find((t) => t.st === 'doing');
    // 🧠 aulas 063 e 099: quem dormiu mal enxerga ameaça em tudo. Sono de ontem sem ✓ → hoje só o essencial
    const sono = R.neuroOn(S, 'clock') && S.core.habits.find((h) => /SONO|DORMIR/i.test(h.name)), y = addDays(today(), -1);
    const badSleep = sono && y >= (S.core.startDate || y) && !S.marks.days[y]?.h?.[sono.id];
    return {
      title: 'por onde começar',
      line: (badSleep ? 'Ontem o sono não foi marcado. Se dormiu mal, hoje o cérebro aumenta os problemas: só o essencial e nada de decisão grande, uai. ' : '') + (doing ? `Fechado: a primeira é "${clean(doing.text).slice(0, 60)}". O resto espera, sô.` : l.length ? 'Agora escolhe UMA pra ser a primeira. Só uma, uai.' : 'Hoje tá sem prazo marcado. Puxa uma coisa pequena pra começar o dia, sô.'),
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
  m.innerHTML = `<div class="brief review">${fig('primo', 1, 'pav', 'PRIMO')}
    <div class="px meta" style="font-size:7px;text-align:center">${st.gap >= GAP_DAYS ? 'BOAS-VINDAS' : 'ENTREVISTA DO DIA'} · PASSO ${st.i + 1} DE ${n}</div>
    <h2>${esc(v.title)}</h2><div class="speech" id="rv-say"></div>${v.body}
    <div class="actions"><div class="left"><button class="btn sm ghost" data-rv="skip">PULAR TUDO</button></div>
      ${st.i > 0 ? '<button class="btn" data-rv="prev">◄</button>' : ''}${v.next === false ? '' : `<button class="btn pri" data-rv="${v.last ? 'end' : 'next'}" autofocus>${v.last ? 'BORA ▶' : 'PRÓXIMO ►'}</button>`}</div>
    <label class="meta" style="display:block;text-align:center;margin-top:8px"><input type="checkbox" data-rv-off ${ls.get('gamify-ui:brief-off') === '1' ? 'checked' : ''}> não mostrar a entrevista do dia</label></div>`;
  mountPortraits(m);
  if (st.said !== key + v.line) { st.said = key + v.line; setTimeout(() => { const el = m.querySelector('#rv-say'); if (el) say(el, v.line, { voice: false }); }, 150); } else m.querySelector('#rv-say').textContent = v.line;
  window.__deaccent?.(m);
}

export function openReview(gap = 0, prev = null, only = null) {
  st = { gap, prev: prev || today(), steps: buildSteps(gap, only), i: 0, said: '' };
  mig = { skip: new Set() };
  if (st.steps.includes('mes')) A.markMigrated(); // oferecida uma vez por mês (dá pra abrir de novo em PERKS → 🧠)
  if (st.steps.includes('boss')) ls.set(BOSS_NUDGE, today());
  mountReview();
}
/** v9.1: a entrevista volta de onde parou depois de uma pergunta do remarcar */
function reopenReview() { if (st) mountReview(); }
function mountReview() {
  const m = openModal('', { onClose: () => { st = null; } });
  m.addEventListener('change', (e) => { // escolheu o dia novo de uma atrasada: remarca na hora (segue a regra de custo)
    const el = e.target.closest?.('[data-rv-date]');
    if (!el || !el.value || !st) return;
    const t = S.quests.tasks.find((x) => x.id === el.dataset.id);
    if (!t) return;
    // v9.1: o caminho único de remarcar; se ele precisar perguntar (bloco, time box, custo), a entrevista volta depois
    const keep = st; setDue(t.id, el.value, { reopen: () => { st = keep; reopenReview(); } }).then(() => { if (document.querySelector('.modal') === m) draw(); });
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
    else if (k === 'mig-ok') { A.migrateKeep(id, m.querySelector('#mig-due')?.value || null); sfx('tab'); }
    else if (k === 'mig-no') { A.setStatus(id, 'cancel'); sfx('undo'); }
    else if (k === 'mig-skip') mig.skip.add(id);
    else if (k === 'boss-pause') { A.pauseBoss(id, addDays(today(), R.BOSS_PAUSE_MAX)); sfx('tab'); }
    else if (k === 'boss-edit') { closeModal(); ACT['edit-boss']?.({ id }); return; }
    else if (k === 'boss-go') { const bo = S.quests.bosses.find((x) => x.id === id); closeModal(); if (bo?.block) ACT['jump-block']?.({ id: bo.block }); return; }
    else if (k === 'mosca-wake') { A.moscaWake(id); sfx('ready'); toast('▶ Voltou a andar: agora tá ESQUENTANDO.', 'good'); }
    else if (k === 'mosca-go') { closeModal(); ACT[b.dataset.k === 'block' ? 'jump-block' : 'jump']?.({ id }); return; }
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
  const off = ls.get('gamify-ui:brief-off') === '1' && gap < GAP_DAYS; // desligou a entrevista: só o retorno (e a migração do mês) continuam
  const only = off ? (R.migrationPending(S) ? 'mes' : R.moscaMorta(S).length ? 'mosca' : null) : null; // v8: a MOSCA MORTA aparece mesmo com a entrevista desligada
  if (off && !only) return;
  ls.set('gamify-ui:brief', td);
  setTimeout(() => { if (!modalOpen()) openReview(gap, prev, only); }, 700);
}

let ACT = {};
export function extendReview(ACTIONS) {
  ACT = ACTIONS;
  Object.assign(ACTIONS, { review: () => openReview(0), migrate: () => openReview(0, null, 'mes') });
}
