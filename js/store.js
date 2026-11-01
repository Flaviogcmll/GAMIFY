// ESTADO + SALVAMENTO.
// Os dados vivem em documentos JSON: gamify/core, gamify/quests, gamify/marks, gamify/loja e gamify/arq-AAAA-MM.
// No claude.ai eles ficam no banco do app (sincroniza celular e PC). Fora dele, no localStorage do navegador.
import { uid } from './util.js';

export const DOCS = ['core', 'quests', 'marks', 'loja'];
export const S = { _epoch: 1, core: null, quests: null, marks: null, loja: null, arq: {} };
export const status = { mode: 'loading', loaded: false, empty: false, stale: false, error: null, saving: false, readonly: false };

const CLIENT = uid('c');
const LS = 'gamify:';
let backend = null;
const dirty = new Set();
const writing = {};
let timer = null;
const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const emit = (why) => listeners.forEach((fn) => fn(why));

const docIds = () => [...DOCS, ...Object.keys(S.arq).map((m) => 'arq-' + m)];
const bodyOf = (id) => (id.startsWith('arq-') ? S.arq[id.slice(4)] : S[id]);
function putDoc(id, data) {
  const clean = JSON.parse(JSON.stringify(data));
  delete clean._by;
  delete clean._ts;
  if (id.startsWith('arq-')) S.arq[id.slice(4)] = clean;
  else if (DOCS.includes(id)) S[id] = clean;
}

export async function init() {
  // espera o runtime do claude.ai aparecer (só existe quando o app roda lá)
  for (let i = 0; i < 15 && typeof window.claude?.use !== 'function'; i++) await new Promise((r) => setTimeout(r, 100));
  if (typeof window.claude?.use === 'function') {
    let db = null;
    try {
      db = await Promise.race([window.claude.use('db'), new Promise((r) => setTimeout(() => r(null), 10000))]);
    } catch { db = null; }
    if (db) return initDb(db);
    status.error = 'O banco do claude.ai não respondeu. Seus dados ficam só neste navegador por enquanto.';
  }
  initLocal();
}

function initLocal() {
  backend = { kind: 'local' };
  status.mode = 'local';
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i), id = k.startsWith(LS) ? k.slice(LS.length) : '';
      if (!DOCS.includes(id) && !id.startsWith('arq-')) continue;
      try { putDoc(id, JSON.parse(localStorage.getItem(k))); } catch { /* documento corrompido: ignora */ }
    }
  } catch { status.error = 'Este navegador bloqueou o armazenamento local.'; }
  status.loaded = true;
  status.empty = !S.core;
  S._epoch++;
  emit('load');
}
/** v4: antes de qualquer gravação nova, copia os documentos como estavam (v3.5) para a coleção gamify-backup-v35. Roda uma vez. */
let snapDone = false;
async function snapshotOnce(db, docs) {
  const FLAG = 'gamify-ui:snap-v35';
  try {
    if (localStorage.getItem(FLAG)) return;
    const ref = db.doc('gamify-backup-v35/core');
    let exists = false;
    try { const g = await ref.get(); exists = typeof g?.exists === 'function' ? g.exists() : !!g?.exists; } catch { exists = false; }
    if (!exists) {
      for (const [id, data] of docs) {
        if (!data || id.startsWith('_')) continue;
        await db.doc('gamify-backup-v35/' + id).set({ ...JSON.parse(JSON.stringify(data)), _snapshotAt: new Date().toISOString() });
      }
    }
    localStorage.setItem(FLAG, '1');
  } catch { /* sem backup automático: o botão COPIAR BACKUP continua valendo */ }
}

function initDb(db) {
  backend = { kind: 'db', db };
  status.mode = 'db';
  let confirmed = false;
  const slow = setTimeout(() => {
    if (!confirmed) {
      status.stale = true;
      if (!status.loaded) { status.loaded = true; status.empty = !S.core; }
      emit('status');
    }
  }, 10000);
  db.collection('gamify').onSnapshot(
    (snap) => {
      for (const d of snap.docs) {
        const data = d.data();
        if (!data || data._by === CLIENT) continue; // eco da minha própria escrita
        if (dirty.has(d.id) || writing[d.id]) continue; // tenho alteração local pendente: a minha vale
        putDoc(d.id, data);
      }
      if (!snap.metadata.fromCache) {
        confirmed = true; clearTimeout(slow); status.stale = false;
        if (!snapDone) { snapDone = true; snapshotOnce(db, snap.docs.map((d) => [d.id, d.data()])); }
      }
      if (!status.loaded && (confirmed || S.core)) { status.loaded = true; }
      status.empty = status.loaded && !S.core;
      S._epoch++;
      emit('remote');
    },
    (err) => {
      clearTimeout(slow);
      status.error = 'Perdi a conexão com o banco (' + (err?.code || 'erro') + '). Recarregue a página para tentar de novo.';
      status.loaded = true;
      status.empty = !S.core;
      emit('status');
    },
  );
}

/** marca documentos como alterados; grava ~0,7 s depois (agrupa cliques seguidos) */
export function save(...ids) {
  for (const id of ids) if (id) dirty.add(id);
  status.saving = true;
  clearTimeout(timer);
  timer = setTimeout(flush, 700);
  emit('status');
}

export async function flush() {
  clearTimeout(timer);
  for (const id of [...dirty]) {
    if (writing[id]) continue;
    dirty.delete(id);
    const body = bodyOf(id);
    if (!body) continue;
    const json = JSON.stringify(body);
    if (json.length > 240000) status.error = `O documento "${id}" está ficando grande demais (${Math.round(json.length / 1024)} KB). Arquive tarefas antigas.`;
    writing[id] = true;
    try {
      if (backend?.kind === 'db') {
        const payload = { ...JSON.parse(json), _by: CLIENT, _ts: Date.now() };
        try { await backend.db.doc('gamify/' + id).set(payload); }
        catch (e) {
          if (e?.code === 'unavailable') { await new Promise((r) => setTimeout(r, 800 + Math.random() * 800)); await backend.db.doc('gamify/' + id).set(payload); }
          else throw e;
        }
      } else {
        localStorage.setItem(LS + id, json);
      }
    } catch (e) {
      if (e?.code === 'invalid_argument') { status.readonly = true; status.error = 'Este jogo é privado: só o dono consegue salvar.'; }
      else if (e?.code === 'quota_exceeded') status.error = 'O banco do app está cheio. Exporte um backup e arquive dados antigos.';
      else status.error = 'Não consegui salvar (' + (e?.code || e?.message || 'erro') + '). Vou tentar de novo na próxima alteração.';
      dirty.add(id);
    }
    writing[id] = false;
  }
  status.saving = dirty.size > 0;
  if (dirty.size && !status.readonly) timer = setTimeout(flush, 2000);
  emit('status');
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.hidden && dirty.size) flush(); });
}

/** troca todos os documentos (novo jogo ou importar backup) */
export function replaceAll(docs) {
  S.arq = {};
  for (const [id, body] of Object.entries(docs)) putDoc(id, body);
  status.empty = !S.core;
  S._epoch++;
  save(...docIds());
  emit('load');
}

export function exportAll() {
  const docs = {};
  for (const id of docIds()) if (bodyOf(id)) docs[id] = bodyOf(id);
  return { gamify: 1, exportedAt: new Date().toISOString(), docs };
}

/** apaga documentos (usado ao esvaziar o arquivo) */
export async function deleteDocs(...ids) {
  for (const id of ids) {
    dirty.delete(id);
    try {
      if (backend?.kind === 'db') await backend.db.doc('gamify/' + id).delete();
      else localStorage.removeItem(LS + id);
    } catch (e) { status.error = 'Não consegui apagar ' + id + ' (' + (e?.code || 'erro') + ').'; emit('status'); }
  }
}
export const backendKind = () => backend?.kind || 'loading';
