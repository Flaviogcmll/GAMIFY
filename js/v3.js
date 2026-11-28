// v3 — companheiro, cenários por aba, fogueira de foco, arrastar com dedo/mouse, recolher e arquivo com filtro.
import { vozDaAba } from './vozes.js';
import { fig, ANFITRIAO, quem } from './elenco.js';
import { historyCard, dropTaskSmart } from './v4.js';

import { S } from './store.js';

import * as A from './actions.js';
import * as R from './rules.js';
import { tiles } from './telas.js';
import { esc, today, fmtDM, fmtN, addDays, lightNow } from './util.js';

import { openModal, closeModal, toast, ask, segBar } from './ui.js';
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
  survival: ['sobrevivência.', 'a roça · hábitos, rituais e rotina'], agenda: ['agenda.', 'a mesa do mapa · prazos e rituais'], shop: ['feira.', 'a ALQUIMISTA, o ferreiro e quem mais aparecer'],
  ferreiro: ['ferreiro.', 'upgrades permanentes · XP + gold'], domingo: ['reflexão.', 'o baú da semana · peso · notas'], conquistas: ['conquistas.', 'salão dos troféus'],
  filtro: ['filtro.', 'tudo em aberto, numa tabela'], rotina: ['rotina.', 'a torre do relógio · semana-tipo'], regras: ['perks and rules.', 'o livro de regras'], arquivo: ['arquivo.', 'a biblioteca do que já foi'],
};
export function sceneBanner(route, ui) {
  if (route === 'quests') return '';
  const key = route === 'shop' && ui.ltab === 'ferreiro' ? 'ferreiro' : route;
  const [t, sub] = TITLES[key] || [route + '.', ''];
  // v5.14: cada aba tem a sua imagem (dia e noite); o desenho em código só aparece se a imagem não carregar
  const pph = R.praga(S).phase; // v6.7: A PRAGA força a noite; da fase 3 em diante usa o cenário assombrado (se a arte já existir)
  const lt = lightNow(), night = lt === 'noite' || pph >= 4, tarde = !night && lt === 'tarde'; // v7.0: pela hora real (o tema escuro não muda o cenário); fase 4 da Praga força a noite
  // v6: a SHOP virou FEIRA, com o cenário da feira (dia, tarde ou noite)
  const src = pph >= 3 && R.PRAGA_TOPOS.includes(key) ? `assets/topo/${key}-praga.webp` : key === 'shop' ? `assets/primo/cena/feira-${night ? 'noite' : tarde ? 'tarde' : 'dia'}.webp` : `assets/topo/${TOPOS.includes(key) ? key : 'survival'}-${night ? 'noite' : 'dia'}.webp`;
  return `<div class="scene pstrip ${tarde ? 'tarde' : ''}" style="--img:url('${new URL(src, document.baseURI).href}')"><canvas id="scene" data-interior="${interiorOf(key) || 'rotina'}" aria-hidden="true"></canvas><img class="topo" src="${src}" alt="" aria-hidden="true">${pph >= 2 ? '<span class="pg-fog" aria-hidden="true"></span><span class="pg-eyes" aria-hidden="true"></span>' : ''}${R.praga(S).noite ? '<span class="pg-moon" aria-hidden="true" title="PRAGA"></span>' : ''}
    <div class="pst-face" data-act="primo-hub" title="Falar com o PRIMO">${fig('primo', 1, '', 'PRIMO')}</div>${((h) => (h ? `<div class="pst-host" data-host="${h[0]}">${fig(h[0], h[1], '', h[2], true)}</div>` : ''))(ANFITRIAO[key])}
    <div class="pst-txt"><div class="scene-title">${esc(t)}</div><div class="scene-sub">${esc(sub.toUpperCase())}</div>${((v) => (v ? `<div class="pst-say host-say" data-act="voz" data-k="${v.who}" title="Toque pra ouvir"><b>${esc(v.nome)}:</b> ${esc(v.text)}</div>` : `<div class="pst-say" data-pspeech="tab:${key}"></div>`))(vozDaAba(key))}</div></div>`; // v9.6: quem fala é o dono do lugar
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
    <p class="meta fc-credit">🐸 Fogueira acesa pelo FROG LIPÊ, o único da vila que sabe fazer fogo. <i>"Calma, calabreso: um tiquinho de cada vez."</i></p>
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
    <p class="meta fc-credit">🐸 fogueira do FROG LIPÊ</p><div class="actions" style="justify-content:center"><button class="btn" data-act="focus-stop">${pomo ? 'ENCERRAR' : 'DESISTIR'}</button></div></div>`, { onClose: () => { if (focus) { clearInterval(focus.timer); focus = null; } } });
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
    const li = el.closest('li.task'), zone = el.closest('[data-drop-cat],[data-drop-area],[data-drop-block],[data-drop-cor]');
    if (!zone) { const grp = el.closest('.group[data-win]'); return grp && !el.closest('article.block') ? { toBlock: grp, zone: grp } : null; } // v9.9: solta fora de qualquer bloco = vira bloco nesta janela
    const other = li && li.dataset.id !== drag.id ? li : null;
    // v9.0 (pedido do dono): soltar EM CIMA de outra subtarefa do bloco (metade de baixo da linha) = vira passo ↳ dela
    if (other && zone.dataset.dropBlock && !other.classList.contains('step')) { const r = other.getBoundingClientRect(); if (y > r.top + r.height * 0.4) return { nest: other, zone }; }
    return { li: other, zone };
  }
  const art = el.closest('article.block'), col = el.closest('.group[data-group]');
  // v7.0: a coluna (0 a 2) onde o bloco vai cair. No celular as colunas viram uma só: aí não muda a coluna, só a ordem
  const mc = matchMedia('(max-width: 860px)').matches ? null : el.closest('.mcol[data-col]');
  // v10.1 (pedido do dono): dá pra soltar ABAIXO de um bloco: a faixa de baixo do bloco (os últimos 30 px, ou a metade de baixo
  // de um bloco recolhido) põe o bloco depois dele, não por cima
  if (art && art.dataset.dropBlock !== drag.id) {
    const r = art.getBoundingClientRect(), low = art.classList.contains('collapsed') ? y > r.top + r.height / 2 : y > r.bottom - 30;
    if (low) { // o bloco de baixo (cada bloco mora numa caixinha .mitem): pula o próprio bloco que está sendo arrastado
      const artOf = (n) => (n?.matches?.('article.block') ? n : n?.querySelector?.('article.block')) || null;
      let nx = (art.closest('.mitem') || art).nextElementSibling;
      while (nx && (!artOf(nx) || artOf(nx).dataset.dropBlock === drag.id)) nx = nx.nextElementSibling;
      return col ? { li: artOf(nx), after: art, zone: col, mc } : null;
    }
  }
  // v9.0 (pedido do dono): soltar um bloco DENTRO de outro bloco aberto (na lista de tarefas dele) = vira subtarefa dele
  const body = el.closest('article.block:not(.collapsed) .bbody'), host = body?.closest('article.block[data-drop-block]');
  if (host && host.dataset.dropBlock !== drag.id && !host.classList.contains('boss-b')) return { merge: host, zone: col };
  return col ? { li: art && art.dataset.dropBlock !== drag.id ? art : null, zone: col, mc } : null;
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
  document.querySelectorAll('.drop-before,.drop-zone,.drop-nest,.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-zone', 'drop-nest', 'drop-after'));
  drag.ghost.style.display = 'none';
  const t = targetAt(e.clientX, e.clientY, drag.kind);
  drag.ghost.style.display = '';
  drag.target = t;
  if (t) { if (t.after) t.after.classList.add('drop-after'); else (t.nest || t.merge || t.li || t.mc || t.zone).classList.add(t.nest || t.merge ? 'drop-nest' : t.li ? 'drop-before' : 'drop-zone'); }
  if (e.clientY < 70) scrollBy(0, -12); else if (e.clientY > innerHeight - 70) scrollBy(0, 12);
});
document.addEventListener('pointerup', () => {
  if (!drag) return;
  const d = drag; drag = null;
  d.ghost?.remove(); d.src?.classList.remove('dragging');
  document.querySelectorAll('.drop-before,.drop-zone,.drop-nest,.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-zone', 'drop-nest', 'drop-after'));
  if (!d.on || !d.target) return;
  const z = d.target.zone;
  // v9.4: TODAS: soltar num grupo = muda o ASSUNTO; trocar de coluna = AGORA vira ESQUENTANDO, DEPOIS vira ESTÁVEL; AGUARDANDO/PARADO = a cor deles
  if (d.kind === 'task' && (z.dataset.dropCat != null || z.dataset.dropCor)) {
    const t = S.quests.tasks.find((x) => x.id === d.id);
    if (t && !t.block) {
      if (z.dataset.dropCat != null) { if ((t.cat || '') !== z.dataset.dropCat) A.setCat(t.id, z.dataset.dropCat); const now = R.isAgora(S, t); if (z.dataset.dropCol === 'agora' && !now) A.setCor(t.id, 'chega'); else if (z.dataset.dropCol === 'depois' && now) A.setCor(t.id, 'estavel'); }
      else A.setCor(t.id, z.dataset.dropCor);
      sfx('drop'); return;
    }
  }
  if (d.target.toBlock) {
    const t = S.quests.tasks.find((x) => x.id === d.id), key = d.target.toBlock.dataset.win;
    ask('Virar um bloco?', `"${String(t?.text || '').replace(/\s*\(\d+\s*XP\)/i, '')}" vira um BLOCO nesta janela (os passos ↳ dela viram as tarefas). Dá pra desfazer no ↩.`, 'VIRAR BLOCO', false, quem('boi-nilton', 2, 'Tarefa que cresceu vira obra, sô.')).then((ok) => { if (!ok) return; const r = A.taskToBlock(d.id, key); if (r?.error) toast(esc(r.error), 'bad'); else { sfx('upgrade'); toast(esc(r.msg), 'good'); } });
    return;
  }
  if (d.target.nest) { const r = A.nestTask(d.id, d.target.nest.dataset.id); if (r?.error) toast(esc(r.error), 'bad'); sfx('drop'); return; }
  if (d.target.merge) {
    const src = R.findBlock(S, d.id), dst = R.findBlock(S, d.target.merge.dataset.dropBlock);
    ask('Juntar os blocos?', `"${src?.title}" vira uma subtarefa de "${dst?.title}" e as tarefas dele viram passos ↳. Dá pra desfazer no ↩.`, 'JUNTAR').then((ok) => { if (ok) { const r = A.mergeBlockInto(d.id, dst.id); if (r?.error) toast(esc(r.error), 'bad'); else sfx('drop'); } });
    return;
  }
  if (d.kind === 'task') dropTaskSmart(d.id, { area: z.dataset.dropArea, block: z.dataset.dropBlock, before: d.target.li?.dataset.id });
  else {
    // v7.0: guarda a coluna de destino e "congela" a coluna dos vizinhos (assim ninguém troca de lugar sozinho)
    const mc = d.target.mc, peers = mc ? [...mc.parentElement.querySelectorAll(':scope > .mcol[data-col]')].flatMap((c) => [...c.querySelectorAll('article.block[data-drop-block]')].map((a) => [a.dataset.dropBlock, +c.dataset.col])) : null;
    A.dropBlock(d.id, { group: z.dataset.group, before: d.target.li?.dataset.dropBlock, col: mc ? +mc.dataset.col : undefined, peers });
  }
  sfx('drop');
});

// ───────────── ARQUIVO com filtro e esvaziar ─────────────
export function viewArquivo3(ui) {
  const f = (ui.arqF ||= { q: '', m: '', a: '', st: '' });
  let all = R.allTasks(S).filter((t) => t.st === 'done' || t.st === 'cancel' || (t.rounds || []).length);
  const months = [...new Set(all.map((t) => (t.doneAt || t.cancelAt || t.sentAt || '').slice(0, 7)).filter(Boolean))].sort().reverse();
  all = all.filter((t) => (!f.q || (t.text + ' ' + (t.blockTitle || '')).toLowerCase().includes(f.q.toLowerCase())) && (!f.m || (t.doneAt || t.cancelAt || '').startsWith(f.m)) && (!f.a || (f.a === 'block' ? t.block || t.blockTitle : t.area === f.a)))
    .sort((a, b) => ((b.doneAt || b.cancelAt || '') > (a.doneAt || a.cancelAt || '') ? 1 : -1));
  // v5.16: resumo do que está filtrado (o mês escolhido, ou tudo)
  const xpOf = (t) => (t.xp || 0) + (t.rounds || []).reduce((a, r) => a + r.xp, 0) + (t.bonusXp || 0);
  const ctxOf = (t) => t.blockTitle || (t.block ? R.findBlock(S, t.block)?.title : R.areaName(t.area)) || '';
  const dayOf = (t) => t.doneAt || t.cancelAt || t.sentAt || '';
  const done = all.filter((t) => t.st !== 'cancel'), canc = all.length - done.length, xpSum = done.reduce((a, t) => a + xpOf(t), 0);
  const perDay = {}; for (const t of done) { const d = dayOf(t); if (d) perDay[d] = (perDay[d] || 0) + 1; }
  const best = Object.entries(perDay).sort((a, b) => b[1] - a[1])[0];
  const rounds = all.reduce((a, t) => a + (t.rounds || []).length, 0);
  const shown = f.st ? all.filter((t) => (f.st === 'cancel' ? t.st === 'cancel' : t.st !== 'cancel')) : all;
  const strip = tiles([
    { label: '✓ Concluídas', value: fmtN(done.length), tone: 'ok', act: 'arq-st', data: { v: 'done' }, on: f.st === 'done', sub: f.m ? `${f.m.slice(5)}/${f.m.slice(0, 4)}` : 'todos os meses' },
    { label: '✕ Canceladas', value: fmtN(canc), tone: 'neutro', act: 'arq-st', data: { v: 'cancel' }, on: f.st === 'cancel', sub: 'largar também é decidir' },
    { label: '✨ XP', value: fmtN(xpSum), cls: 'gold', tone: 'premio' },
    best && { label: '🔥 Melhor dia', value: `${best[1]} <small class="u">tarefas</small>`, sub: `em ${fmtDM(best[0])}`, tone: 'ok', tip: `O dia em que você mais concluiu tarefas: ${best[1]} em ${fmtDM(best[0])}` },
    rounds && { label: '🔁 Vai e volta', value: rounds, sub: 'rodadas enviadas', tone: 'espera' },
    ((c) => (c.noite || c.antidoto ? { label: '🐺 Ciclos do lobo', value: (c.noite || 0) + (c.antidoto || 0), sub: `${c.noite || 0} pela NOITE · ${c.antidoto || 0} antídoto`, tone: 'calma', tip: 'Quantas vezes o LAMBEHOMI voltou a ser GUARANÁ: roubando a BRASINHA na PRAGA ou pelo ANTÍDOTO da CAJULINA e da EVE LÃ. É um ciclo, como a lua.' } : null))(R.lobo(S).curas),
  ]);
  const ctx = {}; for (const t of done) { const c = ctxOf(t) || '—'; ctx[c] = (ctx[c] || 0) + 1; }
  const top = Object.entries(ctx).sort((a, b) => b[1] - a[1]).slice(0, 8), max = top[0]?.[1] || 1;
  const lim = ui.arqLimit || 80, page = shown.slice(0, lim);
  // agrupa por dia: um cabeçalho com o total do dia, e as tarefas embaixo
  // v6: cada dia é um cartão (data grande, dia da semana, total do dia) e as tarefas dentro
  const DOWN = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
  const groups = []; for (const t of page) { const d = dayOf(t); if (groups.at(-1)?.d !== d) groups.push({ d, items: [] }); groups.at(-1).items.push(t); }
  const rows = groups.map(({ d, items }) => {
    const dd = shown.filter((x) => dayOf(x) === d), nDone = dd.filter((x) => x.st !== 'cancel').length, xpD = dd.reduce((a, x) => a + (x.st === 'cancel' ? 0 : xpOf(x)), 0);
    return `<section class="arq-daycard ${isCollapsed('a:' + d) ? 'shut' : ''}"><div class="arq-day" data-act="collapse" data-k="a:${d}" title="Toque pra recolher ou abrir este dia" style="cursor:var(--cur-hand,pointer)"><span class="ad-n">${d ? d.slice(8) : '—'}</span><span class="ad-m">${d ? `${DOWN[new Date(d + 'T12:00').getDay()]}<br>${fmtDM(d).slice(3)}` : 'sem data'}</span><span class="ad-s"><b>${nDone}</b> feita(s)<br><span class="gold">+${fmtN(xpD)} XP</span></span></div>
      <div class="list">${items.map((t) => `<div class="li ${t.st === 'cancel' ? 'canc' : ''}"><div class="lt">${t.st === 'cancel' ? '✕' : '✓'} ${esc(t.text)}${(t.sal ?? t.reza) ? ' <span title="Resolvida com BANHO DE SAL GROSSO (estava em ' + R.PRAGA_NAMES[t.sal ?? t.reza] + ')">🧂</span>' : ''}<small>${esc(ctxOf(t))}${(t.rounds || []).length ? ` · 🔁 ${t.rounds.length}` : ''}</small></div><span class="chip xp">+${xpOf(t)}</span></div>`).join('')}</div></section>`;
  }).join('');
  const L = S.core.legacy;
  return `<div class="page-title"><div><h1><em>arquivo</em>.</h1><p>Tudo que você já fechou mora aqui. Toque num quadrinho pra filtrar.</p></div></div>
    ${strip}${historyCard()}<div class="grid" style="margin-bottom:14px">${top.length ? `<div class="card c12"><header><h2>📊 Onde você mais fechou</h2></header><div class="arq-top">${top.map(([n, c]) => `<div class="bar-row"><span>${esc(n.slice(0, 34))}</span><b class="num" style="font-size:8px">${c}</b>${segBar(c / max, 'good sm')}</div>`).join('')}</div></div>` : ''}</div><div class="card" style="margin-bottom:14px"><div class="row">
      <input class="inp grow" data-input="arqF.q" value="${esc(f.q)}" placeholder="🔍 buscar no arquivo" aria-label="Buscar">
      <select class="inp" style="width:auto" data-v3change="arqF.m" aria-label="Mês"><option value="">TODOS OS MESES</option>${months.map((m) => `<option ${f.m === m ? 'selected' : ''} value="${m}">${m.slice(5)}/${m.slice(0, 4)}</option>`).join('')}</select>
      <select class="inp" style="width:auto" data-v3change="arqF.a" aria-label="Área"><option value="">TODAS</option>${[...Object.entries(R.AREAS), ['block', 'BLOCOS']].map(([k, n]) => `<option ${f.a === k ? 'selected' : ''} value="${k}">${n}</option>`).join('')}</select>
      <button class="btn" data-act="archive-now">🔄 ATUALIZAR</button><button class="btn danger" data-act="arq-empty" ${Object.keys(S.arq).length ? '' : 'disabled'} title="Escolha os meses; XP e medalhas ficam">🗑 ESVAZIAR…</button></div>
      ${L ? `<p class="meta" style="margin:8px 0 0">saldo histórico guardado: ${fmtN(L.done || 0)} concluídas · ${fmtN(L.onTime || 0)} no prazo</p>` : ''}</div>
    <div class="grid">
      <div class="c12 arq-list">${rows || '<div class="card"><div class="empty">nada encontrado.</div></div>'}${shown.length > lim ? '<button class="more" data-act="arq-more">mostrar mais</button>' : ''}</div></div>`;
}

// ───────────── ações da v3 (somadas às do app) ─────────────
export function extend(ACTIONS, render) {
  window.__weeklyPick = () => ACTIONS['weekly-pick']();
  Object.assign(ACTIONS, {
    collapse: (d, e, el) => { // v6.3: o título que você tocou fica parado no mesmo lugar da tela (o cartão não "pula")
      const y0 = (el || document.querySelector(`[data-k="${CSS.escape(d.k)}"]`))?.getBoundingClientRect().top;
      // v6.4: a página não encolhe enquanto você está na aba (senão, perto do fim, o navegador puxa a tela e o cartão "vai pra baixo")
      const mn = document.getElementById('main'); if (mn) { mn.style.minHeight = Math.max(mn.offsetHeight, parseFloat(mn.style.minHeight) || 0) + 'px'; mn.dataset.keepFor = location.hash; }
      toggleCollapse(d.k); render(); sfx('swish');
      // v7.7: corrige já e de novo quando imagens, gráficos e o mapa terminam de assentar (eles mudam a altura DEPOIS do redesenho e empurravam o cartão)
      const fix = () => { const h = document.querySelector(`[data-k="${CSS.escape(d.k)}"]`); if (!h || y0 == null) return; const dy = h.getBoundingClientRect().top - y0; if (Math.abs(dy) > 1) window.scrollBy(0, dy); };
      fix(); let moved = false; const off = () => { moved = true; }; addEventListener('wheel', off, { once: true, passive: true }); addEventListener('touchmove', off, { once: true, passive: true });
      // v9.0 (pedido do dono: linhas pulando, mais no PERKS): em vez de corrigir em 150/450/900 ms (cada correção era um pulo visível),
      // um ResizeObserver corrige ANTES de a tela ser pintada sempre que a altura muda, durante 1,2 s
      const ro = new ResizeObserver(() => { if (!moved) fix(); }); ro.observe(document.body); const mn2 = document.getElementById('main'); if (mn2) ro.observe(mn2);
      setTimeout(() => ro.disconnect(), 1200);
    },
    qtab: (d) => { const ui = window.__ui; if ((document.querySelector('.qbar .seg button.on')?.dataset.tab || ui.qtab || 'listas') === d.tab && !ui.mm) ui.mm = true; else { ui.mm = false; ui.qtab = d.tab; } render(); sfx('tab'); }, // v6: tocar de novo na janela aberta = memento mori
    'mm-off': () => { window.__ui.mm = false; render(); sfx('tab'); },
    'ag-day': (d) => { const list = R.openTasks(S).filter((t) => t.due === d.d), pg = window.__pragaDays?.[d.d]; openModal(`<h2>${fmtDM(d.d)}</h2>${pg?.length && d.d >= today() && d.d <= addDays(today(), 3) ? `<p class="pg-coming" style="display:block;border-radius:8px;padding:6px 10px;margin:0 0 10px">🪰 O TREM chega aqui: se ninguém fizer até a véspera, neste dia vira TREM TRAPAIADO: ${esc(pg.slice(0, 6).join(' · '))}</p>` : ''}<div class="list">${((rits, blks) => `${blks.map((b) => `<div class="li" data-color="${b.color || ''}"><div class="lt" data-act="jump-block" data-id="${b.id}" style="cursor:var(--cur-hand,pointer)">◆ ${esc(b.title)}<small>prazo final do bloco</small></div></div>`).join('')}${rits.map((r) => `<div class="li rit"><div class="lt" data-act="jump-rit" data-id="${r.id}" style="cursor:var(--cur-hand,pointer)">🔁 ${esc(r.name)}<small>ritual</small></div></div>`).join('')}`)(R.ritualDates(S, d.d, 1)[d.d] || [], S.quests.blocks.filter((b) => b.st !== 'done' && b.due === d.d))}${list.map((t) => `<div class="li" data-list="${R.listOf(t)}"><div class="lt" data-act="jump" data-id="${t.id}" style="cursor:var(--cur-hand,pointer)">${esc(t.text)}<small>${esc(t.block ? R.findBlock(S, t.block)?.title || '' : R.areaName(t.area))}</small></div><span class="chip xp">${R.taskXp(S, t).xp}</span></div>`).join('') || (R.ritualDates(S, d.d, 1)[d.d] || S.quests.blocks.some((b) => b.st !== 'done' && b.due === d.d) ? '' : '<div class="empty">nada vence nesse dia.</div>')}</div><div class="actions"><button class="btn" data-close>FECHAR</button></div>`); },
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
      openModal(`<form data-v3form="weekly" data-target="${target}"><h2>📌 3 missões da ${sunday ? 'próxima semana' : 'semana'}</h2><input class="inp" data-v4filter=".wk-list" placeholder="🔍 buscar missão…" aria-label="Buscar missão" style="margin-bottom:8px"><div class="list wk-list" style="max-height:52vh;overflow:auto">${list.map((t) => `<label class="li" style="cursor:var(--cur-hand,pointer)"><span class="lt"><input type="checkbox" name="w" value="${t.id}" ${cur.has(t.id) ? 'checked' : ''}> ${esc(t.text)}<small>${esc(t.block ? R.findBlock(S, t.block)?.title || '' : R.AREAS[t.area])}${t.due ? ' · ' + fmtDM(t.due) : ''}</small></span></label>`).join('')}</div><div class="actions"><button type="button" class="btn" data-close>CANCELAR</button><button class="btn pri">SALVAR</button></div></form>`, { wide: true });
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
        <div class="list">${ms.map((m) => `<label class="li" style="cursor:var(--cur-hand,pointer)"><span class="lt"><input type="checkbox" name="m" value="${m}" checked> ${m.slice(5)}/${m.slice(0, 4)}<small>${(S.arq[m].tasks || []).length} tarefa(s)</small></span></label>`).join('')}</div>
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

// v6.4: ao trocar de aba, a página volta a ter a altura do conteúdo
window.addEventListener('hashchange', () => { const mn = document.getElementById('main'); if (mn && mn.dataset.keepFor !== location.hash) { mn.style.minHeight = ''; delete mn.dataset.keepFor; } });
