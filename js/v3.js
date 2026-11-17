// v3 — companheiro, cenários por aba, fogueira de foco, arrastar com dedo/mouse, recolher e arquivo com filtro.
import { historyCard, dropTaskSmart } from './v4.js';

import { S } from './store.js';

import * as A from './actions.js';
import * as R from './rules.js';
import { esc, today, fmtDM, fmtN, addDays } from './util.js';

import { openModal, closeModal, toast, ask } from './ui.js';
import { mountInterior, interiorOf } from './interiors.js';

import { primoCard, mountPortraits, primoReact } from './primo.js';

import { sfx, startAmbience, ambienceOn } from './audio.js';

import { confetti } from './fx.js';


// ───────────── recolher (fica salvo neste aparelho) ─────────────
const CK = 'gamify-ui:collapsed';
let collapsed = new Set((() => { try { return JSON.parse(localStorage.getItem(CK)) || []; } catch { return []; } })());
export const isCollapsed = (k) => collapsed.has(k);
export function toggleCollapse(k) { collapsed.has(k) ? collapsed.delete(k) : collapsed.add(k); try { localStorage.setItem(CK, JSON.stringify([...collapsed])); } catch { /* */ } }

// ───────────── cenário no topo de cada aba ─────────────
const TITLES = {
  survival: ['survival.', 'campo de treino · hábitos e rituais'], agenda: ['agenda.', 'a mesa do mapa · prazos e rituais'], shop: ['taverna.', 'compre antes de aproveitar'],
  ferreiro: ['ferreiro.', 'upgrades permanentes · XP + gold'], domingo: ['reflexão.', 'o baú da semana · peso · notas'], conquistas: ['conquistas.', 'salão dos troféus'],
  filtro: ['filtro.', 'tudo em aberto, numa tabela'], rotina: ['rotina.', 'a torre do relógio · semana-tipo'], regras: ['perks and rules.', 'o livro de regras'], arquivo: ['arquivo.', 'a biblioteca do que já foi'],
};
export function sceneBanner(route, ui) {
  if (route === 'quests') return '';
  const key = route === 'shop' && ui.ltab === 'ferreiro' ? 'ferreiro' : route;
  const [t, sub] = TITLES[key] || [route + '.', ''];
  // v5.14: cada aba tem a sua imagem (dia e noite); o desenho em código só aparece se a imagem não carregar
  const night = document.documentElement.dataset.mode === 'night';
  return `<div class="scene pstrip"><canvas id="scene" data-interior="${interiorOf(key) || 'rotina'}" aria-hidden="true"></canvas><img class="topo" src="assets/topo/${TOPOS.includes(key) ? key : 'survival'}-${night ? 'noite' : 'dia'}.webp" alt="" aria-hidden="true">
    <div class="pst-face"><canvas class="pcv" data-portrait="mini" data-act="primo-hub" title="Falar com o PRIMO" aria-label="PRIMO"></canvas></div>
    <div class="pst-txt"><div class="scene-title">${esc(t)}</div><div class="scene-sub">${esc(sub.toUpperCase())}</div><div class="pst-say" data-pspeech="tab:${key}"></div></div></div>`;
}
const TOPOS = ['survival', 'agenda', 'shop', 'ferreiro', 'domingo', 'conquistas', 'filtro', 'rotina', 'regras', 'arquivo'];
export function mountScenes() {
  const c = document.getElementById('scene'), img = document.querySelector('.pstrip img.topo');
  if (!c) return;
  if (img && !(img.complete && !img.naturalWidth)) { img.onerror = () => { img.remove(); mountInterior(c, c.dataset.interior); }; return; }
  img?.remove();
  mountInterior(c, c.dataset.interior);
}

// ───────────── painel do companheiro (QUESTS) ─────────────
export function companionCard() { return primoCard(); }

// ───────────── conversa com o companheiro (IA do claude.ai) ─────────────
let chatLog = [];
async function askClaude(messages) {
  const sample = typeof window.claude?.use === 'function' ? await window.claude.use('sample') : null;
  if (!sample) throw { code: 'not_granted' };
  const r = await sample(messages, { modelTier: 'quick', cache: false });
  return String(r.text || '').trim();
}
function context() {
  const c = R.companion(S), tot = R.totals(S), ch = S.core.chapter || {}, st = R.dayStatus(S, today());
  const q = R.deadlineQueue(S).slice(0, 5).map((t) => `- ${t.text}${t.due ? ' (prazo ' + fmtDM(t.due) + ')' : ''}`).join('\n');
  return `Você é ${c.name}, o aventureiro companheiro do jogador num app de produtividade gamificada em pixel art (estilo RPG 16-bit, acampamento com fogueira). Fale em português do Brasil, curto (2 a 4 frases), caloroso e direto, como um parceiro de aventura. Nunca invente dados. Ajude a quebrar tarefas em passos de 10 minutos, lembre o "por quê" do capítulo e use a ciência dos hábitos (micro-vitórias, começar pelo menor passo, celebrar).
Capítulo ${ch.n}: ${ch.title} · missão: ${ch.mission} · por quê: ${ch.why}
Nível ${tot.level} (${tot.title}), saldo ${tot.balance} XP. Humor: ${c.mood}, energia ${c.energy}%. Status: ${st.list.map((x) => x.name).join(', ') || 'normal'}.
Próximas tarefas:\n${q || '(nenhuma com prazo)'}`;
}
function drawChat(m) {
  m.querySelector('.chat').innerHTML = chatLog.map((x) => `<div class="${x.role === 'user' ? 'me' : 'him'}">${esc(x.content)}</div>`).join('') || `<div class="him">${esc(line(R.companion(S)))}</div>`;
  m.querySelector('.chat').scrollTop = 1e6;
}
function talk() {
  const c = R.companion(S);
  const m = openModal(`<h2>💬 ${esc(c.name)}</h2><div class="chat"></div><form data-v3form="chat" class="row"><input class="inp grow" name="q" placeholder="fala com ele… (ex.: tô travado no contrato)" autocomplete="off" autofocus aria-label="Mensagem"><button class="btn pri">ENVIAR</button></form>
    <div class="actions"><button class="btn" data-close>FECHAR</button></div>`, { wide: true });
  drawChat(m);
}

// ───────────── fogueira de foco (estilo Forest: saiu do app, a fogueira apaga) ─────────────
let focus = null;
function focusModal() {
  const tasks = R.deadlineQueue(S).slice(0, 6);
  openModal(`<h2>🔥 fogueira de foco</h2><p class="muted">Se você sair do app no celular durante o foco, a fogueira apaga. Cada 25 min vale ${R.C.FOCUS_XP} XP (até 60 XP por dia) e tira 1 h da obra da vila.</p>
    <label class="lbl" for="fc-task">Em quê?</label><select class="inp" id="fc-task"><option value="">— só foco —</option>${tasks.map((t) => `<option value="${t.id}">${esc(t.text)}</option>`).join('')}</select>
    <label style="display:block;margin-top:10px;font-size:12.5px"><input type="checkbox" id="fc-strict" checked> modo estrito (sair do app apaga a fogueira)</label>
    <div class="actions" style="justify-content:center;flex-wrap:wrap"><button class="btn pri" data-act="focus-go" data-min="25" data-pomo="1" title="25 min de foco, 5 de pausa; a cada 4 rodadas, pausa longa de 15">🍅 POMODORO</button>${[15, 25, 50].map((n) => `<button class="btn" data-act="focus-go" data-min="${n}">${n} MIN</button>`).join('')}</div>`);
}
function focusRun(min, pomo = false) {
  const taskId = document.getElementById('fc-task')?.value || null, strict = document.getElementById('fc-strict')?.checked;
  if (!ambienceOn()) startAmbience();
  const len = pomo ? 25 : min;
  focus = { min: len, pomo, phase: 'focus', round: 1, end: Date.now() + len * 60000, taskId, strict, ok: true };
  const m = openModal(`<div style="text-align:center"><div class="chip" id="fc-phase" style="margin:0 auto"></div><h2 id="fc-title">mantenha a fogueira acesa.</h2><div class="focus-fire"><canvas class="pcv" data-portrait="full" aria-label="PRIMO focado"></canvas><div class="fc-flames" aria-hidden="true">🔥</div></div>
    <div class="num" id="fc-clock" style="font-size:30px;color:var(--accent);margin:10px 0">${len}:00</div><p class="muted" id="fc-sub">${taskId ? esc(S.quests.tasks.find((t) => t.id === taskId)?.text || '') : 'foco livre'}</p>
    <div class="actions" style="justify-content:center"><button class="btn" data-act="focus-stop">${pomo ? 'ENCERRAR' : 'DESISTIR'}</button></div></div>`, { onClose: () => { if (focus) { clearInterval(focus.timer); focus = null; } } });
  mountPortraits(m); primoReact('foco_inicio');
  const paint = () => {
    const f = focus; if (!f) return;
    const ph = document.getElementById('fc-phase'), tt = document.getElementById('fc-title'), sub = document.getElementById('fc-sub');
    if (ph) ph.textContent = f.pomo ? (f.phase === 'focus' ? `🍅 FOCO ${f.round}/4` : f.long ? '🌿 PAUSA LONGA' : '☕ PAUSA CURTA') : '🔥 FOCO';
    if (tt) tt.textContent = f.phase === 'focus' ? 'mantenha a fogueira acesa.' : 'respire. levante, beba água, olhe pra longe.';
    if (sub && f.phase === 'break') sub.textContent = 'a próxima rodada começa sozinha';
  };
  paint();
  focus.timer = setInterval(() => {
    const f = focus; if (!f) return;
    const left = f.end - Date.now(), el = document.getElementById('fc-clock');
    if (el) el.textContent = `${String(Math.max(0, left / 60000 | 0)).padStart(2, '0')}:${String(Math.max(0, (left / 1000 | 0) % 60)).padStart(2, '0')}`;
    if (left > 0) return;
    if (f.phase === 'focus') {
      A.focusDone(f.min, true, f.taskId); sfx('bell'); confetti(60); primoReact('foco_fim');
      if (!f.pomo) { clearInterval(f.timer); focus = null; closeModal(); return; }
      f.phase = 'break'; f.long = f.round % 4 === 0; f.end = Date.now() + (f.long ? 15 : 5) * 60000; paint();
    } else {
      f.round = f.long ? 1 : f.round + 1; f.phase = 'focus'; f.long = false; f.end = Date.now() + 25 * 60000; sfx('ready'); paint();
    }
  }, 1000);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && focus?.strict && focus.phase === 'focus') focus.hiddenAt = Date.now();
  else if (focus?.hiddenAt) { if (Date.now() - focus.hiddenAt > 15000) { const f = focus; clearInterval(f.timer); focus = null; closeModal(); sfx('error'); A.focusDone(f.min, false, f.taskId); } else focus.hiddenAt = null; }
});

// ───────────── arrastar com dedo ou mouse (tarefas e blocos) ─────────────
let drag = null;
function targetAt(x, y, kind) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  if (kind === 'task') {
    const li = el.closest('li.task'), zone = el.closest('[data-drop-area],[data-drop-block]');
    return zone ? { li: li && li.dataset.id !== drag.id ? li : null, zone } : null;
  }
  const art = el.closest('article.block'), col = el.closest('.group[data-group]');
  return col ? { li: art && art.dataset.dropBlock !== drag.id ? art : null, zone: col } : null;
}
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('[data-handle]');
  if (!h || (h.dataset.handle !== 'task' && h.dataset.handle !== 'block')) return;
  e.preventDefault();
  const src = h.closest(h.dataset.handle === 'task' ? 'li.task' : 'article.block');
  if (!src) return;
  drag = { kind: h.dataset.handle, id: h.dataset.id, src, x0: e.clientX, y0: e.clientY, on: false };
  h.setPointerCapture?.(e.pointerId);
});
document.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (!drag.on) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
    drag.on = true;
    sfx('pick');
    drag.ghost = drag.src.cloneNode(true); drag.ghost.className += ' drag-ghost'; drag.ghost.style.width = drag.src.offsetWidth + 'px';
    document.body.appendChild(drag.ghost); drag.src.classList.add('dragging');
  }
  drag.ghost.style.left = e.clientX - 20 + 'px'; drag.ghost.style.top = e.clientY - 14 + 'px';
  document.querySelectorAll('.drop-before,.drop-zone').forEach((x) => x.classList.remove('drop-before', 'drop-zone'));
  drag.ghost.style.display = 'none';
  const t = targetAt(e.clientX, e.clientY, drag.kind);
  drag.ghost.style.display = '';
  drag.target = t;
  if (t) (t.li || t.zone).classList.add(t.li ? 'drop-before' : 'drop-zone');
  if (e.clientY < 70) scrollBy(0, -12); else if (e.clientY > innerHeight - 70) scrollBy(0, 12);
});
document.addEventListener('pointerup', () => {
  if (!drag) return;
  const d = drag; drag = null;
  d.ghost?.remove(); d.src?.classList.remove('dragging');
  document.querySelectorAll('.drop-before,.drop-zone').forEach((x) => x.classList.remove('drop-before', 'drop-zone'));
  if (!d.on || !d.target) return;
  const z = d.target.zone;
  if (d.kind === 'task') dropTaskSmart(d.id, { area: z.dataset.dropArea, block: z.dataset.dropBlock, before: d.target.li?.dataset.id });
  else A.dropBlock(d.id, { group: z.dataset.group, before: d.target.li?.dataset.dropBlock });
  sfx('drop');
});

// ───────────── ARQUIVO com filtro e esvaziar ─────────────
export function viewArquivo3(ui) {
  const f = (ui.arqF ||= { q: '', m: '', a: '' });
  let all = R.allTasks(S).filter((t) => t.st === 'done' || t.st === 'cancel' || (t.rounds || []).length);
  const months = [...new Set(all.map((t) => (t.doneAt || t.cancelAt || t.sentAt || '').slice(0, 7)).filter(Boolean))].sort().reverse();
  all = all.filter((t) => (!f.q || (t.text + ' ' + (t.blockTitle || '')).toLowerCase().includes(f.q.toLowerCase())) && (!f.m || (t.doneAt || t.cancelAt || '').startsWith(f.m)) && (!f.a || (f.a === 'block' ? t.block || t.blockTitle : t.area === f.a)))
    .sort((a, b) => ((b.doneAt || b.cancelAt || '') > (a.doneAt || a.cancelAt || '') ? 1 : -1));
  const lim = ui.arqLimit || 80;
  const L = S.core.legacy;
  return `${historyCard()}<div class="card" style="margin-bottom:14px"><div class="row">
      <input class="inp grow" data-input="arqF.q" value="${esc(f.q)}" placeholder="🔍 buscar no arquivo" aria-label="Buscar">
      <select class="inp" style="width:auto" data-v3change="arqF.m" aria-label="Mês"><option value="">TODOS OS MESES</option>${months.map((m) => `<option ${f.m === m ? 'selected' : ''} value="${m}">${m.slice(5)}/${m.slice(0, 4)}</option>`).join('')}</select>
      <select class="inp" style="width:auto" data-v3change="arqF.a" aria-label="Área"><option value="">TODAS</option>${[...Object.entries(R.AREAS), ['block', 'BLOCOS']].map(([k, n]) => `<option ${f.a === k ? 'selected' : ''} value="${k}">${n}</option>`).join('')}</select>
      <button class="btn" data-act="archive-now">🔄 ATUALIZAR</button><button class="btn danger" data-act="arq-empty" ${Object.keys(S.arq).length ? '' : 'disabled'} title="Escolha os meses; XP e medalhas ficam">🗑 ESVAZIAR…</button></div>
      ${L ? `<p class="meta" style="margin:8px 0 0">saldo histórico guardado: ${fmtN(L.done || 0)} concluídas · ${fmtN(L.onTime || 0)} no prazo</p>` : ''}</div>
    <div class="card" style="max-width:920px"><div class="list">${all.slice(0, lim).map((t) => {
      const ctx = t.blockTitle || (t.block ? R.findBlock(S, t.block)?.title : R.areaName(t.area)) || '';
      const xp = (t.xp || 0) + (t.rounds || []).reduce((a, r) => a + r.xp, 0) + (t.bonusXp || 0);
      return `<div class="li"><div class="lt">${t.st === 'cancel' ? '✕' : '✓'} ${esc(t.text)}<small>${fmtDM(t.doneAt || t.cancelAt || t.sentAt)} · ${esc(ctx)}${(t.rounds || []).length ? ` · 🔁 ${t.rounds.length}` : ''}</small></div><span class="chip xp">+${xp}</span></div>`;
    }).join('') || '<div class="empty">nada encontrado.</div>'}</div>${all.length > lim ? '<button class="more" data-act="arq-more">mostrar mais</button>' : ''}</div>`;
}

// ───────────── ações da v3 (somadas às do app) ─────────────
export function extend(ACTIONS, render) {
  window.__weeklyPick = () => ACTIONS['weekly-pick']();
  Object.assign(ACTIONS, {
    collapse: (d) => { toggleCollapse(d.k); render(); sfx('swish'); },
    qtab: (d) => { window.__ui.qtab = d.tab; render(); sfx('tab'); },
    'comp-talk': () => talk(),
    'comp-rename': () => openModal(`<form data-v3form="rename"><h2>nome do companheiro</h2><input class="inp" name="n" value="${esc(R.companion(S).name)}" maxlength="12" autofocus aria-label="Nome"><div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">SALVAR</button></div></form>`),
    'take-money': () => openModal(`<form data-v3form="take"><h2>↩ retirei</h2><p class="muted">Quanto você TIROU do que estava guardado? O boss do capítulo recupera essa vida. Fica anotado no histórico, sem multa.</p><input class="inp" name="v" type="number" min="1" step="1" placeholder="R$" autofocus aria-label="Valor"><input class="inp" name="n" placeholder="pra quê (ex.: CONSERTO DO CARRO)" style="margin-top:8px" aria-label="Motivo"><div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">RETIRAR</button></div></form>`),
    'money-log': () => {
      const moves = [...(R.chapterBoss(S)?.moves || [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      openModal(`<h2>💰 guardado e retirado</h2><p class="muted">Movimentos deste capítulo. O ✕ apaga um lançamento errado (Ctrl+Z desfaz).</p><div class="list" style="max-height:52vh;overflow:auto">${moves.map((g) => `<div class="li"><div class="lt"><b class="${g.amount < 0 ? 'bad' : 'good'}">${g.amount < 0 ? '− R$ ' : '+ R$ '}${fmtN(Math.abs(g.amount))}</b><small>${fmtDM(g.date)}${g.note ? ' · ' + esc(g.note) : ''}</small></div><button class="icon-btn" data-act="money-del" data-id="${g.id}" aria-label="Apagar lançamento">✕</button></div>`).join('') || '<div class="empty">nada guardado ainda.</div>'}</div><div class="actions"><button class="btn pri" data-close>FECHAR</button></div>`);
    },
    'money-del': (d) => { A.deleteSaving(d.id); sfx('tab'); ACTIONS['money-log'](); },
    'save-money': () => openModal(`<form data-v3form="save"><h2>💰 guardei</h2><p class="muted">Quanto você GUARDOU de verdade (a outra metade do projeto, por exemplo)? Isso dá dano no boss do capítulo.</p><input class="inp" name="v" type="number" min="1" step="1" placeholder="R$" autofocus aria-label="Valor"><input class="inp" name="n" placeholder="de onde (ex.: FABIANA NOV)" style="margin-top:8px" aria-label="Origem"><div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">GUARDAR</button></div></form>`),
    'weekly-pick': () => {
      const sunday = new Date().getDay() === 0, target = sunday ? addDays(today(), 1) : today();
      const cur = new Set(R.weeklyMissions(S, target).ids), list = R.openTasks(S).filter((t) => t.st !== 'wait').sort((a, b) => (cur.has(b.id) - cur.has(a.id)) || (R.parse(b.text).star - R.parse(a.text).star) || (a.due || '9').localeCompare(b.due || '9'));
      openModal(`<form data-v3form="weekly" data-target="${target}"><h2>📌 3 missões da ${sunday ? 'próxima semana' : 'semana'}</h2><input class="inp" data-v4filter=".wk-list" placeholder="🔍 buscar missão…" aria-label="Buscar missão" style="margin-bottom:8px"><div class="list wk-list" style="max-height:52vh;overflow:auto">${list.map((t) => `<label class="li" style="cursor:pointer"><span class="lt"><input type="checkbox" name="w" value="${t.id}" ${cur.has(t.id) ? 'checked' : ''}> ${esc(t.text)}<small>${esc(t.block ? R.findBlock(S, t.block)?.title || '' : R.AREAS[t.area])}${t.due ? ' · ' + fmtDM(t.due) : ''}</small></span></label>`).join('')}</div><div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">SALVAR</button></div></form>`, { wide: true });
    },
    focus: () => focusModal(),
    'focus-go': (d) => focusRun(+d.min, d.pomo === '1'),
    'focus-stop': async () => {
      const f = focus; if (!f) return;
      if (f.phase === 'break' || (f.pomo && f.round > 1 && f.end - Date.now() > 24 * 60000)) { clearInterval(f.timer); focus = null; closeModal(); toast('🍅 Ciclo encerrado. Bom trabalho!', 'good'); return; }
      if (await ask('Desistir do foco?', 'A fogueira apaga e não conta XP desta rodada.', 'DESISTIR', true)) { const g = focus; if (g) { clearInterval(g.timer); focus = null; A.focusDone(g.min, false, g.taskId); } }
    },
    'arq-empty': () => {
      const ms = Object.keys(S.arq).sort();
      if (!ms.length) { toast('O arquivo já está vazio.'); return; }
      openModal(`<form data-v3form="arq-empty"><h2>🗑 esvaziar o arquivo</h2><p class="muted">Escolha os meses. As tarefas desses meses somem da lista do ARQUIVO, mas o XP, o nível, as medalhas, a meta do dia e as sequências continuam iguais (ficam guardados dia a dia). Baixe um backup antes, se quiser guardar a lista.</p>
        <div class="list">${ms.map((m) => `<label class="li" style="cursor:pointer"><span class="lt"><input type="checkbox" name="m" value="${m}" checked> ${m.slice(5)}/${m.slice(0, 4)}<small>${(S.arq[m].tasks || []).length} tarefa(s)</small></span></label>`).join('')}</div>
        <div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn danger">ESVAZIAR</button></div></form>`);
    },
  });
  document.addEventListener('submit', async (e) => {
    const f = e.target.closest('form[data-v3form]');
    if (!f) return;
    e.preventDefault();
    if (f.dataset.v3form === 'rename') { A.renameCompanion(f.n.value); closeModal(); }
    if (f.dataset.v3form === 'weekly') { const ids = [...f.querySelectorAll('[name=w]:checked')].map((x) => x.value); if (ids.length > 3) { toast('Só 3. Foco é escolher o que fica de fora.', 'bad'); return; } A.setWeekly(ids, R.weeklyMissions(S, f.dataset.target).ws); closeModal(); }
    if (f.dataset.v3form === 'arq-empty') { const ms = [...f.querySelectorAll('[name=m]:checked')].map((x) => x.value); closeModal(); if (!ms.length) return; const r = A.emptyArchive(ms); if (r?.error) toast(esc(r.error), 'bad'); else sfx('swish'); }
    if (f.dataset.v3form === 'save') { A.addSaving(f.v.value, f.n.value); closeModal(); sfx('coin'); }
    if (f.dataset.v3form === 'take') { const r = A.withdrawSaving(f.v.value, f.n.value); if (r?.error) { sfx('error'); toast(esc(r.error), 'bad'); return; } closeModal(); sfx('coin'); }
    if (f.dataset.v3form === 'chat') {
      const q = f.q.value.trim(); if (!q) return;
      f.q.value = '';
      chatLog.push({ role: 'user', content: q });
      const m = f.closest('.modal'); drawChat(m);
      try {
        const msgs = [{ role: 'user', content: context() + '\n\n(Responda como o personagem.)' }, { role: 'assistant', content: 'Combinado.' }, ...chatLog.slice(-10)];
        chatLog.push({ role: 'assistant', content: await askClaude(msgs) });
      } catch (err) { chatLog.push({ role: 'assistant', content: err?.code === 'not_granted' ? '(A conversa com IA só funciona com o app aberto pelo claude.ai e com a permissão aceita.)' : '(Não consegui responder agora. Tenta de novo?)' }); }
      if (document.body.contains(m)) drawChat(m);
    }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-v3change]');
    if (!el) return;
    const [a, b] = el.dataset.v3change.split('.');
    window.__ui[a][b] = el.value;
    render();
  });
}

// ───────────── som suave ao rolar ─────────────
let lastScrollSfx = 0, lastY = 0;
const onScroll = (y) => { const now = Date.now(); if (Math.abs(y - lastY) > 90 && now - lastScrollSfx > 140) { lastScrollSfx = now; lastY = y; sfx('scroll'); } };
addEventListener('scroll', () => onScroll(scrollY), { passive: true });
document.addEventListener('scroll', (e) => { const el = e.target; if (el?.classList?.contains('daystrip') || el?.classList?.contains('feed')) onScroll(el.scrollLeft + el.scrollTop); }, { capture: true, passive: true });

/** carta do capítulo: a cerimônia de fim de temporada */
export function chapterCard(ch) {
  const st = ch.stats || {};
  confetti(120); sfx('level');
  openModal(`<div class="levelup"><div class="px muted" style="font-size:9px">FIM DO CAPÍTULO ${esc(ch.n)}</div><h2 style="margin:12px 0">📖 ${esc(ch.title)}</h2><p class="muted">${esc(ch.mission)}</p>
    <div class="stats" style="margin-top:14px"><div class="stat"><small>XP</small><b class="acc">${fmtN(st.xp || 0)}</b></div><div class="stat"><small>Tarefas</small><b>${st.tasks || 0}</b><span>${st.onTime || 0} no prazo</span></div>
    <div class="stat"><small>Hábitos</small><b>${st.habits || 0}</b></div><div class="stat"><small>Gold</small><b class="gold">${fmtN(st.gold || 0)}</b></div></div>
    <p>${fmtDM(ch.start)} → ${fmtDM(ch.end)} · ${esc(R.companion(S).name)} chegou ao nível ${st.level}. Um novo capítulo começa agora.</p><div class="actions" style="justify-content:center"><button class="btn pri" data-close>VIRAR A PÁGINA</button></div></div>`);
}
