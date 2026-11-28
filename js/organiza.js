// v9.4 (sugestões aprovadas pelo dono: 2, 3, 4, 5): ferramentas de ORGANIZAÇÃO, cada uma com o personagem da lore que combina.
//  2) MODO FOCO numa tarefa: o resto do app some; só ela, os passos, o cronômetro e o FEITO (PRIMO + BRASINHA)
//  3) REVISÃO DA SEMANA guiada (domingo, 10 min): arquivar, organizar a CAIXA DE ENTRADA, escolher as 3 missões, planejar a segunda (MEGG rezando)
//  4) LIMITE DE URGENTE: passou de 5, a ROSEMIA (em cima das caixas) pede pra escolher quais descem pra ESQUENTANDO
//  5) SEM RUMO HÁ 3 DIAS: tarefa sem cor ou sem assunto há 3+ dias, a CAJULINA chama pra organizar (1 vez por dia)
import { S } from './store.js';
import * as R from './rules.js';
import * as A from './actions.js';
import { esc, today, addDays, weekday, fmtDM } from './util.js';
import { openModal, closeModal, modalOpen, toast } from './ui.js';
import { sfx, voz } from './audio.js';
import { quem, sorte, fig } from './elenco.js';
import { confetti } from './fx.js';
import { setDue } from './remarcar.js';
import { markBtns } from './planos.js';

const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
const clean = (t) => String(t?.text || '').replace(/\s*\(\d+\s*XP\)/i, '').replace(/^\s*(↳|>)\s*/, '');
const loose = () => S.quests.tasks.filter((t) => !t.mother && !t.link && R.isOpen(t) && t.st !== 'wait' && t.color !== 'black'); // v9.5: tarefas de verdade (em qualquer janela)
// v9.5: a cor vem do prazo; organizar = dar um PRAZO (HOJE, AMANHÃ, +7 ou uma data)
const orgRow = (t) => { const td = today(), b = t.block && R.findBlock(S, t.block); return `<div class="li org-row"><div class="lt">${esc(clean(t))}<small>${b ? esc(b.title) + ' · ' : ''}${t.due ? fmtDM(t.due) : 'sem prazo'}</small></div><span class="row org-acts">${[['HOJE', td], ['AMANHÃ', addDays(td, 1)], ['+7', addDays(td, 7)]].map(([n, d]) => `<button class="btn sm ghost" data-act="org-due" data-id="${t.id}" data-d="${d}">${n}</button>`).join('')}<input class="inp pc-date" type="date" data-org-due="${t.id}" min="${td}" aria-label="Outro dia">${markBtns(t)}</span></div>`; };

// ───── 4) LIMITE DE URGENTE ─────
/** v9.5: pra onde uma tarefa vai (toda tarefa mora numa janela, dentro de um bloco). Opções: os blocos de cada janela + "📥 AVULSAS" da janela */
export function destOptions(sel = '') {
  const out = [];
  for (const [k, n] of R.assuntos(S).slice(1)) {
    const blocks = S.quests.blocks.filter((b) => b.st !== 'done' && b.group !== 'bs' && (k.startsWith('w:') ? b.win === k.slice(2) : !b.win && b.group === k)).sort((a, z) => (a.title === A.AVULSAS ? -1 : z.title === A.AVULSAS ? 1 : a.title.localeCompare(z.title)));
    out.push(`<optgroup label="${esc(n)}">${blocks.some((b) => b.title === A.AVULSAS) ? '' : `<option value="new:${k}" ${sel === 'new:' + k ? 'selected' : ''}>📥 AVULSAS (${esc(n)})</option>`}${blocks.map((b) => `<option value="${b.id}" ${sel === b.id || (b.title === A.AVULSAS && sel === 'new:' + k) ? 'selected' : ''}>${esc(b.title)}</option>`).join('')}</optgroup>`);
  }
  return out.join('');
}
/** v9.9 (pedido do dono): "📦 MUDAR DE LUGAR" na janela da tarefa: qualquer bloco de qualquer janela, ou virar um bloco novo (ou BOSS) */
export function moveOptions(t) {
  const wins = R.assuntos(S).slice(1);
  return `<option value="">— fica onde está${t?.block ? ' (' + esc(R.findBlock(S, t.block)?.title || '') + ')' : ''} —</option>${destOptions('').replace(new RegExp(`<option value="${t?.block}"[^>]*>[^<]*</option>`), '')}<optgroup label="✨ VIRAR UM BLOCO NOVO">${wins.map(([k, n]) => `<option value="blk:${k}">✨ bloco novo em ${esc(n)}</option>`).join('')}<option value="blk:boss">👹 virar um BOSS</option></optgroup>`;
}
/** resolve o valor escolhido ('new:<janela>' cria/acha o AVULSAS) e devolve o id do bloco */
export const destBlock = (v) => (!v ? null : v.startsWith('new:') ? A.avulsasBlock(v.slice(4)) : v);
/** pergunta onde mora uma tarefa nova (CAJULINA carimba). Devolve o id do bloco ou null */
export function askDestino(text, pre = '') {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal(`${quem('cajulina', 2, 'Toda tarefa tem casa, sô. Me diz onde eu guardo essa.')}<h2>📦 Onde ela mora?</h2><p class="muted">"<b>${esc(text)}</b>"</p>
      <form class="dest-f" autocomplete="off"><select class="inp" name="dest" autofocus>${destOptions(pre || 'new:bd')}</select>
      <div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">GUARDAR AQUI</button></div></form>`, { onClose: () => { if (!done) resolve(null); } });
    m.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); done = true; const v = e.target.dest.value; closeModal(); resolve(destBlock(v)); });
  });
}
// ───── v9.5: MUDANÇA DE CASA: a TODAS saiu; as tarefas soltas (sem bloco) precisam de um lugar. O app pergunta, você escolhe. ─────
export const soltas = () => S.quests.tasks.filter((t) => !t.block && !t.mother && !t.link && (R.isOpen(t) || t.st === 'sent'));
function mudancaHtml() {
  const list = soltas();
  return `<div class="org mudanca">${quem('cajulina', 4, 'A janela TODAS fechou. Essas aqui ficaram sem casa: me diz pra onde cada uma vai que eu carimbo a mudança.')}
    <h2>📦 Mudança: ${list.length} tarefa${list.length === 1 ? '' : 's'} sem casa</h2>
    <form data-form="mudanca" autocomplete="off"><div class="row" style="margin:0 0 8px;gap:6px"><span class="meta">Todas pra:</span><select class="inp" data-mud-all style="width:auto;flex:1">${'<option value="">— escolher uma por uma —</option>' + destOptions('')}</select></div>
    <div class="list">${list.map((t) => `<div class="li"><div class="lt">${esc(clean(t))}<small>${t.due ? fmtDM(t.due) : 'sem prazo'}${t.st === 'wait' ? ' · aguardando' : ''}</small></div><select class="inp mud-sel" name="d:${t.id}" style="width:auto;max-width:230px">${destOptions(t.cat ? 'new:' + t.cat : '')}</select></div>`).join('') || '<div class="empty">nenhuma sem casa. 👏</div>'}</div>
    <div class="actions"><button type="button" class="btn" data-close>DEPOIS</button><button class="btn pri">MUDAR</button></div></form></div>`;
}
export function openMudanca() { openModal(mudancaHtml(), { wide: true }); }
export const URG_MAX = 5;
const urgentes = () => R.openTasks(S).filter((t) => !t.mother && t.st !== 'wait' && R.colorOfTask(S, t) === 'red');
function urgHtml() {
  const list = urgentes();
  return `<div class="org">${quem('rosemia', 4, sorte([`Menino, tem ${list.length} URGENTE. Urgente demais é urgente nenhum. Escolhe o que pode ir pra semana que vem.`, `As cartas não mentem: ${list.length} URGENTE não cabe num dia. Alivia aí.`]))}
    <h2>🔥 URGENTE demais (${list.length} de ${URG_MAX})</h2><p class="meta">Marque as que podem esperar: elas vão pra SEMANA QUE VEM (a cor muda sozinha com o prazo).</p>
    <form data-form="urg-limit" autocomplete="off"><div class="list">${list.map((t) => `<label class="li"><input type="checkbox" name="id" value="${t.id}"> <span class="lt">${esc(clean(t))}<small>${t.due ? fmtDM(t.due) : 'sem data'}${t.block ? ' · ' + esc(R.findBlock(S, t.block)?.title || '') : ''}</small></span></label>`).join('')}</div>
    <div class="actions"><button type="button" class="btn" data-close>DEIXA ASSIM</button><button class="btn pri">→ SEMANA QUE VEM</button></div></form></div>`;
}
export function checkUrgLimit() {
  const n = urgentes().length; if (n <= URG_MAX || modalOpen()) return false;
  let w; try { w = JSON.parse(ls.get('gamify-ui:urglim') || 'null'); } catch { w = null; }
  if (w && w.d === today() && w.n >= n) return false; // já avisou hoje com esse tanto (ou mais)
  ls.set('gamify-ui:urglim', JSON.stringify({ d: today(), n }));
  openModal(urgHtml(), { wide: true }); return true;
}

// ───── 5) SEM RUMO (sem cor ou sem assunto) há 3+ dias ─────
const SEM_DIAS = 3;
const semRumo = () => loose().filter((t) => !t.due && t.created && t.created <= addDays(today(), -SEM_DIAS)); // v9.5: sem PRAZO há 3+ dias
function orgHtml(list, titulo) {
  return `<div class="org">${quem('cajulina', 2, sorte(['Tem papel sem data na mesa, sô. Me diz quando que eu carimbo.', 'Sem prazo fica sem rumo. Bora dar um dia pra cada?']))}
    <h2>${titulo}</h2><p class="meta">Dê um prazo: a cor vem sozinha (até amanhã URGENTE, até 7 dias ESQUENTANDO, depois ESTÁVEL).</p>
    <div class="list org-list">${list.map(orgRow).join('') || '<div class="empty">tudo organizado. Trem bão!</div>'}</div>
    <div class="actions"><button class="btn pri" data-close>PRONTO</button></div></div>`;
}
let orgList = [];
export function openOrganizar(list = semRumo(), titulo = `🗂 Sem prazo há ${SEM_DIAS}+ dias (${list.length})`) { orgList = list.map((t) => t.id); openModal(orgHtml(list, titulo), { wide: true }); }
export function checkSemRumo() {
  if (modalOpen() || ls.get('gamify-ui:semrumo') === today()) return false;
  const list = semRumo(); if (!list.length) return false;
  ls.set('gamify-ui:semrumo', today());
  openOrganizar(list); return true;
}
const redrawOrg = () => { const m = document.querySelector('.modal .org-list'); if (!m) return; const list = orgList.map((id) => S.quests.tasks.find((t) => t.id === id)).filter((t) => t && R.isOpen(t)); m.innerHTML = list.map(orgRow).join(''); window.__deaccent?.(m); };

// ───── 2) MODO FOCO ─────
let foco = null;
function focoHtml(t) {
  const b = t.block && R.findBlock(S, t.block), kids = S.quests.tasks.filter((x) => x.parent === t.id && x.st !== 'cancel'), st = Math.max(0, Math.min(4, S.core.brasinha?.stage ?? 0));
  const left = foco ? Math.max(0, foco.end - Date.now()) : 25 * 60e3, mm = (ms) => `${String(Math.floor(ms / 60e3)).padStart(2, '0')}:${String(Math.floor((ms % 60e3) / 1e3)).padStart(2, '0')}`;
  return `<div class="foco-full"><div class="ff-arte">${fig('primo', 3, '', 'PRIMO', true)}${fig('brasinha', st + 1, 'ff-bras', 'BRASINHA', true)}</div>
    <p class="ff-k">▶ MODO FOCO${b ? ` · ${esc(b.title)}` : ''}</p><h2 class="ff-t">${esc(clean(t))}</h2>
    ${kids.length ? `<ul class="ff-passos">${kids.map((k) => `<li><button class="check" data-act="foco-passo" data-id="${k.id}">${k.st === 'done' ? '✓' : ''}</button> <span class="${k.st === 'done' ? 'ff-feito' : ''}">${esc(clean(k))}</span></li>`).join('')}</ul>` : ''}
    <div class="ff-relogio" data-foco-clock>${mm(left)}</div>
    <div class="row ff-btns"><button class="btn" data-act="foco-timer">${foco?.run ? '⏸ PAUSA' : '▶ 25 MIN'}</button><button class="btn pri" data-act="foco-feito" data-id="${t.id}">✓ FEITO</button><button class="btn ghost" data-act="foco-sair">SAIR</button></div>
    <p class="meta">Só esta. O resto espera. (Esc ou SAIR volta pro app)</p></div>`;
}
export function openFoco(id) {
  const t = S.quests.tasks.find((x) => x.id === id); if (!t) return;
  clearInterval(foco?.tick); foco = { id, end: Date.now() + 25 * 60e3, run: false, rest: 25 * 60e3 };
  const m = openModal(focoHtml(t), { wide: true, onClose: () => { clearInterval(foco?.tick); foco = null; document.documentElement.classList.remove('em-foco'); } });
  m.classList.add('foco-modal'); document.documentElement.classList.add('em-foco'); voz('primo');
}
const redrawFoco = () => { const t = foco && S.quests.tasks.find((x) => x.id === foco.id); const m = document.querySelector('.modal .foco-full'); if (t && m) { m.outerHTML = focoHtml(t); window.__deaccent?.(document.querySelector('.modal')); } };

// ───── 3) REVISÃO DA SEMANA (domingo) ─────
let rv = 0;
const RV_STEPS = ['arquivo', 'caixa', 'missoes', 'segunda'];
function revHtml() {
  const k = RV_STEPS[rv], p = A.archivePreview(), n = p.tasks + p.canceled + p.blocks, caixa = loose().filter((t) => !t.due), wm = R.weeklyMissions(S, addDays(today(), weekday(today()) === 0 ? 1 : 0));
  const body = k === 'arquivo' ? `<h3>1 · Arquivar o que já foi</h3><p>${n ? `Tem <b>${n}</b> coisa${n > 1 ? 's' : ''} feita${n > 1 ? 's' : ''} ainda no quadro.` : 'O quadro já está limpo.'}</p>${n ? '<button class="btn" data-act="rev-arq">🗄 ARQUIVAR AGORA</button>' : ''}`
    : k === 'caixa' ? `<h3>2 · Dar prazo pro que está sem</h3><p class="meta">Tarefas sem prazo (${caixa.length}): escolha um dia.</p><div class="list org-list">${caixa.map(orgRow).join('') || '<div class="empty">caixa vazia. 👏</div>'}</div>`
    : k === 'missoes' ? `<h3>3 · As 3 pedras grandes da semana</h3><p>${wm.tasks.length ? `Escolhidas: ${wm.tasks.map((t) => '<b>' + esc(clean(t)) + '</b>').join(' · ')}` : 'Ainda não escolheu.'}</p><button class="btn" data-act="weekly-pick">📌 ESCOLHER AS 3 MISSÕES</button>`
    : `<h3>4 · Planejar ${weekday(today()) === 0 ? 'a segunda' : 'amanhã'}</h3><p>Dê horário pro que importa: amanhã cedo é só seguir o MEU DIA.</p><button class="btn" data-act="plan-tomorrow">🌙 PLANEJAR AMANHÃ</button>`;
  return `<div class="org revisao">${quem('megg', 2, sorte(['Domingo é dia de arrumar a casa por dentro, meu filho. Dez minutinhos.', 'Quem revisa no domingo não se perde na segunda. Tá no livro.']))}
    <h2>🧭 Revisão da semana <small class="meta">passo ${rv + 1} de ${RV_STEPS.length}</small></h2>${body}
    <div class="actions">${rv ? '<button class="btn" data-act="rev-nav" data-d="-1">◄ VOLTAR</button>' : ''}${rv < RV_STEPS.length - 1 ? '<button class="btn pri" data-act="rev-nav" data-d="1">PRÓXIMO ►</button>' : '<button class="btn pri" data-act="rev-fim">PRONTO ✓</button>'}</div></div>`;
}
export function openRevisao(step = 0) { rv = step; orgList = loose().filter((t) => !t.due).map((t) => t.id); openModal(revHtml(), { wide: true }); }
const redrawRev = () => { const m = document.querySelector('.modal .revisao'); if (m) { m.outerHTML = revHtml(); window.__deaccent?.(document.querySelector('.modal')); } };
export function maybeRevisao() {
  if (weekday(today()) !== 0 || modalOpen() || ls.get('gamify-ui:revisao') === today()) return false;
  ls.set('gamify-ui:revisao', today()); setTimeout(() => { if (!modalOpen()) openRevisao(); }, 900); return true;
}

/** depois de cada redesenho: no máximo UMA dessas janelas por vez (domingo: revisão; senão limite de URGENTE; senão sem rumo) */
let organizaT = 0;
export function maybeOrganiza() {
  clearTimeout(organizaT);
  organizaT = setTimeout(() => { if (modalOpen()) return; maybeRevisao() || checkUrgLimit() || checkSemRumo(); }, 2500);
}

export function extendOrganiza(ACTIONS, FORMS) {
  Object.assign(ACTIONS, {
    'org-cor': (d) => { A.setCor(d.id, d.cor); sfx('tab'); redrawOrg(); },
    organizar: () => openOrganizar(loose().filter((t) => !t.due), '🗂 Dar prazo pro que está sem'),
    'org-due': async (d) => { await setDue(d.id, d.d, { reopen: () => openOrganizar(orgList.map((id) => S.quests.tasks.find((t) => t.id === id)).filter((t) => t && R.isOpen(t)), '🗂 Dar prazo pro que está sem') }); redrawOrg(); },
    'foco-open': (d) => { closeModal(); setTimeout(() => openFoco(d.id), 50); },
    'foco-sair': () => closeModal(),
    'foco-passo': (d) => { const k = S.quests.tasks.find((x) => x.id === d.id); if (k) { A.setStatus(k.id, k.st === 'done' ? '' : 'done'); sfx('check'); setTimeout(redrawFoco, 30); } },
    'foco-feito': (d) => { A.setStatus(d.id, 'done'); A.stat('foco'); closeModal(); sfx('xp'); try { confetti(); } catch { /* */ } toast('✓ Feito, no modo foco. Trem bão!', 'good'); },
    'foco-timer': () => {
      if (!foco) return;
      if (foco.run) { foco.rest = Math.max(0, foco.end - Date.now()); foco.run = false; clearInterval(foco.tick); }
      else { foco.end = Date.now() + foco.rest; foco.run = true; clearInterval(foco.tick); foco.tick = setInterval(() => { const el = document.querySelector('[data-foco-clock]'); if (!el || !foco) return; const ms = Math.max(0, foco.end - Date.now()); el.textContent = `${String(Math.floor(ms / 60e3)).padStart(2, '0')}:${String(Math.floor((ms % 60e3) / 1e3)).padStart(2, '0')}`; if (!ms) { clearInterval(foco.tick); foco.run = false; sfx('bell'); toast('⏰ 25 minutos! Respira, levanta, bebe uma água.', 'gold'); redrawFoco(); } }, 500); }
      sfx('tab'); redrawFoco();
    },
    revisao: () => openRevisao(),
    'rev-nav': (d) => { rv = Math.max(0, Math.min(RV_STEPS.length - 1, rv + +d.d)); sfx('tab'); redrawRev(); },
    'rev-arq': () => { A.archiveNow(); sfx('stamp'); redrawRev(); },
    'rev-fim': () => { A.stat('revisao'); closeModal(); sfx('ready'); toast('🧭 Semana revisada. A MEGG aprovou.', 'good'); },
    mudanca: () => openMudanca(),
    'urg-open': () => openModal(urgHtml(), { wide: true }),
  });
  FORMS.mudanca = (f) => {
    let n = 0; const cache = {};
    for (const sel of f.querySelectorAll('select[name^="d:"]')) { const v = sel.value; if (!v) continue; const bid = cache[v] ||= destBlock(v); if (bid) { const r = A.moveToBlock(sel.name.slice(2), bid); if (r?.error) toast(esc(r.error), 'bad'); else n++; } }
    if (n) A.stat('mudanca', n);
    closeModal(); sfx('stamp'); toast(`📦 ${n} tarefa${n === 1 ? '' : 's'} mudaram de casa.${soltas().length ? ` Faltam ${soltas().length}.` : ' Todas com casa!'}`, 'good');
  };
  document.addEventListener('change', (e) => { const all = e.target.closest?.('[data-mud-all]'); if (all && all.value) all.closest('form').querySelectorAll('.mud-sel').forEach((s) => { s.value = all.value; }); });
  // v9.5: a cor vem do prazo, então aliviar o URGENTE = mandar pra SEMANA QUE VEM (o caminho único de remarcar pergunta o que precisar)
  FORMS['urg-limit'] = async (f) => { const ids = [...f.querySelectorAll('[name=id]:checked')].map((x) => x.value); closeModal(); let ok = 0; for (const id of ids) if (await setDue(id, addDays(today(), 7))) ok++; if (ok) { sfx('tab'); toast(`🔥 ${ok} foram pra semana que vem.`); } };
  document.addEventListener('change', (e) => { const sel = e.target.closest?.('[data-org-cat]'); if (sel) { A.setCat(sel.dataset.orgCat, sel.value); sfx('tab'); } const od = e.target.closest?.('[data-org-due]'); if (od?.value) setDue(od.dataset.orgDue, od.value).then(redrawOrg); });
}
