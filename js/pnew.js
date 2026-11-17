// O PRIMO NOVO — desenho em alta definição feito a partir das artes geradas pelo dono (IA de imagem, com direção dele).
// Aqui só se DESENHA: animações do porquinho, rostos (expressões), acessórios encaixados por posição, FAÍSCA e o arquivo do cenário.
// O porquinho clássico em pixel (pdraw.js) continua existindo como reserva: se estas artes não carregarem, é ele que aparece.
// As artes ficam em assets/primo/ e são preparadas fora do app (recorte de fundo, quadros dos vídeos, redução).
const BASE = 'assets/primo/';
let META = null, failed = false;
const IMG = {};
/** carrega uma imagem uma vez; devolve o <img> (pode ainda estar carregando) */
function img(name) {
  if (!IMG[name]) { const i = new Image(); i.decoding = 'async'; i.src = BASE + name + '.webp'; i.onerror = () => { i._bad = true; }; IMG[name] = i; }
  return IMG[name];
}
const ok = (i) => i && i.complete && i.naturalWidth > 0;
if (typeof fetch === 'function' && typeof document !== 'undefined') {
  fetch(BASE + 'primo.json').then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => { META = j; img('parado'); img('rostos'); img('faisca'); }).catch(() => { failed = true; });
}
/** o dono pode voltar pro porquinho clássico em PERKS */
export const artWanted = () => { try { return localStorage.getItem('gamify-ui:primo-art') !== 'classico'; } catch { return true; } };
/** as artes novas estão prontas pra desenhar? (senão, cai no clássico) */
export const artReady = () => !failed && !!META && ok(img('parado'));
export const artOn = () => artWanted() && artReady();

// ───────────────────────── ACESSÓRIOS ─────────────────────────
// Cada peça tem duas vistas: f = frente 3/4 (porco parado, feliz, comendo) · s = lado (porco andando).
// [largura, centro x, centro y] em pontos do quadro (0 a 224), medidos no primeiro quadro de cada vista.
// `under: true` = desenhada ATRÁS do porco (capas).
export const ACC = {
  // cabeça
  bone: { slot: 'hat', f: [112, 142, 60], s: [84, 174, 60] },
  palha: { slot: 'hat', f: [138, 140, 58], s: [100, 172, 58] },
  gorro: { slot: 'hat', f: [106, 140, 52], s: [80, 174, 54] },
  bandana: { slot: 'hat', f: [112, 138, 66], s: [82, 172, 66] },
  capacete: { slot: 'hat', f: [112, 140, 56], s: [86, 176, 58] },
  fone: { slot: 'hat', f: [132, 140, 88], s: [44, 162, 92] },
  cartola: { slot: 'hat', f: [92, 140, 44], s: [70, 174, 44] },
  mago: { slot: 'hat', f: [122, 140, 40], s: [92, 172, 42] },
  coroa: { slot: 'hat', f: [72, 140, 50], s: [54, 174, 50] },
  cozinheiro: { slot: 'hat', f: [92, 140, 38], s: [70, 174, 40] },
  lanterna: { slot: 'hat', f: [114, 140, 56], s: [88, 176, 58] },
  // olhos
  oculos: { slot: 'eyes', f: [102, 157, 106], s: [52, 186, 104] },
  sol: { slot: 'eyes', f: [106, 157, 106], s: [54, 186, 104] },
  monoculo: { slot: 'eyes', f: [44, 186, 114], s: [20, 198, 108] },
  // pescoço
  cachecol: { slot: 'neck', f: [96, 142, 152], s: [46, 160, 146] },
  gravata: { slot: 'neck', f: [58, 152, 150], s: [26, 174, 142] },
  medalha: { slot: 'neck', f: [52, 150, 160], s: [26, 170, 152] },
  junina: { slot: 'neck', f: [86, 146, 152], s: [50, 164, 144] },
  trevo: { slot: 'neck', f: [46, 152, 152], s: [28, 170, 144] },
  // costas
  mochila: { slot: 'back', f: [76, 70, 116], s: [60, 96, 98] },
  capa: { slot: 'back', f: [104, 78, 126], s: [88, 104, 122] },
  capaazul: { slot: 'back', f: [104, 78, 126], s: [88, 104, 122] },
  chuva: { slot: 'back', f: [96, 76, 118], s: [84, 100, 108] },
  violao: { slot: 'back', f: [56, 62, 110], s: [44, 92, 92] },
};
// quanto a CABEÇA desce em cada quadro do "comendo" (o centro do corpo quase não muda, então é marcado à mão)
const EAT_HEAD = [0, 0, 3, 10, 15, 16, 16, 16, 16, 16, 16, 15, 10, 0, 0, 0];

const HAPPY = ['feliz', 'animado', 'festa', 'orgulhoso', 'apaixonado', 'piscada'];
/** qual animação combina com a expressão; parado, ele dá uma voltinha e come de vez em quando */
function pose(expr, f, tired) {
  if (expr === 'dormindo') return { anim: 'dormindo', off: 0 };
  if (HAPPY.includes(expr)) return { anim: 'feliz', off: 0 };
  if (!tired && ['neutro', 'pensativo', 'debochado', 'suspeito'].includes(expr)) {
    const ph = f % 260;
    if (ph < 40) return { anim: 'andando', off: ph * 0.5, flip: false };
    if (ph >= 110 && ph < 150) return { anim: 'andando', off: 20 - (ph - 110) * 0.5, flip: true };
    if (ph >= 190 && ph < 222) return { anim: 'comendo', off: 0, t: ph - 190 };
    return { anim: 'parado', off: ph < 110 ? 20 : 0 };
  }
  return { anim: 'parado', off: 0 };
}
const TMP = typeof document !== 'undefined' ? document.createElement('canvas') : null;

function drawAcc(t, id, view, dx, dy, FR) {
  const a = ACC[id], p = a?.[view], m = META.acc[id]?.[view], im = img('acc/' + id + '-' + view);
  if (!p || !m || !ok(im)) return;
  const w = p[0], h = (w * m[1]) / m[0];
  t.drawImage(im, p[1] - w / 2 + dx, p[2] - h / 2 + dy, w, h);
  void FR;
}

/** desenha o PRIMO novo no mesmo espaço lógico do clássico (72 x 96): o = { expr, wear, talk, f, mood } */
export function drawPortraitNew(c, o = {}) {
  const { wear = {}, talk = false, f = 0, mood = null } = o, FR = META.fr;
  const tired = mood === 'tired' || o.expr === 'cansado';
  const ps = pose(o.expr, f, tired), A = META.anim[ps.anim], sheet = img(ps.anim);
  const sp = A.speed * (tired ? 2 : 1), i = ps.t != null ? Math.min(A.n - 1, Math.floor(ps.t / A.speed)) : Math.floor(f / sp) % A.n;
  const dance = o.expr === 'festa', hop = dance ? -Math.abs(Math.round(Math.sin(f / 2) * 3)) : talk && f % 4 < 2 ? -1 : 0;
  c.clearRect(0, 0, 72, 96);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  const x = 3 + ps.off * 0.3, y = 26, size = 66; // onde o quadro do porco cai na tela lógica
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(x + size / 2, 90, ps.anim === 'dormindo' ? 26 : 22, 3.5, 0, 0, 7); c.fill();
  if (!ok(sheet)) { if (ok(img('parado'))) c.drawImage(img('parado'), 0, 0, FR, FR, x, y + hop, size, size); return; }
  TMP.width = FR; TMP.height = FR;
  const t = TMP.getContext('2d');
  t.clearRect(0, 0, FR, FR);
  // os acessórios acompanham o corpo: usam o deslocamento do centro do bicho em relação ao 1º quadro
  const cen = A.cen, dx = cen[i][0] - cen[0][0], dyB = cen[i][1] - cen[0][1], dyH = ps.anim === 'comendo' ? EAT_HEAD[i] || 0 : dyB;
  const view = ps.anim === 'andando' ? 's' : 'f', showAcc = ps.anim !== 'dormindo'; // dormindo ele tira tudo
  const items = showAcc ? ['back', 'neck', 'eyes', 'hat'].map((s) => wear[s]).filter((id) => id && ACC[id]) : [];
  for (const id of items) if (ACC[id].under) drawAcc(t, id, view, dx, dyB, FR);
  t.drawImage(sheet, i * FR, 0, FR, FR, 0, 0, FR, FR);
  for (const id of items) if (!ACC[id].under) drawAcc(t, id, view, dx, ACC[id].slot === 'back' || ACC[id].slot === 'neck' ? dyB : dyH, FR);
  // estado do dia: envenenado esverdeia, cansado azula, em chama esquenta
  t.globalCompositeOperation = 'source-atop';
  if (mood === 'poison' || o.expr === 'enjoado') { t.fillStyle = 'rgba(124,195,90,.42)'; t.fillRect(0, 0, FR, FR); }
  else if (tired) { t.fillStyle = 'rgba(40,50,110,.2)'; t.fillRect(0, 0, FR, FR); }
  else if (mood === 'fire') { t.fillStyle = 'rgba(255,120,30,.14)'; t.fillRect(0, 0, FR, FR); }
  t.globalCompositeOperation = 'source-over';
  if (mood === 'fire') for (let k = 0; k < 10; k++) { const a = f / 4 + k * 0.63; c.fillStyle = k % 2 ? '#f5801e' : '#ffd27a'; c.fillRect(36 + Math.cos(a) * 32, 60 + Math.sin(a) * 24 - ((f + k * 3) % 8), 2, 2); }
  c.save();
  if (ps.flip) { c.translate(x + size, y + hop); c.scale(-1, 1); c.drawImage(TMP, 0, 0, size, size); } else c.drawImage(TMP, x, y + hop, size, size);
  c.restore();
}

/** só o rosto, com a expressão (faixa de cada aba, entrevista do dia). Desenha num quadrado de lado `size` */
export function drawFace(c, expr, size, mood) {
  const i = Math.max(0, META.faces.indexOf(mood === 'poison' ? 'enjoado' : expr)), FS = META.fs, sheet = img('rostos');
  c.clearRect(0, 0, size, size);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  if (ok(sheet)) c.drawImage(sheet, i * FS, 0, FS, FS, 0, 0, size, size);
}

/** a FAÍSCA nova: 8 fases (ovo → fênix lendária) num espaço lógico de 32 x 32 */
export function drawMascotNew(c, stage = 0, f = 0, happy = false) {
  const MS = META.ms, sheet = img('faisca'), hop = happy ? Math.abs(Math.sin(f / 3)) * 3 : stage > 0 ? Math.sin(f / 5) * 0.6 : 0;
  c.clearRect(0, 0, 32, 32);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(16, 30, 8, 1.6, 0, 0, 7); c.fill();
  if (ok(sheet)) c.drawImage(sheet, Math.max(0, Math.min(7, stage)) * MS, 0, MS, MS, 1, 1 - hop, 30, 30);
}

// ───────────────────────── CENÁRIOS ─────────────────────────
export const PLACES = ['fogueira', 'varanda', 'cozinha', 'escritorio', 'estrada', 'feira'];
/** endereço do arquivo do cenário: lugar + luz (dia, tarde, noite) */
export const sceneUrl = (place, light) => `${BASE}cena/${PLACES.includes(place) ? place : 'fogueira'}-${['dia', 'tarde', 'noite'].includes(light) ? light : 'dia'}.webp`;
