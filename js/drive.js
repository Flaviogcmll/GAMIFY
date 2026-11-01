// GOOGLE DRIVE — sincroniza celular e PC no app instalado (fora do claude.ai). Grátis: usa a pasta escondida do app no SEU Drive
// (escopo drive.appdata: o app só enxerga o próprio arquivo, nunca o resto do Drive). Você cria o ID de acesso uma vez (veja GUIA_LANCAMENTO.md).
import { S, exportAll, replaceAll, backendKind } from './store.js';
import { esc, hash } from './util.js';
import { toast, ask } from './ui.js';
import { sfx } from './audio.js';

const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
const FILE = 'gamify-backup.json', API = 'https://www.googleapis.com';
let token = null, tokenExp = 0, tc = null, busy = false;
const clientId = () => (ls.get('gamify-ui:gclient') || '').trim();
const snapHash = () => String(hash(JSON.stringify(exportAll().docs)));

function loadGis() {
  return new Promise((res, rej) => {
    if (window.google?.accounts?.oauth2) return res();
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('Sem internet para falar com o Google.'));
    document.head.appendChild(s);
  });
}
async function getToken(interactive) {
  if (token && Date.now() < tokenExp - 60000) return token;
  if (!clientId()) throw new Error('Cole primeiro o ID de acesso do Google (veja o guia).');
  await loadGis();
  return new Promise((res, rej) => {
    tc = tc || window.google.accounts.oauth2.initTokenClient({ client_id: clientId(), scope: 'https://www.googleapis.com/auth/drive.appdata', callback: () => {} });
    tc.callback = (r) => { if (r.error) rej(new Error(r.error_description || r.error)); else { token = r.access_token; tokenExp = Date.now() + (r.expires_in || 3600) * 1000; ls.set('gamify-ui:gdrive', '1'); res(token); } };
    tc.error_callback = (e) => rej(new Error(e?.type === 'popup_closed' ? 'Janela do Google fechada.' : 'O Google não abriu a janela de login.'));
    tc.requestAccessToken({ prompt: interactive ? (ls.get('gamify-ui:gdrive') ? '' : 'consent') : '' });
  });
}
async function api(path, opts = {}, tk) {
  const r = await fetch(API + path, { ...opts, headers: { Authorization: 'Bearer ' + tk, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error('Drive ' + r.status);
  return r;
}
async function findFile(tk) {
  const r = await (await api(`/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(`name='${FILE}'`)}&fields=files(id,modifiedTime)`, {}, tk)).json();
  return r.files?.[0] || null;
}
async function upload(tk, fileId, body) {
  const meta = { name: FILE, ...(fileId ? {} : { parents: ['appDataFolder'] }) }, boundary = 'gmf' + Date.now();
  const payload = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
  await api(`/upload/drive/v3/files${fileId ? '/' + fileId : ''}?uploadType=multipart`, { method: fileId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: payload }, tk);
}

/** sincroniza: sobe, baixa ou pergunta quando os dois lados mudaram */
export async function driveSync({ interactive = true, render = () => {} } = {}) {
  if (busy || backendKind() !== 'local') return;
  busy = true;
  try {
    const tk = await getToken(interactive), file = await findFile(tk);
    const localNow = snapHash(), lastSynced = ls.get('gamify-ui:gsnap'), localChanged = localNow !== lastSynced;
    if (!file) { await upload(tk, null, JSON.stringify(exportAll())); ls.set('gamify-ui:gsnap', localNow); if (interactive) toast('☁ Primeiro backup criado no seu Drive', 'good'); return; }
    const remote = await (await api(`/drive/v3/files/${file.id}?alt=media`, {}, tk)).json();
    const remoteHash = String(hash(JSON.stringify(remote.docs || {})));
    if (remoteHash === localNow) { ls.set('gamify-ui:gsnap', localNow); if (interactive) toast('☁ Já está tudo igual', 'good'); return; }
    const remoteChanged = remoteHash !== lastSynced;
    let useRemote = remoteChanged && !localChanged;
    if (remoteChanged && localChanged) useRemote = await ask('Os dois lados mudaram', `A nuvem foi atualizada em ${new Date(file.modifiedTime).toLocaleString('pt-BR')} e este aparelho também tem mudanças novas. Qual versão vale?`, 'USAR A DA NUVEM', false) ? true : false;
    if (remoteChanged && localChanged && !useRemote && !(await ask('Manter este aparelho?', 'A versão da nuvem será substituída pela daqui.', 'MANTER ESTE', true))) return;
    if (useRemote) { replaceAll(remote.docs); ls.set('gamify-ui:gsnap', remoteHash); render(); toast('☁ Dados baixados do Drive', 'good'); sfx('coin'); }
    else { await upload(tk, file.id, JSON.stringify(exportAll())); ls.set('gamify-ui:gsnap', localNow); if (interactive) toast('☁ Enviado pro Drive', 'good'); }
  } catch (e) { if (interactive) { sfx('error'); toast('☁ ' + esc(e.message || 'Não deu certo'), 'bad'); } } finally { busy = false; }
}

export function driveCard() {
  if (backendKind() !== 'local') return '';
  const id = clientId(), on = ls.get('gamify-ui:gdrive') === '1';
  return `<div class="card c12" data-gk="drive"><header><h2>☁ Google Drive · sincronizar celular e PC</h2><span class="meta">${on ? 'conectado' : id ? 'pronto pra entrar' : 'falta o ID de acesso'}</span></header>
    <form data-v4form="drive-id" class="row" autocomplete="off"><input class="inp grow" name="id" value="${esc(id)}" placeholder="ID de acesso do Google (termina com .apps.googleusercontent.com)" aria-label="ID de acesso do Google"><button class="btn sm">SALVAR ID</button></form>
    <div class="row" style="margin-top:10px"><button class="btn sm pri" data-act="drive-sync" ${id ? '' : 'disabled'}>☁ ${on ? 'SINCRONIZAR AGORA' : 'ENTRAR E SINCRONIZAR'}</button></div>
    <p class="meta" style="margin:8px 0 0">O app só enxerga o próprio arquivo escondido no seu Drive. Passo a passo para criar o ID: GUIA_LANCAMENTO.md.</p></div>`;
}
export function extendDrive(ACTIONS, render) {
  Object.assign(ACTIONS, { 'drive-sync': () => driveSync({ interactive: true, render }) });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest?.('form[data-v4form="drive-id"]');
    if (!f) return;
    e.preventDefault(); ls.set('gamify-ui:gclient', f.id.value.trim()); toast('ID salvo', 'good'); render();
  });
  // ao abrir e depois de mudanças (20 s), tenta sincronizar sozinho quando já conectado
  let t = null;
  setTimeout(() => { if (ls.get('gamify-ui:gdrive') === '1') driveSync({ interactive: false, render }); }, 4000);
  document.addEventListener('visibilitychange', () => { if (document.hidden && ls.get('gamify-ui:gdrive') === '1') { clearTimeout(t); t = setTimeout(() => driveSync({ interactive: false, render }), 500); } });
  void S;
}
