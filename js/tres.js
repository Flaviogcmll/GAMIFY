// v9.7 (pesquisa J do dono): AS 3 DO DIA — o método de prioridade com mais apoio da ciência pra quem procrastina.
// O que a pesquisa achou (relatório no Drive do dono):
//  - escolher POUCAS coisas (a memória de trabalho segura ~4) e escolher NA VÉSPERA (fazer um plano tira da cabeça o que ficou aberto);
//  - a cor vermelha do prazo puxa pro URGENTE mesmo quando ele vale menos (viés da mera urgência): na hora de escolher, o app mostra o XP;
//  - começar pelo difícil rende mais do que ir no fácil primeiro (estudos de campo): a 1ª é o SAPO e vale mais;
//  - dizer QUANDO vai fazer (intenção de implementação) é o que mais ajuda: o SAPO pede um horário;
//  - dia ruim acontece: "DIA DIFÍCIL" deixa só o SAPO, sem castigo (folga planejada ajuda a não largar tudo).
// Dados: core.tres = { 'AAAA-MM-DD': [id do SAPO, id 2, id 3] } (últimos 14 dias). O bônus de XP fica em rules.js (taskXp, TRES_MULT).
import { S } from './store.js';
import * as R from './rules.js';
import * as A from './actions.js';
import { esc, today, addDays, fmtDM } from './util.js';
import { openModal, closeModal, toast } from './ui.js';
import { sfx } from './audio.js';
import { fig, quem, sorte } from './elenco.js';
import { setDue } from './remarcar.js';

const clean = (t) => String(t?.text || '').replace(/\s*\(\d+\s*XP\)/i, '').replace(/^\s*(↳|>)\s*/, '');
const T = (id) => S.quests.tasks.find((x) => x.id === id);
const dayTxt = (d) => (d === today() ? 'HOJE' : d === addDays(today(), 1) ? 'AMANHÃ' : fmtDM(d));
const where = (t) => (t.block ? R.findBlock(S, t.block)?.title || '' : '');

/** o cartão no topo das MISSÕES */
export function tresCard() {
  if (!S.core) return '';
  const td = today(), ids = R.tresOf(S, td), list = ids.map(T).filter(Boolean);
  const open = R.openTasks(S).filter((t) => t.st !== 'wait' && t.color !== 'black');
  if (!list.length) {
    if (!open.length) return '';
    return `<div class="card tres-card vazio">${fig('frog-lipe', 1, 'tres-art', 'FROG LIPE: engole o sapo primeiro', true)}<div class="tres-txt"><b>🐸 AS 3 DE HOJE</b><span>Escolha até 3 coisas que <b>importam</b> (não só as vermelhas). A 1ª é o <b>SAPO</b>: a mais chata, com hora marcada. SAPO vale x1,5 e as outras x1,25.</span></div><button class="btn sm pri" data-act="tres-edit" data-d="${td}">ESCOLHER AS 3</button></div>`;
  }
  const feitas = list.filter((t) => t.st === 'done').length;
  const row = (t, i) => { const done = t.st === 'done', at = t.box?.at || t.at || ''; return `<li class="tres-i ${i === 0 ? 'sapo' : ''} ${done ? 'done' : ''}" data-n="${i + 1}">
    <button class="tres-chk" data-act="toggle" data-id="${t.id}" aria-label="${done ? 'Desfazer' : 'Concluir'}" title="${done ? 'Desfazer' : 'Feita'}">${done ? '✓' : ''}</button>
    <span class="tres-t" data-act="edit-task" data-id="${t.id}">${i === 0 ? '🐸 ' : ''}${esc(clean(t))}<small>${[where(t), at && '⏰ ' + at, t.due && t.due < td && !done ? 'atrasada' : ''].filter(Boolean).map(esc).join(' · ')}</small></span>
    <span class="tres-x">x${i === 0 ? '1,5' : '1,25'}</span></li>`; };
  const all = feitas === list.length;
  return `<div class="card tres-card ${all ? 'ok' : ''}"><header><h2>🐸 As 3 de hoje</h2><span class="meta">${feitas}/${list.length} feitas${all ? ' · dia ganho! 🎉' : ''}</span>
      <span class="row" style="gap:6px">${list.length > 1 && !feitas ? '<button class="btn sm ghost" data-act="tres-dificil" title="Dia ruim acontece: fica só o SAPO, sem castigo">😮‍💨 DIA DIFÍCIL</button>' : ''}<button class="btn sm ghost" data-act="tres-edit" data-d="${td}">✎</button></span></header>
    <ol class="tres-l">${list.map(row).join('')}</ol></div>`;
}

// ───── a janela de escolher (hoje ou amanhã) ─────
let pick = [], pickD = '', filtro = '';
function cands(d) {
  const tm = addDays(today(), 1);
  const rank = (t) => (t.st === 'doing' ? 0 : t.due && t.due < today() ? 1 : t.due === today() ? 2 : t.due === tm ? 3 : t.due ? 4 : 5);
  const q = filtro.trim().toLowerCase();
  return R.openTasks(S).filter((t) => t.st !== 'wait' && t.color !== 'black' && (!q || clean(t).toLowerCase().includes(q) || where(t).toLowerCase().includes(q)))
    .sort((a, b) => rank(a) - rank(b) || (a.due || '9').localeCompare(b.due || '9')).slice(0, q ? 60 : 30);
}
function pickHtml() {
  const d = pickD, chosen = pick.map(T).filter(Boolean), sapo = chosen[0];
  const row = (t) => { const i = pick.indexOf(t.id); return `<button type="button" class="li tres-c ${i >= 0 ? 'on' : ''}" data-act="tres-pick" data-id="${t.id}" data-color="${R.colorOfTask(S, t) || ''}"><span class="tres-n">${i >= 0 ? (i === 0 ? '🐸' : i + 1) : ''}</span><span class="lt">${esc(clean(t))}<small>${esc(where(t))}${t.due ? ' · ' + esc(dayTxt(t.due)) : ' · sem prazo'}</small></span><span class="chip xp" title="O que ela vale (já com o bônus, se ela entrar nas 3)">${R.taskXp(S, t, d).xp} XP</span></button>`; };
  return `<div class="tres-pick">${quem('frog-lipe', 2, sorte(['Ribbit. Escolhe pelo que IMPORTA, não pelo que tá gritando vermelho.', 'O SAPO primeiro, sô. Depois o resto desce que é uma beleza.', 'Três. Só três. O resto espera sentado.']))}<h2>🐸 As 3 de ${dayTxt(d).toLowerCase()}</h2>
    <p class="meta" style="margin:0 0 8px">Toque pra escolher, na ordem: a 1ª é o <b>SAPO</b> (a mais chata, vale x1,5), as outras valem x1,25. Olhe o XP: vermelho é só prazo perto, não quer dizer que importa mais.</p>
    <div class="tres-sel">${[0, 1, 2].map((i) => `<span class="tres-slot ${chosen[i] ? 'on' : ''}">${i === 0 ? '🐸' : i + 1} ${chosen[i] ? esc(clean(chosen[i]).slice(0, 40)) : '—'}</span>`).join('')}</div>
    ${sapo ? `<label class="lbl">⏰ A que horas você engole o SAPO? <span class="meta">(quem marca a hora faz muito mais)</span></label><div class="row"><input class="inp" type="time" name="tres-at" value="${esc(sapo.box?.at || sapo.at || '')}" style="width:auto">${['08:00', '09:00', '10:00', '14:00'].map((h) => `<button type="button" class="pill" data-act="tres-hora" data-v="${h}"><span>${h}</span></button>`).join('')}</div>` : ''}
    <input class="inp" name="tres-q" placeholder="🔍 procurar tarefa…" value="${esc(filtro)}" style="margin:10px 0 6px" aria-label="Procurar">
    <div class="list tres-cands">${cands(d).map(row).join('') || '<div class="empty">nada em aberto. 👏</div>'}</div>
    <div class="actions"><button type="button" class="btn" data-close>FECHAR</button>${pick.length ? '<button type="button" class="btn ghost" data-act="tres-limpar">LIMPAR</button>' : ''}<button type="button" class="btn pri" data-act="tres-ok">COMBINADO ▸</button></div></div>`;
}
function redraw() {
  const m = document.querySelector('.modal .tres-pick'); if (!m) return;
  const at = m.querySelector('[name="tres-at"]')?.value, foc = document.activeElement?.name;
  m.outerHTML = pickHtml();
  const n = document.querySelector('.modal .tres-pick');
  if (at && n.querySelector('[name="tres-at"]')) n.querySelector('[name="tres-at"]').value = at;
  if (foc === 'tres-q') { const q = n.querySelector('[name="tres-q"]'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  window.__deaccent?.(document.querySelector('.modal'));
}
export function openTres(d = today()) {
  pickD = d; pick = [...R.tresOf(S, d)]; filtro = '';
  const m = openModal(pickHtml(), { wide: true });
  m.addEventListener('input', (e) => { if (e.target.name === 'tres-q') { filtro = e.target.value; redraw(); } });
}

// ───── v9.7 (pesquisa L): REVISÃO DA NOITE SEM CULPA. Quem se perdoa procrastina menos da próxima vez (Wohl, Pychyl & Bennett 2010).
// Cada uma das 3 de hoje que não saiu ganha "o que travou?" com 4 respostas que já viram ação. Nada de bronca.
const PERDAO = ['Acontece, sô. Amanhã começa pelo passo pequeno.', 'Não saiu hoje? A gente costura amanhã. Sem drama.', 'Travar é normal. O importante é saber onde travou.'];
export function travouHtml() {
  const td = today(), tm = addDays(td, 1), left = R.tresOf(S, td).map(T).filter((t) => t && R.isOpen(t) && t.st !== 'wait');
  if (!left.length) return '';
  return `<div class="travou"><h3 class="px" style="font-size:8px;margin:0 0 6px">🐸 O QUE TRAVOU HOJE?</h3><p class="meta" style="margin:0 0 6px">${esc(PERDAO[new Date().getDate() % PERDAO.length])}</p>
    ${left.map((t) => `<div class="li trav-row"><div class="lt">${esc(clean(t))}</div><span class="row trav-acts">
      <button class="btn sm" data-act="trav-grande" data-id="${t.id}" title="Quebrar em passos pequenos">🧩 GRANDE DEMAIS</button>
      <button class="btn sm" data-act="trav-tempo" data-id="${t.id}" data-d="${tm}" title="Vai pra amanhã">⏳ FALTOU TEMPO</button>
      <button class="btn sm" data-act="trav-alguem" data-id="${t.id}" title="Vira AGUARDANDO">🙋 DEPENDO DE ALGUÉM</button>
      <button class="btn sm ghost" data-act="trav-nao" data-id="${t.id}" title="Tudo bem: fica onde está">🤷 NÃO QUIS</button></span></div>`).join('')}</div>`;
}
const backToPlan = () => setTimeout(() => import('./planos.js').then((m) => m.openPlanTomorrow()), 60);

export function extendTres(ACTIONS) {
  Object.assign(ACTIONS, {
    'tres-edit': (d) => { closeModal(); setTimeout(() => openTres(d.d || today()), 30); },
    'tres-pick': (d) => { const i = pick.indexOf(d.id); if (i >= 0) pick.splice(i, 1); else if (pick.length < 3) pick.push(d.id); else { toast('Só 3, sô. Tire uma pra pôr outra.'); return; } sfx('tab'); redraw(); },
    'tres-hora': (d) => { const i = document.querySelector('.modal [name="tres-at"]'); if (i) i.value = d.v; },
    'tres-limpar': () => { pick = []; redraw(); },
    'tres-ok': () => {
      const at = document.querySelector('.modal [name="tres-at"]')?.value || '';
      A.setTres(pickD, pick);
      const sapo = pick[0] && T(pick[0]);
      if (sapo && at && at !== (sapo.at || '')) A.updateTask(sapo.id, { at }); // o horário não mexe no prazo (não custa nada)
      closeModal(); sfx('ready');
      toast(pick.length ? `🐸 Combinado: ${pick.length === 1 ? 'só o SAPO' : `as ${pick.length}`} de ${dayTxt(pickD).toLowerCase()}${at ? ` · SAPO às ${at}` : ''}.` : 'As 3 ficaram vazias.', pick.length ? 'good' : '');
    },
    'trav-grande': (d) => ACTIONS['add-step']?.(d), // a janela de escrever o 1º passo ↳ (a mesma do botão + ↳ PASSO)
    'trav-tempo': async (d) => { closeModal(); await setDue(d.id, d.d, { reopen: backToPlan }); backToPlan(); },
    'trav-alguem': (d) => { A.setStatus(d.id, 'wait'); sfx('tab'); toast('🙋 Foi pra AGUARDANDO. Quando a pessoa responder, ela volta.'); closeModal(); backToPlan(); },
    'trav-nao': (d) => { sfx('tab'); toast('🤷 Tudo bem. Ela fica onde está, sem castigo.'); const r = document.querySelector(`.modal [data-act="trav-nao"][data-id="${d.id}"]`)?.closest('.trav-row'); if (r) r.style.display = 'none'; },
    'tres-dificil': () => { const ids = R.tresOf(S, today()); if (ids.length > 1) { A.setTres(today(), ids.slice(0, 1)); sfx('tab'); toast('😮‍💨 Dia difícil: fica só o SAPO. Fez ele, o dia tá ganho.', 'good'); } },
  });
}
