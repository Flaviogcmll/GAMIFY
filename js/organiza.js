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

const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
const clean = (t) => String(t?.text || '').replace(/\s*\(\d+\s*XP\)/i, '').replace(/^\s*(↳|>)\s*/, '');
const loose = () => S.quests.tasks.filter((t) => !t.block && !t.mother && !t.link && R.isOpen(t) && t.st !== 'wait' && t.color !== 'black');
const DOTS = [['urg', 'red'], ['chega', 'yellow'], ['estavel', 'green']];
const corDots = (t) => DOTS.map(([k, c]) => `<button class="pc-cor ${R.corOf(S, t) === k ? 'on' : ''}" data-act="org-cor" data-id="${t.id}" data-cor="${k}" data-c="${c}" title="${R.COR_NAMES[k]}"></button>`).join('');
const catSel = (t) => `<select class="inp org-cat" data-org-cat="${t.id}" aria-label="Assunto">${R.assuntos(S).map(([k, n]) => `<option value="${k}" ${R.catOf(S, t) === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
const orgRow = (t) => `<div class="li org-row"><div class="lt">${esc(clean(t))}<small>${t.due ? fmtDM(t.due) : 'sem data'}</small></div><span class="row org-acts">${corDots(t)}${catSel(t)}</span></div>`;

// ───── 4) LIMITE DE URGENTE ─────
export const URG_MAX = 5;
const urgentes = () => R.openTasks(S).filter((t) => !t.mother && t.st !== 'wait' && R.colorOfTask(S, t) === 'red');
function urgHtml() {
  const list = urgentes();
  return `<div class="org">${quem('rosemia', 4, sorte([`Menino, tem ${list.length} URGENTE. Urgente demais é urgente nenhum. Escolhe quem desce pra ESQUENTANDO.`, `As cartas não mentem: ${list.length} URGENTE não cabe num dia. Alivia aí.`]))}
    <h2>🔥 URGENTE demais (${list.length} de ${URG_MAX})</h2><p class="meta">Marque as que podem esperar um pouco: elas vão pra ESQUENTANDO (amarelo). O prazo não muda.</p>
    <form data-form="urg-limit" autocomplete="off"><div class="list">${list.map((t) => `<label class="li"><input type="checkbox" name="id" value="${t.id}"> <span class="lt">${esc(clean(t))}<small>${t.due ? fmtDM(t.due) : 'sem data'}${t.block ? ' · ' + esc(R.findBlock(S, t.block)?.title || '') : ''}</small></span></label>`).join('')}</div>
    <div class="actions"><button type="button" class="btn" data-close>DEIXA ASSIM</button><button class="btn pri">DESCER PRA ESQUENTANDO</button></div></form></div>`;
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
const semRumo = () => loose().filter((t) => (!t.color || !t.cat) && t.created && t.created <= addDays(today(), -SEM_DIAS));
function orgHtml(list, titulo) {
  return `<div class="org">${quem('cajulina', 2, sorte(['Tem papel solto na mesa, sô. Dá uma cor e um assunto que eu carimbo e guardo.', 'Sem cor e sem assunto fica sem rumo. Bora arrumar?']))}
    <h2>${titulo}</h2><p class="meta">Cor = a pressa (URGENTE, ESQUENTANDO, ESTÁVEL) · assunto = o grupo na TODAS. Muda na hora.</p>
    <div class="list org-list">${list.map(orgRow).join('') || '<div class="empty">tudo organizado. Trem bão!</div>'}</div>
    <div class="actions"><button class="btn pri" data-close>PRONTO</button></div></div>`;
}
let orgList = [];
export function openOrganizar(list = semRumo(), titulo = `🗂 Sem rumo há ${SEM_DIAS}+ dias (${list.length})`) { orgList = list.map((t) => t.id); openModal(orgHtml(list, titulo), { wide: true }); }
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
  const k = RV_STEPS[rv], p = A.archivePreview(), n = p.tasks + p.canceled + p.blocks, caixa = loose().filter((t) => !t.cat || !t.color), wm = R.weeklyMissions(S, addDays(today(), weekday(today()) === 0 ? 1 : 0));
  const body = k === 'arquivo' ? `<h3>1 · Arquivar o que já foi</h3><p>${n ? `Tem <b>${n}</b> coisa${n > 1 ? 's' : ''} feita${n > 1 ? 's' : ''} ainda no quadro.` : 'O quadro já está limpo.'}</p>${n ? '<button class="btn" data-act="rev-arq">🗄 ARQUIVAR AGORA</button>' : ''}`
    : k === 'caixa' ? `<h3>2 · Esvaziar a CAIXA DE ENTRADA</h3><p class="meta">Dê cor e assunto pro que está solto (${caixa.length}).</p><div class="list org-list">${caixa.map(orgRow).join('') || '<div class="empty">caixa vazia. 👏</div>'}</div>`
    : k === 'missoes' ? `<h3>3 · As 3 pedras grandes da semana</h3><p>${wm.tasks.length ? `Escolhidas: ${wm.tasks.map((t) => '<b>' + esc(clean(t)) + '</b>').join(' · ')}` : 'Ainda não escolheu.'}</p><button class="btn" data-act="weekly-pick">📌 ESCOLHER AS 3 MISSÕES</button>`
    : `<h3>4 · Planejar ${weekday(today()) === 0 ? 'a segunda' : 'amanhã'}</h3><p>Dê horário pro que importa: amanhã cedo é só seguir o MEU DIA.</p><button class="btn" data-act="plan-tomorrow">🌙 PLANEJAR AMANHÃ</button>`;
  return `<div class="org revisao">${quem('megg', 2, sorte(['Domingo é dia de arrumar a casa por dentro, meu filho. Dez minutinhos.', 'Quem revisa no domingo não se perde na segunda. Tá no livro.']))}
    <h2>🧭 Revisão da semana <small class="meta">passo ${rv + 1} de ${RV_STEPS.length}</small></h2>${body}
    <div class="actions">${rv ? '<button class="btn" data-act="rev-nav" data-d="-1">◄ VOLTAR</button>' : ''}${rv < RV_STEPS.length - 1 ? '<button class="btn pri" data-act="rev-nav" data-d="1">PRÓXIMO ►</button>' : '<button class="btn pri" data-act="rev-fim">PRONTO ✓</button>'}</div></div>`;
}
export function openRevisao(step = 0) { rv = step; orgList = loose().filter((t) => !t.cat || !t.color).map((t) => t.id); openModal(revHtml(), { wide: true }); }
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
    organizar: () => openOrganizar(semRumo().length ? semRumo() : loose().filter((t) => !t.cat || !t.color), '🗂 Organizar a CAIXA DE ENTRADA'),
    'foco-open': (d) => { closeModal(); setTimeout(() => openFoco(d.id), 50); },
    'foco-sair': () => closeModal(),
    'foco-passo': (d) => { const k = S.quests.tasks.find((x) => x.id === d.id); if (k) { A.setStatus(k.id, k.st === 'done' ? '' : 'done'); sfx('check'); setTimeout(redrawFoco, 30); } },
    'foco-feito': (d) => { A.setStatus(d.id, 'done'); closeModal(); sfx('xp'); try { confetti(); } catch { /* */ } toast('✓ Feito, no modo foco. Trem bão!', 'good'); },
    'foco-timer': () => {
      if (!foco) return;
      if (foco.run) { foco.rest = Math.max(0, foco.end - Date.now()); foco.run = false; clearInterval(foco.tick); }
      else { foco.end = Date.now() + foco.rest; foco.run = true; clearInterval(foco.tick); foco.tick = setInterval(() => { const el = document.querySelector('[data-foco-clock]'); if (!el || !foco) return; const ms = Math.max(0, foco.end - Date.now()); el.textContent = `${String(Math.floor(ms / 60e3)).padStart(2, '0')}:${String(Math.floor((ms % 60e3) / 1e3)).padStart(2, '0')}`; if (!ms) { clearInterval(foco.tick); foco.run = false; sfx('bell'); toast('⏰ 25 minutos! Respira, levanta, bebe uma água.', 'gold'); redrawFoco(); } }, 500); }
      sfx('tab'); redrawFoco();
    },
    revisao: () => openRevisao(),
    'rev-nav': (d) => { rv = Math.max(0, Math.min(RV_STEPS.length - 1, rv + +d.d)); sfx('tab'); redrawRev(); },
    'rev-arq': () => { A.archiveNow(); sfx('stamp'); redrawRev(); },
    'rev-fim': () => { closeModal(); sfx('ready'); toast('🧭 Semana revisada. A MEGG aprovou.', 'good'); },
    'urg-open': () => openModal(urgHtml(), { wide: true }),
  });
  FORMS['urg-limit'] = (f) => { const ids = [...f.querySelectorAll('[name=id]:checked')].map((x) => x.value); for (const id of ids) A.setCor(id, 'chega'); closeModal(); if (ids.length) { sfx('tab'); toast(`🔥 ${ids.length} desceram pra ESQUENTANDO.`); } };
  document.addEventListener('change', (e) => { const sel = e.target.closest?.('[data-org-cat]'); if (sel) { A.setCat(sel.dataset.orgCat, sel.value); sfx('tab'); } });
}
