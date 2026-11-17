// IMAGENS E PRINTS NAS TAREFAS. A imagem é reduzida no aparelho, guardada aqui (IndexedDB) e enviada pra pasta escondida
// do app no seu Google Drive (a mesma do backup: o app continua sem enxergar o resto do Drive). No outro aparelho, ela é
// baixada do Drive na primeira vez que aparece. Na tarefa fica só uma etiqueta pequena: t.imgs = [{ k, g }]
// (k = nome da imagem neste aparelho · g = id do arquivo no Drive, quando já subiu). O backup em arquivo não leva as imagens.
import { S } from './store.js';
import { commit } from './actions.js';
import { driveApi, driveOn } from './drive.js';
import { uid } from './util.js';
import { toast } from './ui.js';

const ST = 'img';
let dbp = null;
const db = () => (dbp ||= new Promise((res, rej) => { const r = indexedDB.open('gamify-img', 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
async function idb(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => { const tx = d.transaction(ST, mode), q = fn(tx.objectStore(ST)); tx.oncomplete = () => res(q?.result); tx.onerror = () => rej(tx.error); });
}
const getLocal = (k) => idb('readonly', (s) => s.get(k)).catch(() => null);
const putLocal = (k, b) => idb('readwrite', (s) => s.put(b, k));
const task = (id) => S.quests.tasks.find((t) => t.id === id);

/** reduz: lado maior até 1600 px, JPEG 82% (um print continua legível e fica com uns 200 KB) */
async function shrink(file) {
  let src;
  try { src = await createImageBitmap(file); } catch { src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Esse arquivo não é uma imagem que o navegador abre.')); i.src = URL.createObjectURL(file); }); }
  const w = src.width, h = src.height, k = Math.min(1, 1600 / Math.max(w, h)), c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  src.close?.();
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82));
}
async function upload(k, blob) {
  const b = 'gmi' + Date.now(), meta = JSON.stringify({ name: `img-${k}.jpg`, parents: ['appDataFolder'] });
  const body = new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${b}\r\nContent-Type: image/jpeg\r\n\r\n`, blob, `\r\n--${b}--`]);
  return (await (await driveApi('/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body })).json()).id;
}

/** sobe pro Drive as imagens que ainda só estão neste aparelho */
let pushing = false;
export async function pushPending() {
  if (pushing || !driveOn()) return;
  pushing = true;
  try {
    for (const t of S.quests.tasks) for (const im of t.imgs || []) {
      if (im.g) continue;
      const blob = await getLocal(im.k);
      if (!blob) continue;
      const g = await upload(im.k, blob);
      commit(['quests'], () => { im.g = g; }, { noUndo: true });
    }
  } catch { /* sem internet ou sem login: tenta de novo depois */ } finally { pushing = false; }
}
export async function addImages(taskId, files) {
  let n = 0;
  for (const f of files) {
    if (!/^image\//.test(f.type)) continue;
    try {
      const blob = await shrink(f), k = uid('i');
      await putLocal(k, blob);
      commit(['quests'], () => { const t = task(taskId); if (t) (t.imgs ||= []).push({ k }); });
      n++;
    } catch (e) { toast('🖼 ' + (e.message || 'Não deu pra guardar a imagem.'), 'bad'); }
  }
  if (n) { toast(`🖼 ${n} imagem(ns) guardada(s)${driveOn() ? '; subindo pro Drive' : ' neste aparelho'}.`, 'good'); pushPending(); }
  return n;
}
const urls = new Map();
/** endereço pra mostrar a imagem: deste aparelho ou, se não tiver, baixada do Drive (e guardada) */
export async function imgUrl(im) {
  if (urls.has(im.k)) return urls.get(im.k);
  let blob = await getLocal(im.k);
  if (!blob && im.g && driveOn()) { try { blob = await (await driveApi(`/drive/v3/files/${im.g}?alt=media`)).blob(); await putLocal(im.k, blob); } catch { /* */ } }
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urls.set(im.k, u);
  return u;
}
/** tira a imagem da tarefa e apaga o arquivo do Drive (a cópia deste aparelho fica, pro ↺ desfazer) */
export function removeImage(taskId, k) {
  const t = task(taskId), im = t?.imgs?.find((x) => x.k === k);
  if (!im) return;
  commit(['quests'], () => { t.imgs = t.imgs.filter((x) => x.k !== k); if (!t.imgs.length) delete t.imgs; });
  if (im.g && driveOn()) driveApi(`/drive/v3/files/${im.g}`, { method: 'DELETE' }).catch(() => {});
}

/** miniaturas dentro da janela de editar tarefa */
export const imgSection = (t) => `<label class="lbl">🖼 Imagens e prints</label><div class="imgs" data-imgs="${t.id}"></div>
  <div class="row" style="gap:8px;align-items:center"><label class="btn sm">＋ IMAGEM<input type="file" accept="image/*" multiple hidden data-img-add="${t.id}"></label><span class="meta">${driveOn() ? 'vão pro seu Drive e aparecem no celular e no PC' : 'ficam só neste aparelho até você conectar o Drive (PERKS)'} · no PC dá pra colar um print (Ctrl+V)</span></div>`;
export async function fillImgs(root = document) {
  for (const box of root.querySelectorAll('[data-imgs]')) {
    const t = task(box.dataset.imgs), list = t?.imgs || [];
    box.innerHTML = list.map((im) => `<button type="button" class="imgth" data-img-open="${t.id}" data-k="${im.k}" aria-label="Ver imagem"><span>…</span></button>`).join('');
    for (const im of list) {
      const u = await imgUrl(im), b = box.querySelector(`[data-k="${im.k}"]`);
      if (b) b.innerHTML = u ? `<img src="${u}" alt="">` : `<span title="Ainda não chegou neste aparelho: sincronize o Drive">☁</span>`;
    }
  }
}
function viewer(taskId, k) {
  const u = urls.get(k);
  if (!u) return;
  const d = document.createElement('div');
  d.className = 'imgview';
  d.innerHTML = `<img src="${u}" alt=""><div class="row"><button class="btn sm danger" data-x="del">APAGAR</button><button class="btn sm pri" data-x="close">FECHAR</button></div>`;
  d.onclick = (e) => {
    const x = e.target.closest('[data-x]')?.dataset.x;
    if (x === 'del') { removeImage(taskId, k); fillImgs(); }
    if (x || e.target === d) d.remove();
  };
  document.body.appendChild(d);
}

export function extendImgs() {
  document.addEventListener('change', async (e) => {
    const inp = e.target.closest?.('[data-img-add]');
    if (!inp) return;
    await addImages(inp.dataset.imgAdd, [...inp.files]);
    inp.value = '';
    fillImgs();
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-img-open]');
    if (b) viewer(b.dataset.imgOpen, b.dataset.k);
  });
  // print colado (Ctrl+V) com a tarefa aberta
  document.addEventListener('paste', async (e) => {
    const box = document.querySelector('.modal [data-imgs]'), files = [...(e.clipboardData?.files || [])].filter((f) => /^image\//.test(f.type));
    if (!box || !files.length) return;
    e.preventDefault();
    await addImages(box.dataset.imgs, files);
    fillImgs();
  });
  setTimeout(pushPending, 8000);
}
