// v3.5 — o PRIMO vivo (falas, voz, carinho, pergunta do dia, amizade), o REINO em tela cheia, a abertura do dia,
// um feed bem mais rico, cartões que recolhem, painel que você organiza arrastando, cores por aba e a CRÔNICA do progresso.
import { S } from './store.js';

import * as A from './actions.js';
import * as R from './rules.js';
import { esc, today, addDays, fmtDM, hash, diffDays, weekday } from './util.js';
import { openModal, closeModal, toast, modalOpen } from './ui.js';
import { sfx, blip } from './audio.js';
import { kingdomData } from './kingdom.js';

import { primoReact, primoAfterRender, mountPortraits } from './primo.js';

import { primoThink } from './claude.js';

import { primoLine, lastExpr } from './falas.js';
import { pickSaber } from './saber.js';

import { skyAt, sceneHour, SEASON_NAME, WEATHER_NAME } from './sky.js';
import { isCollapsed, toggleCollapse } from './v3.js';


const ls = { get: (k, d = null) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clean = (t) => String(t || '').replace(/\s*\(\d+\s*XP\)/i, '').replace(/^(↳|>)\s*/, '');

// ───────────────────────── VOZ DO PRIMO ─────────────────────────
// blip = vozinha de bichinho (um bip por letra) · fala = voz de verdade do aparelho (pt-BR) · mudo
export const voiceMode = () => ls.get('gamify-ui:voice', 'blip');
export const setVoice = (m) => ls.set('gamify-ui:voice', m);
function speakReal(text) {
  const ss = window.speechSynthesis;
  if (!ss) return false;
  try {
    ss.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?…:;'"()%-]/gu, ' '));
    u.lang = 'pt-BR'; u.rate = 1.04; u.pitch = 1.08;
    const vs = ss.getVoices();
    const v = vs.find((x) => /pt[-_]BR/i.test(x.lang)) || vs.find((x) => /^pt/i.test(x.lang));
    if (v) u.voice = v;
    ss.speak(u);
    return true;
  } catch { return false; }
}
/** escreve a fala letra por letra (efeito de RPG) com a voz escolhida */
export function say(el, text, { voice = true } = {}) {
  if (!el) return;
  clearInterval(el._typer);
  const mode = voice ? voiceMode() : 'mudo';
  if (mode === 'fala') speakReal(text);
  if (reduced()) { el.textContent = text; return; }
  let i = 0;
  el.textContent = '';
  el.classList.add('typing');
  const base = 210 + (R.companion(S).tier || 0) * 6;
  el._typer = setInterval(() => {
    i += 1;
    el.textContent = text.slice(0, i);
    const ch = text[i - 1];
    if (mode === 'blip' && i % 2 === 1 && /[a-zà-ú]/i.test(ch || '')) blip(ch, base);
    if (i >= text.length || !el.isConnected) { clearInterval(el._typer); el.classList.remove('typing'); el.textContent = text; }
  }, 26);
}

// ───────────────────────── AMIZADE ─────────────────────────
const BOND = [[0, 'CONHECIDO'], [5, 'COLEGA DE ESTRADA'], [15, 'PARCEIRO'], [40, 'AMIGO DE FOGUEIRA'], [100, 'IRMÃO DE ESTRADA'], [250, 'PRIMO DE SANGUE']];
export function bond() {
  const pts = S.core?.bond?.pts || 0;
  let i = 0;
  BOND.forEach(([n], j) => { if (pts >= n) i = j; });
  const next = BOND[i + 1];
  return { pts, lvl: i, name: BOND[i][1], next: next?.[0] || null, pct: next ? (pts - BOND[i][0]) / (next[0] - BOND[i][0]) : 1, hearts: Math.min(5, i) };
}

export { primoLine, lastExpr };
/** a fala dinâmica agora mora em falas.js; aqui ficam só os apoios de memória */
function memory() {
  const td = today(), done = R.allTasks(S).filter((t) => t.st === 'done' && t.doneAt && t.doneAt <= addDays(td, -7) && !/^(↳|>)/.test(t.text));
  if (!done.length) return null;
  for (const n of [365, 180, 90, 30, 14, 7]) { const hit = done.find((t) => t.doneAt === addDays(td, -n)); if (hit) return { t: hit, n }; }
  const t = done[hash('mem' + td) % done.length];
  return { t, n: diffDays(t.doneAt, td) };
}

// ───────────────────────── PERGUNTA DO DIA (diário) ─────────────────────────
const QS = ['O que faria hoje valer a pena?', 'Qual tarefa você está evitando? O que tem nela que assusta?', 'Quem merece uma mensagem sua essa semana?', 'O que te deu energia ontem?',
  'Se você só tivesse 2 horas hoje, no que gastaria?', 'Qual pequena vitória de ontem passou despercebida?', 'O que você de um ano atrás acharia de você hoje?', 'Qual hábito está mais fácil? E o mais difícil?',
  'Do que você quer se orgulhar no fim deste capítulo?', 'O que dá pra delegar, cortar ou simplificar?', 'Qual projeto mais te anima agora? Por quê?', 'Pra onde foi o seu tempo ontem?',
  'O que você aprendeu essa semana?', 'Uma coisa pela qual você é grato hoje:', 'Como está o corpo hoje, de 1 a 10? O que ajudaria?', 'Qual conversa difícil você está adiando?',
  'Se a semana tivesse um título, qual seria?', 'Quanto dá pra guardar a mais esse mês pro APÊ?', 'Qual o próximo passo concreto pro APÊ?', 'O que você faria hoje se não tivesse medo de errar?',
  'Qual vício roubou tempo essa semana? Como cortar 10%?', 'Que conteúdo você pode publicar essa semana?', 'Quem do seu network você não fala há tempo?', 'Qual tarefa de 2 minutos dá pra matar agora?',
  'Como você quer se sentir às 18h de hoje?', 'Qual decisão você está empurrando?', 'Do que você precisa descansar?', 'Que ideia de projeto apareceu essa semana?',
  'O que você fez hoje só por você?', 'Qual foi o melhor momento de ontem?', 'Se o PRIMO pudesse te ajudar em uma coisa hoje, qual seria?', 'O que a PRIMOS precisa de você essa semana?',
  'O que você quer que digam do seu trabalho daqui a 5 anos?', 'Que hábito novo valeria testar por 7 dias?', 'Qual foi a última vez que você se divertiu de verdade?'];

// ───────────────────────── CARINHO ─────────────────────────
function pet() {
  primoReact('carinho');
  if (S.core.bond?.last?.pet !== today()) setTimeout(() => A.bondTouch('pet'), 2600);
}

// ───────────────────────── ABERTURA DO DIA ─────────────────────────
function maybeBrief() {
  const td = today();
  if (ls.get('gamify-ui:brief') === td || ls.get('gamify-ui:brief-off') === '1' || !ls.get('gamify-ui:tour') || modalOpen()) return;
  ls.set('gamify-ui:brief', td);
  setTimeout(() => brief(), 700);
}
export function brief() {
  const td = today(), g = R.dailyGoal(S), k = kingdomData(S), hr = new Date().getHours();
  const open = R.openTasks(S), over = open.filter((t) => t.due && t.due < td).length, hoje = open.filter((t) => t.due === td).length;
  const wk = R.weeklyMissions(S, td), sunday = weekday(td) === 0 && !(S.core.sundays || []).some((x) => x.date === td);
  const hi = hr < 5 ? 'madrugada acordado, primo?' : hr < 12 ? 'bom dia, primo.' : hr < 18 ? 'boa tarde, primo.' : 'boa noite, primo.';
  const m = openModal(`<div class="brief"><canvas id="brief-canvas" class="pcv pmini" data-portrait="mini" aria-hidden="true"></canvas>
    <h2>${hi}</h2><div class="speech" id="brief-say"></div>
    <div class="brief-grid">
      <div><small>HOJE</small><b>${SEASON_NAME[k.season]} · ${esc(WEATHER_NAME[k.weather])}</b></div>
      <div><small>META DO DIA</small><b>${g.today}/${g.goal} XP · ${g.streak} 🔥</b></div>
      <div><small>PRAZOS</small><b class="${over ? 'bad' : ''}">${hoje} hoje${over ? ` · ${over} atrasadas` : ''}</b></div>
      <div><small>MISSÕES DA SEMANA</small><b>${wk.tasks.length ? `${wk.done}/3 feitas` : 'escolher 📌'}</b></div></div>
    ${(() => { const x = pickSaber('all'); return `<div class="li" style="margin:8px 0"><div class="lt">${x.label}<small style="white-space:normal">${esc(x.text)} — ${esc(x.by)}</small></div></div>`; })()}
    ${sunday ? '<p class="meta" style="text-align:center">🎁 é domingo: o baú da semana está esperando as suas notas.</p>' : ''}
    <div class="actions" style="justify-content:center"><button class="btn" data-act="primo-hub" data-close>🔥 FALAR COM O PRIMO</button>${sunday ? '<a class="btn" href="#domingo" data-close>🎁 ABRIR O BAÚ</a>' : ''}<button class="btn pri" data-close autofocus>BORA ▶</button></div>
    <label class="meta" style="display:block;text-align:center;margin-top:8px"><input type="checkbox" data-v35="brief-off"> não mostrar a abertura do dia</label></div>`);
  const line = sunday ? 'Domingo! Dia de olhar a semana, dar as notas e escolher as 3 pedras grandes.' : over >= 3 ? `Temos ${over} atrasadas. Começa pela menor que o resto destrava.` : wk.tasks.length && !wk.complete ? `Foco da semana: ${clean(wk.tasks.find((t) => t.st !== 'done')?.text || '')}.` : primoLine();
  mountPortraits(m);
  setTimeout(() => say(m.querySelector('#brief-say'), line), 300);
  window.__deaccent?.(m);
}

// ───────────────────────── RECOLHER QUALQUER CARTÃO ─────────────────────────
const slug = (t) => t.normalize('NFD').replace(/[^A-Za-z ]/g, '').trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30);
function enhance(root, route) {
  for (const card of root.querySelectorAll('.card')) {
    const h = card.querySelector(':scope > header > h2');
    if (!h || h.dataset.act || card.closest('.modal')) continue;
    const key = `c:${route}:${slug(h.textContent)}`;
    // cartões só de consulta (referência e legenda) começam recolhidos; depois vale a sua escolha
    const gk = card.dataset.gk;
    if ((gk === 'ref' || gk === 'legenda') && !ls.get('gamify-ui:cinit:' + gk)) { ls.set('gamify-ui:cinit:' + gk, '1'); if (!isCollapsed(key)) toggleCollapse(key); }
    h.dataset.act = 'collapse'; h.dataset.k = key; h.classList.add('colh');
    h.insertAdjacentHTML('afterbegin', `<span class="chev">${isCollapsed(key) ? '▸' : '▾'}</span> `);
    card.classList.toggle('collapsed', isCollapsed(key));
  }
}

// ───────────────────────── PAINEL QUE VOCÊ ORGANIZA ─────────────────────────
const LABELS = {};
const orderOf = (key) => { try { return JSON.parse(ls.get('gamify-ui:order:' + key)) || { order: [], hidden: [] }; } catch { return { order: [], hidden: [] }; } };
const saveOrder = (key, o) => ls.set('gamify-ui:order:' + key, JSON.stringify(o));
/** monta seções na ordem que você escolheu (arrastando pela alça ⠿ ou em ⚙ PERSONALIZAR) */
export function arrange(key, sections, { button = true } = {}) {
  LABELS[key] = sections.map(([id, label]) => [id, label]);
  const pref = orderOf(key), ids = sections.map((s) => s[0]);
  const order = [...pref.order.filter((id) => ids.includes(id)), ...ids.filter((id) => !pref.order.includes(id))];
  return order.filter((id) => !(pref.hidden || []).includes(id)).map((id) => {
    const s = sections.find((x) => x[0] === id);
    return s[2] ? `<div class="sitem" data-sitem="${id}" data-slist="${key}"><span class="shandle" data-handle="sort" title="Segure e arraste pra mudar a ordem" aria-label="Arrastar">⠿</span>${s[2]}</div>` : '';
  }).join('');
}
function arrangeModal(key) {
  const pref = orderOf(key), labels = LABELS[key] || [], ids = labels.map((l) => l[0]);
  const order = [...pref.order.filter((id) => ids.includes(id)), ...ids.filter((id) => !pref.order.includes(id))];
  openModal(`<form data-v35form="arrange" data-key="${key}"><h2>⚙ personalizar</h2><p class="muted">Marque o que aparece e use ↑ ↓ pra ordem. Dica: também dá pra arrastar cada cartão pela alça ⠿ no topo dele.</p>
    <div class="list" id="arr-list">${order.map((id) => `<div class="li" data-id="${id}"><label class="lt" style="cursor:pointer"><input type="checkbox" name="v" value="${id}" ${(pref.hidden || []).includes(id) ? '' : 'checked'}> ${esc(labels.find((l) => l[0] === id)?.[1] || id)}</label><span class="row" style="gap:4px"><button type="button" class="icon-btn" data-act="arr-mv" data-d="-1">↑</button><button type="button" class="icon-btn" data-act="arr-mv" data-d="1">↓</button></span></div>`).join('')}</div>
    <div class="actions"><button type="button" class="btn ghost" data-act="arr-reset" data-key="${key}">PADRÃO</button><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">SALVAR</button></div></form>`);
}
let sdrag = null;
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('[data-handle="sort"]');
  if (!h) return;
  e.preventDefault();
  const src = h.closest('.sitem');
  sdrag = { src, list: src.dataset.slist, x0: e.clientX, y0: e.clientY, on: false };
  h.setPointerCapture?.(e.pointerId);
});
document.addEventListener('pointermove', (e) => {
  if (!sdrag) return;
  if (!sdrag.on) {
    if (Math.hypot(e.clientX - sdrag.x0, e.clientY - sdrag.y0) < 6) return;
    sdrag.on = true; sfx('pick');
    sdrag.ghost = sdrag.src.cloneNode(true); sdrag.ghost.classList.add('drag-ghost'); sdrag.ghost.style.width = sdrag.src.offsetWidth + 'px';
    document.body.appendChild(sdrag.ghost); sdrag.src.classList.add('dragging');
  }
  sdrag.ghost.style.left = e.clientX - 30 + 'px'; sdrag.ghost.style.top = e.clientY - 12 + 'px';
  sdrag.ghost.style.display = 'none';
  const under = document.elementFromPoint(e.clientX, e.clientY)?.closest(`.sitem[data-slist="${sdrag.list}"]`);
  sdrag.ghost.style.display = '';
  document.querySelectorAll('.sitem.drop-before,.sitem.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after'));
  sdrag.target = null;
  if (under && under !== sdrag.src) { const r = under.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2; under.classList.add(after ? 'drop-after' : 'drop-before'); sdrag.target = { el: under, after }; }
  if (e.clientY < 70) scrollBy(0, -12); else if (e.clientY > innerHeight - 70) scrollBy(0, 12);
});
document.addEventListener('pointerup', () => {
  if (!sdrag) return;
  const d = sdrag; sdrag = null;
  d.ghost?.remove(); d.src.classList.remove('dragging');
  document.querySelectorAll('.sitem.drop-before,.sitem.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after'));
  if (!d.on || !d.target) return;
  const ids = [...document.querySelectorAll(`.sitem[data-slist="${d.list}"]`)].map((x) => x.dataset.sitem).filter((id) => id !== d.src.dataset.sitem);
  let at = ids.indexOf(d.target.el.dataset.sitem) + (d.target.after ? 1 : 0);
  ids.splice(at, 0, d.src.dataset.sitem);
  const pref = orderOf(d.list);
  const rest = (LABELS[d.list] || []).map((l) => l[0]).filter((id) => !ids.includes(id));
  saveOrder(d.list, { order: [...ids, ...rest], hidden: pref.hidden || [] });
  sfx('drop');
  rerender();
});

// ───────────────────────── TEMA E CÉU ─────────────────────────
export const THEMES = [['', 'Cognac (laranja, padrão)'], ['rouge', 'Rouge Noir'], ['coral', 'Blue Coral'], ['olive', 'Olive'], ['midnight', 'Midnight Blue'], ['tobacco', 'Tobacco'], ['merlot', 'Merlot']];
export function applyTheme() {
  const t = ls.get('gamify-ui:theme', ''), root = document.documentElement;
  if (t) root.dataset.theme = t; else delete root.dataset.theme;
  root.dataset.tabhue = ls.get('gamify-ui:tabhue', '1') === '1' ? 'on' : 'off';
  const sky = skyAt(sceneHour());
  root.style.setProperty('--sky-a', sky.top); root.style.setProperty('--sky-b', sky.hor); root.style.setProperty('--sky-m', sky.mid);
}
setInterval(applyTheme, 60000);

/** diário (pergunta do dia) pra reler no domingo */

// ───────────────────────── CONVERSA (IA) COM VOZ ─────────────────────────
let chat = [];
function chatContext() {
  const c = R.companion(S), tot = R.totals(S), ch = S.core.chapter || {}, st = R.dayStatus(S, today()), k = kingdomData(S), bd = bond(), g = R.dailyGoal(S);
  const q = R.deadlineQueue(S).slice(0, 6).map((t) => `- ${clean(t.text)}${t.due ? ' (prazo ' + fmtDM(t.due) + ')' : ''}`).join('\n');
  const wk = R.weeklyMissions(S).tasks.map((t) => `- ${clean(t.text)}${t.st === 'done' ? ' ✓' : ''}`).join('\n');
  const jr = Object.entries(S.core.journal || {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 4).map(([d, x]) => `- ${fmtDM(d)} "${x.q}" → ${x.a}`).join('\n');
  return `Você é ${c.name}, o companheiro de aventura do jogador num app de produtividade gamificada em pixel art (o PRIMO é o centro do jogo: ele reage às tarefas, pede uma missão por dia, sai em expedições e tem um mascote). O jogador é arquiteto autônomo (escritório PRIMOS, com a prima) em Alfenas-MG; você o chama de "primo". Fale português do Brasil, caloroso, divertido e direto, 2 a 4 frases, sem listas longas. Nunca invente dados. Use a ciência dos hábitos: menor passo possível, micro-vitórias, celebrar. Se ele estiver travado, quebre a tarefa em um passo de 10 minutos.
Amizade: ${bd.name}. Capítulo ${ch.n}: ${ch.title} · missão: ${ch.mission} · por quê: ${ch.why}
Nível ${tot.level} (${tot.title}), saldo ${tot.balance} XP. Meta do dia: ${g.today}/${g.goal} XP, ${g.streak} dias em chama. Humor: ${c.mood}, energia ${c.energy}%. Status: ${st.list.map((x) => x.name).join(', ') || 'normal'}.
APÊ ${k.boss ? Math.floor((k.boss.got / k.boss.target) * 100) + '% (R$ ' + k.boss.got + ' de ' + k.boss.target + ')' : 'sem meta'}. Distritos (última nota de domingo): ${k.districts.map((d) => `${d.name} ${d.last ?? '—'}`).join(', ')}.
Missões da semana:\n${wk || '(nenhuma)'}\nPróximas tarefas:\n${q || '(nenhuma com prazo)'}\nDiário recente:\n${jr || '(vazio)'}`;
}
function talk() {
  const c = R.companion(S), hasMic = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const m = openModal(`<h2>💬 ${esc(c.name)} <small class="meta">· ${esc(bond().name)} ${'♥'.repeat(bond().hearts)}</small></h2><div class="chat" id="v35-chat"></div>
    <div class="chips">${['tô travado', 'me motiva', 'o que faço agora?', 'planeja meu dia', 'me conta uma curiosidade'].map((t) => `<button type="button" class="btn sm ghost" data-act="chat-chip" data-t="${t}">${t}</button>`).join('')}</div>
    <form data-v35form="chat" class="row" style="flex-wrap:nowrap">${hasMic ? '<button type="button" class="btn" data-act="chat-mic" title="Falar">🎤</button>' : ''}<input class="inp grow" name="q" placeholder="fala com ele…" autocomplete="off" autofocus aria-label="Mensagem"><button class="btn pri">ENVIAR</button></form>
    <div class="actions"><span class="meta" style="margin-right:auto">voz: ${{ blip: 'vozinha', fala: 'voz real', mudo: 'muda' }[voiceMode()]} (troque em PERKS AND RULES)</span><button class="btn" data-close>FECHAR</button></div>`, { wide: true });
  drawChat(m);
}
function drawChat(m) {
  const box = m.querySelector('#v35-chat');
  if (!box) return;
  box.innerHTML = chat.map((x) => `<div class="${x.role === 'user' ? 'me' : 'him'}">${esc(x.content)}</div>`).join('') || `<div class="him">${esc(primoLine())}</div>`;
  box.scrollTop = 1e6;
}
async function sendChat(m, q) {
  chat.push({ role: 'user', content: q });
  chat.push({ role: 'assistant', content: '…' });
  drawChat(m);
  let reply;
  try {
    const sample = typeof window.claude?.use === 'function' ? await window.claude.use('sample') : null;
    if (!sample) throw { code: 'not_granted' };
    const msgs = [{ role: 'user', content: chatContext() + '\n\n(Responda como o personagem.)' }, { role: 'assistant', content: 'Combinado, primo.' }, ...chat.slice(0, -1).slice(-10)];
    const r = await sample(msgs, { modelTier: 'quick', cache: false });
    reply = String(r.text || '').trim() || '…';
  } catch (err) { reply = err?.code === 'not_granted' ? '(A conversa com IA só funciona com o app aberto pelo claude.ai e com a permissão aceita.)' : '(Não consegui responder agora. Tenta de novo?)'; }
  chat[chat.length - 1] = { role: 'assistant', content: reply };
  if (document.body.contains(m)) {
    drawChat(m);
    const last = [...m.querySelectorAll('#v35-chat .him')].pop();
    if (last && !reply.startsWith('(')) say(last, reply);
  }
  if (S.core.bond?.last?.talk !== today()) A.bondTouch('talk');
}
function listen(input) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  try {
    const r = new SR(); r.lang = 'pt-BR'; r.interimResults = false;
    r.onresult = (e) => { input.value = e.results[0][0].transcript; input.form.requestSubmit(); };
    r.onerror = () => toast('Não deu pra usar o microfone aqui. Digite que eu leio.', 'bad');
    r.start(); toast('🎤 pode falar…');
  } catch { toast('Microfone indisponível aqui.', 'bad'); }
}

// ───────────────────────── LIGAÇÕES COM O APP ─────────────────────────
let rerender = () => {};
/** roda depois de cada desenho da tela */
export function afterRender(route) {
  const main = document.getElementById('main');
  if (main) { main.dataset.route = route; enhance(main, route); }
  document.body.dataset.route = route;
  const sp = document.getElementById('comp-speech');
  primoAfterRender();
  if (sp) primoThink(sp);
  maybeBrief();
}
export function extend35(ACTIONS, render) {
  rerender = render;
  applyTheme();
  Object.assign(ACTIONS, {
    'comp-poke': () => primoReact('carinho'),
    'primo-pet': () => pet(),
    'comp-talk': () => talk(),
    'chat-chip': (d) => { const m = document.querySelector('.modal'); if (m) sendChat(m, d.t); },
    'chat-mic': (d, e, el) => listen(el.closest('form').q),
    arrange: (d) => arrangeModal(d.key),
    'arr-mv': (d, e, el) => { const li = el.closest('.li'), sib = +d.d < 0 ? li.previousElementSibling : li.nextElementSibling; if (sib) { if (+d.d < 0) sib.before(li); else sib.after(li); sfx('tab'); } },
    'arr-reset': (d) => { saveOrder(d.key, { order: [], hidden: [] }); closeModal(); render(); },
    brief: () => brief(),
    theme: (d) => { ls.set('gamify-ui:theme', d.t || ''); applyTheme(); render(); sfx('tab'); },
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-v35form]');
    if (!f) return;
    e.preventDefault();
    const kind = f.dataset.v35form;
    if (kind === 'chat') { const q = f.q.value.trim(); if (!q) return; f.q.value = ''; sendChat(f.closest('.modal'), q); }
    if (kind === 'arrange') {
      const ids = [...f.querySelectorAll('#arr-list .li')].map((x) => x.dataset.id), vis = new Set([...f.querySelectorAll('[name=v]:checked')].map((x) => x.value));
      saveOrder(f.dataset.key, { order: ids, hidden: ids.filter((id) => !vis.has(id)) });
      closeModal(); render(); sfx('drop');
    }
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset?.v35 === 'brief-off') ls.set('gamify-ui:brief-off', el.checked ? '1' : '0');
    if (el.dataset?.v35 === 'ai') ls.set('gamify-ui:ai', el.value);
    if (el.dataset?.v35 === 'voice') { setVoice(el.value); say(document.getElementById('voice-test'), 'Oi, primo! É assim que eu falo.'); }
    if (el.dataset?.v35 === 'tabhue') { ls.set('gamify-ui:tabhue', el.checked ? '1' : '0'); applyTheme(); }
    if (el.dataset?.v35 === 'brief-on') ls.set('gamify-ui:brief-off', el.checked ? '0' : '1');
  });
}
/** ajustes da v3.5 que aparecem em PERKS AND RULES */
export function settingsV35() {
  const v = voiceMode(), t = ls.get('gamify-ui:theme', '');
  return `<div class="card c12"><header><h2>🎨 Visual, voz e integrações</h2></header>
    <div class="grid3">
      <div><label class="lbl">Cor do jogo</label><div class="swatches">${THEMES.map(([k, n]) => `<button type="button" class="sw ${t === k ? 'on' : ''}" data-act="theme" data-t="${k}" data-sw="${k || 'cognac'}" title="${esc(n)}" aria-label="${esc(n)}"></button>`).join('')}</div>
        <label style="display:block;margin-top:8px;font-size:12.5px"><input type="checkbox" data-v35="tabhue" ${ls.get('gamify-ui:tabhue', '1') === '1' ? 'checked' : ''}> cada aba com a sua cor</label></div>
      <div><label class="lbl" for="v35-voice">Voz do ${esc(R.companion(S).name)}</label><select class="inp" id="v35-voice" data-v35="voice"><option value="blip" ${v === 'blip' ? 'selected' : ''}>vozinha (bips de RPG)</option><option value="fala" ${v === 'fala' ? 'selected' : ''}>voz real do aparelho (pt-BR)</option><option value="mudo" ${v === 'mudo' ? 'selected' : ''}>mudo</option></select>
        <div class="speech" id="voice-test" style="margin-top:8px">Oi, primo!</div></div>
      <div><label class="lbl" for="v35-ai">IA do ${esc(R.companion(S).name)} (usa a sua cota do Claude)</label><select class="inp" id="v35-ai" data-v35="ai"><option value="daily" ${ls.get('gamify-ui:ai', 'daily') === 'daily' ? 'selected' : ''}>1 fala por dia + carta da expedição</option><option value="never" ${ls.get('gamify-ui:ai', 'daily') === 'never' ? 'selected' : ''}>só quando eu conversar</option></select></div>
      <div><label class="lbl">Atalhos</label><div class="row"><button class="btn sm" data-act="brief">☀ ABERTURA DO DIA</button><button class="btn sm" data-act="realm-open">🏘 VILA</button></div>
        <label style="display:block;margin-top:8px;font-size:12.5px"><input type="checkbox" data-v35="brief-on" ${ls.get('gamify-ui:brief-off') === '1' ? '' : 'checked'}> mostrar a abertura do dia</label></div></div></div>`;
}
