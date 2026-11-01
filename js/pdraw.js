// O DESENHO DO PRIMO — rosto e busto em pixel art ORIGINAL (tudo desenhado em código, nada copiado de outro jogo).
// drawPortrait(ctx, {tier, expr, wear, talk, f, look}) → 72 x 88 px · drawMascot(ctx, stage, f, happy) → 32 x 32 px.
const OL = '#2a1a14', SK = '#f0bf94', SKS = '#d9a074', SKL = '#f8d6b4', HR = '#40261a', HRL = '#5e3b28', RED = '#c4513a';
export const PW = 72, PH = 96;
const rect = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function rr(c, x, y, w, h, r, col) {
  c.fillStyle = col;
  for (let i = 0; i < h; i++) {
    let ins = 0;
    if (i < r) ins = r - Math.floor(Math.sqrt(r * r - (r - i - 0.5) ** 2));
    else if (i >= h - r) { const k = i - (h - r); ins = Math.ceil(r - Math.sqrt(r * r - (k + 0.5) ** 2)); }
    c.fillRect(Math.round(x + ins), Math.round(y + i), Math.round(w - 2 * ins), 1);
  }
}
const rro = (c, x, y, w, h, r, col) => { rr(c, x - 1, y - 1, w + 2, h + 2, r + 1, OL); rr(c, x, y, w, h, r, col); };
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join(''); };

// expressão = olhos, sobrancelhas (inclinação por lado: + brava, − preocupada; alt = sobe), boca e efeitos
export const EXPR = {
  neutro: { eye: 'open', brow: [0, 0], mouth: 'line' },
  feliz: { eye: 'happy', brow: [0, 0], alt: [-1, -1], mouth: 'smile', blush: 1 },
  animado: { eye: 'wide', brow: [0, 0], alt: [-2, -2], mouth: 'grin', fx: 'spark' },
  orgulhoso: { eye: 'half', brow: [1, 0], alt: [0, -1], mouth: 'smirk', fx: 'shine' },
  cansado: { eye: 'half', brow: [-1, -1], mouth: 'wavy', fx: 'bags' },
  dormindo: { eye: 'closed', brow: [0, 0], mouth: 'tiny', fx: 'zzz' },
  preocupado: { eye: 'open', brow: [-2, -2], mouth: 'wavy', fx: 'sweat' },
  bravo: { eye: 'open', brow: [2, 2], mouth: 'frown', fx: 'vein' },
  surpreso: { eye: 'wide', brow: [0, 0], alt: [-3, -3], mouth: 'o', fx: 'bang' },
  pensativo: { eye: 'side', brow: [0, -1], alt: [-2, 0], mouth: 'tiny', fx: 'dots', pose: 'chin' },
  debochado: { eye: 'half', brow: [0, 0], alt: [-2, 0], mouth: 'tongue' },
  apaixonado: { eye: 'heart', brow: [0, 0], alt: [-1, -1], mouth: 'smile', blush: 2, fx: 'hearts' },
  triste: { eye: 'tear', brow: [-2, -2], mouth: 'frown', fx: 'tear' },
  festa: { eye: 'happy', brow: [0, 0], alt: [-2, -2], mouth: 'open', fx: 'confetti', pose: 'up' },
  enjoado: { eye: 'spiral', brow: [-1, -1], mouth: 'wavy', fx: 'green' },
  suspeito: { eye: 'slit', brow: [1, 1], mouth: 'line' },
  piscada: { eye: 'wink', brow: [0, 0], alt: [0, -1], mouth: 'tongue' },
};

function fx(c, kind, f, tier) {
  const t = f >> 1;
  switch (kind) {
    case 'sweat': rect(c, 54, 24 + (t % 3), 3, 4, '#5ab0e6'); rect(c, 55, 22 + (t % 3), 1, 2, '#5ab0e6'); rect(c, 54, 26 + (t % 3), 1, 1, '#fff'); break;
    case 'vein': [[0, 1], [1, 0], [1, 2], [2, 1], [0, 2], [2, 0]].forEach(([x, y]) => rect(c, 52 + x * 2, 18 + y * 2, 2, 2, '#d9473a')); break;
    case 'bang': rect(c, 56, 14, 3, 8, '#d9473a'); rect(c, 56, 24, 3, 3, '#d9473a'); break;
    case 'dots': for (let i = 0; i < 3; i++) if ((t + i) % 4 < 3) rect(c, 54 + i * 4, 14, 2, 2, '#fff'); break;
    case 'bags': rect(c, 22, 38, 8, 1, '#a07a8a'); rect(c, 42, 38, 8, 1, '#a07a8a'); break;
    case 'tear': rect(c, 24, 42 + (t % 4), 2, 2, '#5ab0e6'); break;
    case 'zzz': c.fillStyle = '#fff'; c.font = '8px monospace'; c.fillText('z', 54 + (t % 4), 22 - (t % 6)); c.fillText('Z', 60 + (t % 3), 14 - (t % 5)); break;
    case 'hearts': for (let i = 0; i < 3; i++) { const x = 8 + i * 22 + (t % 2), y = 24 - ((t + i * 3) % 12); rect(c, x, y, 2, 1, '#e03a5a'); rect(c, x + 3, y, 2, 1, '#e03a5a'); rect(c, x, y + 1, 5, 2, '#e03a5a'); rect(c, x + 1, y + 3, 3, 1, '#e03a5a'); rect(c, x + 2, y + 4, 1, 1, '#e03a5a'); } break;
    case 'spark': case 'shine': for (let i = 0; i < 3; i++) { const x = 6 + i * 26, y = 16 + ((t + i * 2) % 3) * 3; if ((t + i) % 3 !== 0) { rect(c, x, y, 1, 5, '#fff2a8'); rect(c, x - 2, y + 2, 5, 1, '#fff2a8'); } } break;
    case 'confetti': for (let i = 0; i < 12; i++) { const x = (i * 23 + t * 3) % 70, y = ((i * 17 + t * 4) % 50); rect(c, x, y, 2, 2, ['#e8584a', '#f5c840', '#4aa8d8', '#7cc35a', '#c88ae0'][i % 5]); } break;
    default:
  }
  void tier;
}

// ───────────────────────── O PORQUINHO (sprite "Free Pets Pack", de Frakassets, CC BY 4.0) ─────────────────────────
import { drawBack, drawFront } from './pacc.js';
const PIG = new Image(); PIG.src = 'assets/pets/piglet.png';
let PIGJ = null;
fetch('assets/pets/piglet.json').then((r) => r.json()).then((j) => { PIGJ = j; }).catch(() => { /* sem sprite: fica só o cenário */ });
const TMP = document.createElement('canvas'); TMP.width = 32; TMP.height = 32;
const HAPPY = ['feliz', 'animado', 'festa', 'orgulhoso', 'apaixonado', 'piscada'];
/** qual animação do porquinho combina com a expressão (e passeia pelo palco quando está à toa) */
function pigPose(expr, f, tired) {
  if (expr === 'dormindo') return ['Sleep_South', 0];
  if (HAPPY.includes(expr)) return ['Happy_South', 0];
  if (!tired && ['neutro', 'pensativo', 'debochado', 'suspeito'].includes(expr)) {
    const ph = f % 220;
    if (ph < 40) return ['Walk_East', Math.round(ph * 0.5)];
    if (ph >= 110 && ph < 150) return ['Walk_West', Math.round(20 - (ph - 110) * 0.5)];
    return ['Idle_South', ph < 110 ? 20 : 0];
  }
  return ['Idle_South', 0];
}

/** desenha o PRIMO (um porquinho, sem acessório por padrão): o = { tier, expr, wear, talk, f, mood: 'poison'|'tired'|'fire'|null } em 72 x 96 */
export function drawPortrait(c, o = {}) {
  const { tier = 0, wear = {}, talk = false, f = 0, mood = null } = o, ex = EXPR[o.expr] || EXPR.neutro;
  c.clearRect(0, 0, PW, PH);
  c.imageSmoothingEnabled = false;
  const tired = mood === 'tired' || o.expr === 'cansado';
  const [tag, off] = pigPose(o.expr, f, tired);
  const dance = o.expr === 'festa', hop = dance ? -Math.abs(Math.round(Math.sin(f / 2) * 4)) : talk && f % 4 < 2 ? -1 : 0;
  c.save(); c.translate(0, hop);
  if (mood === 'fire') for (let i = 0; i < 10; i++) { const a = f / 4 + i * 0.63; rect(c, 36 + Math.cos(a) * 34, 62 + Math.sin(a) * 26 - ((f + i * 3) % 8), 3, 3, i % 2 ? '#f5801e' : '#ffd27a'); }
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(36 + off, 90, 22, 4, 0, 0, 7); c.fill();
  if (PIGJ && PIG.complete && PIG.naturalWidth) {
    const fr = PIGJ.tags[tag] ? tag : 'Idle_South', list = PIGJ.tags[fr], i = (tired ? f >> 1 : f) % list.length, k = list[i], an = PIGJ.an[fr][i], t = TMP.getContext('2d');
    const behind = (wear.back === 'capa' || wear.back === 'capaazul') && !fr.endsWith('North');
    t.clearRect(0, 0, 32, 32);
    if (behind) drawBack(t, wear, fr, an);
    t.drawImage(PIG, k[0], k[1], 32, 32, 0, 0, 32, 32);
    if (!behind) drawBack(t, wear, fr, an);
    drawFront(t, wear, fr, an);
    t.globalCompositeOperation = 'source-atop';
    if (mood === 'poison' || ex.fx === 'green') { t.fillStyle = 'rgba(124,195,90,.5)'; t.fillRect(0, 0, 32, 32); }
    else if (tired) { t.fillStyle = 'rgba(40,50,110,.22)'; t.fillRect(0, 0, 32, 32); }
    else if (mood === 'fire') { t.fillStyle = 'rgba(255,120,30,.16)'; t.fillRect(0, 0, 32, 32); }
    t.globalCompositeOperation = 'source-over';
    c.drawImage(TMP, 4 + off, 36, 64, 64);
  }
  const walking = tag.startsWith('Walk') ? off : 0;
  c.save(); c.translate(walking, 26);
  if (mood === 'poison') fx(c, 'sweat', f, tier); else if (ex.fx !== 'bags' && ex.fx !== 'green') fx(c, ex.fx, f, tier);
  c.restore();
  c.restore();
}

/** a FAÍSCA (mascote): 0 ovo · 1 faísca · 2 chamazinha · 3 chama · 4 fênix. 32 x 32 */
export function drawMascot(c, stage = 0, f = 0, happy = false) {
  c.clearRect(0, 0, 32, 32);
  const t = f >> 1, hop = happy ? Math.abs(Math.sin(f / 3)) * 3 : 0, y0 = 30 - hop;
  const flame = (cx, base, w, h, col1, col2, col3) => {
    for (let i = 0; i < h; i++) {
      const k = i / h, ww = Math.max(2, Math.round(w * (1 - k * k) * (0.85 + 0.15 * Math.sin(t + i)))), x = cx - ww / 2 + Math.round(Math.sin(t / 1.5 + i / 3) * (k * 1.5));
      c.fillStyle = k < 0.35 ? col3 : k < 0.7 ? col2 : col1; c.fillRect(Math.round(x), Math.round(base - i), ww, 1);
    }
  };
  const eyes = (cx, ey, big = false) => { rect(c, cx - 3, ey, big ? 2 : 1, big ? 3 : 2, OL); rect(c, cx + 2, ey, big ? 2 : 1, big ? 3 : 2, OL); if (happy) { rect(c, cx - 1, ey + 3, 3, 1, OL); } };
  if (stage === 0) { // ovo malhado, balançando
    const w = (f % 30 < 4) ? (f % 2 ? 1 : -1) : 0;
    c.save(); c.translate(16 + w, 0);
    rro(c, -6, y0 - 17, 12, 17, 6, '#f4efe4'); rect(c, -4, y0 - 15, 3, 2, '#fff'); [[-3, 8, '#f5a030'], [1, 5, '#e8584a'], [-1, 12, '#f5c840'], [3, 11, '#f5a030']].forEach(([x, y, col]) => rect(c, x, y0 - y - 3, 2, 2, col));
    if (happy) rect(c, -1, y0 - 18, 3, 1, '#e8584a'); c.restore(); return;
  }
  const cA = stage >= 7 ? ['#4aa8d8', '#9ad8ee', '#ffffff'] : ['#d9473a', '#f5801e', '#f5e07a'];
  const fen = (hi) => { // fênix: asas batendo
    flame(16, y0 - 2, 12, 16, ...cA); eyes(16, y0 - 10, true);
    const fl = (f >> 2) % 2 ? 2 : 0;
    [-1, 1].forEach((sd) => { for (let i = 0; i < 10; i++) rect(c, sd < 0 ? 4 - i * 0.4 : 24 + i * 0.4, y0 - 14 - fl + i * 0.6, 4, 3, i % 2 ? cA[1] : cA[0]); });
    flame(16, y0 - 16, 5, 8, cA[0], cA[1], cA[2]); rect(c, 15, y0 - 12, 3, 2, '#f5c840');
    if (hi) { rect(c, 8, 1, 16, 1, '#fff2a8'); rect(c, 9, 0, 14, 1, '#e8b84a'); }
  };
  if (stage === 1) { flame(16, y0, 11, 16, '#e8584a', '#f5a030', '#f5e07a'); eyes(16, y0 - 7); }
  else if (stage === 2) { flame(16, y0, 13, 18, '#e8584a', '#f5a030', '#f5e07a'); eyes(16, y0 - 8, true); }
  else if (stage === 3) { flame(16, y0, 15, 20, '#e8584a', '#f5a030', '#f5e07a'); eyes(16, y0 - 8, true); rect(c, 6, y0 - 8, 3, 2, '#e8584a'); rect(c, 23, y0 - 8, 3, 2, '#e8584a'); }
  else if (stage === 4) { flame(16, y0, 19, 25, '#d9473a', '#f5801e', '#f5e07a'); eyes(16, y0 - 10, true); flame(10, y0 - 20, 4, 6, '#e8584a', '#f5a030', '#f5e07a'); flame(22, y0 - 20, 4, 6, '#e8584a', '#f5a030', '#f5e07a'); }
  else if (stage === 5) { rect(c, 5, y0 - 1, 22, 3, '#6a4a2a'); rect(c, 8, y0 - 3, 16, 3, '#8a5a2e'); flame(16, y0 - 3, 22, 27, '#d9473a', '#f5801e', '#f5e07a'); eyes(16, y0 - 12, true); if (f % 3 === 0) rect(c, 6 + (f % 5) * 4, y0 - 28, 1, 1, '#fff2a8'); }
  else fen(stage >= 7);
  rect(c, 13, y0 + 1, 6, 1, 'rgba(0,0,0,.25)');
}
