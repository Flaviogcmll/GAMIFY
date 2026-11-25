// FILTRO — tudo em aberto numa tabela pra filtrar e ordenar. Clique na linha = abre a tarefa.
import { S } from '../store.js';
import * as R from '../rules.js';
import { esc, fmtDM, today } from '../util.js';
import { tiles } from '../telas.js';

const COLS = [['text', 'O QUE'], ['where', 'PROJETO / LISTA'], ['cat', 'CATEGORIA'], ['date', 'DATA'], ['left', 'FALTA'], ['bucket', 'PRAZO'], ['status', 'STATUS'], ['who', 'AGUARDANDO'], ['type', 'TIPO'], ['color', 'COR'], ['marks', 'MARCAS'], ['xp', 'XP']];
const SQ = { red: '🟥', yellow: '🟨', green: '🟩', orange: '🟧', black: '⬛' };
const opt = (vals, cur) => ['', ...vals].map((v) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${v || 'TODOS'}</option>`).join('');

/** v6.1: o corpo do FILTRO (vai dentro da AGENDA, numa vitrine com banner próprio) */
export function filtroBody(ui) {
  const all = R.filterRows(S, today());
  const f = ui.filtro ||= { q: '', cat: '', bucket: '', status: '', type: '', who: '', sort: 'date', dir: 1 };
  let rows = all.filter((r) => (!f.q || (r.text + ' ' + r.where).toLowerCase().includes(f.q.toLowerCase()))
    && (!f.cat || r.cat === f.cat) && (!f.bucket || r.bucket === f.bucket) && (!f.status || r.status === f.status) && (!f.type || r.type === f.type) && (!f.who || r.who === f.who));
  const k = f.sort;
  rows.sort((a, b) => {
    const x = a[k] ?? '', y = b[k] ?? '';
    if (k === 'date' || k === 'left') { if (!a.date && b.date) return 1; if (a.date && !b.date) return -1; }
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * f.dir;
  });
  const uniq = (key) => [...new Set(all.map((r) => r[key]).filter(Boolean))].sort();
  // v5.16: quadrinhos de resumo que filtram com 1 toque (cor = a lista onde a tarefa cai)
  const n = (fn) => all.filter(fn).length, pick = (k, v) => ({ act: 'fpick', data: { k, v }, on: f[k] === v });
  const strip = tiles([
    { label: '⏰ Atrasadas', value: n((r) => r.bucket === 'ATRASADA'), cls: n((r) => r.bucket === 'ATRASADA') ? 'bad' : '', tone: 'urg', ...pick('bucket', 'ATRASADA') },
    { label: 'Hoje', value: n((r) => r.bucket === 'HOJE'), tone: 'urg', ...pick('bucket', 'HOJE') },
    { label: 'Amanhã', value: n((r) => r.bucket === 'AMANHÃ'), tone: 'quase', ...pick('bucket', 'AMANHÃ') },
    { label: 'Próximos 7 dias', value: n((r) => r.bucket === 'PRÓX. 7 DIAS'), tone: 'atencao', ...pick('bucket', 'PRÓX. 7 DIAS') },
    { label: 'Depois', value: n((r) => r.bucket === 'DEPOIS'), tone: 'ok', ...pick('bucket', 'DEPOIS') },
    { label: 'Sem data', value: n((r) => r.bucket === 'SEM DATA'), tone: 'neutro', ...pick('bucket', 'SEM DATA') },
    { label: '⏳ Aguardando', value: n((r) => r.status === '⏳ AGUARDANDO'), tone: 'espera', ...pick('status', '⏳ AGUARDANDO') },
  ]);
  const BKEY = { ATRASADA: 'late', HOJE: 'today', AMANHÃ: 'tomorrow', 'PRÓX. 7 DIAS': 'week', DEPOIS: 'later', 'SEM DATA': 'none' };
  const any = f.q || f.cat || f.bucket || f.status || f.type || f.who;
  return `${strip}
    <div class="card" style="margin-bottom:14px"><div class="row">
      <input class="inp grow" data-input="filtro.q" value="${esc(f.q)}" placeholder="🔍 buscar" aria-label="Buscar">
      <label class="row" style="gap:4px"><span class="px" style="font-size:7px">CATEGORIA</span><select class="inp" style="width:auto" data-change="filtro" data-k="cat">${opt(uniq('cat'), f.cat)}</select></label>
      <label class="row" style="gap:4px"><span class="px" style="font-size:7px">PRAZO</span><select class="inp" style="width:auto" data-change="filtro" data-k="bucket">${opt(['ATRASADA', 'HOJE', 'AMANHÃ', 'PRÓX. 7 DIAS', 'DEPOIS', 'SEM DATA'], f.bucket)}</select></label>
      <label class="row" style="gap:4px"><span class="px" style="font-size:7px">STATUS</span><select class="inp" style="width:auto" data-change="filtro" data-k="status">${opt(uniq('status'), f.status)}</select></label>
      <label class="row" style="gap:4px"><span class="px" style="font-size:7px">TIPO</span><select class="inp" style="width:auto" data-change="filtro" data-k="type">${opt(uniq('type'), f.type)}</select></label>
      <label class="row" style="gap:4px"><span class="px" style="font-size:7px">PESSOA</span><select class="inp" style="width:auto" data-change="filtro" data-k="who">${opt(uniq('who'), f.who || '')}</select></label>
      <span class="meta">${rows.length} linha(s)</span>${any ? '<button class="btn sm ghost" data-act="fclear">✕ LIMPAR</button>' : ''}</div></div>
    <div class="card ftab" style="padding:0"><table><thead><tr>${COLS.map(([key, n]) => `<th data-act="fsort" data-k="${key}">${n}${f.sort === key ? (f.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr data-act="${r.kind === 'ritual' ? 'edit-ritual' : 'jump'}" data-id="${r.id}" data-b="${r.status === '⏳ AGUARDANDO' ? 'wait' : BKEY[r.bucket] || ''}">
        <td class="ft">${esc(r.text)}</td><td>${esc(r.where)}</td><td>${esc(r.cat)}</td><td>${r.date ? fmtDM(r.date) : ''}</td>
        <td class="${r.left != null && r.left < 0 ? 'bad' : ''}">${r.left ?? ''}</td><td>${esc(r.bucket)}</td><td>${r.status === 'ABERTA' ? esc(r.status) : `<span class="chip ${r.status === '▶ FAZENDO' ? 'doing' : 'wait'}">${esc(r.status)}</span>`}</td><td>${esc(r.who || '')}</td><td>${esc(r.type)}</td><td>${SQ[r.color] || ''}</td><td>${r.marks}</td><td class="gold">${r.xp || ''}</td></tr>`).join('') || `<tr><td colspan="${COLS.length}" class="empty">nada com esse filtro.</td></tr>`}</tbody></table></div>`;
}

export const viewFiltro = (ui) => filtroBody(ui);
