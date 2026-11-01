// O CANAL DO CLAUDE (recados, sugestões e o que ele mudou) e a vida própria do PRIMO com IA (só funciona dentro do claude.ai).
import { S } from './store.js';

import * as R from './rules.js';
import * as A from './actions.js';
import { esc, today, fmtDM } from './util.js';

import { openModal } from './ui.js';

// ───────────────────────── O CLAUDE COMO AUXILIAR ─────────────────────────
const cl = () => S.core?.claude || { notes: [], log: [], suggest: [] };
export const claudeCount = () => cl().notes.filter((n) => !n.read).length + cl().suggest.length;
export function openClaude() {
  const c = cl();
  const sug = c.suggest.map((x) => `<div class="li"><div class="lt">${{ boss: '👹', task: '☑', block: '📦' }[x.kind] || '✨'} ${esc(x.text)}<small>${esc(x.why || 'sugestão do Claude')}</small></div><div class="row" style="flex-wrap:nowrap;gap:4px"><button class="btn sm good" data-act="claude-ok" data-id="${x.id}">APROVAR</button><button class="btn sm ghost" data-act="claude-no" data-id="${x.id}">NÃO</button></div></div>`).join('');
  const notes = [...c.notes].reverse().slice(0, 12).map((n) => `<div class="li"><div class="lt">${n.read ? '' : '🔴 '}${esc(n.text)}<small>${fmtDM(n.date)}</small></div></div>`).join('');
  const log = [...c.log].reverse().slice(0, 25).map((n) => `<div class="li"><div class="lt">${esc(n.text)}<small>${fmtDM(n.date)}</small></div></div>`).join('');
  openModal(`<h2>✨ o Claude e você</h2><p class="muted">Enquanto a gente conversa, eu deixo aqui o que mudei e o que sugiro. Coisas grandes só entram se você aprovar.</p>
    ${sug ? `<label class="lbl">Sugestões · precisam do seu OK</label><div class="list">${sug}</div>` : ''}
    <label class="lbl">Recados</label><div class="list" style="max-height:22vh;overflow:auto">${notes || '<div class="empty">sem recados.</div>'}</div>
    <label class="lbl">O que o Claude mudou</label><div class="list" style="max-height:26vh;overflow:auto">${log || '<div class="empty">nada ainda.</div>'}</div>
    <div class="actions"><button class="btn pri" data-close>FECHAR</button></div>`, { wide: true });
  if (c.notes.some((n) => !n.read)) A.claudeReadAll();
}

// ───────────────────────── VIDA PRÓPRIA (IA) ─────────────────────────
async function ask(prompt) {
  const sample = typeof window.claude?.use === 'function' ? await window.claude.use('sample') : null;
  if (!sample) throw new Error('sem IA');
  const r = await sample([{ role: 'user', content: prompt }], { modelTier: 'quick', cache: false });
  return String(r.text || '').trim();
}
function brain() {
  const c = R.companion(S), t = R.totals(S), g = R.dailyGoal(S), q = R.deadlineQueue(S).slice(0, 4).map((x) => `${x.text}${x.due ? ' (' + fmtDM(x.due) + ')' : ''}`).join('; '), cf = S.core.chapter || {};
  const notes = cl().notes.filter((n) => !n.read).map((n) => n.text).join(' | ');
  return `Você é ${c.name}, o companheiro de um jogo de produtividade com o PRIMO como centro. Fale em português do Brasil, curto, caloroso, com humor leve. Dados reais do jogador: nível ${t.level}, meta de hoje ${g.today}/${g.goal} XP, ${g.streak} dia(s) em chama, capítulo "${cf.title}" (missão: ${cf.mission}), próximos prazos: ${q || 'nenhum'}, humor ${c.mood}. ${notes ? 'Recados do Claude para o jogador: ' + notes + '.' : ''}`;
}
/** fala do dia: uma frase com IA, no máximo 1x por dia (se estiver ligado em PERKS AND RULES) */
export async function primoThink(el) {
  const mode = localStorage.getItem('gamify-ui:ai') || 'daily';
  if (mode === 'never' || !el) return;
  const key = 'gamify-ui:ailine', saved = (() => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } })();
  if (saved?.d === today()) { if (saved.t && !el.classList.contains('typing')) el.textContent = saved.t; return; }
  try {
    const t = (await ask(brain() + '\nDiga UMA frase (até 25 palavras) comentando algo concreto do dia dele, como se você tivesse pensado nisso sozinho. Sem aspas.')).replace(/^["“]|["”]$/g, '');
    localStorage.setItem(key, JSON.stringify({ d: today(), t }));
    if (document.contains(el) && t) el.textContent = t;
  } catch { /* sem IA: fica a fala de sempre */ }
}
/** a carta da expedição: notícias da estrada + recados, escrita pela IA (com plano B sem IA) */
export async function expeditionLetter() {
  const base = brain() + '\nVocê voltou de uma expedição. Escreva a carta em 3 linhas curtas: 2 "notícias da estrada" que mostrem o progresso REAL do jogador (nada inventado) e 1 sugestão prática pra hoje.';
  try { return await ask(base); } catch { return ''; }
}

