// ROTINA — a semana-tipo hora a hora (dois planos: CEDO e TARDE), ATIVIDADES e CONTROLE. Clique na célula pra editar.
import { S } from '../store.js';
import { esc, today, weekday } from '../util.js';
import { segBar } from '../ui.js';

const DAYS = [['seg', 'SEGUNDA'], ['ter', 'TERÇA'], ['qua', 'QUARTA'], ['qui', 'QUINTA'], ['sex', 'SEXTA'], ['sab', 'SÁBADO'], ['dom', 'DOMINGO']];
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
// cor por tipo de atividade (palavra-chave)
const TONES = [
  [/DORM/, '#2b2f3a', '#c9d1e0'], [/ACADEMIA|CARDIO|CORRIDA|ALONGAMENTO|TREINO/, '#3f8a55', '#fff'], [/ESTUD|CURSO|LEITURA|DETOX/, '#1c3a5e', '#fff'],
  [/SOFTWARE|PROJETO/, '#9b4722', '#fff'], [/STORIES|REELS|YOUTUBE|FEED|POSTAR|GRAVAR|IG/, '#c2602f', '#fff'], [/ALMO|CAF|MARMITA|BULLET/, '#d9a520', '#141414'],
  [/DESCANSO|MEDITA|SPA|LAZER/, '#6e6c66', '#fff'], [/CASA|LIMPAR/, '#d9732a', '#fff'], [/SKINCARE|GAMIFY|ANALISE/, '#5b4b8a', '#fff'],
];
const tone = (t) => { const m = TONES.find(([re]) => re.test(t || '')); return m ? `background:${m[1]};color:${m[2]}` : 'background:var(--panel-2)'; };

export function viewRotina(ui) {
  const r = S.core.routine;
  if (!r?.plans?.length) return `<div class="page-title"><div><h1><em>rotina</em>.</h1></div></div><div class="card"><p>Sem rotina cadastrada ainda.</p><button class="btn pri" data-act="routine-new">CRIAR ROTINA</button></div>`;
  const pi = Math.min(ui.rplan ?? r.active ?? 0, r.plans.length - 1), plan = r.plans[pi];
  const now = new Date(), hh = String(now.getHours()).padStart(2, '0'), wd = WD[weekday(today())];
  const rows = r.hours.map((h) => `<tr><td class="h">${h}H</td>${DAYS.map(([d]) => {
    const v = plan.grid[`${d}|${h}`] || '';
    return `<td style="${tone(v)}" class="${d === wd ? 'today-col' : ''} ${d === wd && h === hh ? 'now' : ''}" data-act="rot-cell" data-key="${d}|${h}" title="${esc(v)}">${esc(v)}</td>`;
  }).join('')}</tr>`).join('');
  const cur = plan.grid[`${wd}|${hh}`], nxt = r.hours.filter((h) => h > hh).map((h) => [h, plan.grid[`${wd}|${h}`]]).find(([, v]) => v && v !== cur);
  // v5.16: o dia de hoje numa faixa (blocos iguais seguidos viram um só) + quanto falta do bloco atual
  const segs = [];
  for (const h of r.hours) { const v = plan.grid[`${wd}|${h}`] || ''; const lastSeg = segs.at(-1); if (lastSeg && lastSeg.v === v) lastSeg.to = +h + 1; else segs.push({ v, from: +h, to: +h + 1 }); }
  const nowM = now.getHours() * 60 + now.getMinutes(), curSeg = segs.find((g) => nowM >= g.from * 60 && nowM < g.to * 60);
  const leftM = curSeg ? curSeg.to * 60 - nowM : 0, pct = curSeg ? (nowM - curSeg.from * 60) / ((curSeg.to - curSeg.from) * 60) : 0;
  const hm = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}` : `${m} min`);
  const strip = `<div class="rot-day">${segs.filter((g) => g.v).map((g) => `<span class="rd ${g === curSeg ? 'cur' : g.to * 60 <= nowM ? 'past' : ''}" style="${tone(g.v)};flex-grow:${g.to - g.from}" title="${String(g.from).padStart(2, '0')}h–${String(g.to).padStart(2, '0')}h ${esc(g.v)}"><small>${String(g.from).padStart(2, '0')}h</small>${esc(g.v)}</span>`).join('')}</div>`;
  const chips = (list) => `<div class="chips">${(list || []).map((x) => `<span class="chip">${esc(x)}</span>`).join('') || '<span class="meta">vazio</span>'}</div>`;
  return `<div class="page-title"><div><h1><em>rotina</em>.</h1></div></div>
    <div class="grid">
      <div class="card c12" data-gk="rot-agora"><header><h2>⏱ Agora · ${hh}h</h2><span class="meta">${plan.name}${pi === r.active ? ' ★' : ''}</span></header>
        <div class="rot-now"><b style="${tone(cur)}">${esc(cur || 'livre')}</b><div class="rn-info">${curSeg ? `<span class="meta">até ${String(curSeg.to).padStart(2, '0')}h · falta${leftM > 1 ? 'm' : ''} <b>${hm(leftM)}</b></span>${segBar(pct, 'sm')}` : ''}${nxt ? `<span class="meta">depois, às ${nxt[0]}h: <b>${esc(nxt[1])}</b></span>` : ''}</div></div>
        ${strip}</div>
      <div class="card c12 rot" data-gk="rot-grade"><header><h2>🗓 Semana-tipo</h2><div class="seg">${r.plans.map((p, i) => `<button class="${i === pi ? 'on' : ''}" data-act="rot-plan" data-i="${i}">${esc(p.name)}${i === r.active ? ' ★' : ''}</button>`).join('')}</div></header>
        <div class="rot-wrap"><table><thead><tr><th></th>${DAYS.map(([d, n]) => `<th style="${d === wd ? 'color:var(--accent)' : ''}">${n.slice(0, 3)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
        ${pi !== r.active ? `<div class="row" style="margin-top:10px"><button class="btn sm" data-act="rot-active" data-i="${pi}">★ USAR ESTA COMO PRINCIPAL</button></div>` : ''}</div>
      <div class="card c6" data-gk="rot-ativ"><header><h2>Atividades</h2><span class="meta">uma por linha</span></header>${chips(r.atividades)}<textarea class="inp" rows="6" data-change="routine-list" data-k="atividades" aria-label="Atividades" style="margin-top:8px">${esc((r.atividades || []).join('\n'))}</textarea></div>
      <div class="card c6" data-gk="rot-ctrl"><header><h2>Controle</h2><span class="meta">o que manter sob controle</span></header>${chips(r.controle)}<textarea class="inp" rows="6" data-change="routine-list" data-k="controle" aria-label="Controle" style="margin-top:8px">${esc((r.controle || []).join('\n'))}</textarea></div></div>`;
}
