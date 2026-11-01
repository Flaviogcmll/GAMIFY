// APP — liga tudo: abas (como na planilha), dia/noite, cliques, janelas, PRIMO, SOS, arrastar e soltar, sons.
import { S, status, init, onChange, replaceAll, exportAll } from './store.js';

import * as A from './actions.js';
import * as R from './rules.js';
import { esc, today, addDays, weekday, fmtDM, fmtN, uid, DOW, diffDays } from './util.js';

import { openModal, closeModal, ask, toast, modalOpen, segBar } from './ui.js';

import { px } from './icons.js';

import { embers, confetti, floatXp } from './fx.js';
import { sfx, startAmbience, stopAmbience, ambienceOn, prefs, setVol } from './audio.js';

import { viewQuests } from './views/quests.js';

import { viewSurvival } from './views/survival.js';

import { viewAgenda } from './views/agenda.js';

import { viewShop, mmss } from './views/shop.js';

import { viewDomingo, viewConquistas, viewRegras } from './views/extras.js';
import { viewFiltro } from './views/filtro.js';

import { viewRotina } from './views/rotina.js';

import { sceneBanner, mountScenes, extend, viewArquivo3, chapterCard } from './v3.js';

import { afterRender, extend35 } from './v35.js';

import { extend4, afterRender4, captureFocus, checkMilestones, confirmResched } from './v4.js';

import { extendPrimo, openPrimoHub, primoFeedback, primoReact } from './primo.js';

import { extendDrive } from './drive.js';


// abas na mesma ordem da planilha
const ROUTES = [
  ['quests', 'QUESTS', 'quests', viewQuests, 'q'], ['survival', 'SURVIVAL', 'survival', viewSurvival, 's'], ['agenda', 'AGENDA', 'agenda', viewAgenda, 'a'],
  ['shop', 'SHOP', 'shop', viewShop, 'l'], ['domingo', 'REFLEXÃO', 'domingo', viewDomingo, 'b'], ['conquistas', 'CONQUISTAS', 'conquistas', viewConquistas, ''],
  ['filtro', 'FILTRO', 'filtro', viewFiltro, 'f'], ['rotina', 'ROTINA', 'rotina', viewRotina, 'r'], ['regras', 'PERKS AND RULES', 'regras', viewRegras, 'p'],
  ['arquivo', 'ARQUIVO', 'arquivo', viewArquivo3, ''],
];
/** a ordem das abas de cima é sua: arraste uma aba sobre outra */
function tabOrder() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('gamify-ui:tabs')) || []; } catch { /* */ }
  const ids = ROUTES.map((r) => r[0]);
  return [...saved.filter((i) => ids.includes(i)), ...ids.filter((i) => !saved.includes(i))].map((i) => ROUTES.find((r) => r[0] === i));
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
const ui = { ltab: 'taverna', fcat: null, showDone: false, hweek: 0, tlWeek: 0, arqLimit: 80 };
const $main = document.getElementById('main');
let started = false;
const route = () => { const h = location.hash.replace('#', ''); return ROUTES.find((r) => r[0] === h) ? h : 'quests'; };

// ───────────────────────── DIA (papel) / NOITE (fogueira) ─────────────────────────
function modePref() { try { return localStorage.getItem('gamify-ui:mode') || 'auto'; } catch { return 'auto'; } }
function applyMode() {
  const p = modePref(), h = new Date().getHours();
  const m = p === 'auto' ? (h >= 6 && h < 18 ? 'day' : 'night') : p;
  if (document.documentElement.dataset.mode !== m) document.documentElement.dataset.mode = m;
  embers(m === 'night');
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', m === 'night' ? '#0e0c0a' : '#f7f5f0');
}
function setMode(p) { try { localStorage.setItem('gamify-ui:mode', p); } catch { /* */ } applyMode(); render(); }

// ───────────────────────── RENDER ─────────────────────────
function header() {
  const tot = R.totals(S), ch = S.core.chapter || {};
  const using = S.loja.purchases.filter((p) => p.status === 'using');
  const night = document.documentElement.dataset.mode === 'night';
  return `<a class="logo" href="#quests">${px('fire', 20)}<span>GAMIFY<small>${status.mode === 'local' ? '💻 só neste navegador' : status.error ? '⚠ erro ao salvar' : status.saving ? 'salvando…' : '☁ salvo'}</small></span></a>
    <div class="hero"><div class="lv"><span>NV</span><b>${tot.level}</b></div>
      <div class="who"><div class="t">⚔ ${esc(tot.title)}</div>${segBar(tot.pct, 'sm')}<div class="x">${fmtN(tot.into)}/${fmtN(tot.need)} XP · CAP. ${esc(ch.n)} ${esc(ch.title)}</div></div></div>
    <div class="row" style="gap:6px;flex-wrap:nowrap">
      <div class="wallet"><div class="coin"><small>XP</small><b class="acc">${fmtN(tot.balance)}</b></div><div class="coin"><small>GOLD</small><b class="gold">${fmtN(tot.gold)}</b></div><div class="coin" style="min-width:52px"><small>🎟</small><b class="tk">${tot.tickets}</b></div></div>
      <div class="tools">${using.map((p) => `<button class="timer-chip" data-act="goto-bag" title="${esc(p.item)}" data-countdown="${p.endsAt}">${mmss(p.endsAt - Date.now())}</button>`).join('')}
        <button class="btn sm" data-act="undo" data-undo-btn ${A.undoState().undo ? '' : 'disabled'} title="Desfazer (Ctrl+Z)" aria-label="Desfazer">↩</button><button class="btn sm" data-act="redo" data-redo-btn ${A.undoState().redo ? '' : 'hidden'} title="Refazer" aria-label="Refazer">↪</button>
        <button class="btn sm" data-act="mode" title="Dia/noite (N)">${px(night ? 'moon' : 'sun', 12)}</button>
        <button class="btn sm ${ambienceOn() ? 'pri' : ''}" data-act="music" title="Lo-fi da fogueira">${px('music', 12)}</button>
        <button class="btn sm" data-act="focus" title="Fogueira de foco">🔥</button>
        <button class="btn sm" data-act="sos" title="SOS travei">${px('sos', 12)}</button></div></div>`;
}
function render() {
  if (!status.loaded) return;
  const cur = route();
  if (status.empty) { $main.innerHTML = welcome(); return; }
  if (!S.core || !S.quests || !S.marks || !S.loja) { $main.innerHTML = '<div class="empty px" style="padding:60px;text-align:center">carregando…</div>'; return; }
  if (!started) {
    started = true;
    A.startup();
    if (S._autoDue) toast(`📅 ${S._autoDue} tarefa(s) nova(s) do IMEDIATOS/CURTO ganharam prazo sozinhas.`);
    try { if (!localStorage.getItem('gamify-ui:tour')) setTimeout(tour, 600); } catch { /* */ }
  }
  document.getElementById('top').innerHTML = header();
  document.getElementById('tabs').innerHTML = tabOrder().map(([k, n, ic]) => `<a href="#${k}" draggable="true" data-tabk="${k}" class="${k === cur ? 'on' : ''}">${px(ic, 12)}${n}</a>`).join('');
  const bn = (k, n, ic, cls = '') => `<a href="#${k}" class="${cls} ${k === cur ? 'on' : ''}">${px(ic, 18)}${n}</a>`;
  document.getElementById('bottom').innerHTML = bn('quests', 'QUESTS', 'quests') + bn('survival', 'SURVIVAL', 'survival') + bn('shop', 'SHOP', 'shop', 'primo-btn') + bn('agenda', 'AGENDA', 'agenda') + `<a href="#" data-act="more">${px('regras', 18)}MAIS</a>`;
  const banners = [];
  if (status.error) banners.push(`<div class="banner bad">${esc(status.error)}</div>`);
  if (status.stale) banners.push('<div class="banner info">Ainda não consegui confirmar os dados com o servidor. Pode estar desatualizado.</div>');
  if (status.mode === 'local' && !localStorage.getItem('gamify-ui:localok')) setTimeout(() => { try { localStorage.setItem('gamify-ui:localok', '1'); } catch { /* */ } }, 20000);
  if (status.mode === 'local' && !status.error && !localStorage.getItem('gamify-ui:localok')) banners.push(typeof window.claude === 'undefined' ? '<div class="banner info">📱 Modo app: seus dados ficam neste aparelho. Conecte o Google Drive em PERKS AND RULES para sincronizar celular e PC, ou baixe um backup. <button class="btn sm ghost" data-act="local-ok">ENTENDI</button></div>' : '<div class="banner info">Modo local: os dados ficam só neste navegador. Abra pelo link do claude.ai pra sincronizar celular e PC.</div>');
  const y = scrollY, refocus = captureFocus();
  let bodyHtml;
  try { bodyHtml = sceneBanner(cur, ui) + ROUTES.find((r) => r[0] === cur)[3](ui); } catch (err) {
    console.error(err);
    bodyHtml = `<div class="banner bad"><b>Erro ao desenhar esta aba:</b> ${esc(String(err?.message || err))}<br><small>${esc(String(err?.stack || '').split('\n').slice(1, 4).join(' · '))}</small><br>Recarregue com Ctrl+Shift+R. Se continuar, me mande esta mensagem.</div>`;
  }
  $main.innerHTML = banners.join('') + bodyHtml;
  scrollTo(0, y);
  try { mountScenes(); } catch (err) { console.error(err); }
  deaccent(document.body);
  try { afterRender(cur); } catch (err) { console.error(err); }
  try { afterRender4(cur); } catch (err) { console.error(err); }
  refocus();
}
const PX_SEL = 'h1,h2,h3,.btn,.px,.tabs a,.chip,.lv,.coin small,.rar,.band,.seg button,.stat small,label.lbl,.hab .hn,.bottom a,.logo,.item .ip,.k,.timer-chip,.ftab th,.tl th,.rot th,.medal .mn';
const plain = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function deaccent(root) {
  for (const el of root.querySelectorAll(PX_SEL)) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (/[\u00C0-\u017F]/.test(n.nodeValue)) n.nodeValue = plain(n.nodeValue);
  }
}
function welcome() {
  return `<div style="max-width:560px;margin:10vh auto;text-align:center"><h1 class="acc" style="font-size:26px">GAMIFY</h1><p class="muted">Metas, tarefas e hábitos como um jogo de verdade.</p>
    <div class="row" style="justify-content:center;margin-top:20px"><button class="btn pri" data-act="new-game">▶ JOGO NOVO</button><button class="btn" data-act="backup-import">IMPORTAR BACKUP</button></div></div>`;
}

// ───────────────────────── RECOMPENSAS NA TELA ─────────────────────────
A.onFeedback((fb) => {
  if (fb.xp > 0) { floatXp(`+${fmtN(fb.xp)} XP`, fb.at); sfx(fb.task ? 'check' : 'xp'); setTimeout(checkMilestones, 400); }
  if (fb.sent) toast(`✉ Rodada concluída e enviada: <b>${esc(fb.task.text)}</b>. Fica aguardando retorno.`, 'good');
  if (fb.loot) setTimeout(() => { sfx('loot'); toast(`${px('chest', 16)} <b>LOOT!</b> ${esc(fb.loot.label)}${fb.loot.itemId ? ' (foi pra mochila)' : ''}`, 'gold'); }, 350);
  if (fb.closedBlock) { toast(`🏁 BLOCO FECHADO: <b>${esc(fb.closedBlock.title)}</b> · +${fb.closedBlock.xp} XP`, 'good'); confetti(60); }
  if (fb.boss) { toast(`👹 BOSS DERROTADO: <b>${esc(fb.boss.text)}</b> · +${fmtN(fb.boss.xp)} XP · +1 🎟`, 'good'); confetti(); sfx('level'); }
  if (fb.sunday) { toast(`🎁 Baú aberto: <b>+${fb.sunday} XP</b>`, 'good'); sfx('chest'); }
  if (fb.built) sfx('ready');
  if (fb.building) sfx('upgrade');
  if (fb.bought) { sfx('buy'); toast(`🛒 <b>${esc(fb.bought)}</b>${fb.bag ? ' foi pra MOCHILA. Use quando for aproveitar.' : ''}`, 'gold'); }
  if (fb.using) { sfx('xp'); toast(`⏱ <b>${esc(fb.using.item)}</b>: aproveite sem culpa.`, 'gold'); }
  for (const a of fb.achievements || []) { toast(`🏆 CONQUISTA: <b>${esc(a.name)}</b> · +${a.xp} XP`, 'gold'); sfx('chest'); }
  if (fb.msg) toast(esc(fb.msg));
  primoFeedback(fb);
  if (fb.levelUp) levelUp(fb.levelUp);
  if (fb.chapterClosed) chapterCard(fb.chapterClosed);
  render();
});
function levelUp(t) {
  confetti(); sfx('level');
  openModal(`<div class="levelup"><div class="px muted" style="font-size:9px">LEVEL UP!</div><div class="big">${t.level}</div><h2>⚔ ${esc(t.title)}</h2><p class="muted">+1 🎟 ticket. Próximo nível em ${fmtN(t.need - t.into)} XP.</p><div class="actions" style="justify-content:center"><button class="btn pri" data-close autofocus>BORA!</button></div></div>`);
}

// ───────────────────────── JANELAS ─────────────────────────
const MARK_RE = { star: /⭐\s*/g, home: /🛡\s*/g, money: /\s*💰/g, xp: /\s*\(\d+\s*XP\)/gi };
function rebuildText(text, { star, home, money, xp }) {
  let t = text.replace(MARK_RE.star, '').replace(MARK_RE.home, '').replace(MARK_RE.xp, '').trim();
  const hadMoney = /💰/.test(t);
  if (!money) t = t.replace(MARK_RE.money, '').trim();
  const pre = (t.match(/^(⚔|↳)\s*/) || [''])[0];
  t = pre + (star ? '⭐ ' : '') + (home ? '🛡 ' : '') + t.slice(pre.length);
  if (money && !hadMoney) t += ' 💰';
  if (xp) t += ` (${xp}XP)`;
  return t.trim();
}
function whereOptions(t) {
  const lists = Object.entries(R.AREAS).map(([k, n]) => `<option value="area:${k}" ${!t.block && t.area === k ? 'selected' : ''}>${n}</option>`).join('');
  const groups = Object.entries(R.GROUPS).map(([g, info]) => { const bl = S.quests.blocks.filter((b) => b.group === g).sort((a, b) => a.ord - b.ord); return bl.length ? `<optgroup label="${info.name}">${bl.map((b) => `<option value="block:${b.id}" ${t.block === b.id ? 'selected' : ''}>${esc(b.title)}</option>`).join('')}</optgroup>` : ''; }).join('');
  return `<optgroup label="LISTAS">${lists}</optgroup>${groups}`;
}
const COLORS = [['', 'sem cor'], ['red', '🟥 urgente'], ['yellow', '🟨 andamento'], ['green', '🟩 pessoal'], ['orange', '🟧 gestão'], ['black', '⬛ parado']];
function editTask(id) {
  const t = S.quests.tasks.find((x) => x.id === id);
  if (!t) return;
  const p = R.parse(t.text), now = R.taskXp(S, t), td = today();
  const nextMon = addDays(td, ((8 - weekday(td)) % 7) || 7);
  const sts = [['', '○ ABERTA'], ['doing', '▶ FAZENDO'], ['wait', '… AGUARDANDO'], ['done', '✓ FEITA'], ['cancel', '✕ CANCELADA']];
  const suggestCycle = t.cycle === undefined && /PREFEITURA|APROVA|AN[AÁ]LISE|PROTOCOLO/i.test(t.text);
  openModal(`<form data-form="task" data-id="${id}" autocomplete="off">
    <h2>${p.mini ? '⚔ mini-boss' : p.step ? '↳ passo' : 'tarefa'}</h2>
    <p class="meta" style="margin:0">${t.block ? esc(R.findBlock(S, t.block)?.title || '') : R.AREAS[t.area]} · ${t.st === 'done' ? `feita ${fmtDM(t.doneAt)} · +${t.xp} XP` : `vale <b class="acc">${now.xp} XP</b>${now.parts.length ? ' (' + esc(now.parts.join(' · ')) + ')' : ''}`}${(t.rounds || []).length ? ` · 🔁 ${t.rounds.length} rodada(s)` : ''}</p>
    <label class="lbl" for="t-text">Texto</label><textarea class="inp" id="t-text" name="text" rows="2" autofocus>${esc(t.text.replace(MARK_RE.star, '').replace(MARK_RE.home, '').replace(MARK_RE.xp, '').trim())}</textarea>
    <label class="lbl">Status</label><div class="statusbtns">${sts.map(([k, n]) => `<button type="button" class="btn sm ${(t.st || '') === k ? 'on' : ''}" data-act="set-status" data-id="${id}" data-st="${k}">${n}</button>`).join('')}</div>
    <label class="lbl" for="t-due">Prazo</label><div class="row"><input class="inp" type="date" id="t-due" name="due" value="${t.due || ''}" style="width:auto">
      ${[['HOJE', td], ['AMANHÃ', addDays(td, 1)], ['+3', addDays(td, 3)], ['PRÓX. SEG', nextMon], ['SEM', '']].map(([n, d]) => `<button type="button" class="btn sm ghost" data-act="due-quick" data-d="${d}">${n}</button>`).join('')}</div>
    ${t.due ? `<p class="meta" style="margin:4px 0 0">${t.due < td ? `⏰ Atrasada: concluir agora paga só ${Math.round(Math.max(R.C.LATE_MIN, 1 - R.C.LATE_DAY * diffDays(t.due, td)) * 100)}% do XP. ` : ''}Empurrar o prazo custa <b>${A.reschedBase({ ...t, due: '0' }, '9')}</b> XP${A.freeResched() ? ' (mas a 1ª remarcação da semana é grátis)' : ''}${t.rs ? ` · já remarcada ${t.rs}x` : ''}; antecipar é de graça.</p>` : ''}
    <label class="lbl">Marcadores</label><div class="row" style="gap:14px;font-size:12.5px">
      <label><input type="checkbox" name="star" ${p.star ? 'checked' : ''}> ⭐ chata x2</label><label><input type="checkbox" name="home" ${p.home ? 'checked' : ''}> 🛡 casa/família</label>
      <label><input type="checkbox" name="money" ${p.money ? 'checked' : ''}> 💰 dinheiro</label><label><input type="checkbox" name="prio" ${t.prio ? 'checked' : ''}> ! prioridade</label>
      <label title="Prefeitura, aprovação, cliente revisando"><input type="checkbox" name="cycle" ${t.cycle || suggestCycle ? 'checked' : ''}> 🔁 vai e volta${suggestCycle ? ' <span class="warn">(sugerido)</span>' : ''}</label>
      <span class="xpset">XP ${[['', 'AUTO'], [5, '5'], [10, '10'], [30, '30'], [60, '60'], [100, '100']].map(([v, n]) => `<button type="button" class="btn sm ghost ${String(p.xpFix ?? '') === String(v) ? 'on' : ''}" data-act="xp-preset" data-v="${v}">${n}</button>`).join('')}<input class="inp" type="number" min="1" name="xp" value="${p.xpFix ?? ''}" placeholder="auto" aria-label="XP fixo" style="width:70px;min-height:28px;display:inline-block"></span></div>
    <div class="row"><div class="grow"><label class="lbl" for="t-where">Onde</label><select class="inp" id="t-where" name="where">${whereOptions(t)}</select></div>
      <div><label class="lbl" for="t-color">Cor</label><select class="inp" id="t-color" name="color">${COLORS.map(([k, n]) => `<option value="${k}" ${(t.color || '') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      ${t.block ? `<div><label class="lbl" for="t-pin">↗ Também em</label><select class="inp" id="t-pin" name="pin"><option value="">—</option>${Object.entries(R.AREAS).map(([k, n]) => `<option value="${k}" ${t.pin === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>` : ''}</div>
    <div class="actions"><div class="left"><button type="button" class="btn sm" data-act="move-task" data-id="${id}" data-dir="-1">↑</button><button type="button" class="btn sm" data-act="move-task" data-id="${id}" data-dir="1">↓</button>
      ${t.block && !p.step ? `<button type="button" class="btn sm" data-act="add-step" data-id="${id}">+ ↳ PASSO</button>` : ''}<button type="button" class="btn sm" data-act="sos" data-id="${id}">${px('sos', 10)} TRAVEI</button>${t.link ? `<button type="button" class="btn sm" data-act="unlink" data-id="${id}">↯ DESVINCULAR</button>` : ''}<button type="button" class="btn sm danger" data-act="del-task" data-id="${id}">APAGAR</button></div>
      <button type="button" class="btn" data-close>FECHAR</button><button class="btn pri">SALVAR</button></div></form>`, { wide: true });
}
function editBlock(id) {
  const b = S.quests.blocks.find((x) => x.id === id);
  if (!b) return;
  openModal(`<form data-form="block" data-id="${id}" autocomplete="off"><h2>bloco</h2><p class="meta" style="margin:0">Fechar vale <b class="acc">${R.blockXp(b)} XP</b>${R.projectValue(b.title) ? ` · projeto de ${fmtN(R.projectValue(b.title))}: sua metade ${fmtN(R.projectValue(b.title) / 2)} gold` : ''}</p>
    <label class="lbl" for="b-title">Título (🎯 meta · 3000💰 · 1900💰 / MES (DIA 05) · (500XP))</label><input class="inp" id="b-title" name="title" value="${esc(b.title)}" autofocus>
    <label class="lbl">Cor</label><div class="row" style="font-size:12.5px">${COLORS.slice(1).map(([k, n]) => `<label><input type="radio" name="color" value="${k}" ${b.color === k ? 'checked' : ''}> ${n}</label>`).join('')}</div>
    <div class="row"><div class="grow"><label class="lbl" for="b-due">◆ Prazo final</label><input class="inp" type="date" id="b-due" name="due" value="${b.due || ''}"></div>
      <div class="grow"><label class="lbl" for="b-group">Área</label><select class="inp" id="b-group" name="group">${Object.entries(R.GROUPS).map(([g, i]) => `<option value="${g}" ${b.group === g ? 'selected' : ''}>${i.name}</option>`).join('')}</select></div>
      <div class="grow"><label class="lbl" for="b-st">Situação</label><select class="inp" id="b-st" name="st"><option value="">ATIVO</option><option value="wait" ${b.st === 'wait' ? 'selected' : ''}>… SÓ AGUARDANDO</option>${b.st === 'done' ? '<option value="done" selected>FECHADO</option>' : ''}</select></div></div>
    <div class="actions"><div class="left"><button type="button" class="btn sm" data-act="move-block" data-id="${id}" data-dir="-1">↑</button><button type="button" class="btn sm" data-act="move-block" data-id="${id}" data-dir="1">↓</button><button type="button" class="btn sm danger" data-act="del-block" data-id="${id}">APAGAR BLOCO</button></div>
      <button type="button" class="btn" data-close>FECHAR</button><button class="btn pri">SALVAR</button></div></form>`);
}
function distribute() {
  let resched = true;
  const draw = () => {
    const plan = R.distributePlan(S, { reschedule: resched });
    const m = document.querySelector('.modal');
    const moved = plan.filter((p) => p.from).length, cost = A.planCost(plan);
    m.innerHTML = `<h2>📅 distribuir prazos</h2><p class="meta" style="margin:0">Dá data a tudo do IMEDIATOS/CURTO (⭐ primeiro) e à próxima ação de cada bloco. Máx. ${S.core.settings?.maxPerDay || R.C.MAX_PER_DAY} por dia útil; pula fim de semana e feriado.</p>
      <label style="display:block;margin:10px 0;font-size:12.5px"><input type="checkbox" id="dist-resched" ${resched ? 'checked' : ''}> remarcar também as atrasadas</label>
      <p><b>${plan.length - moved}</b> ganham data nova · <b>${moved}</b> remarcadas${cost ? ` · <b class="${cost > R.totals(S).balance ? 'bad' : 'acc'}">custo ${cost} XP</b> <span class="meta">(saldo ${fmtN(R.totals(S).balance)})</span>` : ''}</p>
      <div class="list" style="max-height:48vh;overflow:auto">${plan.map((p) => `<div class="li"><div class="lt">${esc(p.text)}<small>${esc(p.why)}</small></div><span class="chip ${p.from ? 'today' : 'soon'}">${p.from ? fmtDM(p.from) + ' → ' : ''}${DOW[weekday(p.to)]} ${fmtDM(p.to)}</span></div>`).join('') || '<div class="empty">tudo já tem prazo. 👏</div>'}</div>
      <div class="actions"><button class="btn" data-close>CANCELAR</button>${plan.length ? `<button class="btn pri" id="dist-apply" ${cost > R.totals(S).balance ? 'disabled' : ''}>APLICAR ${plan.length}${cost ? ` · −${cost} XP` : ''}</button>` : ''}</div>`;
    m.querySelector('#dist-resched').onchange = (e) => { resched = e.target.checked; draw(); };
    const ap = m.querySelector('#dist-apply');
    if (ap) ap.onclick = () => { const r = A.applyPlan(plan); if (r?.error) { toast(esc(r.error), 'bad'); return; } closeModal(); toast(`📅 ${plan.length} prazo(s) aplicados. <button class="btn sm" data-act="undo-plan">↺ DESFAZER</button>`, 'good'); };
  };
  openModal('', { wide: true });
  draw();
}
function editRitual(id) {
  const r = id ? S.core.rituals.find((x) => x.id === id) : { type: 'pessoa', name: '', every: 7, last: today() };
  openModal(`<form data-form="ritual" data-id="${id || ''}" autocomplete="off"><h2>${id ? 'ritual' : 'novo ritual'}</h2>
    <div class="row"><div style="width:150px"><label class="lbl" for="r-type">Tipo</label><select class="inp" id="r-type" name="type"><option value="pessoa" ${r.type === 'pessoa' ? 'selected' : ''}>👥 PESSOA</option><option value="rotina" ${r.type === 'rotina' ? 'selected' : ''}>🔁 ROTINA</option><option value="trabalho" ${r.type === 'trabalho' ? 'selected' : ''}>💼 TRABALHO</option></select></div>
      <div class="grow"><label class="lbl" for="r-name">O quê / quem</label><input class="inp" id="r-name" name="name" value="${esc(r.name)}" required autofocus></div></div>
    <div class="row"><div><label class="lbl" for="r-mode">Repete</label><select class="inp" id="r-mode" name="mode"><option value="every" ${!r.dom ? 'selected' : ''}>A CADA N DIAS</option><option value="dom" ${r.dom ? 'selected' : ''}>TODO MÊS NO DIA</option></select></div>
      <div style="width:96px"><label class="lbl" for="r-every">N dias</label><input class="inp" id="r-every" name="every" type="number" min="1" value="${r.every || 7}"></div>
      <div style="width:96px"><label class="lbl" for="r-dom">Dia</label><input class="inp" id="r-dom" name="dom" type="number" min="1" max="28" value="${r.dom || 5}"></div>
      <div class="grow"><label class="lbl" for="r-last">Última vez</label><input class="inp" id="r-last" name="last" type="date" value="${r.last || ''}"></div></div>
    <label class="lbl" for="r-notes">Notas</label><input class="inp" id="r-notes" name="notes" value="${esc(r.notes || '')}">
    <div class="actions">${id ? `<div class="left"><button type="button" class="btn sm danger" data-act="del-ritual" data-id="${id}">APAGAR</button></div>` : ''}<button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">SALVAR</button></div></form>`);
}
function editItem(kind, id, cat) {
  const it = id ? S.loja[kind].find((x) => x.id === id) : { name: '', xp: 100, nv: 1, cat: cat || S.loja.cats[0] || 'EU' };
  const m = R.itemMeta(it);
  openModal(`<form data-form="item" data-kind="${kind}" data-id="${id || ''}" autocomplete="off"><h2>${kind === 'taverna' ? 'recompensa da taverna' : 'item do ferreiro'}</h2>
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
  const b = S.quests.bosses.find((x) => x.id === id);
  if (!b) return;
  const linked = R.bossBlock(S, b);
  openModal(`<form data-form="boss" data-id="${id}" autocomplete="off"><h2>👹 boss</h2>
    <label class="lbl" for="bo-text">Meta</label><input class="inp" id="bo-text" name="text" value="${esc(b.text)}" autofocus>
    <div class="row"><div style="width:130px"><label class="lbl" for="bo-xp">XP</label><input class="inp" id="bo-xp" name="xp" type="number" min="1" value="${b.xp}"></div>
      <div class="grow"><label class="lbl" for="bo-block">Vida (HP) vem do bloco 🎯</label><select class="inp" id="bo-block" name="block"><option value="">${linked && !b.block ? 'automático: ' + esc(linked.title) : '— nenhum —'}</option>${S.quests.blocks.filter((x) => x.group === 'bd' || x.group === 'bs').map((x) => `<option value="${x.id}" ${b.block === x.id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></div>
      <div><label class="lbl" for="bo-st">Situação</label><select class="inp" id="bo-st" name="st"><option value="">EM ABERTO</option><option value="wait" ${b.st === 'wait' ? 'selected' : ''}>… AGUARDANDO</option>${b.st === 'done' ? '<option value="done" selected>DERROTADO</option>' : ''}</select></div></div>
    <div class="actions"><div class="left"><button type="button" class="btn sm danger" data-act="del-boss" data-id="${id}">APAGAR</button></div><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">SALVAR</button></div></form>`);
}
function redemption() {
  const td = today(), done = S.marks.days[td]?.h?.rd === 'x';
  const opts = ['VER UMA AULA DO RD', '30 MIN DE MEDITAÇÃO', '1H DE CAMINHADA SEM CELULAR', 'BANHO GELADO + 5 SUSPIROS', 'LEITURA FÍSICA 1H'];
  openModal(`<h2>⚔ missão de redenção</h2><p class="muted">+30 XP e cura ☠ envenenado e 🌫 neblina. Escolha a sua:</p>
    <div class="list">${opts.map((o) => `<button class="li" style="width:100%;text-align:left;border:0;background:none;cursor:pointer" data-act="rd-do" data-o="${esc(o)}"><span class="lt">⚔ ${esc(o)}</span><span class="chip xp">+30</span></button>`).join('')}</div>
    <div class="actions">${done ? '<button class="btn danger" data-act="rd-undo">DESFAZER A DE HOJE</button>' : ''}<button class="btn" data-close>FECHAR</button></div>`);
}
function tour(step = 0) {
  const steps = [
    ['bem-vindo ao gamify v2.', 'Igual à planilha, com as mesmas abas: QUESTS é a casa e o painel. De dia ele é papel; à noite vira acampamento com fogueira. O ♪ liga o lo-fi.'],
    ['quests.', 'Listas e BOSS em cima; BREAKDOWN, TRABALHO e CAPTAÇÕES embaixo. Toque no quadradinho pra concluir, no texto pra editar (prazo, cor, ! prioridade, 🔁 vai e volta). No PC dá pra arrastar tarefas.'],
    ['o primo.', 'O PRIMO é o centro do jogo: ele reage ao que você faz, pede uma missão por dia, sai em expedição, tem armário e um mascote que cresce. Toque no botão PRIMO pra falar com ele.'],
    ['shop.', 'Compre ANTES de aproveitar: vai pra MOCHILA; na hora, USAR liga o cronômetro. Fez sem comprar? Paga x2. Gold é a sua metade: o app pergunta quando entra.'],
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
      <div class="list">${(t ? [t] : smallest).map((x) => `<button class="li" style="width:100%;text-align:left;border:0;background:none;cursor:pointer" data-act="sos-pick" data-id="${x.id}"><span class="lt">${esc(x.text)}<small>${esc(x.block ? R.findBlock(S, x.block)?.title : R.AREAS[x.area])}</small></span><span class="chip">10 MIN</span></button>`).join('')}</div>
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
function jump(id) {
  const t = S.quests.tasks.find((x) => x.id === id);
  if (!t) return;
  if (!R.isOpen(t) || (t.block && R.findBlock(S, t.block)?.color === 'black')) ui.showDone = true;
  closeModal();
  ui.qtab = t.block ? (R.findBlock(S, t.block)?.group === 'bs' ? 'boss' : R.findBlock(S, t.block)?.group || 'listas') : 'listas';
  if (route() !== 'quests') location.hash = '#quests'; else render();
  setTimeout(() => { const el = document.querySelector(`.board li.task[data-id="${id}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); } }, 80);
}
const ACTIONS = {
  toggle: (d, e) => { const r = A.toggleDone(d.id, at(e)); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); } },
  'to-breakdown': (d) => { const r = A.toBreakdown(d.id); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); } else sfx('upgrade'); },
  unlink: (d) => { A.unlinkTask(d.id); closeModal(); },
  'edit-task': (d) => editTask(d.id),
  'set-status': (d) => { A.setStatus(d.id, d.st); closeModal(); },
  'due-quick': (d, e, el) => { el.closest('form').due.value = d.d; },
  'move-task': (d) => A.moveTask(d.id, +d.dir),
  'add-step': (d) => { const t = S.quests.tasks.find((x) => x.id === d.id); closeModal(); stepPrompt(t); },
  'del-task': async (d) => { closeModal(); if (await ask('Apagar tarefa?', 'Ela some de vez (e os passos ↳ dela também).', 'APAGAR', true)) A.deleteTask(d.id); },
  'cycle-back': (d) => A.cycleBack(d.id),
  'cycle-ok': (d) => { A.cycleApprove(d.id); sfx('level'); confetti(50); },
  prio: (d) => { const t = S.quests.tasks.find((x) => x.id === d.id); A.updateTask(d.id, { prio: !t.prio }); },
  sort: (d) => { A.sortContainer({ area: d.area, block: d.block }); sfx('tab'); },
  jump: (d) => jump(d.id),
  'jump-block': (d) => { const b = S.quests.blocks.find((x) => x.id === d.id); if (!b) return; ui.qtab = b.group === 'bs' ? 'boss' : b.group; closeModal(); if (route() !== 'quests') location.hash = '#quests'; else render(); setTimeout(() => { const el = document.querySelector(`[data-drop-block="${d.id}"]`); el?.scrollIntoView({ block: 'center' }); el?.classList.add('flash'); }, 80); },
  'goto-agenda': () => { location.hash = '#agenda'; },
  'edit-block': (d) => editBlock(d.id),
  'move-block': (d) => A.moveBlock(d.id, +d.dir),
  'del-block': async (d) => { closeModal(); if (await ask('Apagar bloco inteiro?', 'O bloco e todas as subtarefas somem de vez.', 'APAGAR', true)) A.deleteBlock(d.id); },
  'boss-toggle': (d, e) => A.toggleBoss(d.id, at(e)),
  'edit-boss': (d) => editBoss(d.id),
  'del-boss': async (d) => { closeModal(); if (await ask('Apagar boss?', 'Essa meta some da lista.', 'APAGAR', true)) A.deleteBoss(d.id); },
  habit: (d, e) => { A.cycleHabit(d.d, d.h, at(e)); sfx('habit'); if (Math.random() < 0.3) primoReact('habito_feito'); },
  redemption: () => redemption(),
  'rd-do': (d) => { closeModal(); if (S.marks.days[today()]?.h?.rd !== 'x') { A.setHabit(today(), 'rd', 'x'); toast(`⚔ Redenção: ${esc(d.o)}. +30 XP e debuffs curados.`, 'good'); } else toast('A redenção de hoje já foi feita.'); },
  'rd-undo': () => { closeModal(); A.setHabit(today(), 'rd', ''); },
  'rest-day': async () => { if (await ask('Dia de descanso?', 'Viagem ou doença: todos os hábitos de hoje viram folga (–), sem punição.', 'DESCANSAR')) A.restDay(today()); },
  hweek: (d) => { ui.hweek = Math.min(0, (ui.hweek || 0) + +d.dir); render(); },
  'tl-week': (d) => { ui.tlWeek = +d.dir === 0 ? 0 : (ui.tlWeek || 0) + +d.dir; render(); },
  'ag-filter': (d) => { ui.agB = d.b; render(); },
  'ritual-done': (d, e) => { A.ritualDone(d.id, at(e)); },
  'ritual-undo': (d) => A.ritualUndo(d.id),
  'edit-ritual': (d) => editRitual(d.id),
  'del-ritual': async (d) => { closeModal(); if (await ask('Apagar ritual?', 'O histórico de XP continua valendo.', 'APAGAR', true)) A.deleteRitual(d.id); },
  'edit-habits': () => editHabits(),
  'hab-row-add': (d, e, el) => { el.closest('form').querySelector('#hab-rows').insertAdjacentHTML('beforeend', '<div class="row hrow" style="margin-bottom:6px" data-id=""><input class="inp" name="icon" value="⭐" style="width:60px;text-align:center" aria-label="Ícone"><input class="inp grow" name="name" placeholder="NOVO HÁBITO" aria-label="Nome"><button type="button" class="icon-btn" data-act="hab-row-del" aria-label="Remover">×</button></div>'); },
  'hab-row-del': (d, e, el) => el.closest('.hrow').remove(),
  ltab: (d) => { ui.ltab = d.tab; render(); sfx('tab'); },
  fcat: (d) => { ui.fcat = d.cat; render(); },
  fsort: (d) => { const f = ui.filtro; if (f.sort === d.k) f.dir *= -1; else { f.sort = d.k; f.dir = 1; } render(); },
  'toggle-done': () => { ui.showDone = !ui.showDone; render(); },
  'arq-more': () => { ui.arqLimit += 100; render(); },
  'archive-now': async () => { if (await ask('Atualizar o quadro?', 'Arquiva agora tudo que está ✓ ou ✕ (e blocos fechados). O XP continua valendo.', 'ATUALIZAR')) A.archiveNow(); },
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
  'buy-ticket': (d, e) => { const r = A.buyTaverna(d.id, true, at(e)); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); } },
  confess: async (d) => { const it = S.loja.taverna.find((x) => x.id === d.id); if (await ask('Fiz sem comprar…', `${it.name} sai por ${R.tavernaPrice(S, it) * 2} XP (x2). Da próxima vez, compre antes.`, 'PAGAR A DÍVIDA', true)) A.confessItem(d.id); },
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
  'gold-edit': (d) => { const p = goldByKey(d.key); if (p) openModal(`<form data-form="gold-edit" data-key="${esc(p.key)}"><h2>💰 ${esc(p.title)}</h2><label class="lbl" for="ge-v">Quanto entrou (sua parte)</label><input class="inp" id="ge-v" name="v" type="number" min="1" value="${p.amount}" autofocus><div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">GUARDAR</button></div></form>`); },
  'gold-later': (d) => { const p = goldByKey(d.key); if (p) A.snoozeGold(p); },
  'gold-never': (d) => { const p = goldByKey(d.key); if (p) A.snoozeGold(p, true); },
  'del-commit': (d) => A.deleteCommitment(d.id),
  'rot-plan': (d) => { ui.rplan = +d.i; render(); },
  'rot-active': (d) => A.setRoutinePlan(+d.i),
  'rot-cell': (d) => {
    const r = S.core.routine, pi = Math.min(ui.rplan ?? r.active ?? 0, r.plans.length - 1), v = r.plans[pi].grid[d.key] || '';
    const sugg = [...new Set([...(r.atividades || []), ...Object.values(r.plans[pi].grid)])].sort();
    openModal(`<form data-form="rot-cell" data-key="${d.key}" data-p="${pi}"><h2>${d.key.replace('|', ' · ')}H</h2><input class="inp" name="v" value="${esc(v)}" list="rot-sugg" autofocus><datalist id="rot-sugg">${sugg.map((s) => `<option value="${esc(s)}">`).join('')}</datalist><div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">SALVAR</button></div></form>`);
  },
  'routine-new': () => A.initRoutine(),
  'ai-breakdown': () => aiBreakdown(),
  'primo-hub': () => openPrimoHub(),
  sos: (d) => { sos(d.id); },
  'sos-pick': (d) => { const t = S.quests.tasks.find((x) => x.id === d.id); A.setStatus(d.id, 'doing'); sosTimerFor(t.text, d.id); },
  music: () => { if (ambienceOn()) stopAmbience(); else startAmbience(); render(); },
  'local-ok': () => { try { localStorage.setItem('gamify-ui:localok', '1'); } catch { /* */ } render(); },
  mode: () => { const cur = document.documentElement.dataset.mode; setMode(cur === 'night' ? 'day' : 'night'); sfx('tab'); },
  tour: (d) => tour(+d.s || 0),
  more: () => openModal(`<h2>mais</h2><div class="list"><a class="li" href="#" data-act="primo-hub" data-close style="text-decoration:none;color:var(--ink)"><span class="lt">${px('fire', 16)} PRIMO</span><span class="dim">→</span></a>${ROUTES.filter((r) => !['quests', 'survival', 'shop', 'agenda'].includes(r[0])).map(([k, n, ic]) => `<a class="li" href="#${k}" data-close style="text-decoration:none;color:var(--ink)"><span class="lt">${px(ic, 16)} ${n}</span><span class="dim">→</span></a>`).join('')}</div>`),
  'backup-copy': async () => {
    const json = JSON.stringify(exportAll());
    try { await navigator.clipboard.writeText(json); toast('Backup copiado. Cole num e-mail ou nota.', 'good'); }
    catch { openModal(`<h2>backup</h2><textarea class="inp" rows="10" readonly>${esc(json)}</textarea><div class="actions"><button class="btn pri" data-close>FECHAR</button></div>`); }
  },
  'backup-import': () => openModal(`<form data-form="import"><h2>importar backup</h2><p class="muted">Cole o texto do backup. Isso SUBSTITUI os dados atuais.</p><textarea class="inp" name="json" rows="10" required></textarea><div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">IMPORTAR</button></div></form>`),
  'new-game': () => { replaceAll(A.newGameDocs()); render(); },
};
extend(ACTIONS, () => render());
extend35(ACTIONS, () => render());
extend4(ACTIONS, () => render());
extendPrimo(ACTIONS);
extendDrive(ACTIONS, () => render());
window.__ui = ui;
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
  'add-task': (f) => {
    const text = f.text.value.trim();
    if (!text) return;
    if (f.dataset.block) A.addTask({ text, block: f.dataset.block }); else A.addTask({ text, area: f.dataset.area });
    sfx('tab');
    requestAnimationFrame(() => document.querySelector(`form[data-form="add-task"][data-${f.dataset.block ? 'block' : 'area'}="${f.dataset.block || f.dataset.area}"] input`)?.focus());
  },
  'add-block': (f) => A.addBlock(f.dataset.group, f.title.value),
  'add-boss': (f) => { const v = f.text.value; const m = /([\d.]+)\s*XP/i.exec(v); A.addBoss(v, m ? +m[1].replace(/\./g, '') : 500); },
  task: async (f) => {
    const t = S.quests.tasks.find((x) => x.id === f.dataset.id);
    const text = rebuildText(f.text.value, { star: f.star.checked, home: f.home.checked, money: f.money.checked, xp: +f.xp.value || null });
    const [kind, val] = f.where.value.split(':');
    const patch = { text, due: f.due.value || null, color: f.color.value || undefined, prio: f.prio.checked || undefined, cycle: f.cycle.checked };
    if (f.pin) patch.pin = f.pin.value || undefined;
    if (f.where.value !== (t.block ? `block:${t.block}` : `area:${t.area}`)) { if (kind === 'block') patch.block = val; else { patch.block = null; patch.area = val; } }
    if (!(await confirmResched(t, patch.due))) return;
    const cost = A.reschedCost(t, patch.due || null), r = A.updateTask(t.id, patch);
    if (r?.error) { toast(esc(r.error), 'bad'); return; }
    if (cost) primoReact('remarcou', { xp: cost });
    closeModal();
  },
  block: (f) => {
    const b = S.quests.blocks.find((x) => x.id === f.dataset.id);
    const patch = { title: f.title.value.trim() || b.title, color: f.querySelector('[name=color]:checked')?.value || b.color, due: f.due.value || null, group: f.group.value };
    if (f.st.value !== 'done') patch.st = f.st.value;
    A.updateBlock(b.id, patch);
    closeModal();
  },
  boss: (f) => { const patch = { text: f.text.value.trim(), xp: +f.xp.value || 200, block: f.block.value || undefined }; if (f.st.value !== 'done') patch.st = f.st.value; A.updateBoss(f.dataset.id, patch); closeModal(); },
  ritual: (f) => { A.saveRitual({ id: f.dataset.id, type: f.type.value, name: f.name.value, mode: f.mode.value, every: f.every.value, dom: f.dom.value, last: f.last.value, notes: f.notes.value }); closeModal(); },
  item: (f) => {
    const k = f.dataset.kind;
    A.saveShopItem(k, k === 'taverna' ? { id: f.dataset.id, name: f.name.value, xp: f.xp.value, icon: f.icon.value, min: f.min.value } : { id: f.dataset.id, name: f.name.value, cat: f.cat.value.trim().toUpperCase() || 'EU', nv: f.nv.value, repeat: f.repeat.checked, icon: f.icon.value });
    closeModal();
  },
  forge: (f) => { const r = A.buyFerreiro(f.dataset.id, f.gold.value); closeModal(); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); } },
  gold: (f) => { A.addGold({ date: f.date.value, from: f.from.value, amount: f.amount.value }); sfx('coin'); },
  'gold-edit': (f) => { const p = goldByKey(f.dataset.key); if (p) A.confirmGold(p, +f.v.value); closeModal(); sfx('coin'); },
  commit: (f) => A.addCommitment({ text: f.text.value, date: f.date.value, start: f.start.value, end: f.end.value, type: f.type.value }),
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
    if (status.empty || await ask('Substituir tudo?', 'Os dados atuais serão trocados pelos do backup.', 'SUBSTITUIR', true)) { replaceAll(docs); render(); toast('Backup importado', 'good'); }
  },
};
document.addEventListener('submit', (e) => { const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault(); FORMS[f.dataset.form]?.(f); });
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const k = el.dataset.k, c = el.dataset.change;
  if (c === 'setting') A.setSetting(k, +el.value);
  if (c === 'milestones') A.updateMilestones(el.value.split(',').map((s) => s.trim().toUpperCase()));
  if (c === 'mode') setMode(el.value);
  if (c === 'vol') setVol(k, +el.value);
  if (c === 'filtro') { ui.filtro[k] = el.value; render(); }
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
  const zone = e.target.closest('[data-drop-area],[data-drop-block]');
  if (!zone) return;
  e.preventDefault();
  document.querySelectorAll('.drag-over').forEach((x) => x.classList.remove('drag-over'));
  (e.target.closest('li.task') || zone).classList.add('drag-over');
});
document.addEventListener('drop', (e) => {
  if (!dragId) return;
  const zone = e.target.closest('[data-drop-area],[data-drop-block]');
  if (!zone) return;
  e.preventDefault();
  const before = e.target.closest('li.task')?.dataset.id;
  A.dropTask(dragId, { area: zone.dataset.dropArea, block: zone.dataset.dropBlock, before: before !== dragId ? before : undefined });
  sfx('tab');
});

// ───────────────────────── ATALHOS ─────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (modalOpen()) closeModal(); return; }
  if (modalOpen() || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
  const r = ROUTES.find((x) => x[4] && x[4] === e.key.toLowerCase());
  if (r) { location.hash = '#' + r[0]; return; }
  if (e.key === ' ') { e.preventDefault(); openPrimoHub(); }
  if (e.key === 'n') ACTIONS.mode();
  if (e.key === '/') { e.preventDefault(); location.hash = '#quests'; setTimeout(() => document.querySelector('form[data-area="imed"] input')?.focus(), 60); }
});

// ───────────────────────── RELÓGIO: cronômetros, virada do dia, dia/noite ─────────────────────────
let lastDay = today();
setInterval(() => {
  const now = Date.now();
  document.querySelectorAll('[data-countdown]').forEach((el) => { el.textContent = mmss(+el.dataset.countdown - now); });
  if (S.loja) for (const p of S.loja.purchases.filter((p) => p.status === 'using' && p.endsAt <= now)) {
    A.finishItem(p.id); sfx('bell'); toast(`⏰ Acabou: <b>${esc(p.item)}</b>. De volta pra fogueira.`, 'gold');
  }
}, 1000);
setInterval(() => { applyMode(); if (today() !== lastDay) { lastDay = today(); started = false; render(); } }, 60000);

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
applyMode();
init();
