// FILTRO — tudo em aberto + compromissos numa tabela pra filtrar e ordenar. Clique na linha = abre a tarefa.
import { S } from '../store.js';
import * as R from '../rules.js';
import { esc, fmtDM, today } from '../util.js';

const COLS = [['text', 'O QUE'], ['where', 'PROJETO / LISTA'], ['cat', 'CATEGORIA'], ['date', 'DATA'], ['time', 'HORA'], ['left', 'FALTA'], ['bucket', 'PRAZO'], ['status', 'STATUS'], ['type', 'TIPO'], ['color', 'COR'], ['marks', 'MARCAS'], ['xp', 'XP']];
const SQ = { red: '🟥', yellow: '🟨', green: '🟩', orange: '🟧', black: '⬛' };
const opt = (vals, cur) => ['', ...vals].map((v) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${v || 'TODOS'}</option>`).join('');

export function viewFiltro(ui) {
  const all = R.filterRows(S, today());
  const f = ui.filtro ||= { q: '', cat: '', bucket: '', status: '', type: '', sort: 'date', dir: 1 };
  let rows = all.filter((r) => (!f.q || (r.text + ' ' + r.where).toLowerCase().includes(f.q.toLowerCase()))
    && (!f.cat || r.cat === f.cat) && (!f.bucket || r.bucket === f.bucket) && (!f.status || r.status === f.status) && (!f.type || r.type === f.type));
  const k = f.sort;
  rows.sort((a, b) => {
    const x = a[k] ?? '', y = b[k] ?? '';
    if (k === 'date' || k === 'left') { if (!a.date && b.date) return 1; if (a.date && !b.date) return -1; }
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * f.dir;
  });
  const uniq = (key) => [...new Set(all.map((r) => r[key]).filter(Boolean))].sort();
  const nTasks = all.filter((r) => r.kind === 'task').length, nCom = all.length - nTasks;
  return `<div class="page-title"><div><h1><em>filtro</em>.</h1><p>${nTasks} tarefas abertas · ${nCom} compromissos. Clique no cabeçalho pra ordenar; clique na linha pra abrir. Aqui é só pra ver: editar é no QUESTS ou na AGENDA.</p></div></div>
    <div class="card" style="margin-bottom:14px"><div class="row">
      <input class="inp grow" data-input="filtro.q" value="${esc(f.q)}" placeholder="🔍 buscar" aria-label="Buscar">
      <label class="row" style="gap:4px"><span class="px" style="font-size:7px">CATEGORIA</span><select class="inp" style="width:auto" data-change="filtro" data-k="cat">${opt(uniq('cat'), f.cat)}</select></label>
      <label class="row" style="gap:4px"><span class="px" style="font-size:7px">PRAZO</span><select class="inp" style="width:auto" data-change="filtro" data-k="bucket">${opt(['ATRASADA', 'HOJE', 'PRÓX. 7 DIAS', 'DEPOIS', 'SEM DATA'], f.bucket)}</select></label>
      <label class="row" style="gap:4px"><span class="px" style="font-size:7px">STATUS</span><select class="inp" style="width:auto" data-change="filtro" data-k="status">${opt(uniq('status'), f.status)}</select></label>
      <label class="row" style="gap:4px"><span class="px" style="font-size:7px">TIPO</span><select class="inp" style="width:auto" data-change="filtro" data-k="type">${opt(uniq('type'), f.type)}</select></label>
      <span class="meta">${rows.length} linha(s)</span></div></div>
    <div class="card ftab" style="padding:0"><table><thead><tr>${COLS.map(([key, n]) => `<th data-act="fsort" data-k="${key}">${n}${f.sort === key ? (f.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr data-act="${r.kind === 'task' ? 'jump' : 'goto-agenda'}" data-id="${r.id}">
        <td>${esc(r.text)}</td><td>${esc(r.where)}</td><td>${esc(r.cat)}</td><td>${r.date ? fmtDM(r.date) : ''}</td><td>${esc(r.time)}</td>
        <td class="${r.left != null && r.left < 0 ? 'bad' : ''}">${r.left ?? ''}</td><td>${esc(r.bucket)}</td><td>${esc(r.status)}</td><td>${esc(r.type)}</td><td>${SQ[r.color] || ''}</td><td>${r.marks}</td><td class="acc">${r.xp || ''}</td></tr>`).join('')}</tbody></table></div>`;
}
