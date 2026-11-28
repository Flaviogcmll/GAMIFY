import { prefs as aprefs } from '../audio.js';
// TELAS DOMINGO (baú semanal), CONQUISTAS e REGRAS (capítulo, regras, ajustes, backup).
import { S, status, backendKind } from '../store.js';

import * as R from '../rules.js';
import { tiles } from '../telas.js';
import { scratchCard } from '../mapa.js';
import { sundayTarget } from '../actions.js';

import { esc, today, fmtDM, fmtDMY, weekday, fmtN, DOW, weekStart, addDays, lightNow } from '../util.js';
import { isCollapsed } from '../v3.js';
import { vitrine, quem, sorte } from '../elenco.js';

import { settingsV35 } from '../v35.js';
import { weekSummary } from '../pstate.js';

import { rulesEditor, shopEditor } from '../v4.js';

import { legendHtml } from './quests.js';
import { backupPanel } from '../backup.js';
import { artWanted } from '../pnew.js';

import { driveCard } from '../drive.js';

import { segBar } from '../ui.js';
import { px } from '../icons.js';

import { prefs } from '../audio.js';


// ───────────── META DO DIA SUGERIDA (pela sua média) ─────────────
function metaCard() {
  const xp = R.idx(S).xpByDay, td = today(), days = Array.from({ length: 28 }, (_, i) => addDays(td, -i - 1)), vals = days.map((d) => xp[d] || 0).filter((v, i) => v > 0 || i < 7);
  const act = days.filter((d) => (xp[d] || 0) > 0).length;
  if (act < 7) return `<div class="card c12"><header><h2>🎯 Meta do dia sugerida</h2></header><p class="meta" style="margin:0">Use o app por uns 7 dias e eu sugiro uma meta pela sua média.</p></div>`;
  const avg = vals.reduce((a, b) => a + b, 0) / Math.max(1, days.filter((d) => (xp[d] || 0) > 0).length), sug = Math.max(20, Math.round((avg * 0.9) / 10) * 10), cur = R.dailyGoal(S).goal;
  return `<div class="card c12"><header><h2>🎯 Meta do dia sugerida</h2></header><p class="meta" style="margin:0 0 8px">Sua média nos dias ativos das últimas 4 semanas: <b>${Math.round(avg)} XP</b>. Meta ideal: um pouco abaixo da média, pra bater quase sempre.</p>
    <div class="row"><span>Hoje: <b>${cur} XP</b> → sugerida: <b>${sug} XP</b></span><button class="btn sm pri" data-act="goal-apply" data-v="${sug}" ${sug === cur ? 'disabled' : ''}>USAR ${sug} XP</button></div></div>`;
}
// ───────────── RESUMO DA SEMANA (o PRIMO conta como foi) ─────────────
export function resumoSemana() {
  const ws = weekStart(today()), cur = weekSummary(ws), prev = weekSummary(addDays(ws, -7));
  const row = (t, x) => (x ? `<div class="li"><div class="lt">${esc(x.text)}<small>${t}</small></div></div>` : '');
  return `<div class="wk-res"><h3>📖 Resumo da semana</h3><div class="list">${row('esta semana (até agora)', cur)}${row('semana passada', prev)}${!cur && !prev ? '<div class="empty">Conclua tarefas e volte aqui: o PRIMO resume pra você.</div>' : ''}</div></div>`;
}
// ───────────── PESO (fica junto do baú) ─────────────
function pesoCard() {
  const w = Object.entries(S.core.weights || {}).sort((a, b) => a[0].localeCompare(b[0])), td = today(), last = w.slice(-20);
  let chart = '';
  if (last.length >= 2) {
    const vs = last.map((x) => x[1]), lo = Math.min(...vs) - 0.5, hi = Math.max(...vs) + 0.5;
    const pts = last.map(([, v], i) => `${(i / (last.length - 1)) * 300},${50 - ((v - lo) / (hi - lo)) * 46}`).join(' ');
    chart = `<svg viewBox="0 0 300 54" class="wchart" preserveAspectRatio="none" aria-label="Gráfico do peso"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  }
  const first = w[0]?.[1], cur = w[w.length - 1]?.[1], diff = first != null ? Math.round((cur - first) * 10) / 10 : null;
  return `<div class="card c12" data-gk="peso"><header><h2>⚖ Peso</h2><span class="meta">${cur != null ? `${String(cur).replace('.', ',')} kg${diff ? ` · ${diff > 0 ? '+' : ''}${String(diff).replace('.', ',')} desde o início` : ''}` : 'sem registros'}</span></header>
    <form data-v4form="weight" class="row" autocomplete="off"><input class="inp" type="date" name="d" value="${td}" aria-label="Data" style="width:auto"><input class="inp grow" name="kg" inputmode="decimal" placeholder="peso em kg (ex.: 78,4)" aria-label="Peso em kg"><button class="btn pri">ANOTAR</button></form>
    ${chart}<div class="list" style="margin-top:8px;max-height:200px;overflow:auto">${[...w].reverse().slice(0, 15).map(([d, v]) => `<div class="li"><div class="lt">${String(v).replace('.', ',')} kg<small>${DOW[weekday(d)]} ${fmtDM(d)}</small></div><button class="btn sm ghost" data-act="weight-del" data-d="${d}" aria-label="Apagar">✕</button></div>`).join('') || '<div class="empty">Anote o primeiro peso acima.</div>'}</div></div>`;
}
// ───────────── REFLEXÃO (era DOMINGO) ─────────────
/** v8.6 (pedido do dono): a REFLEXÃO não é mais uma aba: vira um banner recolhível dentro do SURVIVAL
 *  (nota da semana, baú de domingo, peso, histórico e descarregar a cabeça). O "como foi a semana" foi pro lado dos DESAFIOS. */
export function reflexaoBanner() {
  const td = today();
  const target = sundayTarget(td);
  const already = target && S.core.sundays.some((x) => x.date === target);
  const ms = S.core.milestones || [];
  const hist = [...S.core.sundays].sort((a, b) => (a.date < b.date ? 1 : -1));
  const avg = (x) => { const v = Object.values(x.notes || {}).map(Number).filter((n) => !isNaN(n)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const daysTo = (7 - weekday(td)) % 7;
  const form = target && !already ? `<div class="card c12"><header><h2>🎁 Abrir o baú ${target !== td ? '(atrasado, de domingo)' : 'de hoje'}</h2><span class="meta">10 minutos</span></header>
    <form data-form="sunday" autocomplete="off">
      <p class="muted" style="margin:0 0 6px;font-size:13.5px">Nota de 1 a 10 pra cada área da vida nesta semana.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
        ${ms.map((m, i) => `<label style="display:flex;flex-direction:column;gap:4px"><span class="lbl" style="margin:0">${esc(m)}</span><input class="inp num" type="number" min="1" max="10" name="n${i}" id="sun-n${i}" required></label>`).join('')}
      </div>
      <label class="lbl">Os 3 rituais (os 3 = baú em dobro)</label>
      <div style="display:flex;flex-direction:column;gap:6px">
        <label><input type="checkbox" name="prazos" id="sun-prazos"> 📅 Prazos da semana distribuídos</label>
        <label><input type="checkbox" name="pessoas" id="sun-pessoas"> 👥 Pessoas na agenda</label>
        <label><input type="checkbox" name="quests" id="sun-quests"> 🗺 QUESTS revisado (o que perdeu sentido → ✖)</label>
      </div>
      <div style="margin-top:6px"><label class="lbl" for="sun-text">Notas da semana</label><input class="inp" name="text" id="sun-text"></div>
      <div class="row" style="justify-content:space-between;margin-top:14px"><span class="muted">Baú: <b class="acc num" id="sun-preview">50</b> XP</span><button class="btn pri">🎁 ABRIR BAÚ</button></div>
    </form></div>`
    : `<div class="card c12"><header><h2>🎁 Baú de domingo</h2></header>
      <p style="font-size:17px;margin:4px 0">${already ? '✔ Baú desta semana já aberto.' : `O baú abre ${daysTo === 0 ? 'hoje' : `em ${daysTo} dia(s)`} (domingo).`}</p>
      <p class="muted">Todo domingo: nota de 1 a 10 pra cada área + os 3 rituais = abre o baú (50 XP, dobra com os 3 rituais, +10 por nota ≥ 8). A média vira o buff da semana: ≥ 8 ✨ INSPIRADO (+20%), &lt; 5 😩 CANSADO (-10%).</p></div>`;
  const table = `<div class="card c12"><header><h2>Histórico</h2><span class="meta">${hist.length} baús</span></header><div style="overflow-x:auto">
    <table class="hg" style="min-width:${ms.length * 70 + 360}px"><thead><tr><th class="hn">DATA</th>${ms.map((m) => `<th>${esc(m)}</th>`).join('')}<th>MÉDIA</th><th>BUFF</th><th>XP</th><th class="hn">NOTAS</th></tr></thead>
    <tbody>${hist.map((x) => { const a = avg(x); return `<tr><th class="hn">${fmtDM(x.date)}</th>${ms.map((m) => `<td style="text-align:center">${x.notes?.[m] ?? ''}</td>`).join('')}
      <td style="text-align:center"><b class="num">${a == null ? '' : a.toFixed(1).replace('.', ',')}</b></td><td style="text-align:center">${a == null ? '' : a >= 8 ? '✨' : a < 5 ? '😩' : '⚖'}</td>
      <td style="text-align:center" class="acc num">${x.xp}</td><td class="info" style="white-space:normal">${esc(x.text || '')}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  const a0 = hist[0] ? avg(hist[0]) : null, a1 = hist[1] ? avg(hist[1]) : null, nf = (v) => (v == null ? '—' : v.toFixed(1).replace('.', ','));
  const diff = a0 != null && a1 != null ? a0 - a1 : null;
  const strip = tiles([
    { label: '📖 Nota da semana', value: nf(a0), sub: hist[0] ? `baú de ${fmtDM(hist[0].date)}` : 'abra o 1º baú', tone: a0 == null ? 'neutro' : a0 >= 8 ? 'ok' : a0 < 5 ? 'urg' : 'atencao', tip: 'Média das notas do último baú de domingo' },
    { label: '⏮ Semana anterior', value: nf(a1), sub: hist[1] ? fmtDM(hist[1].date) : '', tone: 'neutro' },
    { label: diff == null ? '↕ Diferença' : diff >= 0 ? '▲ Melhorou' : '▼ Caiu', value: diff == null ? '—' : `${diff >= 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')}`, tone: diff == null ? 'neutro' : diff >= 0 ? 'ok' : 'quase', tip: 'Nota desta semana menos a da anterior' },
    (() => { const ws = weekStart(td), h = (S.core.praga?.hist || []).filter((x) => x.d >= ws); return { label: '🐛 TREM TRAPAIADO na semana', value: h.length, sub: h.length ? `${h.filter((x) => x.sal ?? x.reza).length} com banho de sal grosso` : (S.core.praga?.lastSeen >= ws ? 'tem praga ativa' : 'semana limpa 🌙'), tone: h.length ? 'quase' : 'ok', tip: 'Quantas tarefas atrasadas viraram praga e foram limpas nesta semana' }; })(),
    { label: '🎁 Baús abertos', value: hist.length, sub: `${fmtN(hist.reduce((s, x) => s + (x.xp || 0), 0))} XP`, tone: 'premio' },
  ]);
  const ck = 'c:survival:reflexao', shut = isCollapsed(ck);
  return `<section class="vitrine reflexao-v ${shut ? 'shut' : ''}" data-v="reflexao" id="reflexao"><header class="vit-h" data-act="collapse" data-k="${ck}" title="Toque pra recolher ou abrir a REFLEXÃO" style="--img:url('${new URL(`assets/topo/domingo-${lightNow() === 'noite' ? 'noite' : 'dia'}.webp`, document.baseURI).href}')"><div><h2><span class="chev">${shut ? '▸' : '▾'}</span> 📖 REFLEXÃO</h2><p>Baú de domingo, peso, histórico e descarregar a cabeça.</p></div></header>
    ${shut ? '' : `<div class="vit-b">${strip}<div class="grid">${form}${pesoCard()}${scratchCard()}${table}</div></div>`}</section>`;
}

// ───────────── CONQUISTAS ─────────────
// v5.16: faixa de resumo, "quase lá" primeiro (a recompensa perto motiva mais: desconto temporal), filtro de 1 toque,
// dourado = ganha (recompensa) · cinza com cadeado = falta.
/** v7.4: CONQUISTAS por categoria (v7.7: em linhas simples, sem banner) */
const CONQ_CATS = [['organizacao', '🗂 ORGANIZAÇÃO'], ['tarefas', '✅ TAREFAS E PRAZOS'], ['bosses', '👹 BOSSES E BLOCOS'], ['habitos', '💪 HÁBITOS E CORPO'], ['praga', '🐺 OS TREM E O LOBO'], ['feira', '🎪 FEIRA E OURO'], ['jornada', '🧭 JORNADA'], ['outras', '✨ OUTRAS']];
const CONQ_OF = {
  organizacao: ['focos', 'revisoes', 'ritos', 'mudanca', 'planejados', 'nfLimpa'],
  tarefas: ['done', 'onTime', 'withDue', 'maxDone', 'early', 'star', 'legendaryDay', 'approved', 'home', 'people'],
  bosses: ['bossDone', 'miniDone', 'stepsDone', 'blocksClosed', 'bdClosed', 'trClosed', 'capClosed', 'gsClosed', 'windows', 'reviewedNow'],
  habitos: ['treino', 'dieta', 'sono', 'selfcare', 'maxStreak', 'perfectRun', 'noPoison', 'cleanDays', 'flame', 'daysRegistered', 'rd'],
  praga: ['pragaCured', 'pragaEarly', 'pragaExo', 'pragaGhosts', 'pragaCalm', 'antidoto'],
  feira: ['goldIn', 'forged', 'ferreiro'],
  jornada: ['level', 'maxAttr', 'minAttr', 'focus', 'sundays', 'missionWeeks', 'legendaryWeeks', 'prazoWeeks', 'trips', 'bond', 'petStage'],
};
const topoD = (k) => `assets/topo/${k}-${lightNow() === 'noite' ? 'noite' : 'dia'}.webp`;
/** cenário e personagem de cada categoria (até chegar a arte própria de cada banner: ver os prompts no Drive) */
const CONQ_BANNER = {
  organizacao: [topoD('arquivo'), ['cajulina', 4, 'CAJULINA carimba cada passo']], tarefas: [topoD('agenda'), ['primo', 1, 'PRIMO e as tarefas do dia']],
  bosses: [topoD('conquistas'), ['boi-nilton', 3, 'BOI NILTON mede a obra']], habitos: [topoD('survival'), ['eve-la', 2, 'EVE LÃ e o cuidado de todo dia']],
  praga: [topoD('domingo'), ['guarana', 4, 'GUARANÁ cheirando o chão']], feira: [topoD('ferreiro'), ['frog-lipe', 1, 'FROG LIPÊ na ferraria']],
  jornada: [topoD('rotina'), ['primo', 3, 'PRIMO na estrada']], outras: [topoD('regras'), ['megg', 1, 'MEGG DE FÁTIMA anota tudo']],
};
const conqCat = (a) => Object.keys(CONQ_OF).find((k) => CONQ_OF[k].includes(a.metric)) || 'outras';
export function viewConquistas(ui) {
  const list = R.achievementList(S);
  const got = list.filter((a) => a.unlocked).sort((a, b) => ((a.date || '') < (b.date || '') ? 1 : -1));
  const left = list.filter((a) => !a.unlocked).sort((a, b) => b.pct - a.pct);
  const near = left.filter((a) => a.pct >= 0.5);
  const xp = got.reduce((a, x) => a + (S.core.achievements[x.key]?.xp || x.xp), 0), last = got[0];
  const f = ui?.cq || 'todas';
  const medal = (a) => `<div class="medal ${a.unlocked ? 'on' : a.pct >= 0.5 ? 'near' : ''}"><div class="mi">${px(a.unlocked ? 'conquistas' : 'lock', 24)}</div>
      <div><div class="mn">${esc(a.name)} <span class="xpc">+${a.xp}</span></div><div class="md">${esc(a.desc)}</div>
      ${a.unlocked ? `<div class="md good">desbloqueada ${fmtDM(a.date)}</div>` : `${segBar(a.pct, 'sm')}<div class="md num">${fmtN(Math.min(a.value, a.goal))}/${fmtN(a.goal)}${a.pct >= 0.5 ? ` · falta${a.goal - a.value > 1 ? 'm' : ''} ${fmtN(a.goal - a.value)}` : ''}</div>`}</div></div>`;
  const sec = (title, items, empty) => `<h2 class="sec-h">${title} <span class="meta">${items.length}</span></h2>${items.length ? `<div class="medals">${items.map(medal).join('')}</div>` : `<div class="empty">${empty}</div>`}`;
  // v9.5 (pedido do dono): os botões de filtro (QUASE LÁ, FALTAM) saíram; os quadrinhos só informam
  const strip = tiles([
    { label: '🏆 Desbloqueadas', value: `${got.length}/${list.length}`, tone: 'premio', sub: `${Math.round((got.length / list.length) * 100)}% do galpão` },
    { label: '✨ XP de medalhas', value: fmtN(xp), cls: 'gold', tone: 'premio' },
    last && { label: '🕐 Última', value: `<span class="lastm">${esc(last.name)}</span>`, sub: fmtDM(last.date), tone: 'premio' },
  ]); // v9.0 (pedido do dono): o 🎯 FALTA POUCO (as 3 mais perto) saiu; o QUASE LÁ já mostra isso
  // v9.5 (pedido do dono): cada categoria é um BANNER (cenário + o personagem que combina), recolhível; dentro, as medalhas
  const body = CONQ_CATS.map(([k, t]) => {
    const items = [...got, ...left].filter((a) => conqCat(a) === k);
    if (!items.length) return '';
    const n = items.filter((a) => a.unlocked).length, [topo, host] = CONQ_BANNER[k] || CONQ_BANNER.outras;
    return vitrine({ k: 'c:conq:' + k, v: 'conq-' + k, title: t, sub: `${n} de ${items.length} no galpão`, topo, host, shut: isCollapsed('c:conq:' + k), body: `<div class="medals">${items.map(medal).join('')}</div>` });
  }).join('');
  return `<div class="page-title"><div><h1><em>conquistas</em>.</h1><p>O GALPÃO DOS TROFÉUS do BARRANCO BAIXO: toque num banner pra abrir.${f !== 'todas' ? ' <a href="#" data-act="cq" data-v="todas">ver todas</a>' : ''}${S.core.season?.from ? ` · <span title="As do capítulo anterior ficam guardadas">capítulo anterior: ${Object.keys(S.core.achievements || {}).length} conquistas</span>` : ''}</p></div></div>
    ${strip}${body}`;
}

// ───────────── PERKS AND RULES (tutorial + regras + ajustes) ─────────────
const RULES = [
  ['XP', ['Subtarefa 8 · lista 15 · ↳ passo 4 · ⚔ mini-boss 40 (ou o escrito) · 🛡 casa/família 50 · (60XP) no texto manda.', 'Fechar bloco: BREAKDOWN 100 · 🎯 meta 200 · CAPTAÇÃO 150 · TRABALHO 300. BOSS = o XP escrito + 🎟.', '⭐ adiada x2 · 📅 no prazo x1,5 · 🐦 2+ dias antes x2 · 💰 x1,5. Tudo acumula (⭐ antecipada = x4). Atrasou = sem bônus e −20% por dia (mín. 40%).', 'Hábitos 5 cada · combo 7 dias x1,5 · 14 dias x2 · ⚒ forjado (66 ✓) nunca abaixo de x1,5 · dia perfeito x2 · ⚔ redenção +30.', 'Semana: treino 4 (+40) · noites boas 5 (+30) · casa 5 (+30) · perfeito 1 (+30) · semana no prazo (+50) · os 5 = LENDÁRIA +50.', 'Rituais: 👥 15 por encontro · 🔁 💼 20. Baú de domingo 50 a 190. 🎲 Loot: às vezes concluir solta XP extra, 🎟 ou vale da ALQUIMISTA.']],
  ['Níveis, gold e loja', ['Nível com curva: 500 + 150 por nível². NV 2 ≈ 1 semana · NV 5 ≈ 1,5 mês · NV 10 ≈ 5 meses · NV 20 ≈ 1,5 ano.', 'Títulos: 1 INICIANTE · 3 APRENDIZ DE OBRA · 5 ARQUITETO · 8 SÊNIOR · 10 VETERANO · 15 MESTRE CONSTRUTOR · 20 LENDA.', '🎟 Ticket = 1 item grátis da ALQUIMISTA. Ganha 1 por nível, 1 por BOSS, 1 a cada 10 no prazo e às vezes no loot.', 'GOLD = a sua metade do dinheiro que entrou. 3000💰 no título do bloco: quando fecha, o app pergunta. "1900💰 / MES (DIA 05)": pergunta todo dia 5.', 'FERREIRO: 100 XP por NV do item + o gold (dinheiro real). Item acima do seu nível fica trancado.']],
  ['Buffs', ['✨ INSPIRADO: média do baú ≥ 8 → hábitos +20% na semana.', '🚀 EMBALO: 5+ tarefas ontem → hábitos +20% hoje.', '🦾 MÁQUINA: 4+ treinos em 7 dias → hábitos +15%.', '🧘 ZEN: 7 noites boas seguidas e nenhum ☠ → ALQUIMISTA -20%.', '👑 LENDA: semana passada LENDÁRIA → hábitos +25%.', '🛡 SÁBADO BLINDADO: falha não conta e hábitos +50%.', '⏰ RELÓGIO SUÍÇO: 5+ no prazo seguidas · 🔥 COMBO · 🌟 DIA PERFEITO.', 'v4 · 🏦 POUPADOR (guardou na semana): ALQUIMISTA -10% · 🎯 FOCADO (3 fogueiras na semana): tarefas +10% · 🎒 EXPLORADOR (expedição concluída em 3 dias): hábitos +10% · 📔 CRONISTA (diário 3 dias): tarefas +5% · 🔥 EM CHAMA (3 dias na meta): tarefas +10% · 💙 NO AZUL (mês fechou com sobra): ALQUIMISTA -10%.']],
  ['Debuffs', ['☠ ENVENENADO: falhou o NO PH → ALQUIMISTA x2 por 48h. Cura: ⚔ redenção ou ANTÍDOTO.', '🌫 NEBLINA: 2 dias sem treino → hábitos -50%. Cura: treinar hoje, redenção ou ANTÍDOTO.', '😵 FATIGADO: 2 noites ruins → multa x2 na loja. Cura: 1 noite boa ou ANTÍDOTO.', '🧱 SOBRECARGA: 3 dias sem 🧹 → TRABALHO sem o bônus 💰. Cura: 🧹 hoje.', '🍺 RESSACA: 3+ compras num dia → amanhã hábitos -25%.', '🐌 PROCRASTINAÇÃO: 2 dias sem concluir → ALQUIMISTA x1,5.', '🦥 PREGUIÇA: 3 dias com menos de 3 hábitos → hábitos -30%. Cura: 5+ hoje.', '😩 CANSADO: média do baú < 5 → hábitos -10%. Cura: 2 noites boas.', 'v4 · 🌀 DISPERSO (4+ tarefas ▶ ao mesmo tempo): tarefas -10% · 💸 DEVENDO (2+ "fiz sem comprar" na semana): ALQUIMISTA x1,25 · 🕳 VAZANDO (mês passado com besteira > 40% ou crédito > 70%): ALQUIMISTA x1,15.', 'A punição é estagnação, não retrocesso: debuff trava recompensa, nunca apaga XP. 🛡 1 falha por semana em cada hábito é perdoada. 🏕 Descanso (viagem/doença): marca o dia inteiro como folga.']],
  ['Alertas', ['⏰ ATOLADO: 3+ atrasadas → loja trancada até zerar.', '🪰 ESQUECIDA: atrasada há 7+ dias. Resolva, quebre ou remarque com honestidade.', '🗿 ESTAGNADO: 5 dias sem concluir nada. Use o 🆘 SOS e faça 10 minutos.', '💔 SAUDADE: alguém dos rituais atrasado 3+ dias.', '⚠ SEXTA-FEIRA: é o dia em que mais se quebra sequência. Marque os hábitos.']],
  ['Dicas (suas)', ['YOU NEED TO HAVE A WELL DEFINED "STORY LINE" FOR THIS TO WORK.', 'GAMES ARE LOW RISK HIGH REWARD: CREATE THAT FEELING.', 'BREAK DOWN HIGH RISK GOALS INTO SMALL LOW RISK / HIGH REWARD ONES.', 'SEM DATA NÃO É MISSÃO, É DESEJO. A MAIS CHATA PRIMEIRO.', 'SEMANA-TIPO: SEG/QUA clientes · TER/QUI prefeitura e documentos · SEX escritório, marketing e folga · SÁB casa e pessoas · DOM baú e planejamento.', 'COBRAR ANTES DE CRIAR: dinheiro parado em cliente é a missão mais barata do jogo.', 'META GRANDE = 🎯 BLOCO: ⚔ mini-boss escrito como a vitória → ↳ passos de até 2h. Detalhe só o próximo mini-boss.', 'Sem redes sociais na primeira e na última hora do dia. Scroll é prêmio comprado na ALQUIMISTA, não o padrão.']],
  ['Prazos: consequências (v4.3)', ['⏰ Concluir atrasada paga menos: −20% do XP por dia de atraso, no mínimo 40% (editável em PERKS → Prazos). O bônus de pontualidade some.', '📆 Remarcar custa XP: a 1ª vez que você empurra o prazo de uma tarefa custa 10 XP, a 2ª 20, a 3ª 40… (dobra). Sai do saldo, nunca do nível. Mudar o prazo pra antes não custa.', 'DISTRIBUIR PRAZOS mostra o custo total antes de aplicar. Quanto mais realista o prazo que você põe, menos paga.']],
  ['O PRIMO (v7.2)', ['🔥 O PRIMO é o centro do jogo: o rosto muda com o seu dia e ele fala (banco com centenas de frases). Toque nele pra ouvir outra.', '🎯 PEDIDO DO DIA: um desafio específico (fechar tarefas, uma ⭐, hábitos, foco…) que dá XP e +1 ♥ quando cumprido.', '🐣 BRASINHA: pintinho vermelho de fênix que anda atrás do PRIMO. Ela cresce com os dias que você bate a meta. O chapéu de palha é parte dele (não sai).', '🎮 COMANDOS: moram no cartão do PRIMO (foco, revisar o dia, SOS, distribuir, viagem, descanso, atualizar, backup). Todo comando ganha uma frase dele. O STATUS DO DIA aparece ali em ícones: toque pra ver o que é.', '📖 DIÁRIO: todo fim de semana ele escreve um resumo (XP, tarefas, dias na meta, melhor dia). ♥ Amizade: +1 por dia ao afagar, conversar e responder (5 colega · 15 parceiro · 40 amigo · 100 irmão · 250 primo de consideração).']],
  ['Atalhos', ['Q QUESTS · S SURVIVAL · A AGENDA · L SHOP · B baú de domingo · F FILTRO · R ROTINA · P REGRAS', 'ESPAÇO abre o PRIMO · / escreve nos IMEDIATOS · N alterna dia/noite']],
];
const card = ([t, items]) => `<div class="rblock"><h3>${esc(t)}</h3><ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`;

// v9.5 (pedido do dono: PERKS mais interessante): o PERKS virou um LIVRO com capítulos (banners recolhíveis, cada um com quem cuida dele)
// e a MEGG abre a página com uma dica sorteada das regras
const MEGG_DICAS = ['Sabia que tarefa feita no prazo vale x1,5? E 2 dias antes, x2. Tá no livro.', 'Remarcar a 1ª vez na semana é de graça. A 2ª já pesa no bolso, meu filho.', 'Cada remarcação junta uma mosca na tarefa. Três moscas e ela trava: só sai com hora marcada.', 'A cor da tarefa vem do prazo: até amanhã é URGENTE, até 7 dias ESQUENTANDO.', 'Ferro é raro: o FROG LIPÊ só forja com ele. Gasta com juízo.', 'Domingo tem REVISÃO DA SEMANA. Dez minutinhos e a semana anda sozinha.', 'Ritual cumprido zera as moscas dele. Ritual empurrado junta.', 'O LAMBEHOMI aparece quando uma tarefa apodrece. O ANTÍDOTO é zerar as atrasadas.'];
const capitulo = (k, title, sub, topo, host, body) => vitrine({ k: 'c:perks:' + k, v: 'perks-' + k, title, sub, topo: `assets/topo/${topo}-${lightNow() === 'noite' ? 'noite' : 'dia'}.webp`, host, shut: isCollapsed('c:perks:' + k), body: `<div class="grid">${body}</div>` });
export function viewRegras() {
  const ch = S.core.chapter || {};
  const tot = R.totals(S);
  const kb = (n) => Math.round(JSON.stringify(n || {}).length / 1024);
  const mode = localStorage.getItem('gamify-ui:mode') || 'auto';
  const nv = R.neuro(S), bools = Object.entries(nv).filter(([, v]) => typeof v === 'boolean'), on = bools.filter(([, v]) => v).length;
  const cast = { loja: 'LOJA CARA', aviso: 'SÓ AVISO', nenhum: 'NENHUM' }[S.core.settings?.castigo || 'loja'];
  let cur = 'pena'; try { cur = localStorage.getItem('gamify-ui:cursor') || 'pena'; } catch { /* */ }
  const strip = tiles([
    { label: '🧠 Recursos ligados', value: `${on}/${bools.length}`, sub: on === bools.length ? 'tudo ligado' : `${bools.length - on} desligado(s)`, tone: on === bools.length ? 'ok' : 'atencao', tip: 'Relógio do corpo, migração do mês, time box, pato de borracha… (liga e desliga no cartão 🧠)' },
    { label: '⚖ Castigo', value: `<span class="lastm">${cast}</span>`, tone: cast === 'NENHUM' ? 'neutro' : 'quase', tip: 'O que acontece quando os prazos estouram' },
    { label: '🔊 Sons', value: aprefs.on ? 'LIGADO' : 'DESLIGADO', sub: `efeitos ${Math.round((aprefs.sfx ?? 0.6) * 100)}%`, tone: aprefs.on ? 'ok' : 'neutro', tip: 'Música e efeitos (botão ♪ no topo)' },
    { label: '🖱 Cursor', value: `<span class="lastm">${{ pena: 'PENA DA BRASINHA', seta: 'SETA DO JOGO', pincel: 'PINCEL', patinha: 'PATINHA', normal: 'NORMAL' }[cur] || cur}</span>`, tone: 'neutro', tip: 'Troca em Ajustes, mais abaixo' },
    { label: '📖 Capítulo', value: ch.n || 1, sub: esc(ch.title || ''), tone: 'premio' },
  ]);
  return `<div class="page-title"><div><h1><em>perks and rules</em>.</h1></div></div>
    ${strip}${quem('megg', 1, sorte(MEGG_DICAS))}
    ${capitulo('livro', '📖 O LIVRO DA MEGG', 'As regras do jogo do BARRANCO BAIXO: quanto vale cada coisa, os buffs, os castigos.', 'regras', ['megg', 1, 'MEGG DE FÁTIMA, dona das REGRAS'], `      <div class="card c12" data-gk="legenda"><header><h2>📖 Legenda · como marcar e quanto vale</h2></header>${legendHtml()}</div>
      <div class="card c12" data-gk="ref"><header><h2>📖 Referência · regras com os valores padrão</h2></header><div class="refgrid">${RULES.map(card).join('')}</div></div>
      ${rulesEditor()}`)}
    ${capitulo('corpo', '🧠 CORPO E CABEÇA', 'A neurociência que o app usa por você: relógio do corpo, foco, sono, avisos.', 'survival', ['eve-la', 2, 'EVE LÃ cuida do corpo e da cabeça'], `      ${neuroCard()}`)}
    ${capitulo('casa', '🎛 AJUSTES DA CASA', 'Jeitos salvos, nomes das janelas, sons, cursor, loja e castigo.', 'rotina', ['boi-nilton', 1, 'BOI NILTON ajusta a obra'], `      ${presetsCard()}
      ${settingsV35()}
      <div class="card c12" data-gk="nomes"><header><h2>✏ Nomes das listas e janelas</h2><span class="meta">só o texto muda; as regras continuam as mesmas</span></header>
        <div class="namegrid">${R.labelFields().map(([k, def]) => `<label><span class="px">${esc(def)}</span><input class="inp" data-change="label" data-k="${k}" value="${esc(S.core.labels?.[k] || '')}" placeholder="${esc(def)}" maxlength="24" aria-label="Nome para ${esc(def)}"></label>`).join('')}</div>
        <p class="meta" style="margin:8px 0 0">Deixe em branco pra voltar ao nome padrão. Para criar uma janela nova, use o ＋ na barra das janelas do QUESTS.</p></div>
      <div class="card c12" data-gk="ajustes"><header><h2>⚙ Ajustes</h2></header>
        <label class="lbl" for="set-mode">Visual</label><select class="inp" id="set-mode" data-change="mode"><option value="auto" ${mode === 'auto' ? 'selected' : ''}>AUTOMÁTICO (papel 6h–18h · fogueira à noite)</option><option value="day" ${mode === 'day' ? 'selected' : ''}>SEMPRE PAPEL</option><option value="night" ${mode === 'night' ? 'selected' : ''}>SEMPRE FOGUEIRA</option></select>
        <label class="lbl" for="set-primo">Desenho do PRIMO</label><select class="inp" id="set-primo" data-change="primo-art"><option value="novo" ${artWanted() ? 'selected' : ''}>NOVO (arte em alta definição, com cenários)</option><option value="classico" ${artWanted() ? '' : 'selected'}>CLÁSSICO (porquinho em pixel)</option></select>
        ${[['music', 'Música lo-fi'], ['fire', 'Som da fogueira'], ['sfx', 'Efeitos']].map(([k, n]) => `<label class="lbl" for="vol-${k}">${n}</label><input id="vol-${k}" type="range" min="0" max="1" step="0.05" value="${prefs[k]}" data-change="vol" data-k="${k}" style="width:100%">`).join('')}
        <label class="lbl" for="set-cur">Cursor (neste aparelho)</label><select class="inp" id="set-cur" data-change="cursor">${[['pena', '🪶 PENA DA BRASINHA (padrão)'], ['seta', '➤ SETA DO JOGO'], ['pincel', '🖌 PINCEL MÁGICO'], ['patinha', '🐾 PATINHA DO PORQUINHO'], ['normal', 'NORMAL DO SISTEMA']].map(([k, n]) => `<option value="${k}" ${((() => { try { return localStorage.getItem('gamify-ui:cursor'); } catch { return null; } })() || 'pena') === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <label class="lbl" for="set-cast" title="A cada ${R.BLOW_EVERY} prazos estourados. Resolver ou remarcar 1 atrasada cancela o castigo.">Castigo por prazos estourados</label><select class="inp" id="set-cast" data-change="setting" data-k="castigo">${[['loja', `LOJA ${Math.round((R.BLOW_MULT - 1) * 100)}% MAIS CARA POR ${R.BLOW_DAYS} DIAS`], ['aviso', 'SÓ UM AVISO'], ['nenhum', 'NENHUM']].map(([k, n]) => `<option value="${k}" ${(S.core.settings?.castigo || 'loja') === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <label class="lbl" for="set-max">Máx. de prazos por dia útil</label><input class="inp" id="set-max" type="number" min="1" max="20" value="${S.core.settings?.maxPerDay || R.C.MAX_PER_DAY}" data-change="setting" data-k="maxPerDay">
        <label class="lbl" for="set-ms">Áreas do baú de domingo</label><textarea class="inp" id="set-ms" rows="2" data-change="milestones">${esc((S.core.milestones || []).join(', '))}</textarea>
        <div class="row" style="margin-top:12px"><button class="btn sm" data-act="edit-habits">✎ HÁBITOS</button><button class="btn sm" data-act="backup-download">⬇ BAIXAR BACKUP</button><button class="btn sm" data-act="backup-import">IMPORTAR</button><button class="btn sm ghost" data-act="gorder-reset" title="Volta os cartões das telas pra ordem original">↺ ORDEM DOS CARTÕES</button></div>
        ${backupPanel()}
        <p class="meta" style="margin:10px 0 0">Dados: ${backendKind() === 'db' ? '☁ banco do claude.ai (sincroniza celular e PC; precisa de internet)' : '💻 só neste navegador'} · desde ${fmtDMY(S.core.startDate)} · ${fmtN(tot.earned)} XP · quests ${kb(S.quests)} KB${status.error ? ` · <span class="bad">${esc(status.error)}</span>` : ''}</p></div>
      ${shopEditor()}`)}
    ${capitulo('cofre', '💾 O COFRE', 'Backup, Google Drive e o tamanho dos seus dados.', 'arquivo', ['cajulina', 4, 'CAJULINA guarda tudo no CARTÓRIO'], `      ${metaCard()}
      ${driveCard()}`)}
    ${capitulo('historia', '🌅 SUA HISTÓRIA', 'O capítulo que você está vivendo: missão, porquê e até quando.', 'domingo', ['primo', 3, 'PRIMO na estrada'], `      <div class="card c12" data-gk="historia"><header><h2>📖 Sua história · o capítulo que você está vivendo</h2><button class="btn sm pri" data-act="new-chapter" title="Fecha este capítulo (vira uma carta guardada) e começa outro">🌅 NOVO CAPÍTULO</button></header>
        <form data-form="chapter" autocomplete="off">
          <div class="row"><div style="width:90px"><label class="lbl" for="ch-n">Nº</label><input class="inp" id="ch-n" name="n" type="number" min="1" value="${esc(ch.n)}"></div>
            <div class="grow"><label class="lbl" for="ch-title">Título</label><input class="inp" id="ch-title" name="title" value="${esc(ch.title)}"></div></div>
          <label class="lbl" for="ch-mission">Missão (uma só)</label><input class="inp" id="ch-mission" name="mission" value="${esc(ch.mission)}">
          <label class="lbl" for="ch-why">Por quê</label><input class="inp" id="ch-why" name="why" value="${esc(ch.why)}">
          <div class="row" style="align-items:end"><div class="grow"><label class="lbl" for="ch-until">Até</label><input class="inp" id="ch-until" name="until" type="date" value="${esc(ch.until || '')}"></div><button class="btn pri">SALVAR CAPÍTULO</button></div>
        </form></div>
`)}
    <p class="creditos-link"><a href="#" data-act="credits" title="Créditos das artes, sons e fontes">ⓘ créditos</a></p>`;
}

// ───────────── ARQUIVO ─────────────

/** v5.14: neurociência — o que o app faz por você (cada item liga/desliga) e os seus horários */
/** v7.5: salvar o jeito atual com um nome ("SEMANA PESADA", "FÉRIAS"…), trocar com 1 toque e VOLTAR AO PADRÃO */
function presetsCard() {
  const list = S.core.presets || [];
  return `<div class="card c12" data-gk="presets"><header><h2>🎛 Presets e padrão</h2><span class="meta">guarda todos os ajustes de PERKS (regras, castigo, 🧠, TREM); seus horários não mudam</span></header>
    <form class="row" data-form="preset-save" autocomplete="off" style="gap:8px;flex-wrap:wrap"><input class="inp grow" name="name" maxlength="24" placeholder="nome do jeito atual (ex.: SEMANA PESADA, FÉRIAS)" aria-label="Nome do preset"><button class="btn pri">💾 SALVAR O JEITO ATUAL</button><button type="button" class="btn danger" data-act="settings-reset" title="Volta todos os ajustes ao padrão do app (os seus horários de acordar, dormir e comer ficam)">↺ VOLTAR AO PADRÃO</button></form>
    ${list.length ? `<div class="list" style="margin-top:10px">${list.map((p) => `<div class="li"><div class="lt"><b>${esc(p.name)}</b><small>guardado em ${fmtDM(p.at)}</small></div><span class="row" style="gap:4px"><button class="btn sm pri" data-act="preset-apply" data-n="${esc(p.name)}">USAR</button><button class="icon-btn" data-act="preset-del" data-n="${esc(p.name)}" aria-label="Apagar preset" title="Apagar">✕</button></span></div>`).join('')}</div>` : '<p class="meta" style="margin:8px 0 0">Nenhum preset ainda. Ajuste o PERKS do jeito de uma fase (férias, semana de entrega…) e salve com um nome.</p>'}</div>`;
}
function neuroCard() {
  const n = R.neuro(S), c = R.bodyClock(S), ck = (k, t, d) => `<label class="nchk"><input type="checkbox" data-change="neuro" data-k="${k}" ${n[k] !== false ? 'checked' : ''}> <b>${t}</b><span class="meta">${d}</span></label>`;
  const ladder = R.ladderSteps(S);
  return `<div class="card c12" data-gk="neuro"><header><h2>🧠 Neurociência: o app te ajudando a se regular</h2><span class="meta">agora: ${c.icon} ${c.name}</span></header>
    <div class="row" style="gap:14px;flex-wrap:wrap">
      <label>☀ acordo às <input class="inp" type="time" data-change="neuro" data-k="wake" value="${esc(n.wake)}" style="width:auto;display:inline-block"></label>
      <label>😴 durmo às <input class="inp" type="time" data-change="neuro" data-k="bed" value="${esc(n.bed)}" style="width:auto;display:inline-block"></label>
      <label>🍽 refeições <input class="inp" data-change="neuro" data-k="meals" value="${esc((n.meals || []).join(' '))}" placeholder="08:00 12:30 19:30" style="width:170px;display:inline-block"></label>
      <span class="meta">= ${String(c.sleepH).replace('.', ',')} h de sono${c.sleepH < 7 ? ' <b class="bad">(menos de 7 h)</b>' : ''}</span></div>
    <div class="neurogrid">
      ${ck('clock', '🕰 Relógio do corpo', 'No QUESTS, um cartão diz a fase do seu dia (despertar, pico de foco, vale da tarde, segundo pico, desacelerar) e o que fazer nela; no pico, sugere a tarefa mais pesada. Mostra a próxima refeição (comer sempre no mesmo horário acerta o relógio do corpo) e até quando vale o café.')}
      ${ck('curfew', '🌙 Sono inegociável', '1 hora antes de dormir, o QUESTS troca as listas pelo fechamento do dia: o que você fez, o que fica pra amanhã e os hábitos. Dá pra abrir as listas por 15 min se precisar.')}
      ${ck('vila', '🏡 A vila reage', 'Os moradores do BARRANCO BAIXO comentam o que você faz (o FROG comemora o SAPO, a EVE LÃ o dinheiro…) e, de vez em quando, contam como a vila está. Tocar no balão = ouvir a voz.')}
      ${ck('calm', '🎯 Dopamina sob controle', 'Tarefa fácil ganha só o "tic". Número voando e fogos ficam pro que custou (⭐, ⚔, 20 XP ou mais, bloco, boss): o cérebro aprende a gostar do difícil. Na ALQUIMISTA, item comprado 4 vezes em 7 dias avisa pra variar (a mesma recompensa repetida perde o efeito).')}
      ${ck('ladder', `🪜 Escada do esforço${ladder.length ? ' · degrau ' + ladder.length : ''}`, `7 dias seguidos batendo a meta → ela sobe 5% (até ${R.LADDER_MAX} degraus). Errar não desce o degrau. Meta de hoje: ${R.dailyGoal(S).goal} XP.`)}
    </div>
    <h2 class="sec-h">📓 Bullet Journal e praticidade</h2>
    <div class="neurogrid">
      ${ck('mig', '📓 Migração do mês', `Nos primeiros dias do mês, o PRIMO passa pelas tarefas sem prazo ou antigas, uma por vez: ✓ ainda vale (ganha data) ou ✕ cancela. "Se não vale reescrever, não vale fazer." <a href="#" data-act="migrate">migrar agora (${R.migrationCandidates(S).length})</a>`)}
      ${ck('why', '💡 Por que esse boss importa', `Dois campos no boss: "por que importa?" e "o que acontece se eu não fizer?". Boss ${R.BOSS_IDLE_DAYS} dias parado → o PRIMO lembra (no máximo 1 vez por semana).`)}
      ${ck('box', '⏰ Time box', `Tarefa remarcada ${R.RESCHED_LOCK} vezes trava: pra empurrar de novo, marque horário e duração. Ou cancele.`)}
      ${ck('cheio', '🧠 HOJE cheio demais', 'Passou do limite de tarefas por dia (AJUSTES → máx. prazos por dia), aparece um aviso curto em HOJE e um botão que empurra as menos importantes pra amanhã, sem custo.')}
      ${ck('praga', '🐺 Os TREM e o LOBO', `Cada tarefa é um TREM: TREM FEI (prazo correndo, 1 mosca; em dia não tem mosca) › TREM CUSTOSO (vencendo, 2 moscas). Os dias de cada nível você ajusta logo abaixo. Estourou o prazo, vira TREM TRAPAIADO até ${R.moscaCfg(S).podre} dia(s) de atraso (3 moscas; no 2º dia vira o FOCO AGORA e o PRIMO fica paranoico; no 3º, faixa nas abas e janela a cada 7 min) → LAMBEHOMI depois disso (a tarefa apodreceu, auréola de moscas: tela vermelha, loja trancada, a BRASINHA perde 1 fase). O lobo é um só: GUARANÁ calmo → emburrado (tem TREM TRAPAIADO) → LAMBEHOMI (uma apodreceu). Ele volta a ser GUARANÁ com o ANTÍDOTO (resolva TODAS as atrasadas: a CAJULINA e a EVE LÃ acham a receita e a BRASINHA fica) ou na 🌕 PRAGA (${R.noiteN(S)} ou mais no LAMBEHOMI ao mesmo tempo: ele rouba a BRASINHA, a chama dela o cura, ela vira OVO e a MEGG DE FÁTIMA choca de novo). Depois de curado, 1 dia de trégua. Sem perder XP: castigos não somam. BANHO DE SAL GROSSO = resolver, remarcar (custa o de sempre) ou cancelar; limpar não dá XP. Feriado, DESCANSO e VIAGEM não contam.`)}
      <label class="meta" style="grid-column:1 / -1">🌕 PRAGA com <input class="inp" type="number" min="1" max="10" data-change="neuro" data-k="noiteN" value="${R.noiteN(S)}" style="width:64px;display:inline-block"> tarefa(s) no LAMBEHOMI ao mesmo tempo (padrão ${R.NOITE_N}; menos = mais difícil)</label>
      ${((m) => `<div class="meta mosca-cfg" style="grid-column:1 / -1"><b>🪰 Moscas no card</b> (onde tem mosca, tem coisa podre):
        <label>1 mosca (TREM FEI) quando faltam até <input class="inp" type="number" min="0" max="60" data-change="neuro" data-k="mosca1" value="${m.mosca1}"> dias <small>(mais que isso = em dia, sem mosca · padrão ${R.MOSCA_PADRAO.mosca1})</small></label>
        <label>2 moscas (TREM CUSTOSO) quando faltam até <input class="inp" type="number" min="0" max="7" data-change="neuro" data-k="mosca2" value="${m.mosca2}"> dia(s) <small>(0 = só no dia · 1 = hoje e amanhã · padrão ${R.MOSCA_PADRAO.mosca2})</small></label>
        <label>3 moscas (TREM TRAPAIADO) por até <input class="inp" type="number" min="1" max="10" data-change="neuro" data-k="podre" value="${m.podre}"> dia(s) de atraso; passou disso, apodrece: LAMBEHOMI, com a auréola <small>(padrão ${R.MOSCA_PADRAO.podre})</small></label></div>`)(R.moscaCfg(S))}
      ${ck('pato', '🦆 Pato de borracha', 'No SOS TRAVEI: explicar pro PRIMO o que tentou, o que funcionou e o que não. Fica guardado na tarefa.')}
      ${ck('proc', '⚔ Recompensa do processo', 'Cada subtarefa feita num boss mostra quanto de vida ele perdeu. Recompensa que está longe perde valor pro cérebro (desconto temporal): ver o dano agora mantém a motivação no caminho.')}
      ${ck('foco', '🎯 FOCO AGORA', 'No topo do QUESTS, UMA tarefa sugerida pelo PRIMO, com o porquê (atrasada, prazo hoje, boss parado, missão, horário do corpo). OUTRA ▸ mostra a próxima.')}
      ${ck('swipe', '👆 Segurar e arrastar no celular', 'Segure o dedo numa tarefa e arraste por cima das outras: ao soltar, conclui todas de uma vez. O ↩ desfaz.')}
    </div></div>`;
}

