// GOOGLE DRIVE — sincroniza celular e PC no app instalado (fora do claude.ai). Grátis: usa a pasta escondida do app no SEU Drive
// (escopo drive.appdata: o app só enxerga o próprio arquivo, nunca o resto do Drive). Você cria o ID de acesso uma vez, no Google Cloud.
// O dono usa no dia a dia (celular e PC). O Claude não consegue testar o login daqui: mudanças neste arquivo precisam ser conferidas por ele.
import { S, exportAll, backendKind } from './store.js';
import { restoreDocs, markBackup } from './backup.js';
import { esc, hash } from './util.js';
import { toast, ask } from './ui.js';
import { sfx } from './audio.js';

const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } }, del: (k) => { try { localStorage.removeItem(k); } catch { /* */ } } };
const FILE = 'gamify-backup.json', API = 'https://www.googleapis.com';
let token = null, tokenExp = 0, tc = null, busy = false;
const clientId = () => (ls.get('gamify-ui:gclient') || '').trim();
/** conta Google usada da última vez (fica só neste aparelho): com ela o Google não pergunta de novo "qual conta?" */
const account = () => (ls.get('gamify-ui:gmail') || '').trim();
const snapHash = () => String(hash(JSON.stringify(exportAll().docs)));

function loadGis() {
  return new Promise((res, rej) => {
    if (window.google?.accounts?.oauth2) return res();
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('Sem internet para falar com o Google.'));
    document.head.appendChild(s);
  });
}
/** a chave de acesso do Google vale ~1 h: guardada neste aparelho, reabrir o app dentro desse tempo não abre a janela do Google de novo */
function cachedToken() {
  if (token) return;
  try { const c = JSON.parse(ls.get('gamify-ui:gtok') || 'null'); if (c?.t && c.exp > Date.now()) { token = c.t; tokenExp = c.exp; } } catch { /* */ }
}
function dropToken() { token = null; tokenExp = 0; ls.del('gamify-ui:gtok'); }
async function getToken(interactive) {
  cachedToken();
  if (token && Date.now() < tokenExp - 60000) return token;
  if (!clientId()) throw new Error('Cole primeiro o ID de acesso do Google (veja o guia).');
  // v8.3: sem toque do dono o Google não abre a janela de login (o navegador bloqueia). Antes a sincronização automática
  // ficava esperando pra sempre (e travava as próximas): agora ela desiste na hora e o app avisa pra tocar em SINCRONIZAR.
  if (!interactive) { const e = new Error('login'); e.needLogin = true; throw e; }
  await loadGis();
  return new Promise((res, rej) => {
    setTimeout(() => rej(new Error('O Google demorou demais pra responder. Tente de novo.')), 90e3);
    tc = tc || window.google.accounts.oauth2.initTokenClient({ client_id: clientId(), scope: 'https://www.googleapis.com/auth/drive.appdata', callback: () => {} });
    tc.callback = (r) => { if (r.error) rej(new Error(r.error_description || r.error)); else { token = r.access_token; tokenExp = Date.now() + (r.expires_in || 3600) * 1000; ls.set('gamify-ui:gdrive', '1'); ls.set('gamify-ui:gtok', JSON.stringify({ t: token, exp: tokenExp })); res(token); } };
    tc.error_callback = (e) => rej(new Error(e?.type === 'popup_closed' ? 'Janela do Google fechada.' : 'O Google não abriu a janela de login.'));
    const hint = account(), cfg = { prompt: interactive ? (ls.get('gamify-ui:gdrive') ? '' : 'consent') : '' };
    if (hint) { cfg.login_hint = hint; cfg.hint = hint; } // o nome do campo mudou entre versões da biblioteca do Google: mando os dois
    tc.requestAccessToken(cfg);
  });
}
async function api(path, opts = {}, tk) {
  const r = await fetch(API + path, { ...opts, headers: { Authorization: 'Bearer ' + tk, ...(opts.headers || {}) } });
  if (r.status === 401) dropToken(); // chave vencida ou cancelada: na próxima tentativa pede uma nova
  if (!r.ok) throw new Error('Drive ' + r.status);
  return r;
}
/** já conectado ao Drive neste aparelho? (usado pelas imagens das tarefas) */
export const driveOn = () => ls.get('gamify-ui:gdrive') === '1' && !!clientId();
/** chamada ao Drive com a mesma chave do backup (escopo drive.appdata). Sem `interactive`, não abre a janela do Google */
export async function driveApi(path, opts = {}, interactive = false) { return api(path, opts, await getToken(interactive)); }
/** descobre e guarda o e-mail da conta que entrou (uma vez) */
async function rememberAccount(tk) {
  if (account()) return;
  try { const r = await (await api('/drive/v3/about?fields=user(emailAddress)', {}, tk)).json(); if (r.user?.emailAddress) ls.set('gamify-ui:gmail', r.user.emailAddress); } catch { /* sem o e-mail, o Google só volta a perguntar a conta */ }
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
  if (interactive) warned = false;
  try {
    const tk = await getToken(interactive);
    await rememberAccount(tk);
    const file = await findFile(tk);
    const localNow = snapHash(), lastSynced = ls.get('gamify-ui:gsnap'), localChanged = localNow !== lastSynced;
    if (!file) { await upload(tk, null, JSON.stringify(exportAll())); ls.set('gamify-ui:gsnap', localNow); markBackup(); if (interactive) toast('☁ Primeiro backup criado no seu Drive', 'good'); return; }
    const remote = await (await api(`/drive/v3/files/${file.id}?alt=media`, {}, tk)).json();
    const remoteHash = String(hash(JSON.stringify(remote.docs || {})));
    if (remoteHash === localNow) { ls.set('gamify-ui:gsnap', localNow); markBackup(); if (interactive) toast('☁ Já está tudo igual', 'good'); return; }
    const remoteChanged = remoteHash !== lastSynced;
    let useRemote = remoteChanged && !localChanged;
    if (remoteChanged && localChanged) useRemote = await ask('Os dois lados mudaram', `A nuvem foi atualizada em ${new Date(file.modifiedTime).toLocaleString('pt-BR')} e este aparelho também tem mudanças novas. Qual versão vale?`, 'USAR A DA NUVEM', false) ? true : false;
    if (remoteChanged && localChanged && !useRemote && !(await ask('Manter este aparelho?', 'A versão da nuvem será substituída pela daqui.', 'MANTER ESTE', true))) return;
    if (useRemote) { restoreDocs(remote.docs); ls.set('gamify-ui:gsnap', remoteHash); markBackup(); render(); toast('☁ Dados baixados do Drive', 'good'); sfx('coin'); }
    else { await upload(tk, file.id, JSON.stringify(exportAll())); ls.set('gamify-ui:gsnap', localNow); markBackup(); if (interactive) toast('☁ Enviado pro Drive', 'good'); }
  } catch (e) {
    if (interactive) { sfx('error'); toast('☁ ' + esc(e.message || 'Não deu certo'), 'bad'); }
    else if (e.needLogin && !warned) { warned = true; toast('☁ O Google pediu pra entrar de novo: as mudanças deste aparelho ainda NÃO foram pro Drive. <button class="btn sm pri" data-act="drive-sync">☁ SINCRONIZAR</button>', 'gold'); }
  } finally { busy = false; }
}
let warned = false, soonT = 0;
/** v8.3: depois de cada mudança, manda pro Drive (20 s depois da última, pra juntar várias). Antes só mandava ao abrir e ao sair da aba,
 *  e no celular o "ao sair" quase nunca rodava (o navegador congela a aba): o que foi feito no celular não chegava no PC. */
export function driveSoon(render) {
  if (ls.get('gamify-ui:gdrive') !== '1' || backendKind() !== 'local') return;
  clearTimeout(soonT); soonT = setTimeout(() => driveSync({ interactive: false, render }), 20e3);
}

export function driveCard() {
  if (backendKind() !== 'local') return '';
  const id = clientId(), on = ls.get('gamify-ui:gdrive') === '1';
  return `<div class="card c12" data-gk="drive"><header><h2>☁ Google Drive · sincronizar celular e PC</h2><span class="meta">${on ? 'conectado' + (account() ? ' · ' + esc(account()) : '') : id ? 'pronto pra entrar' : 'falta o ID de acesso'}</span></header>
    <form data-v4form="drive-id" class="row" autocomplete="off"><input class="inp grow" name="id" value="${esc(id)}" placeholder="ID de acesso do Google (termina com .apps.googleusercontent.com)" aria-label="ID de acesso do Google"><button class="btn sm">SALVAR ID</button></form>
    <div class="row" style="margin-top:10px"><button class="btn sm pri" data-act="drive-sync" ${id ? '' : 'disabled'}>☁ ${on ? 'SINCRONIZAR AGORA' : 'ENTRAR E SINCRONIZAR'}</button>${account() ? '<button class="btn sm ghost" data-act="drive-account" title="Esquece a conta guardada: na próxima vez o Google pergunta qual usar">TROCAR DE CONTA</button>' : ''}</div>
    <p class="meta" style="margin:8px 0 0">O app só enxerga o próprio arquivo escondido no seu Drive. O ID de acesso é criado uma vez no Google Cloud. O app lembra a conta que você usou, pra não perguntar toda vez.</p></div>`;
}
export function extendDrive(ACTIONS, render) {
  Object.assign(ACTIONS, {
    'drive-sync': () => driveSync({ interactive: true, render }),
    'drive-account': () => { ls.del('gamify-ui:gmail'); dropToken(); tc = null; toast('Conta esquecida. Na próxima sincronização o Google pergunta qual usar.'); render(); },
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest?.('form[data-v4form="drive-id"]');
    if (!f) return;
    e.preventDefault(); ls.set('gamify-ui:gclient', f.id.value.trim()); toast('ID salvo', 'good'); render();
  });
  // ao abrir e depois de mudanças (20 s), tenta sincronizar sozinho quando já conectado
  let t = null;
  setTimeout(() => { if (ls.get('gamify-ui:gdrive') === '1') driveSync({ interactive: false, render }); }, 4000);
  // v8.3: ao sair da aba manda NA HORA (o timer congelava no celular); ao voltar pro app, busca o que o outro aparelho mandou
  let lastPull = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (ls.get('gamify-ui:gdrive') !== '1') return;
    if (document.hidden) { clearTimeout(t); clearTimeout(soonT); driveSync({ interactive: false, render }); }
    else if (Date.now() - lastPull > 60e3) { lastPull = Date.now(); clearTimeout(t); t = setTimeout(() => driveSync({ interactive: false, render }), 800); }
  });
  void S;
}
