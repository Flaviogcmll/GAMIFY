// TELAS DOMINGO (baú semanal), CONQUISTAS e REGRAS (capítulo, regras, ajustes, backup).
import { S, status, backendKind } from '../store.js';

import * as R from '../rules.js';
import { sundayTarget } from '../actions.js';

import { esc, today, fmtDM, fmtDMY, weekday, fmtN, DOW, weekStart, addDays } from '../util.js';

import { settingsV35 } from '../v35.js';
import { weekSummary } from '../pstate.js';

import { rulesEditor, shopEditor } from '../v4.js';

import { legendHtml } from './quests.js';

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
function resumoCard() {
  const ws = weekStart(today()), cur = weekSummary(ws), prev = weekSummary(addDays(ws, -7));
  const row = (t, x) => (x ? `<div class="li"><div class="lt">${esc(x.text)}<small>${t}</small></div></div>` : '');
  return `<div class="card c12"><header><h2>📖 Como foi a semana</h2></header><div class="list">${row('esta semana (até agora)', cur)}${row('semana passada', prev)}${!cur && !prev ? '<div class="empty">Conclua tarefas e volte aqui: o PRIMO resume pra você.</div>' : ''}</div></div>`;
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
export function viewDomingo() {
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
  return `<div class="page-title"><div><h1><em>domingo</em>.</h1></div></div>
    <div class="grid">${form}${pesoCard()}${resumoCard()}${table}</div>`;
}

// ───────────── CONQUISTAS ─────────────
export function viewConquistas() {
  const list = R.achievementList(S);
  const got = list.filter((a) => a.unlocked);
  const xp = got.reduce((a, x) => a + (S.core.achievements[x.key]?.xp || x.xp), 0);
  const sorted = [...got.sort((a, b) => ((a.date || '') < (b.date || '') ? 1 : -1)), ...list.filter((a) => !a.unlocked).sort((a, b) => b.pct - a.pct)];
  return `<div class="page-title"><div><h1><em>conquistas</em>.</h1><p>${got.length} / ${list.length} desbloqueadas · +${fmtN(xp)} XP ganho com medalhas</p></div></div>
    <div class="medals">${sorted.map((a) => `<div class="medal ${a.unlocked ? 'on' : ''}"><div class="mi">${px(a.unlocked ? 'conquistas' : 'regras', 24)}</div>
      <div><div class="mn">${esc(a.name)} <span class="xpc">+${a.xp}</span></div><div class="md">${esc(a.desc)}</div>
      ${a.unlocked ? `<div class="md good">desbloqueada ${fmtDM(a.date)}</div>` : `${segBar(a.pct, 'sm')}<div class="md num">${fmtN(Math.min(a.value, a.goal))}/${fmtN(a.goal)}</div>`}</div></div>`).join('')}</div>`;
}

// ───────────── PERKS AND RULES (tutorial + regras + ajustes) ─────────────
const RULES = [
  ['XP', ['Subtarefa 5 · lista 10 · ↳ passo 3 · ⚔ mini-boss 30 (ou o escrito) · 🛡 casa/família 50 · (60XP) no texto manda.', 'Fechar bloco: BREAKDOWN 100 · 🎯 meta 200 · CAPTAÇÃO 150 · TRABALHO 300. BOSS = o XP escrito + 🎟.', '⭐ adiada x2 · 📅 no prazo x1,5 · 🐦 2+ dias antes x2 · 💰 x1,5. Tudo acumula (⭐ antecipada = x4). Atrasou = sem bônus e −20% por dia (mín. 40%).', 'Hábitos 5 cada · combo 7 dias x1,5 · 14 dias x2 · ⚒ forjado (66 ✓) nunca abaixo de x1,5 · dia perfeito x2 · ⚔ redenção +30.', 'Semana: treino 4 (+40) · noites boas 5 (+30) · casa 5 (+30) · perfeito 1 (+30) · semana no prazo (+50) · os 5 = LENDÁRIA +50.', 'Rituais: 👥 15 por encontro · 🔁 💼 20. Baú de domingo 50 a 190. 🎲 Loot: às vezes concluir solta XP extra, 🎟 ou vale da taverna.']],
  ['Níveis, gold e loja', ['Nível com curva: 500 + 150 por nível². NV 2 ≈ 1 semana · NV 5 ≈ 1,5 mês · NV 10 ≈ 5 meses · NV 20 ≈ 1,5 ano.', 'Títulos: 1 INICIANTE · 3 APRENDIZ DE OBRA · 5 ARQUITETO · 8 SÊNIOR · 10 VETERANO · 15 MESTRE CONSTRUTOR · 20 LENDA.', '🎟 Ticket = 1 item grátis da TAVERNA. Ganha 1 por nível, 1 por BOSS, 1 a cada 10 no prazo e às vezes no loot.', 'GOLD = a sua metade do dinheiro que entrou. 3000💰 no título do bloco: quando fecha, o app pergunta. "1900💰 / MES (DIA 05)": pergunta todo dia 5.', 'FERREIRO: 100 XP por NV do item + o gold (dinheiro real). Item acima do seu nível fica trancado.']],
  ['Buffs', ['✨ INSPIRADO: média do baú ≥ 8 → hábitos +20% na semana.', '🚀 EMBALO: 5+ tarefas ontem → hábitos +20% hoje.', '🦾 MÁQUINA: 4+ treinos em 7 dias → hábitos +15%.', '🧘 ZEN: 7 noites boas seguidas e nenhum ☠ → taverna -20%.', '👑 LENDA: semana passada LENDÁRIA → hábitos +25%.', '🛡 SÁBADO BLINDADO: falha não conta e hábitos +50%.', '⏰ RELÓGIO SUÍÇO: 5+ no prazo seguidas · 🔥 COMBO · 🌟 DIA PERFEITO.', 'v4 · 🏦 POUPADOR (guardou na semana): taverna -10% · 🎯 FOCADO (3 fogueiras na semana): tarefas +10% · 🎒 EXPLORADOR (expedição concluída em 3 dias): hábitos +10% · 📔 CRONISTA (diário 3 dias): tarefas +5% · 🔥 EM CHAMA (3 dias na meta): tarefas +10% · 💙 NO AZUL (mês fechou com sobra): taverna -10%.']],
  ['Debuffs', ['☠ ENVENENADO: falhou o NO PH → taverna x2 por 48h. Cura: ⚔ redenção ou ANTÍDOTO.', '🌫 NEBLINA: 2 dias sem treino → hábitos -50%. Cura: treinar hoje, redenção ou ANTÍDOTO.', '😵 FATIGADO: 2 noites ruins → multa x2 na loja. Cura: 1 noite boa ou ANTÍDOTO.', '🧱 SOBRECARGA: 3 dias sem 🧹 → TRABALHO sem o bônus 💰. Cura: 🧹 hoje.', '🍺 RESSACA: 3+ compras num dia → amanhã hábitos -25%.', '🐌 PROCRASTINAÇÃO: 2 dias sem concluir → taverna x1,5.', '🦥 PREGUIÇA: 3 dias com menos de 3 hábitos → hábitos -30%. Cura: 5+ hoje.', '😩 CANSADO: média do baú < 5 → hábitos -10%. Cura: 2 noites boas.', 'v4 · 🌀 DISPERSO (4+ tarefas ▶ ao mesmo tempo): tarefas -10% · 💸 DEVENDO (2+ "fiz sem comprar" na semana): taverna x1,25 · 🕳 VAZANDO (mês passado com besteira > 40% ou crédito > 70%): taverna x1,15.', 'A punição é estagnação, não retrocesso: debuff trava recompensa, nunca apaga XP. 🛡 1 falha por semana em cada hábito é perdoada. 🏕 Descanso (viagem/doença): marca o dia inteiro como folga.']],
  ['Alertas', ['⏰ ATOLADO: 3+ atrasadas → loja trancada até zerar.', '💀 ESQUECIDA: atrasada há 7+ dias. Resolva, quebre ou remarque com honestidade.', '🗿 ESTAGNADO: 5 dias sem concluir nada. Use o 🆘 SOS e faça 10 minutos.', '💔 SAUDADE: alguém dos rituais atrasado 3+ dias.', '⚠ SEXTA-FEIRA: é o dia em que mais se quebra sequência. Marque os hábitos.']],
  ['Dicas (suas)', ['YOU NEED TO HAVE A WELL DEFINED "STORY LINE" FOR THIS TO WORK.', 'GAMES ARE LOW RISK HIGH REWARD: CREATE THAT FEELING.', 'BREAK DOWN HIGH RISK GOALS INTO SMALL LOW RISK / HIGH REWARD ONES.', 'SEM DATA NÃO É MISSÃO, É DESEJO. A MAIS CHATA PRIMEIRO.', 'SEMANA-TIPO: SEG/QUA clientes · TER/QUI prefeitura e documentos · SEX escritório, marketing e folga · SÁB casa e pessoas · DOM baú e planejamento.', 'COBRAR ANTES DE CRIAR: dinheiro parado em cliente é a missão mais barata do jogo.', 'META GRANDE = 🎯 BLOCO: ⚔ mini-boss escrito como a vitória → ↳ passos de até 2h. Detalhe só o próximo mini-boss.', 'Sem redes sociais na primeira e na última hora do dia. Scroll é prêmio comprado na taverna, não o padrão.']],
  ['Prazos: consequências (v4.3)', ['⏰ Concluir atrasada paga menos: −20% do XP por dia de atraso, no mínimo 40% (editável em PERKS → Prazos). O bônus de pontualidade some.', '📆 Remarcar custa XP: a 1ª vez que você empurra o prazo de uma tarefa custa 10 XP, a 2ª 20, a 3ª 40… (dobra). Sai do saldo, nunca do nível. Mudar o prazo pra antes não custa.', 'DISTRIBUIR PRAZOS mostra o custo total antes de aplicar. Quanto mais realista o prazo que você põe, menos paga.']],
  ['O PRIMO (v4.3)', ['🔥 O PRIMO é o centro do jogo: o rosto muda com o seu dia e ele fala (banco com centenas de frases). Toque nele pra ouvir outra.', '🎯 PEDIDO DO DIA: um desafio específico (fechar tarefas, uma ⭐, hábitos, foco…) que dá XP e +1 ♥ quando cumprido.', '🎒 EXPEDIÇÕES: passeio 30 min · feira 2 h · viagem 8 h · aventura 1 dia. Voltam com XP (e às vezes 🎟). Cada tarefa concluída tira 3 min, cada 25 min de foco tira 1 h, 🎟 termina na hora. Com 3+ atrasadas elas param.', '👕 ARMÁRIO: chapéus, óculos, cachecóis e capas que se liberam com nível, expedições, bosses e conquistas. 🔥 FAÍSCA: o mascote nasce de um ovo e evolui com os dias que você bate a meta (3 · 10 · 25 · 60); nunca volta atrás.', '📖 DIÁRIO: todo fim de semana ele escreve um resumo (XP, tarefas, dias na meta, melhor dia). ♥ Amizade: +1 por dia ao afagar, conversar e responder (5 colega · 15 parceiro · 40 amigo · 100 irmão · 250 primo de sangue).']],
  ['Atalhos', ['Q QUESTS · S SURVIVAL · A AGENDA · L SHOP · B baú de domingo · F FILTRO · R ROTINA · P REGRAS', 'ESPAÇO abre o PRIMO · / escreve nos IMEDIATOS · N alterna dia/noite']],
];
const card = ([t, items]) => `<div class="rblock"><h3>${esc(t)}</h3><ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`;

export function viewRegras() {
  const ch = S.core.chapter || {};
  const tot = R.totals(S);
  const kb = (n) => Math.round(JSON.stringify(n || {}).length / 1024);
  const mode = localStorage.getItem('gamify-ui:mode') || 'auto';
  return `<div class="page-title"><div><h1><em>perks and rules</em>.</h1></div></div>
    <div class="grid">
      ${settingsV35()}
      ${rulesEditor()}
      ${shopEditor()}
      ${metaCard()}
      ${driveCard()}
      <div class="card c7"><header><h2>📖 Sua história · o capítulo que você está vivendo</h2></header>
        <form data-form="chapter" autocomplete="off">
          <div class="row"><div style="width:90px"><label class="lbl" for="ch-n">Nº</label><input class="inp" id="ch-n" name="n" type="number" min="1" value="${esc(ch.n)}"></div>
            <div class="grow"><label class="lbl" for="ch-title">Título</label><input class="inp" id="ch-title" name="title" value="${esc(ch.title)}"></div></div>
          <label class="lbl" for="ch-mission">Missão (uma só)</label><input class="inp" id="ch-mission" name="mission" value="${esc(ch.mission)}">
          <label class="lbl" for="ch-why">Por quê</label><input class="inp" id="ch-why" name="why" value="${esc(ch.why)}">
          <div class="row" style="align-items:end"><div class="grow"><label class="lbl" for="ch-until">Até</label><input class="inp" id="ch-until" name="until" type="date" value="${esc(ch.until || '')}"></div><button class="btn pri">SALVAR CAPÍTULO</button></div>
        </form></div>
      <div class="card c5"><header><h2>Ajustes</h2></header>
        <label class="lbl" for="set-mode">Visual</label><select class="inp" id="set-mode" data-change="mode"><option value="auto" ${mode === 'auto' ? 'selected' : ''}>AUTOMÁTICO (papel 6h–18h · fogueira à noite)</option><option value="day" ${mode === 'day' ? 'selected' : ''}>SEMPRE PAPEL</option><option value="night" ${mode === 'night' ? 'selected' : ''}>SEMPRE FOGUEIRA</option></select>
        ${[['music', 'Música lo-fi'], ['fire', 'Som da fogueira'], ['sfx', 'Efeitos']].map(([k, n]) => `<label class="lbl" for="vol-${k}">${n}</label><input id="vol-${k}" type="range" min="0" max="1" step="0.05" value="${prefs[k]}" data-change="vol" data-k="${k}" style="width:100%">`).join('')}
        <label class="lbl" for="set-max">Máx. de prazos por dia útil</label><input class="inp" id="set-max" type="number" min="1" max="20" value="${S.core.settings?.maxPerDay || R.C.MAX_PER_DAY}" data-change="setting" data-k="maxPerDay">
        <label class="lbl" for="set-ms">Áreas do baú de domingo</label><textarea class="inp" id="set-ms" rows="2" data-change="milestones">${esc((S.core.milestones || []).join(', '))}</textarea>
        <div class="row" style="margin-top:12px"><button class="btn sm" data-act="edit-habits">✎ HÁBITOS</button><button class="btn sm" data-act="backup-copy">COPIAR BACKUP</button><button class="btn sm" data-act="backup-download">⬇ BAIXAR</button><button class="btn sm" data-act="backup-import">IMPORTAR</button><button class="btn sm ghost" data-act="gorder-reset" title="Volta os cartões das telas pra ordem original">↺ ORDEM DOS CARTÕES</button></div>
        <p class="meta" style="margin:10px 0 0">Dados: ${backendKind() === 'db' ? '☁ banco do claude.ai (sincroniza celular e PC; precisa de internet)' : '💻 só neste navegador'} · desde ${fmtDMY(S.core.startDate)} · ${fmtN(tot.earned)} XP · quests ${kb(S.quests)} KB${status.error ? ` · <span class="bad">${esc(status.error)}</span>` : ''}</p></div>
      <div class="card c12" data-gk="legenda"><header><h2>📖 Legenda · como marcar e quanto vale</h2></header>${legendHtml()}</div>
      <div class="card c12" data-gk="ref"><header><h2>📖 Referência · regras com os valores padrão</h2></header><div class="refgrid">${RULES.map(card).join('')}</div></div>
    </div>
    <p class="creditos">Porquinho do PRIMO: "Free Pets Pack" por <a href="https://frakassets.itch.io/free-pets-pack" target="_blank" rel="noopener">Frakassets</a> (CC BY 4.0). Ícones da loja: Kenney (CC0). Lo-fi: gerado no aparelho. Fogueira: "Fireplace sound loop" (CC0).</p>`;
}

// ───────────── ARQUIVO ─────────────
