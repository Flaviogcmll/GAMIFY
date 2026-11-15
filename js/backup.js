// BACKUP — proteção dos dados no app instalado (fora do claude.ai), onde tudo fica só neste aparelho.
// 1) cópia automática: uma por dia (guarda as 3 últimas) + uma antes de qualquer troca geral (importar, restaurar, baixar do Drive);
// 2) lembrete quando faz tempo que você não baixa um backup;
// 3) pede ao navegador para não limpar os dados sozinho.
// ATENÇÃO: as cópias ficam no MESMO navegador. Salvam de erro do app e de importação errada,
// mas NÃO de limpar os dados do navegador nem de perder o aparelho. Para isso existe o BAIXAR.
import { S, exportAll, replaceAll, deleteDocs, backendKind } from './store.js';
import { esc, today, addDays, diffDays, fmtDM } from './util.js';
import { ask, toast } from './ui.js';

const PRE = 'gamify-bak:'; // prefixo diferente de "gamify:" para o app não confundir cópia com dado de verdade
const K_LAST = 'gamify-ui:lastBackup', K_SNOOZE = 'gamify-ui:bakSnooze', K_PREAT = 'gamify-ui:bakPreAt';
const KEEP = 3, REMIND_DAYS = 7, FIRST_DAYS = 3, BIG = 700000;
const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* */ } },
  keys: () => { try { return Object.keys(localStorage); } catch { return []; } },
};
const local = () => backendKind() === 'local';
/** datas (AAAA-MM-DD) das cópias diárias, da mais nova para a mais velha */
const dailies = () => ls.keys().filter((k) => k.startsWith(PRE) && /^\d{4}-\d\d-\d\d$/.test(k.slice(PRE.length))).map((k) => k.slice(PRE.length)).sort().reverse();

/** grava uma cópia; se faltar espaço, apaga a diária mais velha e tenta mais uma vez */
function write(key, json) {
  if (ls.set(PRE + key, json)) return true;
  const old = dailies().filter((d) => d !== key).at(-1);
  if (!old) return false;
  ls.del(PRE + old);
  return ls.set(PRE + key, json);
}

/** uma cópia por dia, tirada ao abrir o app, ANTES de qualquer ajuste automático nos dados */
export function autoSnapshot() {
  if (!local() || !S.core || !S.quests) return;
  const td = today();
  if (ls.get(PRE + td)) return;
  const json = JSON.stringify(exportAll());
  write(td, json);
  dailies().slice(json.length > BIG ? 1 : KEEP).forEach((d) => ls.del(PRE + d));
}

/** troca todos os dados (importar / restaurar / baixar do Drive) guardando antes uma cópia do estado atual */
export function restoreDocs(docs) {
  if (local() && S.core) {
    if (write('pre', JSON.stringify(exportAll()))) ls.set(K_PREAT, new Date().toISOString());
    // meses do arquivo que existem aqui mas não no backup: sem apagar, eles voltariam na próxima abertura
    const stale = Object.keys(S.arq).map((m) => 'arq-' + m).filter((id) => !(id in docs));
    replaceAll(docs);
    if (stale.length) deleteDocs(...stale);
    return;
  }
  replaceAll(docs);
}

/** anota que um backup saiu do aparelho hoje (BAIXAR, COPIAR ou Drive) */
export function markBackup() { ls.set(K_LAST, today()); ls.del(K_SNOOZE); }

/** faixa de lembrete no topo da tela */
export function backupBanner() {
  if (!local() || !S.core) return '';
  const td = today(), last = ls.get(K_LAST), snooze = ls.get(K_SNOOZE);
  if (snooze && td < snooze) return '';
  const days = diffDays(last || S.core.startDate || td, td);
  if (days < (last ? REMIND_DAYS : FIRST_DAYS)) return '';
  return `<div class="banner info">💾 ${last ? `Faz <b>${days} dias</b> que você não baixa um backup.` : 'Hora de baixar um backup.'} Seus dados ficam só neste aparelho.
    <span class="row" style="margin-top:8px"><button class="btn sm pri" data-act="backup-download">⬇ BAIXAR AGORA</button><button class="btn sm ghost" data-act="backup-snooze">DEPOIS</button></span></div>`;
}

let persisted = null; // o navegador prometeu não limpar os dados sozinho?
/** bloco dentro de PERKS AND RULES → AJUSTES */
export function backupPanel() {
  if (!local()) return '';
  const td = today(), last = ls.get(K_LAST), ds = dailies(), preAt = ls.get(PRE + 'pre') ? ls.get(K_PREAT) : null;
  const n = last ? diffDays(last, td) : 0;
  const when = last ? `${fmtDM(last)} (${n === 0 ? 'hoje' : n === 1 ? 'ontem' : 'há ' + n + ' dias'})` : 'nenhum registrado neste aparelho';
  const pre = preAt ? new Date(preAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  return `<p class="meta" style="margin:12px 0 6px">💾 Último backup baixado: <b>${esc(when)}</b>${persisted ? ' · 🔒 o navegador não limpa estes dados sozinho' : ''}</p>
    ${ds.length || preAt ? `<p class="meta" style="margin:0 0 6px">Cópias automáticas neste aparelho (toque para voltar a uma delas):</p>
    <div class="row">${ds.map((d) => `<button class="btn sm ghost" data-act="backup-restore" data-k="${d}">↺ ${fmtDM(d)}</button>`).join('')}${preAt ? `<button class="btn sm ghost" data-act="backup-restore" data-k="pre">↺ ANTES DA ÚLTIMA TROCA · ${esc(pre)}</button>` : ''}</div>` : ''}
    <p class="meta" style="margin:6px 0 0">As cópias automáticas salvam de erro ou importação errada, mas somem se os dados do navegador forem limpos. Por isso o BAIXAR continua valendo.</p>`;
}

export function extendBackup(ACTIONS, render) {
  Object.assign(ACTIONS, {
    'backup-snooze': () => { ls.set(K_SNOOZE, addDays(today(), 1)); render(); },
    'backup-restore': async (d) => {
      let data = null;
      try { data = JSON.parse(ls.get(PRE + d.k)); } catch { /* cópia estragada */ }
      const docs = data?.docs;
      if (!docs?.core || !docs?.quests) { toast('Esta cópia não pôde ser lida.', 'bad'); return; }
      const label = d.k === 'pre' ? 'de antes da última troca' : 'de ' + fmtDM(d.k);
      if (!(await ask('Voltar para esta cópia?', `Os dados atuais serão trocados pela cópia ${label}. O estado de agora fica guardado em "ANTES DA ÚLTIMA TROCA", caso você se arrependa.`, 'VOLTAR', true))) return;
      restoreDocs(docs);
      render();
      toast('↺ Cópia restaurada', 'good');
    },
  });
  // pede armazenamento "persistente": o navegador deixa de apagar os dados sozinho quando falta espaço
  try { if (!/claude/.test(location.hostname)) navigator.storage?.persist?.().then((ok) => { persisted = !!ok; }).catch(() => {}); } catch { /* navegador antigo */ }
}
