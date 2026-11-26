// APP — liga tudo: abas (como na planilha), dia/noite, cliques, janelas, PRIMO, SOS, arrastar e soltar, sons.
import { extendOrganiza, maybeOrganiza } from './organiza.js';
import { extendLobo, loboTermo } from './lobo.js';
import { checkAvisos } from './planos.js';
import { setDue } from './remarcar.js';
import { FALAS, NOMES, quem, sorte } from './elenco.js';
import { S, status, init, onChange, replaceAll, exportAll } from './store.js';

import * as A from './actions.js';
import * as R from './rules.js';
import { esc, today, addDays, weekday, fmtDM, fmtN, uid, DOW, diffDays, lightNow } from './util.js';

import { openModal, closeModal, ask, toast, modalOpen, segBar } from './ui.js';

import { px } from './icons.js';

import { embers, confetti, floatXp, fireworks, poof } from './fx.js';
import { sfx, startAmbience, stopAmbience, ambienceOn, prefs, setVol, toggleMute, voz } from './audio.js';

import { viewQuests, togglePin, curfewSkip, qsortOf, filaCard } from './views/quests.js';

import { viewSurvival } from './views/survival.js';

import { viewAgenda } from './views/agenda.js';

import { viewShop, mmss } from './views/shop.js';

import { viewConquistas, viewRegras } from './views/extras.js';
import { viewFiltro } from './views/filtro.js';

import { viewRotina } from './views/rotina.js';

import { sceneBanner, mountScenes, extend, viewArquivo3, chapterCard, isCollapsed, toggleCollapse } from './v3.js';

import { afterRender, extend35 } from './v35.js';

import { extend4, afterRender4, captureFocus, checkMilestones, confirmResched, dropTaskSmart } from './v4.js';

import { extendPrimo, openPrimoHub, primoFeedback, primoReact } from './primo.js';

import { extendDrive, driveSoon } from './drive.js';
import { extendImgs, imgSection, fillImgs } from './imgs.js';
import { autoSnapshot, backupBanner, extendBackup, markBackup, restoreDocs } from './backup.js';
import { tripBanner, tripCheck, extendTrip } from './trip.js';
import { maybeReview, extendReview } from './review.js';
import { extendPlanos, maybePlanAsk, maybeHabitsAsk } from './planos.js';
import { extendBujo, afterRenderBujo } from './bujo.js';
import { perksNav, perksGo, applyCursor, CURSOR_KEY } from './telas.js';
import { extendMapa } from './mapa.js';
import { extendPraga, extendPraga2, pragaPaint, pragaBanner, banhoSal, pragaGuide, salToast } from './praga.js';
import { renderPostit } from './postit.js';


// abas na mesma ordem da planilha
const ROUTES = [
  ['quests', 'MISSÕES', 'quests', viewQuests, 'q'], ['survival', 'SURVIVAL', 'survival', viewSurvival, 's'], ['agenda', 'AGENDA', 'agenda', viewAgenda, 'a'],
  ['shop', 'FEIRA', 'shop', viewShop, 'l'], ['domingo', 'REFLEXÃO', 'domingo', (u) => { setTimeout(() => { history.replaceState(null, '', '#survival'); document.getElementById('reflexao')?.scrollIntoView({ block: 'start' }); }, 80); return viewSurvival(u); }, 'b'], ['conquistas', 'CONQUISTAS', 'conquistas', viewConquistas, ''],
  ['filtro', 'FILTRO', 'filtro', (u) => { setTimeout(() => { history.replaceState(null, '', '#agenda'); document.getElementById('filtro-v')?.scrollIntoView({ block: 'start' }); }, 80); return viewAgenda(u); }, 'f'], ['rotina', 'ROTINA', 'rotina', viewRotina, 'r'], ['regras', 'PERKS AND RULES', 'regras', viewRegras, 'p'],
  ['arquivo', 'ARQUIVO', 'arquivo', viewArquivo3, ''],
  // v8.5: a FILA DE PRAZOS sozinha numa tela (atalho do app instalado: segure o ícone no celular, ou clique com o direito na barra do PC)
  ['fila', 'FILA', 'agenda', () => `<div class="page-title"><div><h1><em>fila de prazos</em>.</h1></div></div>${filaCard(today())}`, ''],
];
/** a ordem das abas de cima é sua: arraste uma aba sobre outra */
const HIDDEN_TABS = ['filtro', 'fila', 'domingo']; // v6.1: o FILTRO mora dentro da AGENDA · v8.5: a FILA é só pelo atalho
function tabOrder() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('gamify-ui:tabs')) || []; } catch { /* */ }
  const ids = ROUTES.map((r) => r[0]);
  return [...saved.filter((i) => ids.includes(i)), ...ids.filter((i) => !saved.includes(i))].filter((i) => !HIDDEN_TABS.includes(i)).map((i) => ROUTES.find((r) => r[0] === i));
}
let dragTabK = null;
document.addEventListener('dragstart', (e) => { const a = e.target.closest?.('#tabs a[data-tabk]'); if (a) { dragTabK = a.dataset.tabk; e.dataTransfer.effectAllowed = 'move'; } });
document.addEventListener('dragover', (e) => { if (dragTabK && e.target.closest?.('#tabs a[data-tabk]')) e.preventDefault(); });
document.addEventListener('drop', (e) => {
  const a = e.target.closest?.('#tabs a[data-tabk]');
  if (!dragTabK || !a) return;
  e.preventDefault();
  const ord = tabOrder().map((r) => r[0]).filter((k) => k !== dragTabK);
  ord.splice(ord.indexOf(a.dataset.tabk), 0, dragTabK);
  try { localStorage.setItem('gamify-ui:tabs', JSON.stringify(ord)); } catch { /* */ }
  dragTabK = null; render();
});
const ui = { ltab: 'taverna', fcat: null, showDone: false, showStalled: (() => { try { return localStorage.getItem('gamify-ui:stalled') === '1'; } catch { return false; } })(), hweek: 0, tlWeek: 0, arqLimit: 80 };
const $main = document.getElementById('main');
let started = false;
const route = () => { const h = location.hash.replace('#', ''); return ROUTES.find((r) => r[0] === h) ? h : 'quests'; };

// ───────────────────────── DIA (papel) / NOITE (fogueira) ─────────────────────────
function modePref() { try { return localStorage.getItem('gamify-ui:mode') || 'auto'; } catch { return 'auto'; } }
function applyMode() {
  const p = modePref(), h = new Date().getHours();
  const m = p === 'auto' ? (h >= 6 && h < 18 ? 'day' : 'night') : p;
  if (document.documentElement.dataset.mode !== m) document.documentElement.dataset.mode = m;
  const lt = lightNow(); if (document.documentElement.dataset.light !== lt) document.documentElement.dataset.light = lt; // v7.0: cenário pela hora real
  embers(m === 'night');
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', m === 'night' ? '#0e0c0a' : '#f7f5f0');
}
function setMode(p) { try { localStorage.setItem('gamify-ui:mode', p); } catch { /* */ } applyMode(); render(); }

// ───────────────────────── RENDER ─────────────────────────
function header() {
  const tot = R.totals(S), ch = S.core.chapter || {};
  const using = S.loja.purchases.filter((p) => p.status === 'using');
  const night = document.documentElement.dataset.mode === 'night';
  // v5.16: GAMIFY como logo; onde os dados estão vira um iconezinho com legenda (sem textinho)
  const where = status.mode === 'local' ? ['💻', 'Seus dados estão só neste aparelho. Conecte o Google Drive em PERKS pra sincronizar.'] : status.error ? ['⚠', 'Erro ao salvar: ' + status.error] : status.saving ? ['⏳', 'Salvando…'] : ['☁', 'Salvo no Google Drive'];
  return `<span class="brand"><a class="logo" href="#quests" title="GAMIFY">${px('fire', 20)}<span class="lgo">GAMIFY</span></a><span class="savewhere ${status.error ? 'bad' : ''}" title="${esc(where[1])}" aria-label="${esc(where[1])}">${where[0]}</span></span>
    <div class="hero"><div class="lv"><span>NV</span><b>${tot.level}</b></div>
      <div class="who"><div class="t">⚔ ${esc(tot.title)}</div>${segBar(tot.pct, 'sm')}<div class="x">${fmtN(tot.into)}/${fmtN(tot.need)} XP · CAP. ${esc(ch.n)} ${esc(ch.title)}</div></div></div>
    <div class="row" style="gap:6px;flex-wrap:nowrap">
      <div class="wallet"><div class="coin"><small>XP</small><b class="acc">${fmtN(tot.balance)}</b></div><div class="coin"><small>GOLD</small><b class="gold">${fmtN(tot.gold)}</b></div><div class="coin" style="min-width:52px"><small>🎟</small><b class="tk">${tot.tickets}</b></div></div>
      <div class="tools">${using.map((p) => `<button class="timer-chip" data-act="goto-bag" title="${esc(p.item)}" data-countdown="${p.endsAt}">${mmss(p.endsAt - Date.now())}</button>`).join('')}
        <button class="btn sm" data-act="undo" data-undo-btn ${A.undoState().undo ? '' : 'disabled'} title="Desfazer (Ctrl+Z)" aria-label="Desfazer">↩</button><button class="btn sm" data-act="redo" data-redo-btn ${A.undoState().redo ? '' : 'disabled'} title="Refazer (Ctrl+Y)" aria-label="Refazer">↪</button>
        <button class="btn sm" data-act="find" title="Buscar e ir direto (Ctrl+K)" aria-label="Buscar">🔍</button>
        <button class="btn sm" data-act="mode" title="Dia/noite (N)">${px(night ? 'moon' : 'sun', 12)}</button>
        <button class="btn sm ${ambienceOn() ? 'pri' : ''}" data-act="music" title="Lo-fi da fogueira">${px('music', 12)}</button>
        <button class="btn sm ${prefs.mute ? 'pri' : ''}" data-act="mute" title="${prefs.mute ? 'Som desligado: toque pra ligar' : 'Desligar todo o som do app'}" aria-label="Som">${prefs.mute ? '🔇' : '🔊'}</button>
        <button class="btn sm" data-act="fullscreen" title="Tela cheia (F11)" aria-label="Tela cheia">⛶</button></div></div>`;
}
function render() {
  if (!status.loaded) return;
  const cur = route();
  if (status.empty) { $main.innerHTML = welcome(); return; }
  if (!S.core || !S.quests || !S.marks || !S.loja) { $main.innerHTML = '<div class="empty px" style="padding:60px;text-align:center">carregando…</div>'; return; }
  if (!started) {
    started = true;
    autoSnapshot(); // cópia de segurança do dia, antes de o app ajustar qualquer coisa sozinho
    A.startup();
    if (S._ladderUp) toast(`🪜 <b>7 dias seguidos na meta!</b> Ela subiu um degrau: agora é ${R.dailyGoal(S).goal} XP. O difícil está virando fácil.`, 'good');
    if (S._ladderDown) toast(`🪜 Semana mais fraca: a meta desceu um degrau (${R.dailyGoal(S).goal} XP). Sem culpa: ela volta a subir com 7 dias bons.`, 'good');
    if (S._blowHit && R.blowState(S).mode !== 'nenhum') toast(`💥 <b>${R.BLOW_EVERY} prazos estourados</b>: a loja fica ${Math.round((R.BLOW_MULT - 1) * 100)}% mais cara por ${R.BLOW_DAYS} dias.`, 'bad');
    else if (S._blowNew) toast(`💥 ${S._blowNew} prazo(s) estourou(aram). Faltam ${R.blowState(S).left} pro castigo.`);
    try { if (!localStorage.getItem('gamify-ui:tour')) setTimeout(tour, 600); else tripCheck(); } catch { /* */ }
  }
  document.getElementById('top').innerHTML = header();
  document.getElementById('tabs').innerHTML = tabOrder().map(([k, n, ic]) => `<a href="#${k}" draggable="true" data-tabk="${k}" class="${k === cur ? 'on' : ''}">${px(ic, 12)}${n}</a>`).join('');
  const bn = (k, n, ic, cls = '') => `<a href="#${k}" class="${cls} ${k === cur ? 'on' : ''}">${px(ic, 18)}${n}</a>`;
  document.getElementById('bottom').innerHTML = bn('quests', 'MISSÕES', 'quests') + bn('survival', 'SURVIVAL', 'survival') + bn('shop', 'FEIRA', 'shop', 'primo-btn') + bn('agenda', 'AGENDA', 'agenda') + `<a href="#" data-act="more">${px('regras', 18)}MAIS</a>`;
  const banners = [];
  if (status.error) banners.push(`<div class="banner bad">${esc(status.error)}</div>`);
  if (status.stale) banners.push('<div class="banner info">Ainda não consegui confirmar os dados com o servidor. Pode estar desatualizado.</div>');
  if (status.mode === 'local' && !localStorage.getItem('gamify-ui:localok')) setTimeout(() => { try { localStorage.setItem('gamify-ui:localok', '1'); } catch { /* */ } }, 20000);
  if (status.mode === 'local' && !status.error && !localStorage.getItem('gamify-ui:localok')) banners.push(typeof window.claude === 'undefined' ? '<div class="banner info">📱 Modo app: seus dados ficam neste aparelho. Conecte o Google Drive em PERKS AND RULES para sincronizar celular e PC, ou baixe um backup. <button class="btn sm ghost" data-act="local-ok">ENTENDI</button></div>' : '<div class="banner info">Modo local: os dados ficam só neste navegador. Abra pelo link do claude.ai pra sincronizar celular e PC.</div>');
  if (!status.error) banners.push(backupBanner());
  banners.push(tripBanner());
  try { pragaPaint(); banners.push(pragaBanner()); } catch (err) { console.error(err); }
  const y = scrollY, refocus = captureFocus(), sideY = $main.querySelector('.side')?.scrollTop || 0, redraft = captureDrafts();
  let bodyHtml;
  try { bodyHtml = sceneBanner(cur, ui) + ROUTES.find((r) => r[0] === cur)[3](ui); } catch (err) {
    console.error(err);
    bodyHtml = `<div class="banner bad"><b>Erro ao desenhar esta aba:</b> ${esc(String(err?.message || err))}<br><small>${esc(String(err?.stack || '').split('\n').slice(1, 4).join(' · '))}</small><br>Recarregue com Ctrl+Shift+R. Se continuar, me mande esta mensagem.</div>`;
  }
  $main.innerHTML = banners.join('') + bodyHtml;
  setStick();
  scrollTo(0, y);
  try { mountScenes(); } catch (err) { console.error(err); }
  deaccent(document.body);
  try { maybeReview(); } catch (err) { console.error(err); }
  try { maybePlanAsk(); } catch (err) { console.error(err); } // v8.7: à noite, o plano de amanhã
  try { maybeHabitsAsk(); } catch (err) { console.error(err); } // v9.3: os hábitos de hoje, toda vez que o app abre
  try { maybeOrganiza(); } catch (err) { console.error(err); } // v9.4: revisão de domingo, limite de URGENTE, sem rumo
  try { afterRender(cur); } catch (err) { console.error(err); }
  try { afterRender4(cur); } catch (err) { console.error(err); }
  try { afterRenderBujo(); } catch (err) { console.error(err); }
  try { renderPostit(); } catch (err) { console.error(err); }
  try { pragaGuide(); } catch (err) { console.error(err); }
  try { loboTermo(); } catch (err) { console.error(err); } // v9.2: o lobo-termômetro no cantinho // v6.7/v8: a mosca pousa onde a tarefa infectada está
  try { tabTools(cur); } catch (err) { console.error(err); }
  tips($main); // v6.1: os afterRender acima ainda acrescentam botões; eles também ganham legenda
  refocus();
  redraft();
  const side = $main.querySelector('.side'); // o painel da direita tem rolagem própria: volta pra onde estava
  if (side && sideY) side.scrollTop = sideY;
}
/** v7.1: RECOLHER TUDO discreto nas outras abas (em cima do banner). Vale para todos os cartões recolhíveis da aba. */
const tabKeys = () => [...new Set([...$main.querySelectorAll('[data-act="collapse"][data-k]')].filter((x) => !x.closest('.modal, .side')).map((x) => x.dataset.k))];
function tabTools(cur) {
  if (cur === 'quests') return;
  const keys = tabKeys();
  if (keys.length < 2) return;
  const all = keys.every(isCollapsed);
  const el = document.createElement('div'); el.className = 'tab-tools';
  el.innerHTML = `<button class="btn sm ghost" data-act="collapse-tab" title="Recolhe ou abre todos os cartões desta aba">${all ? '▾ ABRIR TUDO' : '▸ RECOLHER TUDO'}</button>`;
  const at = $main.querySelector('.scene.pstrip'); if (at) at.before(el); else $main.prepend(el);
}
/** onde termina o topo (cabeçalho + abas) na tela agora: a barra das janelas do QUESTS e o painel da direita ficam presos logo abaixo.
 *  O topo só acompanha a primeira tela de rolagem; quando ele sai, os dois sobem e aproveitam o espaço. */
let stickV = -1, stickRaf = 0;
function setStick() {
  const v = Math.max(0, Math.round(document.getElementById('tabs').getBoundingClientRect().bottom || document.getElementById('top').getBoundingClientRect().bottom));
  if (v !== stickV) { stickV = v; document.documentElement.style.setProperty('--stick', v + 'px'); }
}
const stickSoon = () => { if (!stickRaf) stickRaf = requestAnimationFrame(() => { stickRaf = 0; setStick(); }); };
addEventListener('resize', stickSoon);
addEventListener('scroll', stickSoon, { passive: true });

// ───────────────────────── TEXTO NÃO SE PERDE ─────────────────────────
// 1) o que está digitado nas linhas "+ adicionar" sobrevive quando a tela é redesenhada;
// 2) sair do campo com texto (sem dar Enter) já adiciona; 3) na janela da tarefa/bloco/boss o texto salva ao sair do campo.
const ADD_SEL = 'form[data-form="add-task"], form[data-form="add-block"], form[data-form="add-boss"]';
const addKey = (f) => `form[data-form="${f.dataset.form}"]` + (f.dataset.block ? `[data-block="${f.dataset.block}"]` : f.dataset.area ? `[data-area="${f.dataset.area}"]` : f.dataset.win ? `[data-win="${f.dataset.win}"]` : f.dataset.group ? `[data-group="${f.dataset.group}"]` : '');
function captureDrafts() {
  const act = document.activeElement, list = [];
  for (const f of $main.querySelectorAll(ADD_SEL)) { const i = f.querySelector('input'); if (i && (i.value || i === act)) list.push([addKey(f), i.value, i === act]); }
  return () => { for (const [k, v, focus] of list) { const i = $main.querySelector(k + ' input'); if (!i) continue; if (v) i.value = v; if (focus && document.activeElement !== i && !modalOpen()) { i.focus(); try { i.setSelectionRange(v.length, v.length); } catch { /* */ } } } };
}
let pendingAdd = null, pendingT = null;
function flushAdd() {
  clearTimeout(pendingT);
  if (!pendingAdd) return;
  const f = document.querySelector(pendingAdd), inp = f?.querySelector('input');
  pendingAdd = null;
  // ignora quando o foco voltou pro campo ou quando só trocou de janela do computador (o texto continua no campo)
  if (!f || !inp || !inp.value.trim() || document.activeElement === inp || !document.hasFocus()) return;
  FORMS[f.dataset.form]?.(f, true);
}
document.addEventListener('focusout', (e) => {
  const f = e.target.closest?.(ADD_SEL);
  if (!f || !e.target.value?.trim()) return;
  // não adiciona na hora: espera o clique terminar (senão o redesenho da tela engole o clique)
  pendingAdd = addKey(f); clearTimeout(pendingT); pendingT = setTimeout(flushAdd, 300);
});
function saveModalText(el) {
  const f = el?.closest?.('form[data-form="task"], form[data-form="block"], form[data-form="boss"]');
  if (!f || !['text', 'title'].includes(el.name)) return;
  const v = el.value.trim(), id = f.dataset.id;
  if (!v) return;
  if (f.dataset.form === 'task') {
    const t = S.quests.tasks.find((x) => x.id === id), text = t && rebuildText(v, { star: f.star.checked, home: f.home.checked, money: f.money.checked, xp: +f.xp.value || null });
    if (t && text !== t.text) A.updateTask(id, { text });
  } else if (f.dataset.form === 'block') { const b = S.quests.blocks.find((x) => x.id === id); if (b && v !== b.title) A.updateBlock(id, { title: v }); }
  else { const b = S.quests.bosses.find((x) => x.id === id); if (b && v !== b.text) A.updateBoss(id, { text: v }); }
}
document.addEventListener('change', (e) => saveModalText(e.target));
// v7.1: Shift + clique no quadradinho não pinta o texto da tela (só conclui o intervalo)
document.addEventListener('mousedown', (e) => { if (e.shiftKey && e.target.closest?.('.check[data-act="toggle"]')) e.preventDefault(); });
// botão direito no quadradinho (ou segurar o dedo, no celular) = CANCELAR a tarefa; de novo = reabrir. O ↩ desfaz.
document.addEventListener('contextmenu', (e) => {
  const c = e.target.closest?.('.check[data-act="toggle"]');
  if (!c) return;
  e.preventDefault();
  const t = S.quests.tasks.find((x) => x.id === c.dataset.id);
  if (!t) return;
  const back = t.st === 'cancel';
  A.setStatus(t.id, back ? '' : 'cancel');
  sfx(back ? 'tab' : 'undo');
  toast(back ? '↺ Tarefa reaberta.' : '✕ Cancelada (sem XP e sem punição). ↩ desfaz.');
});
document.addEventListener('change', async (e) => { // arquivo de backup escolhido: o conteúdo vai pra caixa de texto
  const el = e.target;
  if (!el.matches?.('[data-import-file]') || !el.files?.[0]) return;
  try { el.closest('form').json.value = await el.files[0].text(); } catch { toast('Não consegui ler esse arquivo.', 'bad'); }
});
const PX_SEL = 'h1,h2,h3,.btn,.px,.tabs a,.chip,.lv,.coin small,.rar,.band,.seg button,.stat small,label.lbl,.hab .hn,.bottom a,.logo,.item .ip,.k,.timer-chip,.ftab th,.tl th,.rot th,.medal .mn';
const plain = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ACT_TIP = { check: 'Marcar como feita', 'edit-task': 'Abrir a tarefa', 'edit-block': 'Abrir o bloco', 'edit-boss': 'Abrir o boss', jump: 'Ir até a tarefa', explain: 'O que é isso? Toque pra ver', del: 'Apagar', close: 'Fechar', 'to-breakdown': 'Mandar pra uma janela', 'go-block': 'Ir até o bloco', habit: 'Toque: ✓ fiz → − folga → vazio', collapse: 'Recolher ou abrir', 'rot-cell': 'Escrever o que fazer nesse horário', 'day-status': 'Ver os buffs e debuffs desse dia' };
function tips(root) {
  for (const el of root.querySelectorAll('[data-act], button, .chip')) {
    if (el.title) continue;
    const t = el.getAttribute('aria-label') || ACT_TIP[el.dataset.act] || (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (t && t.length <= 60) el.title = t;
  }
}
function deaccent(root) {
  tips(root);
  for (const el of root.querySelectorAll(PX_SEL)) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (/[\u00C0-\u017F]/.test(n.nodeValue)) n.nodeValue = plain(n.nodeValue);
  }
  // v5.16: dinheiro aparece como "$" no app todo (o 💰 continua guardado nos dados, é o marcador)
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.includes('💰') ? 1 : 3) });
  const list = []; for (let n = w.nextNode(); n; n = w.nextNode()) list.push(n);
  for (const n of list) n.nodeValue = n.nodeValue.replace(/\s?💰/g, '$');
}
function welcome() {
  return `<div style="max-width:560px;margin:10vh auto;text-align:center"><h1 class="acc" style="font-size:26px">GAMIFY</h1><p class="muted">Metas, tarefas e hábitos como um jogo de verdade.</p>
    <div class="row" style="justify-content:center;margin-top:20px"><button class="btn pri" data-act="new-game">▶ JOGO NOVO</button><button class="btn" data-act="backup-import">IMPORTAR BACKUP</button></div></div>`;
}

// ───────────────────────── RECOMPENSAS NA TELA ─────────────────────────
A.onFeedback((fb) => {
  driveSoon(render); // v8.3: toda mudança vai pro Drive uns segundos depois (o celular não perde mais o que foi feito)
  // 🧠 dopamina sob controle: tarefa fácil (menos de 20 XP, sem ⭐ ⚔) ganha só o "tic"; o número voando e os fogos ficam pro que custou
  const easy = R.neuroOn(S, 'calm') && fb.task && fb.xp < 20 && !/⚔|⭐/.test(fb.task.text || '');
  if (fb.task && fb.xp > 0 && fb.task.due) poof(fb.at); // v7.3b/v8: o TREM se resolveu (nuvenzinha de poeira e palha)
  if (fb.xp > 0) { if (!easy) floatXp(`+${fmtN(fb.xp)} XP`, fb.at); sfx(fb.task ? 'check' : 'xp'); setTimeout(checkMilestones, 400); }
  // 🎆 fogos pra coisa demorada: boss, bloco fechado, mini-boss ⚔, tarefa chata ⭐ ou tarefa que rendeu 60 XP ou mais
  if (fb.boss || fb.closedBlock || (fb.task && fb.xp > 0 && (fb.xp >= 60 || /⚔|⭐/.test(fb.task.text || '')))) setTimeout(() => { fireworks(); sfx('fireworks'); }, 250);
  // 🧠 recompensa do processo (aulas 021 e 153): cada passo feito num boss mostra o dano, a recompensa longe fica perto
  if (fb.task && fb.xp > 0 && !fb.boss && R.neuroOn(S, 'proc')) { const bk = fb.task.block && S.quests.blocks.find((x) => x.id === fb.task.block), bo = bk?.group === 'bs' && S.quests.bosses.find((x) => x.block === bk.id), hp = bo && R.bossHp(S, bo); if (hp?.total && hp.left > 0) toast(`👹 Dano no boss <b>${esc(bo.text.replace(/:\s*[\d.]+\s*XP.*$/i, '').slice(0, 40))}</b>: faltam ${Math.round(hp.pct * 100)}% da vida.`, 'good'); }
  if (fb.sent) toast(`✉ Rodada concluída e enviada: <b>${esc(fb.task.text)}</b>. Fica aguardando retorno.`, 'good');
  if (fb.loot) setTimeout(() => { sfx('loot'); toast(`${px('chest', 16)} <b>LOOT!</b> ${esc(fb.loot.label)}${fb.loot.itemId ? ' (foi pra SACOLA)' : ''}`, 'gold'); }, 350);
  if (fb.closedBlock) { toast(`🏁 BLOCO FECHADO: <b>${esc(fb.closedBlock.title)}</b> · +${fb.closedBlock.xp} XP`, 'good'); confetti(60); }
  if (fb.boss) { toast(`👹 BOSS RESOLVIDO: <b>${esc(fb.boss.text)}</b> · +${fmtN(fb.boss.xp)} XP · +1 🎟`, 'good'); confetti(); sfx('level'); }
  if (fb.sunday) { toast(`🎁 Baú aberto: <b>+${fb.sunday} XP</b>`, 'good'); sfx('chest'); }
  if (fb.built) sfx('ready');
  if (fb.building) sfx('upgrade');
  if (fb.bought) { sfx('buy'); toast(`🛒 <b>${esc(fb.bought)}</b>${fb.bag ? ' foi pra SACOLA. Use quando for aproveitar.' : ''}`, 'gold'); }
  if (fb.using) { sfx('xp'); toast(`⏱ <b>${esc(fb.using.item)}</b>: aproveite sem culpa.`, 'gold'); }
  for (const a of fb.achievements || []) { toast(`🏆 CONQUISTA: <b>${esc(a.name)}</b>${a.xp ? ` · +${a.xp} XP` : ''}`, 'gold'); sfx('chest'); }
  if (fb.msg) toast(esc(fb.msg));
  if (fb.released?.length) { toast(`🔓 Liberada${fb.released.length > 1 ? 's' : ''}: <b>${esc(fb.released.map((x) => x.text.replace(/\s*\(\d+\s*XP\)/i, '')).join(' · ').slice(0, 140))}</b>. Saiu do AGUARDANDO.`, 'good'); sfx('ready'); }
  primoFeedback(fb);
  if (fb.levelUp) levelUp(fb.levelUp);
  if (fb.chapterClosed) chapterCard(fb.chapterClosed);
  if (S._pragaWeek) { S._pragaWeek = false; toast('🌙 Uma semana inteira sem TREM TRAPAIADO: +1 🎟', 'gold'); }
  if (fb.praga) { banhoSal(fb.praga); toast(`🧂 ${salToast(`<b>${esc(fb.praga.names[0].slice(0, 40))}</b>`)}${fb.praga.clean ? ' A casa tá limpa: o PRIMO desfranziu a testa.' : ''}`, 'good'); } // v7.3
  if (!fb.quiet || fb.xp || fb.achievements?.length || fb.levelUp) render();
});
function levelUp(t) {
  confetti(); sfx('level');
  openModal(`<div class="levelup"><div class="px muted" style="font-size:9px">LEVEL UP!</div><div class="big">${t.level}</div><h2>⚔ ${esc(t.title)}</h2><p class="muted">+1 🎟 ticket. Próximo nível em ${fmtN(t.need - t.into)} XP.</p><div class="actions" style="justify-content:center"><button class="btn pri" data-close autofocus>BORA!</button></div></div>`);
}

// ───────────────────────── JANELAS ─────────────────────────
const MARK_RE = { star: /⭐\s*/g, home: /🛡\s*/g, money: /\s*💰/g, xp: /\s*\(\d+\s*XP\)/gi };
function rebuildText(text, { star, home, money, xp, kind }) {
  let t = A.normalizeMoney(text).replace(MARK_RE.star, '').replace(MARK_RE.home, '').replace(MARK_RE.xp, '').trim();
  const hadMoney = /💰/.test(t);
  if (!money) t = t.replace(MARK_RE.money, '').trim();
  if (kind != null) t = (kind === 'mini' ? '⚔ ' : kind === 'step' ? '↳ ' : '') + t.replace(/^(⚔|↳|>)\s*/, ''); // tipo escolhido nos marcadores
  const pre = (t.match(/^(⚔|↳)\s*/) || [''])[0];
  t = pre + (star ? '⭐ ' : '') + (home ? '🛡 ' : '') + t.slice(pre.length);
  if (money && !hadMoney) t += ' 💰';
  if (xp) t += ` (${xp}XP)`;
  return t.trim();
}
function whereOptions(t) {
  const lists = `<option value="area:auto" ${!t.block ? 'selected' : ''}>LISTAS (a data decide a lista)</option>`;
  const groups = Object.entries(R.GROUPS).map(([g, info]) => { const bl = S.quests.blocks.filter((b) => b.group === g).sort((a, b) => a.ord - b.ord); return bl.length ? `<optgroup label="${info.name}">${bl.map((b) => `<option value="block:${b.id}" ${t.block === b.id ? 'selected' : ''}>${esc(b.title)}</option>`).join('')}</optgroup>` : ''; }).join('');
  return `<optgroup label="LISTAS">${lists}</optgroup>${groups}`;
}
const COLORS = [['', 'sem cor'], ['red', '🟥 URGENTE'], ['yellow', '🟨 ESQUENTANDO'], ['green', '🟩 ESTÁVEL'], ['black', '⬛ PARADO']];
// v5.16: as mesmas bolinhas de cor em toda janela; AGUARDANDO (roxo) virou uma das cores (por baixo continua o estado "aguardando")
const SWATCH = [['red', 'URGENTE', 'urg', 'Prazo perto ou atrasado: faça primeiro'], ['yellow', 'ESQUENTANDO', 'atencao', 'Tá chegando a hora: vem logo depois das urgentes'], ['green', 'ESTÁVEL', 'ok', 'Tudo em ordem, sem pressa'],
  ['black', 'PARADO', 'neutro', 'Parado de propósito: some das listas até você mostrar'], ['wait', 'AGUARDANDO', 'espera', 'Depende de outra pessoa ou de outra coisa']];
const swatches = (cur, withNone = false) => `<div class="swatches">${[...(withNone ? [['', 'SEM COR', 'none', 'Sem cor']] : []), ...SWATCH].map(([k, n, tone, tip]) => `<label class="csw" title="${tip}"><input type="radio" name="color" value="${k}" ${cur === k ? 'checked' : ''}><i data-tone="${tone}"></i><span>${n}</span></label>`).join('')}</div>`;
/** marcador redondo (checkbox ou radio) com legenda ao passar o mouse */
const pill = (type, name, value, on, label, tip) => `<label class="pill" title="${tip}"><input type="${type}" name="${name}" ${value != null ? `value="${value}"` : ''} ${on ? 'checked' : ''}><span>${label}</span></label>`;
function editTask(id) {
  const t = S.quests.tasks.find((x) => x.id === id);
  if (!t) return;
  const p = R.parse(t.text), now = R.taskXp(S, t), td = today();
  const cap = R.dueCap(t.block && R.findBlock(S, t.block), td); // subtarefa: o prazo vai até o do bloco
  const nextMon = addDays(td, ((8 - weekday(td)) % 7) || 7);
  const st = t.st === 'done' || t.st === 'cancel' ? t.st : '';
  const color = t.st === 'wait' ? 'wait' : t.color || '';
  const suggestCycle = t.cycle === undefined && /PREFEITURA|APROVA|AN[AÁ]LISE|PROTOCOLO/i.test(t.text);
  const where = t.block ? R.findBlock(S, t.block)?.title || '' : R.areaName(t.area);
  openModal(`<form data-form="task" data-id="${id}" autocomplete="off" class="mform">
    <div class="mhead"><span class="mtype">${p.mini ? '⚔ mini-boss' : p.step ? '↳ passo' : 'tarefa'}</span><span class="mwhere">${esc(where)}</span>
      <span class="chip xp" title="${now.parts.length ? esc(now.parts.join(' · ')) : 'XP desta tarefa'}">${t.st === 'done' ? `+${t.xp}` : now.xp} XP</span></div>
    <textarea class="inp mtitle" id="t-text" name="text" rows="2" aria-label="Texto" autofocus>${esc(t.text.replace(MARK_RE.star, '').replace(MARK_RE.home, '').replace(MARK_RE.xp, '').replace(/💰/g, '$').replace(/^(⚔|↳|>)\s*/, '').trim())}</textarea>${(t.pragaLog || []).length ? `<p class="meta" title="Motivos que você escreveu ao remarcar um TREM TRAPAIADO">🐛 ${t.pragaLog.map((x) => `${esc(x.d.slice(8))}/${esc(x.d.slice(5, 7))}: ${esc(x.why)}`).join(' · ')}</p>` : ''}
    <div class="msplit">
      <div><label class="lbl">Status</label><div class="pills">${[['', '○ ABERTA', 'Ainda por fazer'], ['done', '✓ FEITA', 'Concluída (ganha o XP)'], ['cancel', '✕ CANCELADA', 'Não vale mais: sem XP e sem punição']].map(([k, n, tip]) => `<button type="button" class="pill ${st === k ? 'on' : ''}" data-act="set-status" data-id="${id}" data-st="${k}" title="${tip}"><span>${n}</span></button>`).join('')}</div></div>
      <div><label class="lbl">Cor</label>${swatches(color, true)}</div></div>
    ${t.block ? '' : `<label class="lbl" for="t-cat">Assunto <span class="meta">· o grupo dela na TODAS (sem assunto = CAIXA DE ENTRADA)</span></label><select class="inp" id="t-cat" name="cat">${R.assuntos(S).map(([k, n]) => `<option value="${k}" ${R.catOf(S, t) === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`}
    <div class="waitbox"><label class="lbl" for="t-who">⏳ Aguardando quem ou o quê</label><div class="row">
      <input class="inp grow" id="t-who" name="who" value="${esc(t.who || '')}" list="who-list" placeholder="PREFEITURA, CLIENTE, FULANO…" autocomplete="off"><datalist id="who-list">${R.people(S).map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
      <select class="inp" name="dep" aria-label="Depende de outra tarefa" style="flex:1 1 220px;min-width:0"><option value="">— não depende de outra tarefa —</option>${R.openTasks(S).filter((x) => x.id !== t.id && x.dep !== t.id).sort((x, y) => (x.block === t.block ? 0 : 1) - (y.block === t.block ? 0 : 1) || x.text.localeCompare(y.text)).map((x) => `<option value="${x.id}" ${t.dep === x.id ? 'selected' : ''}>🔗 ${esc(x.text.replace(/\s*\(\d+\s*XP\)/i, '').slice(0, 60))}</option>`).join('')}</select></div></div>
    <label class="lbl" for="t-due">Prazo <span class="meta">· ⏰ horário (opcional: aparece no MEU DIA da AGENDA)</span></label><div class="row"><input class="inp" type="date" id="t-due" name="due" value="${t.due || ''}" ${cap ? `title="O bloco termina em ${fmtDM(cap)}: se passar disso, o app pergunta se empurra o bloco junto"` : ''} style="width:auto"><input class="inp" type="time" name="at" value="${esc(t.at || '')}" style="width:auto" aria-label="Horário">
      ${[['HOJE', td], ['AMANHÃ', addDays(td, 1)], ['+3', addDays(td, 3)], ['PRÓX. SEG', nextMon], ['SEM', '']].map(([n, d]) => `<button type="button" class="pill" data-act="due-quick" data-d="${d}"><span>${n}</span></button>`).join('')}
      ${t.due ? `<span class="minfo" title="${t.due < td ? `Atrasada: concluir agora paga ${Math.round(Math.max(R.C.LATE_MIN, 1 - R.C.LATE_DAY * diffDays(t.due, td)) * 100)}% do XP. ` : ''}Empurrar o prazo custa ${A.reschedBase({ ...t, due: '0' }, '9')} XP${A.freeResched() ? ' (a 1ª da semana é grátis)' : ''}. Antecipar é de graça.">${t.due < td ? '⏰' : 'ⓘ'}${t.rs ? ` remarcada ${t.rs}x` : ''}</span>` : ''}</div>
    ${R.reschedLocked(S, t) && R.isOpen(t) ? `<div class="boxlock"><b>🔒 Já remarcada ${t.rs}x.</b> Pra empurrar de novo, marque um horário e quanto tempo (time box). Ou cancele: se não vale fazer, tudo bem.
      <div class="row" style="margin-top:6px"><label>⏰ às <input class="inp" type="time" name="box_at" value="${esc(t.box?.at || '')}" style="width:auto;display:inline-block"></label>
      ${['08:00', '10:00', '14:00', '16:00', '19:00'].map((h) => `<button type="button" class="pill" data-act="set-field" data-name="box_at" data-v="${h}"><span>${h}</span></button>`).join('')}</div><div class="row" style="margin-top:6px">
      <label>por <select class="inp" name="box_min" style="width:auto;display:inline-block">${[15, 25, 50, 90].map((m) => `<option value="${m}" ${(t.box?.min || 25) === m ? 'selected' : ''}>${m} min</option>`).join('')}</select></label></div></div>` : t.box ? `<p class="meta" style="margin:4px 0 0">⏰ time box: ${esc(t.box.at)} · ${t.box.min} min</p>` : ''}
    <label class="lbl">Marcadores</label><div class="pills">
      ${pill('radio', 'kind', '', !p.mini && !p.step, '• tarefa', 'Tarefa comum')}${pill('radio', 'kind', 'mini', p.mini, '⚔ mini-boss', 'Uma vitória no meio do caminho: vale mais XP e solta fogos')}${pill('radio', 'kind', 'step', p.step, '↳ passo', 'Ação pequena embaixo de outra')}
      ${pill('checkbox', 'star', null, p.star, '⭐ chata', 'Tarefa que você vive adiando: vale x2')}${pill('checkbox', 'home', null, p.home, '🛡 casa', 'Casa e família: vale mais')}${pill('checkbox', 'money', null, p.money, '$ dinheiro', 'Traz dinheiro: vale x1,5')}
      ${pill('checkbox', 'prio', null, t.prio, '! prioridade', 'Sobe pro topo da fila')}${pill('checkbox', 'cycle', null, t.cycle || suggestCycle, `🔁 vai e volta${suggestCycle ? ' ✨' : ''}`, 'Prefeitura, aprovação, cliente revisando: cada rodada dá XP')}</div>
    <label class="lbl">XP</label><div class="pills xpset">${[['', 'AUTO'], [5, '5'], [10, '10'], [30, '30'], [60, '60'], [100, '100']].map(([v, n]) => `<button type="button" class="pill ${String(p.xpFix ?? '') === String(v) ? 'on' : ''}" data-act="xp-preset" data-v="${v}"><span>${n}</span></button>`).join('')}<input class="inp" type="number" min="1" name="xp" value="${p.xpFix ?? ''}" placeholder="outro" aria-label="XP fixo" style="width:76px"></div>
    ${(t.duck || []).length ? `<p class="meta" style="margin:8px 0 0">🦆 ${esc([t.duck.at(-1).tried, t.duck.at(-1).nok].filter(Boolean).join(' · ').slice(0, 140))} <a href="#" data-act="duck" data-id="${id}">explicar de novo</a></p>` : ''}
    ${imgSection(t)}
    <div class="actions"><div class="left">
      ${route() !== 'quests' || !document.querySelector(`.board li.task[data-id="${id}"]`) ? `<button type="button" class="btn sm" data-act="jump" data-id="${id}" title="Vai até o lugar dela no QUESTS e pisca">📍 ONDE ELA ESTÁ</button>` : ''}${R.isOpen(t) ? `<button type="button" class="btn sm" data-act="foco-open" data-id="${id}" title="Esconde o resto do app: só esta tarefa, os passos e o cronômetro">▶ MODO FOCO</button>` : ''}${t.block && !p.step ? `<button type="button" class="btn sm" data-act="add-step" data-id="${id}">+ ↳ PASSO</button>` : ''}<button type="button" class="btn sm" data-act="sos" data-id="${id}">${px('sos', 10)} TRAVEI</button>${t.link ? `<button type="button" class="btn sm" data-act="unlink" data-id="${id}" title="Separa a tarefa do bloco ligado a ela">↯ DESVINCULAR</button>` : ''}<button type="button" class="btn sm danger" data-act="del-task" data-id="${id}">APAGAR</button></div>
      <button type="button" class="btn" data-close>FECHAR</button><button class="btn pri">SALVAR</button></div></form>`, { wide: true });
  fillImgs();
}
function editBlock(id) {
  const b = S.quests.blocks.find((x) => x.id === id);
  if (!b) return;
  // v9.0 (pedido do dono): a janela do BLOCO tem o mesmo desenho da janela da TAREFA (cabeçalho, título grande, cor ao lado, prazo com atalhos, ações embaixo)
  const color = b.st === 'wait' ? 'wait' : b.color, td = today(), nextMon = addDays(td, ((8 - weekday(td)) % 7) || 7);
  const items = S.quests.tasks.filter((t) => t.block === b.id && t.st !== 'cancel').sort((x, y) => x.ord - y.ord), open = items.filter(R.isOpen);
  openModal(`<form data-form="block" data-id="${id}" autocomplete="off" class="mform">
    <div class="mhead"><span class="mtype">bloco</span><span class="mwhere">${esc(R.winOf(S, b)?.name || R.GROUPS[b.group]?.name || '')}</span>
      <span class="chip xp" title="Fechar o bloco vale isso${R.projectValue(b.title) ? ` · projeto de ${fmtN(R.projectValue(b.title))}: sua metade ${fmtN(R.projectValue(b.title) / 2)} gold` : ''}">${R.blockXp(b)} XP</span></div>
    <textarea class="inp mtitle" id="b-title" name="title" rows="2" aria-label="Título" title="Dicas: 🎯 no começo = meta · 3000$ = projeto que vale dinheiro · (500XP) fixa o XP" autofocus>${esc(b.title.replace(/💰/g, '$'))}</textarea>
    <div class="msplit">
      <div><label class="lbl" for="b-group">Janela</label><select class="inp" id="b-group" name="group">${Object.entries(R.GROUPS).map(([g, i]) => `<option value="${g}" ${b.group === g && !R.winOf(S, b) ? 'selected' : ''}>${i.name}</option>`).join('')}${R.windows(S).map((w) => `<option value="win:${w.id}" ${b.win === w.id ? 'selected' : ''}>▣ ${esc(w.name)}</option>`).join('')}</select>
        <p class="meta" style="margin:6px 0 0">${items.length - open.length}/${items.length} feitas${open.length ? ` · ${open.length} em aberto` : ''}</p></div>
      <div><label class="lbl">Cor</label>${swatches(color, true)}</div></div>
    <label class="lbl" for="b-due">◆ Prazo final <span class="meta">· só as subtarefas que você datar têm prazo; nenhuma passa deste</span></label><div class="row"><input class="inp" type="date" id="b-due" name="due" value="${b.due || ''}" style="width:auto">
      ${[['HOJE', td], ['AMANHÃ', addDays(td, 1)], ['+7', addDays(td, 7)], ['PRÓX. SEG', nextMon], ['SEM', '']].map(([n, d]) => `<button type="button" class="pill" data-act="due-quick" data-d="${d}"><span>${n}</span></button>`).join('')}</div>
    ${open.length ? `<label class="lbl">Subtarefas</label><div class="mlist">${open.slice(0, 12).map((t) => `<button type="button" class="dia-t" data-act="edit-task" data-id="${t.id}" data-color="${R.colorOfTask(S, t) || ''}">${esc(t.text.replace(/\s*\(\d+\s*XP\)/i, ''))}${t.due ? ` <small class="meta">${fmtDM(t.due)}</small>` : ''}</button>`).join('')}${open.length > 12 ? `<span class="meta">+${open.length - 12}</span>` : ''}</div>` : ''}
    ${b.group !== 'bs' ? `<details class="merge-b"><summary class="meta">↘ virar subtarefa de outro bloco <span class="meta">(ou arraste o bloco pelo ⠿ pra dentro de outro bloco aberto)</span></summary><div class="row" style="margin-top:6px"><select class="inp grow" data-merge-into="${id}" aria-label="Bloco de destino"><option value="">— escolha o bloco —</option>${S.quests.blocks.filter((x) => x.id !== id && x.st !== 'done' && x.group !== 'bs').sort((a, z) => a.title.localeCompare(z.title)).map((x) => `<option value="${x.id}">${esc(x.title)}${R.winOf(S, x) ? ' · ' + esc(R.winOf(S, x).name) : ''}</option>`).join('')}</select></div><p class="meta" style="margin:4px 0 0">O título vira uma tarefa lá dentro e as tarefas daqui viram passos ↳ dela. Dá pra desfazer no ↩.</p></details>` : ''}
    <div class="actions"><div class="left">${open.length && b.st !== 'done' ? `<button type="button" class="btn sm" data-act="done-all" data-id="${id}" title="Concluir todas as tarefas deste bloco">✓ CONCLUIR TUDO</button>` : ''}<button type="button" class="btn sm danger" data-act="del-block" data-id="${id}">APAGAR</button></div>
      <button type="button" class="btn" data-close>FECHAR</button><button class="btn pri">SALVAR</button></div></form>`, { wide: true });
}
function distribute() {
  let scope = 'dated';
  const SC = [['dated', 'SÓ AS QUE JÁ TINHAM PRAZO'], ['new', 'SÓ DAR DATA ÀS SEM PRAZO DOS BLOCOS'], ['all', 'TODAS']];
  const draw = () => {
    const plan = R.distributePlan(S, { scope });
    const m = document.querySelector('.modal');
    const moved = plan.filter((p) => p.from).length, cost = A.planCost(plan), pace = R.weekdayPace(S), max = S.core.settings?.maxPerDay || R.C.MAX_PER_DAY;
    const paceTxt = pace.some((p) => p != null) ? [1, 2, 3, 4, 5, 6, 0].map((w) => `${DOW[w]} ${pace[w] == null ? '–' : String(Math.round(pace[w] * 10) / 10).replace('.', ',')}`).join(' · ') : '';
    m.innerHTML = `${quem('tia-mia', 4, 'Deixa comigo, meu fio: um tanto por dia, sem afobação.')}<h2>📅 distribuir prazos</h2>
      <div class="seg" style="margin:8px 0;flex-wrap:wrap">${SC.map(([k, n]) => `<button type="button" class="${scope === k ? 'on' : ''}" data-scope="${k}">${n}</button>`).join('')}</div>
      <p class="meta" style="margin:0">${scope === 'dated' ? 'Remarca só as tarefas que JÁ TINHAM prazo e atrasaram. Quem não tinha data continua sem.' : scope === 'new' ? 'Dá data só à próxima ação de cada bloco que está sem prazo. Não mexe nas atrasadas nem na lista SEM PRAZO.' : 'Remarca as atrasadas e também dá data à próxima ação de cada bloco. A lista SEM PRAZO não é mexida.'}</p>
      <p class="meta" style="margin:6px 0 0">${paceTxt ? `Seu ritmo (tarefas concluídas por dia, últimas 8 semanas): ${paceTxt}. Cada dia recebe até 80% do seu ritmo (a folga cobre imprevisto), no máximo ${max}. ` : `Ainda há pouco histórico: uso o máximo de ${max} por dia útil. `}Ordem: ! prioridade, ⭐, depois a mais atrasada primeiro. Feriado não entra.</p>
      <p><b>${plan.length - moved}</b> ganham data nova · <b>${moved}</b> remarcadas${cost ? ` · <b class="${cost > R.totals(S).balance ? 'bad' : 'acc'}">custo ${cost} XP</b> <span class="meta">(saldo ${fmtN(R.totals(S).balance)})</span>` : ''}</p>
      <div class="list" style="max-height:42vh;overflow:auto">${plan.map((p) => `<div class="li"><div class="lt">${esc(p.text)}<small>${esc(p.why)}</small></div><span class="chip ${p.from ? 'today' : 'soon'}">${p.from ? fmtDM(p.from) + ' → ' : ''}${DOW[weekday(p.to)]} ${fmtDM(p.to)}</span></div>`).join('') || '<div class="empty">nada pra distribuir aqui. 👏</div>'}</div>
      <div class="actions"><button class="btn" data-close>CANCELAR</button>${plan.length ? `<button class="btn pri" id="dist-apply" ${cost > R.totals(S).balance ? 'disabled' : ''}>APLICAR ${plan.length}${cost ? ` · −${cost} XP` : ''}</button>` : ''}</div>`;
    m.querySelectorAll('[data-scope]').forEach((b) => { b.onclick = () => { scope = b.dataset.scope; draw(); }; });
    const ap = m.querySelector('#dist-apply');
    if (ap) ap.onclick = () => { const r = A.applyPlan(plan); if (r?.error) { toast(esc(r.error), 'bad'); return; } closeModal(); toast(`📅 ${plan.length} prazo(s) aplicados. <button class="btn sm" data-act="undo-plan">↺ DESFAZER</button>`, 'good'); };
    window.__deaccent?.(m);
  };
  openModal('', { wide: true });
  draw();
}
function editRitual(id) {
  const r = id ? S.core.rituals.find((x) => x.id === id) : { type: 'pessoa', name: '', every: 7, last: today() };
  openModal(`<form data-form="ritual" data-id="${id || ''}" autocomplete="off">${quem('tia-mia', 2, sorte(['Ritual é igual chá da tarde: todo dia, sem falta.', 'O que volta sempre merece hora marcada.']))}<h2>${id ? 'ritual' : 'novo ritual'}</h2>
    <div class="row"><div style="width:150px"><label class="lbl" for="r-type">Tipo</label><select class="inp" id="r-type" name="type"><option value="pessoa" ${r.type === 'pessoa' ? 'selected' : ''}>👥 PESSOA</option><option value="rotina" ${r.type === 'rotina' ? 'selected' : ''}>🔁 ROTINA</option><option value="trabalho" ${r.type === 'trabalho' ? 'selected' : ''}>💼 TRABALHO</option></select></div>
      <div class="grow"><label class="lbl" for="r-name">O quê / quem</label><input class="inp" id="r-name" name="name" value="${esc(r.name)}" required autofocus></div></div>
    <div class="row"><div><label class="lbl" for="r-mode">Repete</label><select class="inp" id="r-mode" name="mode"><option value="every" ${r.every || (!r.dom && !r.doms && !r.wd) ? 'selected' : ''}>A CADA N DIAS</option><option value="wd" ${r.wd ? 'selected' : ''}>DIAS DA SEMANA</option><option value="dom" ${r.dom || r.doms ? 'selected' : ''}>DIAS DO MÊS</option></select></div>
      <div style="width:96px"><label class="lbl" for="r-every">N dias</label><input class="inp" id="r-every" name="every" type="number" min="1" value="${r.every || 7}"></div>
      <div style="width:120px"><label class="lbl" for="r-dom">Dias do mês</label><input class="inp" id="r-dom" name="dom" placeholder="5, 15" value="${esc((r.doms || (r.dom ? [r.dom] : [5])).join(', '))}"></div></div>
    <div class="row wd-pick" title="Escolha os dias (vale quando REPETE = DIAS DA SEMANA)">${['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((n, i) => `<label class="btn sm ghost"><input type="checkbox" name="wd" value="${i}" ${r.wd?.includes(i) ? 'checked' : ''}> ${n}</label>`).join('')}</div>
    <div class="row">
      <div class="grow"><label class="lbl" for="r-last">Última vez</label><input class="inp" id="r-last" name="last" type="date" value="${r.last || ''}"></div></div>
    <label class="lbl" for="r-plan">📅 Vou fazer em (opcional: o dia que você escolheu; aparece na AGENDA)</label><input class="inp" id="r-plan" name="plan" type="date" value="${(id && R.ritualPlan(r)) || ''}" style="width:auto">
    <label class="lbl" for="r-notes">Notas</label><input class="inp" id="r-notes" name="notes" value="${esc(r.notes || '')}">
    <div class="actions">${id ? `<div class="left"><button type="button" class="btn sm danger" data-act="del-ritual" data-id="${id}">APAGAR</button></div>` : ''}<button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">SALVAR</button></div></form>`);
}
function editItem(kind, id, cat) {
  const it = id ? S.loja[kind].find((x) => x.id === id) : { name: '', xp: 100, nv: 1, cat: cat || S.loja.cats[0] || 'EU' };
  const m = R.itemMeta(it);
  openModal(`<form data-form="item" data-kind="${kind}" data-id="${id || ''}" autocomplete="off"><h2>${kind === 'taverna' ? 'recompensa da ALQUIMISTA' : 'item do ferreiro'}</h2>
    <div class="row"><div style="width:80px"><label class="lbl" for="i-icon">Ícone</label><input class="inp" id="i-icon" name="icon" value="${esc(it.icon || m.icon)}" style="text-align:center;font-size:20px"></div>
      <div class="grow"><label class="lbl" for="i-name">Nome</label><input class="inp" id="i-name" name="name" value="${esc(it.name)}" required autofocus></div></div>
    ${kind === 'taverna' ? `<div class="row"><div class="grow"><label class="lbl" for="i-xp">Preço (XP)</label><input class="inp" id="i-xp" name="xp" type="number" min="1" value="${it.xp}"></div><div class="grow"><label class="lbl" for="i-min">Cronômetro (min, 0 = sem)</label><input class="inp" id="i-min" name="min" type="number" min="0" value="${m.min}"></div></div>`
    : `<div class="row"><div class="grow"><label class="lbl" for="i-cat">Categoria</label><input class="inp" id="i-cat" name="cat" list="cats" value="${esc(it.cat)}"><datalist id="cats">${S.loja.cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div><div style="width:100px"><label class="lbl" for="i-nv">Nível</label><input class="inp" id="i-nv" name="nv" type="number" min="1" value="${it.nv}"></div></div>
      <label style="display:block;margin-top:10px;font-size:12.5px"><input type="checkbox" name="repeat" ${it.repeat ? 'checked' : ''}> recorrente (pode comprar várias vezes)</label>`}
    <div class="actions">${id ? `<div class="left"><button type="button" class="btn sm danger" data-act="del-item" data-kind="${kind}" data-id="${id}">APAGAR</button></div>` : ''}<button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">SALVAR</button></div></form>`);
}
function editHabits() {
  const row = (h) => `<div class="row hrow" style="margin-bottom:6px" data-id="${esc(h.id)}"><input class="inp" name="icon" value="${esc(h.icon)}" style="width:60px;text-align:center" aria-label="Ícone"><input class="inp grow" name="name" value="${esc(h.name)}" aria-label="Nome"><button type="button" class="icon-btn" data-act="hab-row-del" aria-label="Remover">×</button></div>`;
  openModal(`<form data-form="habits" autocomplete="off"><h2>hábitos</h2><p class="meta" style="margin:0 0 10px">O histórico fica guardado. NO PH, TREINO, SONO e CASA têm regras de buff/debuff ligadas a eles.</p>
    <div id="hab-rows">${S.core.habits.map(row).join('')}</div><button type="button" class="btn sm" data-act="hab-row-add">+ HÁBITO</button>
    <div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">SALVAR</button></div></form>`);
}
function editBoss(id) {
  const b = S.quests.bosses.find((x) => x.id === id), td = today(), paused = R.bossPaused(b);
  if (!b) return;
  const hp = R.bossHp(S, b), st = paused ? 'pause' : b.st === 'wait' ? 'wait' : b.st === 'done' ? 'done' : '';
  openModal(`<form data-form="boss" data-id="${id}" autocomplete="off" class="mform">
    <div class="mhead"><span class="mtype">👹 boss</span><span class="mwhere" title="A vida (HP) é o que falta fazer no boss: cada subtarefa feita tira vida. Zerou, ele se resolve.">${hp?.total ? `HP ${fmtN(hp.left)}/${fmtN(hp.total)}` : 'quebre em subtarefas'}</span>
      <span class="chip xp" title="Resolver o boss vale isso + 1 ticket">${fmtN(b.xp)} XP</span></div>
    <input class="inp mtitle" id="bo-text" name="text" value="${esc(b.text)}" aria-label="Meta" autofocus>
    <div class="msplit">
      <div><label class="lbl">Situação</label><div class="pills">${b.st === 'done' ? pill('radio', 'st', 'done', true, '✓ RESOLVIDO', 'Já se resolveu') : ''}${pill('radio', 'st', '', st === '', '○ EM ABERTO', 'Na luta')}${pill('radio', 'st', 'wait', st === 'wait', '⏳ AGUARDANDO', 'Depende de outra pessoa')}${b.st !== 'done' ? pill('radio', 'st', 'pause', st === 'pause', '⏸ PAUSADO', `Pausa de até ${R.BOSS_PAUSE_MAX} dias: os prazos andam junto, sem custo, e ele volta sozinho`) : ''}</div></div>
      <div><label class="lbl" for="bo-xp">XP</label><input class="inp" id="bo-xp" name="xp" type="number" min="1" value="${b.xp}" style="width:120px"></div></div>
    ${b.st !== 'done' ? `<div class="pausef"><label class="lbl" for="bo-pause">⏸ volta em</label><input class="inp" type="date" id="bo-pause" name="pause" value="${paused ? b.pause : addDays(td, 7)}" min="${addDays(td, 1)}" max="${addDays(td, R.BOSS_PAUSE_MAX)}" style="width:auto"></div>` : ''}
    ${R.neuroOn(S, 'why') ? `<label class="lbl" for="bo-why">💡 Por que isso importa pra mim?</label><textarea class="inp" id="bo-why" name="why" rows="2" maxlength="300" placeholder="opcional">${esc(b.why || '')}</textarea>
    <label class="lbl" for="bo-fear" title="Quando o boss ficar ${R.BOSS_IDLE_DAYS} dias parado, o PRIMO te lembra destas respostas">⚠ O que acontece se eu NÃO fizer?</label><textarea class="inp" id="bo-fear" name="fear" rows="2" maxlength="300" placeholder="opcional">${esc(b.fear || '')}</textarea>` : ''}
    <div class="actions"><div class="left"><button type="button" class="btn sm danger" data-act="del-boss" data-id="${id}">APAGAR</button></div><button type="button" class="btn" data-close>FECHAR</button><button class="btn pri">SALVAR</button></div></form>`);
}
function redemption() {
  const td = today(), done = S.marks.days[td]?.h?.rd === 'x';
  const opts = ['1 AULA DE CURSO', 'MEDITAÇÃO'];
  openModal(`<h2>⚔ missão de redenção</h2><p class="muted">+${R.C.RD_XP} XP e cura ☠ envenenado e 🌫 neblina. Escolha a sua:</p>
    <div class="list">${opts.map((o) => `<button class="li" style="width:100%;text-align:left;border:0;background:none;cursor:var(--cur-hand,pointer)" data-act="rd-do" data-o="${esc(o)}"><span class="lt">⚔ ${esc(o)}</span><span class="chip xp">+${R.C.RD_XP}</span></button>`).join('')}</div>
    <div class="actions">${done ? '<button class="btn danger" data-act="rd-undo">DESFAZER A DE HOJE</button>' : ''}<button class="btn" data-close>FECHAR</button></div>`);
}
function tour(step = 0) {
  const steps = [
    ['bem-vindo ao gamify v2.', 'Igual à planilha, com as mesmas abas: QUESTS é a casa e o painel. De dia ele é papel; à noite vira acampamento com fogueira. O ♪ liga o lo-fi.'],
    ['quests.', 'Listas e BOSS em cima; BREAKDOWN, TRABALHO e CAPTAÇÕES embaixo. Toque no quadradinho pra concluir, no texto pra editar (prazo, cor, ! prioridade, 🔁 vai e volta). No PC dá pra arrastar tarefas.'],
    ['o primo.', 'O PRIMO é o centro do jogo: porco arquiteto, de chapéu de palha, que protege a BRASINHA (filhote de fênix) dos TRENS, os inimigos que nascem de cada tarefa. Ele reage ao que você faz, pede uma missão por dia e guarda os comandos no cartão dele.'],
    ['shop.', 'Compre ANTES de aproveitar: vai pra SACOLA; na hora, USAR liga o cronômetro. Fez sem comprar? Paga 50% a mais. Gold é a sua metade: o app pergunta quando entra.'],
    ['travou?', 'O botão SOS guia uma respiração de 1 minuto, escolhe o menor passo e acende 10 minutos de fogueira. Vale +5 XP de coragem.'],
  ];
  const [t, d] = steps[step];
  openModal(`<div style="text-align:center">${px(['fire', 'quests', 'fire', 'shop', 'sos'][step], 60)}<h2 style="margin-top:12px">${t}</h2><p class="muted">${d}</p><p class="px dim" style="font-size:8px">${step + 1}/${steps.length}</p>
    <div class="actions" style="justify-content:center">${step ? `<button class="btn" data-act="tour" data-s="${step - 1}">◄</button>` : ''}${step < steps.length - 1 ? `<button class="btn pri" data-act="tour" data-s="${step + 1}" autofocus>PRÓXIMO ►</button>` : '<button class="btn pri" data-close autofocus>JOGAR!</button>'}</div></div>`, { onClose: () => { try { localStorage.setItem('gamify-ui:tour', '1'); } catch { /* */ } } });
}

// ───────────────────────── SOS TRAVEI ─────────────────────────
let sosTimer = null;
function sos(taskId) {
  closeModal();
  clearInterval(sosTimer);
  const td = today();
  const t = taskId ? S.quests.tasks.find((x) => x.id === taskId) : null;
  const smallest = R.openTasks(S).filter((x) => x.st !== 'wait').sort((a, b) => R.taskBaseXp(S, a) - R.taskBaseXp(S, b) || (a.due || '9').localeCompare(b.due || '9')).slice(0, 3);
  const m = openModal(`<div style="text-align:center" id="sos"><h2>🆘 travei.</h2><p class="muted">Não é falta de força de vontade: é o corpo em modo "congelar". Primeiro a gente desliga o alarme.</p>
    <div class="sos-ring" id="sos-ring">toque pra<br>começar</div><p class="px" id="sos-step" style="font-size:9px">3 suspiros fisiológicos</p>
    <div class="actions" style="justify-content:center"><button class="btn pri" id="sos-go">RESPIRAR</button><button class="btn ghost" id="sos-skip">PULAR</button></div></div>`, { onClose: () => clearInterval(sosTimer) });
  const ring = m.querySelector('#sos-ring'), stepEl = m.querySelector('#sos-step');
  const phase2 = () => {
    clearInterval(sosTimer);
    m.innerHTML = `<h2>o menor passo.</h2><p class="muted">Escolha UMA coisa e combine só 10 minutos. Não precisa terminar.</p>
      <div class="list">${(t ? [t] : smallest).map((x) => `<button class="li" style="width:100%;text-align:left;border:0;background:none;cursor:var(--cur-hand,pointer)" data-act="sos-pick" data-id="${x.id}"><span class="lt">${esc(x.text)}<small>${esc(x.block ? R.findBlock(S, x.block)?.title : R.AREAS[x.area])}</small></span><span class="chip">10 MIN</span></button>`).join('')}</div>
      ${R.neuroOn(S, 'pato') ? `<p class="meta" style="margin:10px 0 0">Nem sabe por onde começar? <a href="#" data-act="duck" data-id="${t?.id || ''}">🦆 explique pro PRIMO</a>: o que tentou, o que funcionou, o que não.</p>` : ''}
      <form data-form="sos-tiny" class="row" style="margin-top:10px"><input class="inp grow" name="text" placeholder="ou escreva um micro-passo (ex.: abrir o arquivo)" aria-label="Micro-passo"><button class="btn">OK</button></form>
      <div class="actions"><button class="btn" data-close>FECHAR</button></div>`;
  };
  let cycle = 0;
  const breathe = () => {
    const seq = [['inspira…', 1.15, 2000, 'breathIn'], ['…mais um pouco', 1.3, 1000, null], ['solta devagar', 0.85, 6000, 'breathOut']];
    let i = 0;
    const run = () => {
      if (!document.getElementById('sos')) return;
      if (i >= seq.length) { cycle++; if (cycle >= 3) return phase2(); i = 0; }
      const [label, sc, ms, snd] = seq[i++];
      ring.innerHTML = label; ring.style.transform = `scale(${sc})`; ring.style.transitionDuration = ms + 'ms';
      stepEl.textContent = `suspiro ${cycle + 1}/3`;
      if (snd) sfx(snd);
      sosTimer = setTimeout(run, ms);
    };
    run();
  };
  m.querySelector('#sos-go').onclick = breathe;
  ring.onclick = breathe;
  m.querySelector('#sos-skip').onclick = phase2;
  void td;
}
function sosTimerFor(text, taskId) {
  let left = 600;
  if (!ambienceOn() && prefs.on !== false) startAmbience();
  const m = openModal(`<div style="text-align:center"><h2>10 minutos na fogueira.</h2><p>${esc(text)}</p><div class="num" id="sos-clock" style="font-size:36px;margin:20px 0;color:var(--accent)">10:00</div>
    <div class="actions" style="justify-content:center"><button class="btn good" id="sos-done">CONSEGUI COMEÇAR</button><button class="btn" data-close>PARAR</button></div></div>`, { onClose: () => clearInterval(sosTimer) });
  clearInterval(sosTimer);
  sosTimer = setInterval(() => { left--; const c = m.querySelector('#sos-clock'); if (c) c.textContent = mmss(left * 1000); if (left <= 0) { clearInterval(sosTimer); sfx('bell'); toast('⏰ 10 minutos! Quer continuar? Já está andando.', 'good'); } }, 1000);
  m.querySelector('#sos-done').onclick = () => { clearInterval(sosTimer); closeModal(); const r = A.sosDone(taskId); toast(r === null ? 'Coragem registrada (o bônus de hoje já foi).' : '🆘 Coragem: +5 XP. Agora é só seguir.', 'good'); };
}

// ───────────────────────── IA: QUEBRAR META ─────────────────────────
async function askClaude(prompt) {
  const sample = typeof window.claude?.use === 'function' ? await window.claude.use('sample') : null;
  if (!sample) throw { code: 'not_granted' };
  if (typeof sample.json === 'function') return await sample.json(prompt, { modelTier: 'default' });
  const res = await sample(prompt, { modelTier: 'default' });
  const mm = String(res.text || '').match(/\{[\s\S]*\}/);
  return JSON.parse(mm ? mm[0] : res.text);
}
function aiBreakdown() {
  openModal(`<form data-form="ai" autocomplete="off"><h2>🤖 quebrar meta com IA</h2><p class="meta" style="margin:0">A IA devolve um bloco 🎯 com ⚔ mini-bosses (escritos como a vitória) e ↳ passos de até 2h. Você revisa antes de criar.</p>
    <label class="lbl" for="ai-goal">Meta</label><input class="inp" id="ai-goal" name="goal" placeholder="EX.: COMPRAR O APARTAMENTO EM POÇOS" required autofocus>
    <label class="lbl" for="ai-ctx">Contexto (opcional)</label><textarea class="inp" id="ai-ctx" name="ctx" rows="3" placeholder="prazo, quanto já tem, o que trava, quem está envolvido…"></textarea>
    <div id="ai-out"></div><div class="actions"><button type="button" class="btn" data-close>FECHAR</button><button class="btn pri" id="ai-go">GERAR PLANO</button></div></form>`, { wide: true });
}
async function runAi(form) {
  const goal = form.goal.value.trim(), ctx = form.ctx.value.trim(), out = form.querySelector('#ai-out'), go = form.querySelector('#ai-go');
  if (!goal) return;
  go.disabled = true;
  out.innerHTML = '<p class="px muted" style="font-size:8px">🤖 pensando…</p>';
  const ch = S.core.chapter || {};
  const prompt = `Você é a "BREAKDOWN MACHINE" de um app brasileiro de produtividade gamificada.
O jogador está no capítulo "${ch.title}" com a missão "${ch.mission}" (por quê: ${ch.why}).
META GRANDE: ${goal}
CONTEXTO: ${ctx || '(nenhum)'}
Regras: 3 a 5 mini-bosses (⚔) em ordem cronológica, cada um um marco verificável ESCRITO COMO A VITÓRIA (ex.: "SEI QUANTO POSSO FINANCIAR"). Cada mini-boss com 2 a 4 passos (↳) de até 2 horas, começando com verbo no infinitivo. Detalhe mais o primeiro. XP de 30 a 60. Tudo em MAIÚSCULAS, português do Brasil, até 60 caracteres por item.
Responda SOMENTE com JSON: {"title":"TÍTULO CURTO","minis":[{"text":"VITÓRIA","xp":30,"steps":["PASSO","PASSO"]}]}`;
  try {
    const r = await askClaude(prompt);
    const plan = { title: String(r.title || goal).toUpperCase().slice(0, 80), minis: (r.minis || []).slice(0, 6).map((x) => ({ text: String(x.text || '').toUpperCase().slice(0, 90), xp: Math.min(100, Math.max(10, +x.xp || 30)), steps: (x.steps || []).slice(0, 5).map((s) => String(s).toUpperCase().slice(0, 90)) })) };
    if (!plan.minis.length) throw new Error('vazio');
    out.innerHTML = `<div class="card" style="margin-top:12px"><h3 class="px" style="font-size:9px">🎯 ${esc(plan.title)}</h3><ul class="tasks" style="margin-top:8px">${plan.minis.map((x) => `<li class="task mini" style="grid-template-columns:1fr auto"><div class="txt">⚔ ${esc(x.text)}</div><span class="chip xp">${x.xp}</span></li>${x.steps.map((s) => `<li class="task step" style="grid-template-columns:1fr auto"><div class="txt">↳ ${esc(s)}</div><span class="chip xp">3</span></li>`).join('')}`).join('')}</ul>
      <div class="row" style="justify-content:flex-end;margin-top:10px"><button type="button" class="btn" id="ai-again">↻ OUTRA</button><button type="button" class="btn pri" id="ai-create">CRIAR NA BREAKDOWN</button></div></div>`;
    out.querySelector('#ai-create').onclick = () => { A.addGoalBlock(plan.title, plan.minis); closeModal(); location.hash = '#quests'; toast('🎯 Meta criada na BREAKDOWN MACHINE', 'good'); };
    out.querySelector('#ai-again').onclick = () => runAi(form);
  } catch (e) {
    out.innerHTML = `<p class="bad">${e?.code === 'not_granted' ? 'A IA só funciona com o app aberto pelo claude.ai (e com a permissão aceita).' : e?.code === 'rate_limited' ? 'Muitos pedidos seguidos. Espere um minuto.' : 'Não consegui gerar agora. Tente de novo.'}</p>`;
  }
  go.disabled = false;
}

// ───────────────────────── LOJA: baú misterioso ─────────────────────────
function mystery(ticket) {
  const r = A.buyMystery(ticket);
  if (r?.error) { sfx('error'); return toast(esc(r.error), 'bad'); }
  const m = R.itemMeta(r.prize);
  const md = openModal(`<div class="levelup"><div class="px muted" style="font-size:9px">BAÚ MISTERIOSO</div><div id="chest" style="margin:20px auto;width:120px;animation:shake .15s steps(2) 8">${px('chest', 120)}</div><div id="prize" style="visibility:hidden"><div style="font-size:48px">${m.icon}</div><h2>${esc(r.prize.name)}</h2><p class="muted">${m.rarity.name} · foi pra MOCHILA</p></div><div class="actions" style="justify-content:center"><button class="btn pri" data-close>VALEU!</button></div></div>`);
  sfx('chest');
  setTimeout(() => { const p = md.querySelector('#prize'); if (p) { p.style.visibility = 'visible'; md.querySelector('#chest').style.opacity = '.4'; confetti(80); } }, 1300);
}

// ───────────────────────── CLIQUES ─────────────────────────
const at = (e) => ({ x: e.clientX || innerWidth / 2, y: e.clientY || innerHeight / 2 });
const goldByKey = (k) => [...R.goldPrompts(S)].find((p) => p.key === k);
/** v5.16: abre o que estiver recolhido (janela, bloco, lista) pra o item aparecer */
function openUp(keys) { for (const k of keys) if (k && isCollapsed(k)) toggleCollapse(k); }
/** rola até o elemento e faz ele brilhar (com a cor do que ele é: urgente, aguardando…) */
function glow(sel, tries = 0) {
  // v9.1: espera a tela nova aparecer (trocar de aba redesenha depois); tenta por até ~2 s
  setTimeout(() => { const el = [].concat(sel).map((x) => document.querySelector(x)).find(Boolean); if (!el) { if (tries < 12) glow(sel, tries + 1); return; } el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.remove('glow'); void el.offsetWidth; el.classList.add('glow'); setTimeout(() => el.classList.remove('glow'), 3200); }, tries ? 160 : 90);
}
/** v9.0 (pedido do dono): tocar num ritual (fila de prazos, busca, moscas) leva até ele no SURVIVAL, como acontece com os blocos */
function jumpRit(id) {
  closeModal();
  openUp(['c:survival:rituais']);
  if (route() !== 'survival') location.hash = '#survival'; else render();
  setTimeout(() => glow(`[data-rit="${CSS.escape(id)}"]`), 250);
}
function jump(id) {
  const t = S.quests.tasks.find((x) => x.id === id);
  if (!t) return;
  const b = t.block && R.findBlock(S, t.block);
  if (!R.isOpen(t) || b?.color === 'black') ui.showDone = true;
  closeModal(); ui.mm = false;
  // v9.1 (pedido do dono): abre TUDO no caminho (a lista da cor dela, o bloco, o boss) e a janela certa, depois pisca a tarefa
  const bo = b && S.quests.bosses.find((x) => x.block === b.id);
  openUp(b ? ['b:' + b.id, 'g:' + b.group, 'g:bs', bo && 'b:' + b.id] : ['l:' + R.corOf(S, t)]);
  if (t.color === 'black' || b?.color === 'black') ui.showStalled = true;
  ui.qtab = b ? tabOfBlock(b) : 'listas';
  if (route() !== 'quests') location.hash = '#quests'; else render();
  glow([`.board :is(.list-card, .block) li.task[data-id="${id}"]`, `.board li.task[data-id="${id}"]`]);
}
const norm = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function findHits(q) {
  const n = norm(q).trim(); if (n.length < 2) return [];
  const out = [];
  for (const t of S.quests.tasks) if (R.isOpen(t) && !t.mother && norm(t.text).includes(n)) out.push({ k: 'task', id: t.id, text: t.text.replace(/\s*\(\d+\s*XP\)/i, ''), sub: t.block ? R.findBlock(S, t.block)?.title || '' : R.COR_NAMES[R.corOf(S, t)] || '', due: t.due });
  for (const b of S.quests.blocks) if (b.st !== 'done' && norm(b.title).includes(n)) out.push({ k: 'block', id: b.id, text: '▣ ' + b.title, sub: R.winOf(S, b)?.name || R.GROUPS[b.group]?.short || 'bloco', due: b.due });
  for (const r of S.core.rituals || []) if (norm(r.name).includes(n)) out.push({ k: 'rit', id: r.id, text: '🔁 ' + r.name, sub: 'ritual', due: null });
  return out.sort((a, z) => (a.due || '9').localeCompare(z.due || '9')).slice(0, 14);
}
function openFind() {
  const m = openModal(`<div class="find"><h2>🔍 ir direto pra…</h2><input class="inp" id="find-q" placeholder="digite parte do nome (tarefa, bloco, boss ou ritual)" autofocus data-kbd autocomplete="off"><div class="list" id="find-r"><div class="empty">digite pelo menos 2 letras</div></div>
    <p class="meta" style="margin:6px 0 0">Enter vai pro primeiro · Ctrl+K abre de qualquer aba</p></div>`);
  const q = m.querySelector('#find-q'), box = m.querySelector('#find-r');
  const draw = () => { const h = findHits(q.value); box.innerHTML = h.map((x) => `<button class="li rv-opt" data-act="find-go" data-k="${x.k}" data-id="${x.id}"><span class="lt">${esc(x.text)}<small>${esc(x.sub)}${x.due ? ' · ' + fmtDM(x.due) : ''}</small></span></button>`).join('') || `<div class="empty">${q.value.trim().length < 2 ? 'digite pelo menos 2 letras' : 'nada com esse nome'}</div>`; };
  q.addEventListener('input', draw);
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); box.querySelector('[data-act="find-go"]')?.click(); } });
}
function jumpBlock(bid) {
  const b = S.quests.blocks.find((x) => x.id === bid);
  if (!b) return;
  closeModal();
  openUp(['b:' + b.id, 'g:' + b.group, 'g:bs']);
  ui.qtab = tabOfBlock(b);
  if (route() !== 'quests') location.hash = '#quests'; else render();
  glow(`[data-drop-block="${bid}"]`);
}
let lastCheck = null, lastBoxes = []; // v7.1: a última tarefa clicada e a ordem da tela naquela hora (pro Shift + clique)
const ACTIONS = {
  toggle: (d, e) => {
    // v7.1: Shift + clique = conclui todas do intervalo (da última clicada até esta), igual selecionar arquivos no Windows
    // a ordem da tela é guardada no 1º clique: a tarefa concluída pode sumir da tela (MOSTRAR FEITAS desligado)
    const prev = lastCheck, boxes = lastBoxes.length ? lastBoxes : [];
    lastCheck = d.id; lastBoxes = [...$main.querySelectorAll('.board .lists li.task .check[data-act="toggle"], .board .group li.task .check[data-act="toggle"]')].map((c) => c.dataset.id);
    if (e?.shiftKey && prev && prev !== d.id) {
      const i = boxes.indexOf(prev), j = boxes.indexOf(d.id);
      if (i >= 0 && j >= 0) { const ids = boxes.slice(Math.min(i, j), Math.max(i, j) + 1); const r = A.doneMany(ids); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); } else sfx('ready'); return; }
    }
    const r = A.toggleDone(d.id, at(e)); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); }
  },
  // v7.1: menu ≡ do QUESTS
  qsort: (d) => { const tab = $main.querySelector('.qbar .seg button.on')?.dataset.tab || 'listas'; qsortOf(ui, tab); ui.qsort[tab] = ui.qsort[tab] === d.v ? '' : d.v; try { localStorage.setItem('gamify-ui:qsort', JSON.stringify(ui.qsort)); } catch { /* */ } sfx('tab'); render(); },

  // v5.16: a setinha ⤴ pergunta pra qual janela a tarefa vai (vira um bloco lá)
  'to-breakdown': (d) => {
    const wins = [['bd', R.GROUPS.bd.short, '🧩'], ['tr', R.GROUPS.tr.short, '📐'], ['cap', R.GROUPS.cap.short, '🧲'], ['gs', R.GROUPS.gs.short, '🗂'], ...R.windows(S).map((w) => ['w:' + w.id, w.name, '▣'])];
    openModal(`<h2>⤴ mandar pra qual janela?</h2><p class="muted">A tarefa vira um bloco lá e continua aqui nas LISTAS, ligada a ele.</p>
      <div class="pickgrid">${wins.map(([k, n, ic]) => `<button class="pick" data-act="send-to" data-id="${d.id}" data-to="${k}"><span class="pi">${ic}</span>${esc(n)}</button>`).join('')}</div>
      <div class="actions"><button class="btn" data-close>CANCELAR</button></div>`);
  },
  'send-to': (d) => { closeModal(); const r = A.toBreakdown(d.id, d.to); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); return; } sfx('upgrade'); if (r?.block) jumpBlock(r.block.id); },
  unlink: (d) => { A.unlinkTask(d.id); closeModal(); },
  'edit-task': (d) => { const t = S.quests.tasks.find((x) => x.id === d.id), lb = t?.mother && t.link && R.findBlock(S, t.link); if (lb && lb.group !== 'bs') editBlock(lb.id); else editTask(d.id); }, // v8.4: a tarefa-mãe É o bloco: abre a mesma janela
  'set-status': (d) => { A.setStatus(d.id, d.st); closeModal(); },
  'due-quick': (d, e, el) => { el.closest('form').due.value = d.d; },
  'move-task': (d) => A.moveTask(d.id, +d.dir),
  'add-step': (d) => { const t = S.quests.tasks.find((x) => x.id === d.id); closeModal(); stepPrompt(t); },
  'del-task': async (d) => { closeModal(); if (await ask('Apagar tarefa?', 'Ela some de vez (e os passos ↳ dela também).', 'APAGAR', true, quem('megg', 1, 'Apagar é pra sempre, viu? Se não vale mais, CANCELAR deixa registrado.'))) A.deleteTask(d.id); },
  'cycle-back': (d) => A.cycleBack(d.id),
  'cycle-ok': (d) => { A.cycleApprove(d.id); sfx('level'); confetti(50); },
  prio: (d) => { const t = S.quests.tasks.find((x) => x.id === d.id); A.updateTask(d.id, { prio: !t.prio }); },
  sort: (d) => { if (d.area) { (ui.lsort ||= {})[d.area] = ui.lsort[d.area] === 'win' ? 'date' : 'win'; toast(ui.lsort[d.area] === 'win' ? '⇅ Agrupado por janela (toque de novo: por data).' : '⇅ Por data.'); render(); } else A.sortContainer({ area: d.area, block: d.block }); sfx('tab'); },
  jump: (d) => { if (ui.mm) ui.mm = false; jump(d.id); },
  'done-all': async (d) => { const b = S.quests.blocks.find((x) => x.id === d.id), n = S.quests.tasks.filter((t) => t.block === d.id && R.isOpen(t)).length;
    if (b && n && await ask('Concluir tudo?', `Marca as ${n} tarefa(s) abertas de "${b.title}" como feitas (dá pra desfazer com ↩).`, 'CONCLUIR TUDO')) A.doneAll(d.id); },
  'jump-block': (d) => jumpBlock(d.id),
  'jump-rit': (d) => jumpRit(d.id),
  // v9.4 (H2): a linha única de escrever da TODAS abre o anotar rápido já com o texto (pergunta cor, dia e assunto)

  voz: (d) => { voz(d.k); const f = FALAS[d.k]; if (f) toast(`<b>${esc(NOMES[d.k] || '')}:</b> ${esc(f[Math.floor(Math.random() * f.length)])}`); }, // v9.0: tocar num personagem = a voz e uma fala dele
  'edit-block': (d) => editBlock(d.id),
  'move-block': (d) => A.moveBlock(d.id, +d.dir),
  'del-block': async (d) => { closeModal(); if (await ask('Apagar bloco inteiro?', 'O bloco e todas as subtarefas somem de vez.', 'APAGAR', true, quem('boi-nilton', 4, 'Derrubar a obra inteira? Pensa bem antes, sô.'))) A.deleteBlock(d.id); },
  'boss-toggle': (d, e) => A.toggleBoss(d.id, at(e)),
  'edit-boss': (d) => editBoss(d.id),
  'del-boss': async (d) => { closeModal(); if (await ask('Apagar boss?', 'Essa meta some da lista.', 'APAGAR', true)) A.deleteBoss(d.id); },
  habit: (d, e) => { A.cycleHabit(d.d, d.h, at(e)); sfx('habit'); if (Math.random() < 0.3) primoReact('habito_feito'); },
  redemption: () => redemption(),
  'rd-do': (d) => { closeModal(); if (S.marks.days[today()]?.h?.rd !== 'x') { A.setHabit(today(), 'rd', 'x'); toast(`⚔ Redenção: ${esc(d.o)}. +${R.C.RD_XP} XP e debuffs curados.`, 'good'); } else toast('A redenção de hoje já foi feita.'); },
  'rd-undo': () => { closeModal(); A.setHabit(today(), 'rd', ''); },
  'rest-day': async () => { if (await ask('Dia de descanso?', 'Doença ou dia ruim: todos os hábitos de HOJE viram folga (–), sem punição. Dia ruim passa: hoje só o essencial, nada de decisão grande, longe de notícias e álcool; um treino leve ou um chá ajudam, e dormir cedo resolve muito. Vai ficar fora mais dias? Use o botão ✈ VIAGEM.', 'DESCANSAR')) A.restDay(today()); },
  hweek: (d) => { ui.hweek = Math.min(0, (ui.hweek || 0) + +d.dir); render(); },
  'tl-week': (d) => { ui.tlWeek = +d.dir === 0 ? 0 : (ui.tlWeek || 0) + +d.dir; render(); },
  'ag-filter': (d) => { ui.agB = d.b; render(); },
  'ritual-done': (d, e) => { A.ritualDone(d.id, at(e)); },
  'ritual-undo': (d) => A.ritualUndo(d.id),
  'edit-ritual': (d) => editRitual(d.id),
  'ritual-plan': (d) => {
    const r = S.core.rituals.find((x) => x.id === d.id);
    if (!r) return;
    const td = today(), sat = addDays(td, ((6 - weekday(td) + 7) % 7) || 7), sun = addDays(td, ((7 - weekday(td)) % 7) || 7), cur = R.ritualPlan(r) || '';
    openModal(`<form data-form="ritual-plan" data-id="${r.id}" autocomplete="off"><h2>📅 quando vou fazer</h2><p class="muted">${esc(r.name)} · o aviso automático seria ${fmtDM(R.ritualNext(r, td))}. Marque o dia que você quer; ele aparece na AGENDA e vale até você fazer.</p>
      <div class="row"><input class="inp" type="date" name="plan" value="${cur}" min="${td}" style="width:auto" autofocus>${[['HOJE', td], ['AMANHÃ', addDays(td, 1)], ['SÁBADO', sat], ['DOMINGO', sun], ['LIMPAR', '']].map(([n, v]) => `<button type="button" class="btn sm ghost" data-act="plan-quick" data-d="${v}">${n}</button>`).join('')}</div>
      <div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">MARCAR</button></div></form>`);
  },
  'plan-quick': (d, e, el) => { el.closest('form').plan.value = d.d; },
  'review-block': (d) => { A.reviewBlock(d.id); sfx('tab'); },
  'review-list': (d) => { A.reviewList(d.k); sfx('tab'); },
  'curfew-skip': () => { curfewSkip(); render(); },
  'pin-block': (d) => { toast(togglePin(d.id) ? '📌 Virou post-it: ele acompanha você em todas as abas.' : '📌 Post-it guardado.'); render(); sfx('tab'); },
  fullscreen: () => { try { if (document.fullscreenElement) { navigator.keyboard?.unlock?.(); document.exitFullscreen(); } else document.documentElement.requestFullscreen().then(() => navigator.keyboard?.lock?.(['Escape'])).catch(() => {}); } /* v9.1: Esc fecha só a janela; sair da tela cheia é no botão (no Chrome; segurar Esc ainda sai) */ catch { toast('Este navegador não deixou abrir em tela cheia.', 'bad'); } },
  'win-new': () => windowModal(),
  'win-edit': (d) => windowModal(d.id),
  'win-del': async (d) => { const w = R.windows(S).find((x) => x.id === d.id); closeModal(); if (w && await ask(`Apagar a janela ${w.name}?`, `Os blocos dela não são apagados: voltam pra ${R.GROUPS[w.base].short}.`, 'APAGAR', true)) { A.deleteWindow(d.id); ui.qtab = w.base; render(); } },
  'del-ritual': async (d) => { closeModal(); if (await ask('Apagar ritual?', 'O histórico de XP continua valendo.', 'APAGAR', true)) A.deleteRitual(d.id); },
  'edit-habits': () => editHabits(),
  'hab-row-add': (d, e, el) => { el.closest('form').querySelector('#hab-rows').insertAdjacentHTML('beforeend', '<div class="row hrow" style="margin-bottom:6px" data-id=""><input class="inp" name="icon" value="⭐" style="width:60px;text-align:center" aria-label="Ícone"><input class="inp grow" name="name" placeholder="NOVO HÁBITO" aria-label="Nome"><button type="button" class="icon-btn" data-act="hab-row-del" aria-label="Remover">×</button></div>'); },
  'hab-row-del': (d, e, el) => el.closest('.hrow').remove(),
  ltab: (d) => { ui.ltab = d.tab; render(); sfx('tab'); },
  fcat: (d) => { ui.fcat = d.cat; render(); },
  fsort: (d) => { const f = ui.filtro; if (f.sort === d.k) f.dir *= -1; else { f.sort = d.k; f.dir = 1; } render(); },
  fpick: (d) => { const f = (ui.filtro ||= { q: '', cat: '', bucket: '', status: '', type: '', who: '', sort: 'date', dir: 1 }); f[d.k] = f[d.k] === d.v ? '' : d.v; if (d.go && isCollapsed('c:agenda:filtro')) toggleCollapse('c:agenda:filtro'); sfx('tab'); render(); if (d.go) setTimeout(() => document.getElementById('filtro-v')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }, // quadrinho liga/desliga o filtro (na AGENDA, rola até a tabela)
  fclear: () => { Object.assign(ui.filtro, { q: '', cat: '', bucket: '', status: '', type: '', who: '' }); sfx('tab'); render(); },
  cq: (d) => { ui.cq = ui.cq === d.v ? 'todas' : d.v; sfx('tab'); render(); }, // v6.4: tocar de novo no escolhido volta pro padrão // v5.16: filtro das CONQUISTAS
  'perks-go': (d) => perksGo(d.i),
  'new-chapter': () => {
    const ch = S.core.chapter || {};
    openModal(`<form data-form="new-chapter" autocomplete="off" class="mform"><div class="mhead"><span class="mtype">🌅 novo capítulo</span><span class="mwhere">capítulo ${(+ch.n || 1) + 1}</span></div>
      <p class="muted">Recomeçar numa data marcante funciona (é o "efeito do recomeço"). O capítulo atual vira uma carta guardada, com tudo o que você fez.</p>
      <label class="lbl" for="nc-t">Título do capítulo</label><input class="inp mtitle" id="nc-t" name="title" required autofocus placeholder="ex.: FAZENDO DIREITO">
      <label class="lbl" for="nc-m">A missão (uma só)</label><input class="inp" id="nc-m" name="mission" value="${esc(ch.mission || '')}">
      <label class="pill" style="margin-top:14px" title="Gold, compras da loja, conquistas e histórico ficam"><input type="checkbox" name="reset" checked><span>↺ recomeçar XP, nível e tickets do zero</span></label>
      <div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">COMEÇAR</button></div></form>`);
  },
  // v5.16 (2E) FOCO AGORA: concluir, pular pra outra sugestão, ir até a tarefa
  'focus-skip': (d) => { (ui.focusSkip ||= []).push(d.id); sfx('tab'); render(); },
  'focus-reset': () => { ui.focusSkip = []; sfx('tab'); render(); },
  'rot-chip-del': (d) => { const l = [...(S.core.routine?.[d.k] || [])]; l.splice(+d.i, 1); A.setRoutineList(d.k, l); sfx('tab'); },
  credits: () => openModal(`<h2>ⓘ créditos</h2><p class="muted">PRIMO, rostos, BRASINHA, cenários e ícone: arte gerada por IA com direção do autor do app.</p>
    <p class="muted">Porquinho clássico em pixel: "Free Pets Pack" por <a href="https://frakassets.itch.io/free-pets-pack" target="_blank" rel="noopener">Frakassets</a> (CC BY 4.0). Ícones da loja: Kenney (CC0). Fogueira: "Fireplace sound loop" (CC0). Lo-fi: gerado no aparelho. Fontes: Press Start 2P e Roboto Mono (licença aberta).</p>
    <div class="actions"><button class="btn" data-close>FECHAR</button></div>`),
  'toggle-done': () => { ui.showDone = !ui.showDone; render(); },
  'toggle-stalled': () => { ui.showStalled = !ui.showStalled; try { localStorage.setItem('gamify-ui:stalled', ui.showStalled ? '1' : '0'); } catch { /* */ } render(); sfx('tab'); },
  // v7.5: presets do PERKS
  'preset-apply': async (d) => { if (await ask(`Usar o preset ${d.n}?`, 'Os ajustes de PERKS viram os desse preset (seus horários ficam). O ↩ desfaz.', 'USAR')) { const r = A.applyPreset(d.n); if (r?.error) toast(esc(r.error), 'bad'); else sfx('tab'); } },
  'preset-del': async (d) => { if (await ask(`Apagar o preset ${d.n}?`, 'Os ajustes de agora não mudam.', 'APAGAR', true)) A.deletePreset(d.n); },
  'settings-reset': async () => { if (await ask('Voltar ao padrão?', 'Todos os ajustes de PERKS voltam ao padrão do app. Seus horários (acordar, dormir, comer) ficam. Dica: salve antes um preset com o jeito atual. O ↩ desfaz.', 'VOLTAR AO PADRÃO', true)) { A.resetSettings(); sfx('tab'); } },
  'collapse-tab': () => { const keys = tabKeys(), close = keys.some((k) => !isCollapsed(k)); for (const k of keys) if (isCollapsed(k) !== close) toggleCollapse(k); render(); sfx('swish'); },
  'collapse-all': () => {
    const keys = [...new Set([...$main.querySelectorAll('.board [data-act="collapse"][data-k]')].map((x) => x.dataset.k).filter((k) => /^([bl]:|c:quests:)/.test(k)))]; // v6.4: inclui MISSÕES e BOSS DO CAPÍTULO
    const close = keys.some((k) => !isCollapsed(k));
    for (const k of keys) if (isCollapsed(k) !== close) toggleCollapse(k);
    render(); sfx('swish');
  },
  'arq-more': () => { ui.arqLimit = (ui.arqLimit || 80) + 100; render(); },
  'arq-st': (d) => { ui.arqF.st = ui.arqF.st === d.v ? '' : d.v; sfx('tab'); render(); },
  'archive-now': async () => {
    // v9.0 (pedido do dono): a pergunta já diz QUANTAS coisas vão pro ARQUIVO
    const p = A.archivePreview(), n = p.tasks + p.canceled + p.blocks;
    if (!n) { toast('🔄 Nada pra arquivar: o quadro já está em dia.'); return; }
    const parts = [p.tasks && `${p.tasks} tarefa${p.tasks > 1 ? 's' : ''} feita${p.tasks > 1 ? 's' : ''}`, p.canceled && `${p.canceled} cancelada${p.canceled > 1 ? 's' : ''}`, p.blocks && `${p.blocks} bloco${p.blocks > 1 ? 's' : ''} fechado${p.blocks > 1 ? 's' : ''}${p.inBlocks ? ` (com ${p.inBlocks} subtarefa${p.inBlocks > 1 ? 's' : ''})` : ''}`].filter(Boolean);
    if (await ask(`Arquivar ${n} item${n > 1 ? 'ns' : ''}?`, `Vão pro ARQUIVO: ${parts.join(', ')}. O XP continua valendo.`, `ARQUIVAR ${n}`, false, quem('cajulina', 4, 'Feito vai pro CARTÓRIO, bem guardadinho. Carimbo na mão.'))) A.archiveNow();
  },
  distribute: () => distribute(),
  'undo-plan': () => A.undoPlan(),
  'day-status': (d) => {
    const st = R.dayStatus(S, d.d);
    const rows = st.list.filter((x) => x.key !== 'sabado').map((x) => `<div class="li"><div class="lt">${x.icon} <b>${esc(x.name)}</b> <span class="chip ${x.kind === 'buff' ? 'soon' : 'late'}">${x.kind === 'buff' ? 'BUFF' : 'DEBUFF'}</span><small style="white-space:normal">${esc(x.desc || '')}${x.cure ? ' · Cura: ' + esc(x.cure) : ''}</small></div></div>`).join('');
    openModal(`<h2>🎭 status de ${fmtDM(d.d)}</h2><div class="list">${rows || '<div class="empty">Nenhum buff nem debuff nesse dia.</div>'}</div><div class="actions"><button class="btn pri" data-close>FECHAR</button></div>`);
  },
  explain: (d) => {
    const st = R.dayStatus(S, today());
    const x = d.k === 'event' ? { icon: '🎲', name: 'EVENTO DO DIA: ' + st.event.name, desc: st.event.desc, cure: 'Muda todo dia à meia-noite.' } : R.STATUS_INFO[d.k];
    openModal(`<h2>${x.icon} ${esc(x.name)}</h2><p>${esc(x.desc)}</p>${x.cure ? `<p class="muted">Cura: ${esc(x.cure)}</p>` : ''}<div class="actions"><button class="btn pri" data-close autofocus>OK</button></div>`);
  },
  buy: (d, e) => { const r = A.buyTaverna(d.id, false, at(e)); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); } },
  // v8.8 (pedido do dono): USAR AGORA = compra e já começa a usar (sem passar pela SACOLA)
  'buy-now': (d, e) => { const r = A.buyTaverna(d.id, false, at(e)); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); return; } const p = [...S.loja.purchases].reverse().find((x) => x.itemId === d.id && x.status === 'bag'); if (p) A.useItem(p.id); },
  'buy-ticket': (d, e) => { const r = A.buyTaverna(d.id, true, at(e)); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); } },
  confess: async (d) => { const it = S.loja.taverna.find((x) => x.id === d.id); if (await ask('Fiz sem comprar…', `${it.name} sai por ${Math.round((R.tavernaPrice(S, it) * R.DEBT_MULT) / 5) * 5} XP (x${String(R.DEBT_MULT).replace('.', ',')}). Da próxima vez, compre antes.`, 'PAGAR A DÍVIDA', true)) A.confessItem(d.id); },
  'shop-goal': (d) => A.setShopGoal(d.id),
  'use-item': (d) => A.useItem(d.id),
  'finish-item': (d) => A.finishItem(d.id),
  'goto-bag': () => { ui.ltab = 'mochila'; location.hash = '#shop'; render(); },
  mystery: () => mystery(false),
  'mystery-ticket': () => mystery(true),
  forge: (d) => { const it = S.loja.ferreiro.find((x) => x.id === d.id); openModal(`<form data-form="forge" data-id="${d.id}"><h2>⚒ ${esc(it.name)}</h2><p class="muted">Custa <b class="acc">${R.ferreiroXp(it)} XP</b> + o gold (dinheiro real) que você gastou.</p><label class="lbl" for="fg-gold">Quanto gastou (R$ = gold)?</label><input class="inp" id="fg-gold" name="gold" type="number" min="0" value="0" autofocus><div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">FORJAR</button></div></form>`); },
  'edit-item': (d) => editItem(d.kind, d.id, d.cat),
  'del-item': async (d) => { closeModal(); if (await ask('Apagar item?', 'O histórico de compras continua.', 'APAGAR', true)) A.deleteShopItem(d.kind, d.id); },
  'undo-buy': async (d) => { if (await ask('Desfazer compra?', 'O XP/gold/ticket volta pro saldo.', 'DESFAZER')) A.undoPurchase(d.id); },
  'del-gold': async (d) => { if (await ask('Apagar entrada de gold?', 'O valor sai do baú de ouro.', 'APAGAR', true)) A.deleteGold(d.id); },
  'gold-yes': (d) => { const p = goldByKey(d.key); if (p) { A.confirmGold(p, p.amount); sfx('coin'); } },
  // v8.3: atalhos que preenchem um campo do formulário (ex.: horário do time box; o relógio do navegador era ruim de usar)
  // v8.5: BUSCA RÁPIDA (🔍 no topo ou Ctrl+K): digita e vai direto pra tarefa, bloco, boss ou ritual (pedido do dono: velocidade pra se mover no app)
  find: () => openFind(),
  'find-go': (d) => { closeModal(); if (d.k === 'task') jump(d.id); else if (d.k === 'block') jumpBlock(d.id); else if (d.k === 'rit') jumpRit(d.id); },
  'to-top': () => scrollTo({ top: 0, behavior: 'smooth' }),
  mute: () => { const m = toggleMute(); toast(m ? '🔇 Som desligado (efeitos, música e a bagunça dos TREM).' : '🔊 Som de volta.', 'gold'); render(); },
  'set-field': (d, e, el) => { const f = el?.closest('form'), i = f?.elements?.[d.name]; if (!i) return; i.value = d.v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); f.querySelectorAll(`[data-act="set-field"][data-name="${d.name}"]`).forEach((b) => b.classList.toggle('on', b === el)); },
  'gold-edit': (d) => { const p = goldByKey(d.key); if (p) openModal(`<form data-form="gold-edit" data-key="${esc(p.key)}"><h2>💰 ${esc(p.title)}</h2><label class="lbl" for="ge-v">Quanto entrou (sua parte)</label><input class="inp" id="ge-v" name="v" type="number" min="1" value="${p.amount}" autofocus><div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">GUARDAR</button></div></form>`); },
  'gold-later': (d) => { const p = goldByKey(d.key); if (p) A.snoozeGold(p); },
  'gold-never': (d) => { const p = goldByKey(d.key); if (p) A.snoozeGold(p, true); },
  'rot-plan': (d) => { ui.rplan = +d.i; render(); },
  'rot-active': (d) => A.setRoutinePlan(+d.i),
  'rot-cell': (d) => {
    const r = S.core.routine, pi = Math.min(ui.rplan ?? r.active ?? 0, r.plans.length - 1), v = r.plans[pi].grid[d.key] || '';
    const sugg = [...new Set([...(r.atividades || []), ...Object.values(r.plans[pi].grid)])].sort();
    // v6: as sugestões aparecem na hora, como balõezinhos (antes só apareciam depois de digitar)
    openModal(`<form data-form="rot-cell" data-key="${d.key}" data-p="${pi}" class="mform"><div class="mhead"><span class="mtype">${esc(d.key.replace('|', ' · '))}${d.key.includes(':') ? '' : 'H'}</span></div><input class="inp mtitle" name="v" value="${esc(v)}" autofocus aria-label="Atividade" placeholder="escreva ou toque numa abaixo"><div class="pills rot-sugg" style="margin-top:10px">${sugg.map((s) => `<button type="button" class="pill" data-act="rot-pick" data-v="${esc(s)}"><span>${esc(s)}</span></button>`).join('')}<button type="button" class="pill" data-act="rot-pick" data-v="" title="Deixar este horário vazio"><span>✕ VAZIO</span></button></div><div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">SALVAR</button></div></form>`);
  },
  'routine-new': () => A.initRoutine(),
  'rot-neuro': () => { A.addNeuroRoutine(); ui.rplan = S.core.routine.plans.length - 1; sfx('upgrade'); render(); toast('🧠 Criei a rotina NEURO (a sua continua igual). Compare e, se gostar, toque em ★ USAR ESTA COMO PRINCIPAL.', 'good'); },
  'rot-pick': (d, e, el) => { const f = el.closest('form'); f.v.value = d.v; f.requestSubmit(); },
  'rot-hours': () => {
    const hs = S.core.routine?.hours || [];
    openModal(`<form data-form="rot-hours" class="mform" autocomplete="off"><div class="mhead"><span class="mtype">🕐 horários da rotina</span></div>
      <p class="muted">Toque no × pra tirar um horário. Pra meia em meia hora, adicione 07:30, 08:30…</p>
      <div class="pills" id="rh-list">${hs.map((h) => `<span class="pill"><span>${h}${h.includes(':') ? '' : 'H'}</span><button type="button" class="rx" data-act="rot-hour-del" data-h="${h}" aria-label="Tirar ${h}">×</button></span>`).join('')}</div>
      <div class="row" style="margin-top:12px"><input class="inp" type="time" name="h" step="1800" style="width:auto" aria-label="Novo horário"><button class="btn sm pri">+ ADICIONAR</button></div>
      <div class="actions"><button type="button" class="btn" data-close>PRONTO</button></div></form>`);
  },
  'rot-hour-del': (d) => { A.setRoutineHours((S.core.routine?.hours || []).filter((h) => h !== d.h)); ACTIONS['rot-hours'](); },
  'ai-breakdown': () => aiBreakdown(),
  'primo-hub': () => openPrimoHub(),
  sos: (d) => { sos(d.id); },
  'sos-pick': (d) => { const t = S.quests.tasks.find((x) => x.id === d.id); A.setStatus(d.id, 'doing'); sosTimerFor(t.text, d.id); },
  music: () => { if (ambienceOn()) stopAmbience(); else startAmbience(); render(); },
  'local-ok': () => { try { localStorage.setItem('gamify-ui:localok', '1'); } catch { /* */ } render(); },
  mode: () => { const cur = document.documentElement.dataset.mode; setMode(cur === 'night' ? 'day' : 'night'); sfx('tab'); },
  tour: (d) => tour(+d.s || 0),
  more: () => openModal(`<h2>mais</h2><div class="list">${ROUTES.filter((r) => !['quests', 'survival', 'shop', 'agenda', ...HIDDEN_TABS].includes(r[0])).map(([k, n, ic]) => `<a class="li" href="#${k}" data-close style="text-decoration:none;color:var(--ink)"><span class="lt">${px(ic, 16)} ${n}</span><span class="dim">→</span></a>`).join('')}</div>`),
  'backup-copy': async () => {
    const json = JSON.stringify(exportAll());
    try { await navigator.clipboard.writeText(json); markBackup(); render(); toast('Backup copiado. Cole num e-mail ou nota.', 'good'); }
    catch { openModal(`<h2>backup</h2><textarea class="inp" rows="10" readonly>${esc(json)}</textarea><div class="actions"><button class="btn pri" data-close>FECHAR</button></div>`); }
  },
  'backup-import': () => openModal(`<form data-form="import"><h2>importar backup</h2><p class="muted">Escolha o arquivo que o BAIXAR BACKUP gerou (gamify-backup-….json) ou cole o texto dele. Isso SUBSTITUI os dados atuais.</p><input class="inp" type="file" accept=".json,application/json" data-import-file aria-label="Arquivo de backup" style="margin-bottom:8px"><textarea class="inp" name="json" rows="8" required placeholder="…ou cole o texto aqui"></textarea><div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">IMPORTAR</button></div></form>`),
  'new-game': () => { replaceAll(A.newGameDocs()); render(); },
};
extend(ACTIONS, () => render());
extend35(ACTIONS, () => render());
extend4(ACTIONS, () => render());
extendPrimo(ACTIONS);
extendDrive(ACTIONS, () => render());
extendImgs();
extendBackup(ACTIONS, () => render());
extendTrip(ACTIONS);
extendReview(ACTIONS);
window.__ui = ui;
window.__render = () => render();
/** em qual janela do QUESTS um bloco aparece */
function tabOfBlock(b) { return !b ? 'listas' : b.group === 'bs' ? 'boss' : R.winOf(S, b) ? 'w:' + b.win : b.group; }
function windowModal(id) {
  const w = id ? R.windows(S).find((x) => x.id === id) : null;
  const n = w ? S.quests.blocks.filter((b) => b.win === w.id).length : 0;
  openModal(`<form data-form="window" data-id="${w?.id || ''}" autocomplete="off"><h2>${w ? 'janela' : 'nova janela'}</h2>
    <p class="muted">Uma janela é uma gaveta de blocos, ao lado de BREAKDOWN, TRABALHO e as outras. Ela precisa de um tipo, que define quanto vale fechar um bloco: as regras do jogo continuam as mesmas.</p>
    <label class="lbl" for="w-name">Nome</label><input class="inp" id="w-name" name="name" value="${esc(w?.name || '')}" maxlength="18" required autofocus placeholder="ex.: ESTUDOS, CASA, CLIENTE X">
    <label class="lbl" for="w-base">Funciona como</label><select class="inp" id="w-base" name="base">${R.WINDOW_BASES.map((g) => `<option value="${g}" ${(w?.base || 'bd') === g ? 'selected' : ''}>${esc(R.GROUPS[g].short)} · fechar bloco vale ${R.C.XP_BLOCK[g] ?? 100} XP${g === 'tr' || g === 'cap' ? ' · tarefas contam como 💰' : ''}</option>`).join('')}</select>
    <div class="actions">${w ? `<div class="left"><button type="button" class="btn sm danger" data-act="win-del" data-id="${w.id}">APAGAR JANELA</button></div>` : ''}<button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">${w ? 'SALVAR' : 'CRIAR'}</button></div>
    ${w ? `<p class="meta" style="margin:8px 0 0">${n} bloco(s) aqui. Apagar a janela não apaga os blocos: eles voltam pra ${esc(R.GROUPS[w.base].short)}.</p>` : ''}</form>`);
}
function stepPrompt(t) {
  openModal(`<form data-form="step" data-id="${t.id}" autocomplete="off"><h2>+ ↳ passo</h2><p class="meta" style="margin:0">dentro de: ${esc(t.text)}</p><label class="lbl" for="st-text">Passo (até 2h)</label><input class="inp" id="st-text" name="text" required autofocus><div class="actions"><button type="button" class="btn" data-close>FECHAR</button><button class="btn pri">ADICIONAR</button></div></form>`);
}
document.addEventListener('click', (e) => {
  const close = e.target.closest('[data-close]');
  if (close) { if (close.tagName === 'A') setTimeout(closeModal, 0); else { e.preventDefault(); closeModal(); } }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  if (!(el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href') !== '#')) e.preventDefault();
  fn(el.dataset, e, el);
});

// ───────────────────────── FORMULÁRIOS ─────────────────────────
const FORMS = {
  'preset-save': (f) => { const r = A.savePreset(f.name.value); if (r?.error) { toast(esc(r.error), 'bad'); return; } f.name.value = ''; sfx('tab'); },
  'add-task': (f, blur) => {
    const text = f.text.value.trim();
    if (!text) return;
    f.text.value = '';
    const cor = f.dataset.cor, COR_AREA = { urg: 'hoje', chega: 'sem', estavel: 'sem', semcor: 'sem', wait: 'wait', parado: 'sem' };
    if (f.dataset.block) A.addTask({ text, block: f.dataset.block }); else if (cor) A.addTask({ text, area: COR_AREA[cor], color: R.COR_COLOR[cor] || null }); else A.addTask({ text, area: f.dataset.area });
    sfx('tab');
    const key = f.dataset.block ? 'block' : cor ? 'cor' : 'area';
    if (!blur) requestAnimationFrame(() => document.querySelector(`form[data-form="add-task"][data-${key}="${f.dataset.block || cor || f.dataset.area}"] input`)?.focus());
  },
  'add-block': (f) => { const v = f.title.value.trim(); f.title.value = ''; if (v) A.addBlock(f.dataset.group, v, f.dataset.win ? { win: f.dataset.win } : {}); },
  window: (f) => { const r = A.saveWindow({ id: f.dataset.id, name: f.name.value, base: f.base.value }); if (r?.error) { toast(esc(r.error), 'bad'); return; } ui.qtab = 'w:' + r.window.id; closeModal(); sfx('tab'); render(); },
  'add-boss': (f) => { const v = f.text.value.trim(); f.text.value = ''; if (!v) return; const m = /([\d.]+)\s*XP/i.exec(v); A.addBoss(v, m ? +m[1].replace(/\./g, '') : 500); },
  task: async (f) => {
    const t = S.quests.tasks.find((x) => x.id === f.dataset.id);
    const text = rebuildText(f.text.value, { star: f.star.checked, home: f.home.checked, money: f.money.checked, xp: +f.xp.value || null, kind: f.kind.value });
    const patch = { text, due: f.due.value || null, at: f.at?.value || undefined, prio: f.prio.checked || undefined, cycle: f.cycle.checked, who: f.who.value.trim().toUpperCase() || undefined, dep: f.dep.value || undefined };
    if (f.box_at?.value && patch.due && t.due && patch.due > t.due) patch.box = { at: f.box_at.value, min: +f.box_min.value || 25 }; // v5.16 E) time box destrava a remarcação
    const col = f.querySelector('[name=color]:checked')?.value ?? (t.color || '');
    const open = !t.st || t.st === 'doing' || t.st === 'wait';
    if (col === 'wait' || patch.who || patch.dep) { if (open) patch.st = 'wait'; } // roxo (ou disse quem segura): vai pra AGUARDANDO
    else { patch.color = col || undefined; if (t.st === 'wait') { patch.st = ''; patch.who = undefined; patch.dep = undefined; } } // outra cor: sai do AGUARDANDO
    if (patch.color === 'red' && !patch.due && R.isOpen(t)) { patch.due = today(); toast('🟥 URGENTE sempre tem prazo: ficou pra hoje.', 'gold'); } // v8.4 (pedido do dono)
    if (t.link && 'color' in patch && patch.color && patch.color !== 'wait') { const lb = R.findBlock(S, t.link); if (lb && lb.color !== patch.color) A.updateBlock(lb.id, { color: patch.color }); } // tarefa-mãe e bloco têm a mesma cor
    if (f.pin) patch.pin = f.pin.value || undefined;
    // v9.1: o prazo passa pelo caminho único de remarcar (remarcar.js): ele resolve bloco, time box e custo numa janela só
    if (f.cat && (f.cat.value || '') !== (t.cat || '')) A.setCat(t.id, f.cat.value); // v9.4: assunto
    const { due, box, ...rest } = patch;
    const r = A.updateTask(t.id, rest);
    if (r?.error) { toast(esc(r.error), 'bad'); return; }
    closeModal();
    if ((due || null) !== (t.due || null) || box) { const cost = A.reschedCost(t, due || null); if (await setDue(t.id, due, { extra: box ? { box } : {}, reopen: () => editTask(t.id) }) && cost) primoReact('remarcou', { xp: cost }); }
  },
  block: async (f) => {
    const b = S.quests.blocks.find((x) => x.id === f.dataset.id);
    const gv = f.group.value, gw = gv.startsWith('win:') ? R.windows(S).find((w) => 'win:' + w.id === gv) : null;
    const col = f.querySelector('[name=color]:checked')?.value || b.color;
    const patch = { title: A.normalizeMoney(f.title.value.trim()) || b.title, due: f.due.value || null, group: gw ? gw.base : gv, win: gw ? gw.id : undefined };
    if (b.st !== 'done') { if (col === 'wait') patch.st = 'wait'; else { patch.st = ''; patch.color = col; } }
    // v9.3: a tarefa das listas ligada ao bloco muda de prazo pelo caminho único (custo e time box perguntados ali mesmo)
    const lt = b.src && S.quests.tasks.find((x) => x.id === b.src);
    if (lt && (lt.due || null) !== patch.due) { closeModal(); if (!(await setDue(lt.id, patch.due, { reopen: () => editBlock(b.id) }))) return; }
    A.updateBlock(b.id, patch);
    closeModal();
  },
  boss: (f) => {
    const b = S.quests.bosses.find((x) => x.id === f.dataset.id), st = f.st.value;
    const patch = { text: f.text.value.trim() || b.text, xp: +f.xp.value || 200 }; // a vida vem sempre do próprio bloco do boss
    if (f.why) { patch.why = f.why.value.trim() || undefined; patch.fear = f.fear.value.trim() || undefined; }
    if (st !== 'done') patch.st = st === 'pause' ? '' : st;
    A.updateBoss(b.id, patch);
    if (st === 'pause' && f.pause?.value && f.pause.value !== b.pause) A.pauseBoss(b.id, f.pause.value);
    else if (st !== 'pause' && R.bossPaused(b)) A.resumeBoss(b.id);
    closeModal();
  },
  ritual: (f) => { A.saveRitual({ id: f.dataset.id, type: f.type.value, name: f.name.value, mode: f.mode.value, every: f.every.value, dom: f.dom.value, wd: [...f.querySelectorAll('[name=wd]:checked')].map((x) => x.value), last: f.last.value, plan: f.plan.value, notes: f.notes.value }); closeModal(); },
  'ritual-plan': (f) => { A.planRitual(f.dataset.id, f.plan.value || null); closeModal(); sfx('tab'); },
  item: (f) => {
    const k = f.dataset.kind;
    A.saveShopItem(k, k === 'taverna' ? { id: f.dataset.id, name: f.name.value, xp: f.xp.value, icon: f.icon.value, min: f.min.value } : { id: f.dataset.id, name: f.name.value, cat: f.cat.value.trim().toUpperCase() || 'EU', nv: f.nv.value, repeat: f.repeat.checked, icon: f.icon.value });
    closeModal();
  },
  forge: (f) => { const r = A.buyFerreiro(f.dataset.id, f.gold.value); closeModal(); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); } },
  gold: (f) => { A.addGold({ date: f.date.value, from: f.from.value, amount: f.amount.value }); sfx('coin'); },
  'gold-edit': (f) => { const p = goldByKey(f.dataset.key); if (p) A.confirmGold(p, +f.v.value); closeModal(); sfx('coin'); },
  sunday: (f) => {
    const notes = {};
    (S.core.milestones || []).forEach((m, i) => { const v = +f['n' + i].value; if (v) notes[m] = Math.min(10, Math.max(1, v)); });
    const r = A.openSunday({ notes, rit: { prazos: f.prazos.checked, pessoas: f.pessoas.checked, quests: f.quests.checked }, text: f.text.value });
    if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); } else { confetti(); setTimeout(() => window.__weeklyPick?.(), 1200); }
  },
  chapter: (f) => { A.updateChapter({ n: f.n.value, title: f.title.value.trim().toUpperCase(), mission: f.mission.value.trim().toUpperCase(), why: f.why.value.trim().toUpperCase(), until: f.until.value }); toast('📖 Capítulo salvo', 'good'); },
  habits: (f) => {
    const list = [...f.querySelectorAll('.hrow')].map((r) => { const name = r.querySelector('[name=name]').value.trim().toUpperCase(); return { id: r.dataset.id || name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').slice(0, 16) || uid('h'), icon: r.querySelector('[name=icon]').value.trim() || '⭐', name }; }).filter((h) => h.name);
    A.updateHabits(list);
    closeModal();
  },
  step: (f) => { const t = S.quests.tasks.find((x) => x.id === f.dataset.id); A.addTask({ text: '↳ ' + f.text.value.replace(/^(↳|>)\s*/, ''), block: t.block, parent: t.id }); f.text.value = ''; f.text.focus(); },
  'rot-cell': (f) => { A.setRoutineCell(+f.dataset.p, f.dataset.key, f.v.value.trim()); closeModal(); },
  'sos-tiny': (f) => { const v = f.text.value.trim(); if (!v) return; const r = A.addTask({ text: v, area: 'imed', due: today() }); A.setStatus(r.task.id, 'doing'); sosTimerFor(v, r.task.id); },
  ai: (f) => runAi(f),
  import: async (f) => {
    let data;
    try { data = JSON.parse(f.json.value); } catch { toast('Texto inválido: não é um backup.', 'bad'); return; }
    const docs = data.docs || data;
    if (!docs.core || !docs.quests) { toast('Backup incompleto.', 'bad'); return; }
    closeModal();
    if (status.empty || await ask('Substituir tudo?', 'Os dados atuais serão trocados pelos do backup.', 'SUBSTITUIR', true)) { restoreDocs(docs); render(); toast('Backup importado', 'good'); }
  },
};
FORMS['rot-chip-add'] = (f) => { const v = f.v.value.trim().toUpperCase(); if (!v) return; A.setRoutineList(f.dataset.k, [...(S.core.routine?.[f.dataset.k] || []), v]); sfx('tab'); requestAnimationFrame(() => document.querySelector(`form[data-form="rot-chip-add"][data-k="${f.dataset.k}"] input`)?.focus()); };
FORMS['new-chapter'] = (f) => { const ch = S.core.chapter || {}; closeModal(); A.updateChapter({ n: (+ch.n || 1) + 1, title: f.title.value.trim().toUpperCase(), mission: f.mission.value.trim(), reset: f.reset.checked }); sfx('level'); };
FORMS['rot-hours'] = (f) => { const v = f.h.value; if (!v) return; A.setRoutineHours([...(S.core.routine?.hours || []), v]); ACTIONS['rot-hours'](); };
extendBujo(ACTIONS, FORMS);
extendMapa(ACTIONS, FORMS);
extendPlanos(ACTIONS, FORMS);
extendLobo(ACTIONS);
extendOrganiza(ACTIONS, FORMS); // depois do extendPrimo: a linha do lobo abre a janela do termômetro
extendPraga(ACTIONS, FORMS, jump);
extendPraga2(ACTIONS, jump);
document.addEventListener('submit', (e) => { const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault(); FORMS[f.dataset.form]?.(f); });
document.addEventListener('click', () => flushAdd()); // depois do clique tratado: adiciona o texto que ficou numa linha "+ adicionar"
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const k = el.dataset.k, c = el.dataset.change;
  if (c === 'setting') A.setSetting(k, el.tagName === 'SELECT' && isNaN(+el.value) ? el.value : +el.value);
  if (c === 'neuro') A.setNeuro(k, el.type === 'checkbox' ? el.checked : k === 'meals' ? el.value.split(/[\s,;]+/).filter((x) => /^\d{1,2}:\d{2}$/.test(x)) : el.value);
  if (c === 'label') A.setLabel(k, el.value);
  if (c === 'primo-art') { try { localStorage.setItem('gamify-ui:primo-art', el.value); } catch { /* */ } render(); }
  if (c === 'milestones') A.updateMilestones(el.value.split(',').map((s) => s.trim().toUpperCase()));
  if (c === 'mode') setMode(el.value);
  if (c === 'vol') setVol(k, +el.value);
  if (c === 'filtro') { ui.filtro[k] = el.value; render(); }
  if (c === 'cursor') { try { localStorage.setItem(CURSOR_KEY, el.value); } catch { /* */ } applyCursor(); }
  if (c === 'routine-list') A.setRoutineList(k, el.value.split('\n'));
});
let inputT = null;
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.input) {
    clearTimeout(inputT);
    inputT = setTimeout(() => {
      const path = el.dataset.input.split('.'), pos = el.selectionStart;
      if (path.length === 2) ui[path[0]][path[1]] = el.value; else ui[path[0]] = el.value;
      render();
      const again = document.querySelector(`[data-input="${el.dataset.input}"]`);
      if (again) { again.focus(); again.setSelectionRange(pos, pos); }
    }, 220);
    return;
  }
  const f = el.closest('form[data-form="sunday"]');
  if (f) {
    const notes = {};
    (S.core.milestones || []).forEach((m, i) => { notes[m] = +f['n' + i].value || 0; });
    const out = f.querySelector('#sun-preview');
    if (out) out.textContent = R.sundayXp(notes, { prazos: f.prazos.checked, pessoas: f.pessoas.checked, quests: f.quests.checked });
  }
});

// ───────────────────────── ARRASTAR E SOLTAR (PC) ─────────────────────────
let dragId = null;
document.addEventListener('dragstart', (e) => { const li = e.target.closest?.('li.task[draggable]'); if (!li) return; dragId = li.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); li.style.opacity = '.4'; });
document.addEventListener('dragend', (e) => { const li = e.target.closest?.('li.task'); if (li) li.style.opacity = ''; document.querySelectorAll('.drag-over').forEach((x) => x.classList.remove('drag-over')); dragId = null; });
document.addEventListener('dragover', (e) => {
  if (!dragId) return;
  const zone = e.target.closest('[data-drop-area],[data-drop-block],[data-drop-cor]');
  if (!zone) return;
  e.preventDefault();
  document.querySelectorAll('.drag-over').forEach((x) => x.classList.remove('drag-over'));
  (e.target.closest('li.task') || zone).classList.add('drag-over');
});
document.addEventListener('drop', (e) => {
  if (!dragId) return;
  const zone = e.target.closest('[data-drop-area],[data-drop-block],[data-drop-cor]');
  if (!zone) return;
  e.preventDefault();
  const before = e.target.closest('li.task')?.dataset.id;
  if (zone.dataset.dropCor) { const t = S.quests.tasks.find((x) => x.id === dragId); if (t && !t.block) { A.setCor(dragId, zone.dataset.dropCor, before !== dragId ? before : undefined); sfx('tab'); return; } } // v8.4: listas por cor
  dropTaskSmart(dragId, { area: zone.dataset.dropArea, block: zone.dataset.dropBlock, before: before !== dragId ? before : undefined });
  sfx('tab');
});

// ───────────────────────── ATALHOS ─────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (modalOpen()) { document.activeElement?.blur?.(); closeModal(); } return; } // blur antes: salva o texto em edição
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openFind(); return; } // v8.5: busca rápida
  if (modalOpen() || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return; // v6: escrevendo num balão do mapa, as letras não viram atalho
  const r = ROUTES.find((x) => x[4] && x[4] === e.key.toLowerCase());
  if (r) { location.hash = '#' + r[0]; return; }
  if (e.key === ' ') { e.preventDefault(); openPrimoHub(); }
  if (e.key === 'n') ACTIONS.mode();
  if (e.key === '/') { e.preventDefault(); location.hash = '#quests'; setTimeout(() => document.querySelector('form[data-cor="urg"] input, form[data-area="hoje"] input')?.focus(), 60); }
});

// ───────────────────────── RELÓGIO: cronômetros, virada do dia, dia/noite ─────────────────────────
let lastDay = today();
setInterval(() => {
  const now = Date.now();
  document.querySelectorAll('[data-countdown]').forEach((el) => { el.textContent = mmss(+el.dataset.countdown - now); });
  document.querySelectorAll('[data-clock]').forEach((el) => { el.textContent = new Date().toLocaleTimeString('pt-BR'); }); // v6 memento mori
  if (S.loja) for (const p of S.loja.purchases.filter((p) => p.status === 'using' && p.endsAt <= now)) {
    A.finishItem(p.id); sfx('bell'); toast(`⏰ Acabou: <b>${esc(p.item)}</b>. De volta pra fogueira.`, 'gold');
  }
}, 1000);
setInterval(() => { applyMode(); if (today() !== lastDay) { lastDay = today(); started = false; render(); } }, 60000);
setInterval(() => { try { if (S.quests) checkAvisos(); } catch { /* */ } }, 20000); // v9.2: aviso 10 min antes do que tem horário
setTimeout(() => { try { if (S.quests) checkAvisos(); } catch { /* */ } }, 4000);

window.addEventListener('hashchange', () => { closeModal(); render(); scrollTo(0, 0); sfx('tab'); });
let pendingRender = false;
const typing = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && $main.contains(document.activeElement);
document.addEventListener('focusout', () => setTimeout(() => { if (pendingRender && !typing()) { pendingRender = false; render(); } }, 0));
onChange((why) => {
  if (why === 'status') { if (status.loaded && S.core) document.getElementById('top').innerHTML = header(); else render(); return; }
  if (why === 'remote' && started && typing()) { pendingRender = true; return; }
  render();
});
// lo-fi volta sozinho no primeiro toque, se estava ligado
document.addEventListener('pointerdown', () => { if (prefs.on && !ambienceOn()) { startAmbience(); render(); } }, { once: true });
window.__deaccent = deaccent;
// v8.3: no celular, ao tocar num campo, a tela rola até ele depois que o teclado abre (o teclado cobria o último bloco)
document.addEventListener('focusin', (e) => {
  const el = e.target;
  if (!/INPUT|TEXTAREA/.test(el?.tagName) || innerWidth > 860 || el.closest('.overlay, aside.postit')) return;
  setTimeout(() => { try { const vv = window.visualViewport, r = el.getBoundingClientRect(), h = vv ? vv.height : innerHeight; if (r.bottom > h - 12 || r.top < 60) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { /* */ } }, 380);
});
// v8.8: ↘ virar subtarefa de outro bloco (escolhe na janela do bloco e confirma)
document.addEventListener('change', async (e) => {
  const sel = e.target.closest?.('[data-merge-into]'); if (!sel || !sel.value) return;
  const src = S.quests.blocks.find((b) => b.id === sel.dataset.mergeInto), dst = S.quests.blocks.find((b) => b.id === sel.value);
  if (!src || !dst || !(await ask('Virar subtarefa?', `"${src.title}" vira uma tarefa dentro de "${dst.title}", e as tarefas dele viram passos ↳. Dá pra desfazer no ↩.`, 'VIRAR SUBTAREFA'))) { sel.value = ''; return; }
  closeModal(); const r = A.mergeBlockInto(src.id, dst.id); if (r?.error) { toast(esc(r.error), 'bad'); return; } sfx('ready'); setTimeout(() => jumpBlock(dst.id), 60);
});
// v8.5: setinha bem pequena pra voltar ao topo (aparece depois de rolar)
{ const b = document.createElement('button'); b.id = 'totop'; b.type = 'button'; b.dataset.act = 'to-top'; b.title = 'Voltar ao topo'; b.setAttribute('aria-label', 'Voltar ao topo'); b.textContent = '▲'; document.body.appendChild(b);
  addEventListener('scroll', () => b.classList.toggle('on', scrollY > 600), { passive: true }); }
// v9 (guia de interface, etapa 2): BRASINHAS VERMELHAS NO AR à noite. Só CSS anima; aparecem com o tema escuro (html[data-mode="night"])
if (!document.getElementById('brasas')) {
  const b = document.createElement('div'); b.id = 'brasas'; b.setAttribute('aria-hidden', 'true');
  b.innerHTML = Array.from({ length: 10 }, (_, i) => `<i style="left:${((i * 9.7 + 4) % 96).toFixed(1)}%;animation-delay:${(-i * 1.7).toFixed(1)}s;animation-duration:${12 + (i % 4) * 2}s"></i>`).join('');
  document.body.prepend(b);
}
applyMode();
applyCursor();
init();
