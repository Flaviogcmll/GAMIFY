// ROTINA — a semana-tipo hora a hora (dois planos: CEDO e TARDE), ATIVIDADES e CONTROLE. Clique na célula pra editar.
import { S } from '../store.js';
import { esc, today, weekday } from '../util.js';
import { segBar } from '../ui.js';

const DAYS = [['seg', 'SEGUNDA'], ['ter', 'TERÇA'], ['qua', 'QUARTA'], ['qui', 'QUINTA'], ['sex', 'SEXTA'], ['sab', 'SÁBADO'], ['dom', 'DOMINGO']];
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
// v5.16: cores suaves da paleta do app (antes eram cores fortes). Azul = sono e descanso, verde = corpo e saúde,
// madeira = trabalho, estudo e conteúdo (a "casa" do app), cinza claro = refeições e o resto.
const TONES = [
  [/DORM/, 'c-calma', 34], [/DESCANSO|MEDITA|SPA|LAZER/, 'c-calma', 18],
  [/ACADEMIA|CARDIO|CORRIDA|ALONGAMENTO|TREINO|SKINCARE/, 'c-ok', 26],
  [/SOFTWARE|PROJETO|ESTUD|CURSO|LEITURA|DETOX|STORIES|REELS|YOUTUBE|FEED|POSTAR|GRAVAR|IG|ANALISE|GAMIFY/, 'c-acao', 20],
  [/ALMO|CAF|MARMITA|BULLET|CASA|LIMPAR/, 'c-neutro', 18],
];
export const tone = (t) => { const m = TONES.find(([re]) => re.test(t || '')); return m ? `background:color-mix(in srgb, var(--${m[1]}) ${m[2]}%, var(--panel));color:var(--ink)` : 'background:var(--panel-2)'; };

/** v9.5 (pedido do dono): a ROTINA virou um banner dentro da SOBREVIVÊNCIA, embaixo dos RITUAIS (este é o miolo dele) */
export function rotinaBody(ui) {
  const r = S.core.routine;
  if (!r?.plans?.length) return `<div class="card"><p>Sem rotina cadastrada ainda.</p><button class="btn pri" data-act="routine-new">CRIAR ROTINA</button></div>`;
  const pi = Math.min(ui.rplan ?? r.active ?? 0, r.plans.length - 1), plan = r.plans[pi];
  const now = new Date(), wd = WD[weekday(today())];
  // v6: horários podem ter minutos ("07:30"); a linha de agora é o último horário que já começou
  const toMin = (h) => { const [a, b] = String(h).split(':'); return +a * 60 + (+b || 0); }, nowM = now.getHours() * 60 + now.getMinutes();
  const hh = [...r.hours].reverse().find((h) => toMin(h) <= nowM) || r.hours[0];
  const rows = r.hours.map((h) => `<tr><td class="h">${h}${h.includes(':') ? '' : 'H'}</td>${DAYS.map(([d]) => {
    const v = plan.grid[`${d}|${h}`] || '';
    return `<td style="${tone(v)}" class="${d === wd ? 'today-col' : ''} ${DAYS.findIndex(([x]) => x === d) < DAYS.findIndex(([x]) => x === wd) ? 'past-col' : ''} ${d === wd && h === hh ? 'now' : ''}" data-act="rot-cell" data-key="${d}|${h}" title="${esc(v)}">${esc(v)}</td>`;
  }).join('')}</tr>`).join('');
  const cur = plan.grid[`${wd}|${hh}`], nxt = r.hours.filter((h) => toMin(h) > toMin(hh)).map((h) => [h, plan.grid[`${wd}|${h}`]]).find(([, v]) => v && v !== cur);
  // v5.16: o dia de hoje numa faixa (blocos iguais seguidos viram um só) + quanto falta do bloco atual
  const segs = [];
  const endOf = (i) => (r.hours[i + 1] ? toMin(r.hours[i + 1]) : toMin(r.hours[i]) + 60);
  r.hours.forEach((h, i) => { const v = plan.grid[`${wd}|${h}`] || ''; const lastSeg = segs.at(-1); if (lastSeg && lastSeg.v === v) lastSeg.to = endOf(i); else segs.push({ v, from: toMin(h), to: endOf(i) }); });
  const curSeg = segs.find((g) => nowM >= g.from && nowM < g.to);
  const leftM = curSeg ? curSeg.to - nowM : 0, pct = curSeg ? (nowM - curSeg.from) / (curSeg.to - curSeg.from) : 0;
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}${m % 60 ? ':' + String(m % 60).padStart(2, '0') : 'h'}`;
  const hm = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}` : `${m} min`);
  const strip = `<div class="rot-day">${segs.filter((g) => g.v).map((g) => `<span class="rd ${g === curSeg ? 'cur' : g.to <= nowM ? 'past' : ''}" style="${tone(g.v)};flex-grow:${Math.max(1, Math.round((g.to - g.from) / 60))}" title="${hhmm(g.from)}–${hhmm(g.to)} ${esc(g.v)}"><small>${hhmm(g.from)}</small>${esc(g.v)}</span>`).join('')}</div>`;
  // v5.16: balõezinhos com × pra tirar e + pra pôr (sem a caixa de texto)
  const chips = (list, k) => `<div class="chips rchips">${(list || []).map((x, i) => `<span class="chip rchip">${esc(x)}<button type="button" class="rx" data-act="rot-chip-del" data-k="${k}" data-i="${i}" aria-label="Tirar ${esc(x)}" title="Tirar">×</button></span>`).join('')}
    <form class="rchip-add" data-form="rot-chip-add" data-k="${k}" autocomplete="off"><input class="inp" name="v" placeholder="+" aria-label="Adicionar" maxlength="40"></form></div>`;
  return `<div class="grid">
      <div class="card c12" data-gk="rot-agora"><header><h2>⏱ Agora · ${hh}${hh.includes(':') ? '' : 'h'}</h2><span class="meta">${plan.name}${pi === r.active ? ' ★' : ''}</span></header>
        <div class="rot-now"><b style="${tone(cur)}">${esc(cur || 'livre')}</b><div class="rn-info">${curSeg ? `<span class="meta">até ${hhmm(curSeg.to)} · falta${leftM > 1 ? 'm' : ''} <b>${hm(leftM)}</b></span>${segBar(pct, 'sm')}` : ''}${nxt ? `<span class="meta">depois, às ${nxt[0]}h: <b>${esc(nxt[1])}</b></span>` : ''}</div></div>
        ${strip}</div>
      <div class="card c12 rot" data-gk="rot-grade"><header><h2>🗓 Semana-tipo</h2><div class="row" style="gap:8px"><div class="seg">${r.plans.map((p, i) => `<button class="${i === pi ? 'on' : ''}" data-act="rot-plan" data-i="${i}">${esc(p.name)}${i === r.active ? ' ★' : ''}</button>`).join('')}</div><button class="btn sm" data-act="rot-hours" title="Adicionar ou tirar horários (dá pra usar meia hora)">🕐 HORÁRIOS</button>${r.plans.some((p) => p.name === 'NEURO') ? '' : '<button class="btn sm pri" data-act="rot-neuro" title="Cria uma cópia da sua rotina ajustada pela neurociência (luz da manhã, trabalho pesado no pico de foco, jantar fixo). A sua continua igual.">🧠 VERSÃO NEURO</button>'}</div></header>
        <div class="rot-wrap"><table><thead><tr><th></th>${DAYS.map(([d, n]) => `<th style="${d === wd ? 'color:var(--accent)' : ''}">${n.slice(0, 3)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
        ${pi !== r.active ? `<div class="row" style="margin-top:10px"><button class="btn sm" data-act="rot-active" data-i="${pi}">★ USAR ESTA COMO PRINCIPAL</button></div>` : ''}</div>
      <div class="card c6" data-gk="rot-ativ"><header><h2>Atividades</h2></header>${chips(r.atividades, 'atividades')}</div>
      <div class="card c6" data-gk="rot-ctrl"><header><h2 title="O que manter sob controle">Controle</h2></header>${chips(r.controle, 'controle')}</div></div>`;
}

export const viewRotina = rotinaBody;
