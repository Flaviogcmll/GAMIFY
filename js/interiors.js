// POR DENTRO DOS PRÉDIOS — o topo de cada aba mostra o interior do prédio dessa aba (a loja por dentro, a torre do calendário,
// a academia…). Os mesmos prédios existem no mapa da vila; no painel do prédio há o botão ENTRAR. Arte original em código.
import { skyAt, sceneHour } from './sky.js';

const W = 320, H = 80;
const R1 = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, w, h); };
const OL = '#2a1a14';
function box(c, x, y, w, h, col, hi) { R1(c, x - 1, y - 1, w + 2, h + 2, OL); R1(c, x, y, w, h, col); if (hi) R1(c, x, y, w, 2, hi); }
function room(c, wall, floor, line) {
  R1(c, 0, 0, W, 52, wall); R1(c, 0, 52, W, 28, floor); R1(c, 0, 50, W, 3, OL);
  for (let i = 0; i < W; i += 10) R1(c, i, 0, 1, 50, line);
  for (let i = 0; i < W; i += 24) R1(c, i, 53, 1, 27, 'rgba(0,0,0,.16)'); R1(c, 0, 53, W, 1, 'rgba(255,255,255,.14)');
}
function windowTo(c, x, y, f) {
  const sky = skyAt(sceneHour()); box(c, x, y, 34, 28, '#f4efe4'); const g = c.createLinearGradient(0, y + 2, 0, y + 26); g.addColorStop(0, sky.top); g.addColorStop(1, sky.hor); c.fillStyle = g; c.fillRect(x + 2, y + 2, 30, 24);
  R1(c, x + 16, y + 2, 2, 24, '#f4efe4'); R1(c, x + 2, y + 13, 30, 2, '#f4efe4'); if (sky.night) { R1(c, x + 6, y + 6, 1, 1, '#fff'); R1(c, x + 24, y + 9, 1, 1, '#fff'); R1(c, x + 24, y + 4, 5, 5, '#f4efe4'); } else R1(c, x + 22, y + 5, 6, 6, '#ffe58a');
  void f;
}
function hero() { /* o PRIMO agora aparece por cima da faixa (pstrip), não dentro da cena */ }
function shelf(c, x, y, w, items, f) { box(c, x, y + 12, w, 3, '#8a5a2e'); for (let i = 0; i < w - 6; i += 8) { const col = items[(i / 8 + (f > 99999 ? 1 : 0)) % items.length | 0]; R1(c, x + 3 + i, y + 3 + ((i * 7) % 5), 6, 9 - ((i * 7) % 5), col); R1(c, x + 3 + i, y + 3 + ((i * 7) % 5), 6, 1, 'rgba(255,255,255,.4)'); } }
function glowAt(c, x, y, r, a) { c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,190,100,${a})`); g.addColorStop(1, 'rgba(255,150,60,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalCompositeOperation = 'source-over'; }

const SCENES = {
  shop(c, f) { // mercado: prateleiras, balcão, caixa e o vendedor
    room(c, '#e8d4a8', '#a87a48', 'rgba(0,0,0,.06)');
    for (let i = 0; i < W; i += 16) R1(c, i, 0, 16, 9, (i / 16 | 0) % 2 ? '#f4efe4' : '#d9473a'); R1(c, 0, 9, W, 1, OL);
    shelf(c, 20, 18, 90, ['#e8584a', '#f5c840', '#4aa8d8', '#7cc35a', '#c88ae0'], f); shelf(c, 20, 34, 90, ['#7cc35a', '#e8584a', '#f5a030', '#4aa8d8'], f); shelf(c, 210, 18, 90, ['#f5a030', '#c88ae0', '#7cc35a', '#e8584a'], f); shelf(c, 210, 34, 90, ['#4aa8d8', '#f5c840', '#e8584a'], f);
    box(c, 120, 18, 34, 24, '#f4efe4'); R1(c, 124, 22, 26, 2, '#d9473a'); R1(c, 124, 28, 20, 2, '#999'); R1(c, 124, 33, 24, 2, '#999');
    box(c, 100, 52, 120, 10, '#8a5a2e', '#b07a40'); box(c, 150, 44, 22, 10, '#2c2c34', '#44444e'); R1(c, 154, 46, 14, 4, '#7cc35a'); hero(c, 86, 136, 28, f);
    for (let i = 0; i < 4; i++) { R1(c, 112 + i * 18, 47, 8, 6, ['#e8584a', '#f5c840', '#7cc35a', '#f5a030'][i]); }
    R1(c, 40, 4, 50, 12, OL); R1(c, 41, 5, 48, 10, '#f5d27a'); R1(c, 46, 9, 38, 2, OL);
  },
  agenda(c, f) { // torre do calendário
    room(c, '#8e8e98', '#6a5a4a', 'rgba(0,0,0,.14)');
    for (let r = 0; r < 5; r++) for (let q = 0; q < 32; q++) if ((q + r) % 2) R1(c, q * 10, r * 10 + 2, 10, 1, 'rgba(0,0,0,.12)');
    windowTo(c, 30, 12, f); const t = new Date(), ha = ((t.getHours() % 12) + t.getMinutes() / 60) * 30, ma = t.getMinutes() * 6;
    c.fillStyle = OL; c.beginPath(); c.arc(160, 22, 17, 0, 7); c.fill(); c.fillStyle = '#f4efe4'; c.beginPath(); c.arc(160, 22, 15, 0, 7); c.fill();
    for (let i = 0; i < 12; i++) { const a = (i * 30 * Math.PI) / 180; R1(c, 160 + Math.sin(a) * 12, 22 - Math.cos(a) * 12, 2, 2, OL); }
    c.strokeStyle = OL; c.lineWidth = 2; c.beginPath(); c.moveTo(160, 22); c.lineTo(160 + Math.sin((ha * Math.PI) / 180) * 8, 22 - Math.cos((ha * Math.PI) / 180) * 8); c.stroke(); c.lineWidth = 1; c.beginPath(); c.moveTo(160, 22); c.lineTo(160 + Math.sin((ma * Math.PI) / 180) * 12, 22 - Math.cos((ma * Math.PI) / 180) * 12); c.stroke();
    box(c, 220, 12, 70, 34, '#f4efe4'); for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) R1(c, 224 + i * 9, 18 + j * 7, 7, 5, (i + j * 3) % 7 === (f >> 4) % 7 ? '#e8584a' : '#dcd5c6'); R1(c, 220, 12, 70, 5, '#c4513a');
    box(c, 80, 50, 110, 8, '#8a5a2e', '#b07a40'); box(c, 100, 42, 36, 8, '#e6dfcf'); R1(c, 104, 44, 28, 1, '#6a5a4a'); R1(c, 104, 47, 20, 1, '#6a5a4a'); R1(c, 150, 38, 6, 12, '#f4efe4'); R1(c, 152, 34, 2, 4, f % 8 < 4 ? '#ffd27a' : '#f08a3e');
    hero(c, 98, 40, 30, f); glowAt(c, 153, 36, 26, 0.4);
  },
  survival(c, f) { // academia
    room(c, '#a8503a', '#3a3a44', 'rgba(0,0,0,.18)');
    for (let r = 0; r < 5; r++) for (let q = 0; q < 16; q++) R1(c, q * 20 + (r % 2) * 10, r * 10 + 8, 18, 1, 'rgba(0,0,0,.18)');
    box(c, 20, 10, 64, 34, '#9ad8ee'); R1(c, 20, 10, 64, 34, 'rgba(255,255,255,.18)'); R1(c, 40, 14, 3, 26, 'rgba(255,255,255,.45)');
    box(c, 250, 20, 4, 30, '#444'); const sw = Math.sin(f / 6) * 3; box(c, 242 + sw, 26, 20, 26, '#c4513a', '#d9473a'); R1(c, 246 + sw, 28, 12, 3, '#f4efe4');
    box(c, 120, 36, 80, 4, '#555'); for (let i = 0; i < 5; i++) { box(c, 124 + i * 15, 28, 8, 8, i % 2 ? '#444' : '#777'); R1(c, 126 + i * 15, 36, 4, 4, '#333'); }
    box(c, 140, 54, 60, 8, '#3a3a44', '#555'); R1(c, 150, 46, 40, 5, '#222'); R1(c, 144, 44, 6, 9, '#666'); R1(c, 190, 44, 6, 9, '#666');
    hero(c, 99, 150, 24 + (f >> 2) % 2 * 2, f); glowAt(c, 160, 20, 30, 0.12);
  },
  domingo(c, f) { // taverna
    room(c, '#8a5a2e', '#5a3a22', 'rgba(0,0,0,.2)');
    box(c, 20, 14, 46, 36, '#7a7a82'); R1(c, 28, 22, 30, 28, OL); const h = 10 + (f % 3) * 3; R1(c, 34, 50 - h, 18, h, '#e0702a'); R1(c, 38, 50 - h + 4, 10, h - 4, '#f5d27a'); glowAt(c, 43, 40, 48, 0.55);
    box(c, 100, 52, 150, 12, '#6a4a2a', '#8a5a2e'); for (let i = 0; i < 6; i++) { box(c, 112 + i * 20, 44, 7, 8, '#d9a520'); R1(c, 113 + i * 20, 42, 5, 3, '#f4efe4'); }
    for (const x of [270, 290]) { box(c, x, 36, 16, 20, '#a8703a'); R1(c, x, 42, 16, 2, '#555'); R1(c, x, 50, 16, 2, '#555'); }
    hero(c, 87, 160, 18, f); R1(c, 100, 8, 40, 14, OL); R1(c, 101, 9, 38, 12, '#a8703a'); R1(c, 110, 13, 20, 3, OL); box(c, 66, 8, 20, 12, '#c4513a'); R1(c, 72, 12, 8, 4, '#f5d27a');
    box(c, 220, 56, 26, 14, '#8a5a2e', '#b07a40'); R1(c, 228, 60, 10, 4, '#f5d27a'); if (f % 10 < 5) R1(c, 232, 54, 2, 2, '#fff1b8');
  },
  conquistas(c, f) { // salão dos troféus
    room(c, '#2c3a5e', '#4a3a5a', 'rgba(255,255,255,.06)');
    for (let i = 0; i < 5; i++) { const x = 20 + i * 60; box(c, x, 30, 40, 3, '#8a5a2e'); box(c, x + 12, 14, 16, 16, '#f5c840', '#fff1b8'); R1(c, x + 16, 30, 8, 4, '#d9a520'); R1(c, x + 8, 18, 4, 8, '#d9a520'); R1(c, x + 28, 18, 4, 8, '#d9a520'); if ((f >> 3) % 5 === i) R1(c, x + 14, 16, 2, 2, '#fff'); }
    box(c, 130, 40, 60, 12, '#c4513a'); R1(c, 134, 44, 52, 2, '#f5d27a'); hero(c, 100, 150, 24, f); glowAt(c, 160, 28, 90, 0.18);
  },
  filtro(c, f) { // oficina
    room(c, '#7a8a6a', '#6a5238', 'rgba(0,0,0,.12)');
    box(c, 20, 10, 110, 36, '#a89a7a'); for (let i = 0; i < 9; i++) { const x = 28 + i * 11; R1(c, x, 16, 3, 18 + (i % 3) * 4, ['#8a8a92', '#b07a40', '#c4513a'][i % 3]); R1(c, x - 1, 14, 5, 3, '#555'); }
    box(c, 150, 46, 120, 8, '#8a5a2e', '#b07a40'); R1(c, 160, 36, 14, 10, '#555'); R1(c, 164, 30, 6, 6, '#777'); R1(c, 200, 42, 30, 4, '#c4513a'); R1(c, 240, 38, 4, 8, '#8a8a92'); R1(c, 240 + (f >> 2) % 2, 36, 8, 3, '#777');
    box(c, 270, 14, 28, 22, '#f4efe4'); R1(c, 274, 18, 20, 2, '#4a7ab8'); R1(c, 274, 24, 14, 2, '#4a7ab8'); R1(c, 274, 29, 18, 2, '#4a7ab8');
    hero(c, 85, 110, 28, f, true); glowAt(c, 210, 10, 60, 0.2);
  },
  rotina(c, f) { // quarto/escritório
    room(c, '#d8c4a0', '#9a6a3a', 'rgba(0,0,0,.05)'); windowTo(c, 24, 12, f);
    box(c, 200, 30, 70, 6, '#8a5a2e', '#b07a40'); R1(c, 206, 36, 4, 18, OL); R1(c, 260, 36, 4, 18, OL); box(c, 220, 16, 26, 16, '#2c2c34', '#44444e'); R1(c, 222, 18, 22, 11, f % 8 < 4 ? '#6ac0f0' : '#8ad0ff');
    box(c, 90, 38, 80, 16, '#4a7ab8', '#6a9ad8'); box(c, 90, 30, 18, 12, '#f4efe4'); box(c, 100, 8, 40, 10, '#f4efe4'); R1(c, 104, 11, 32, 1, '#999'); R1(c, 104, 14, 22, 1, '#999');
    hero(c, 85, 260, 30, f, true);
  },
  regras(c, f) { // forja
    room(c, '#6a6a72', '#4a3a32', 'rgba(0,0,0,.2)');
    box(c, 30, 14, 56, 36, '#555560'); R1(c, 38, 24, 40, 26, OL); const h = 8 + (f % 4) * 3; R1(c, 44, 50 - h, 28, h, '#e0602a'); R1(c, 50, 50 - h + 4, 16, h - 4, '#f5d27a'); glowAt(c, 58, 42, 70, 0.6);
    box(c, 140, 46, 34, 8, '#3a3a44', '#555'); R1(c, 148, 40, 18, 6, '#555560'); R1(c, 130, 44, 12, 3, '#555560');
    for (let i = 0; i < 3; i++) { R1(c, 200 + i * 14, 14, 2, 14, '#8a5a2e'); R1(c, 196 + i * 14, 10, 10, 5, '#8a8a92'); }
    box(c, 250, 30, 34, 24, '#c4513a'); R1(c, 254, 34, 26, 2, '#f5d27a'); R1(c, 254, 40, 26, 2, '#f5d27a'); hero(c, 86, 100, 26, f);
    if (f % 6 < 3) R1(c, 150 + (f % 12), 36 - (f % 8), 2, 2, '#ffd27a');
  },
  arquivo(c, f) { // biblioteca
    room(c, '#6a4a30', '#8a5a3a', 'rgba(0,0,0,.16)');
    for (let s = 0; s < 3; s++) for (let i = 0; i < W; i += 7) { const col = ['#c4513a', '#4a7ab8', '#5ba43f', '#d9a520', '#8a5a9a', '#e8dcc0'][(i / 7 + s * 2) % 6 | 0]; R1(c, i + 2, 6 + s * 15, 5, 12 - ((i * 3 + s) % 4), col); R1(c, i + 2, 6 + s * 15, 5, 1, 'rgba(255,255,255,.35)'); }
    for (let s = 0; s < 3; s++) R1(c, 0, 19 + s * 15, W, 2, '#4a2f1c');
    box(c, 120, 52, 80, 6, '#8a5a2e', '#b07a40'); R1(c, 150, 42, 20, 10, '#e6dfcf'); R1(c, 152, 36, 2, 6, OL); R1(c, 146, 32, 12, 4, f % 10 < 5 ? '#f5d27a' : '#f0b050'); hero(c, 111, 220, 26, f); glowAt(c, 152, 36, 36, 0.3);
    for (let i = 0; i < 5; i++) R1(c, 60 + ((i * 53 + f) % 200), 20 + ((i * 17) % 28), 1, 1, 'rgba(255,240,200,.7)');
  },
};
const ROUTE_SCENE = { shop: 'shop', agenda: 'agenda', survival: 'survival', domingo: 'domingo', conquistas: 'conquistas', filtro: 'filtro', rotina: 'rotina', regras: 'regras', arquivo: 'arquivo', ferreiro: 'regras' };
export const interiorOf = (route) => ROUTE_SCENE[route] || null;

function paint(c, kind, f) {
  c.imageSmoothingEnabled = false;
  (SCENES[kind] || SCENES.rotina)(c, f);
  const sky = skyAt(sceneHour()); if (sky.light < 1) R1(c, 0, 0, W, H, `rgba(10,18,48,${0.4 * (1 - sky.light)})`);
}
const MOUNTED = new Set(); let looping = false, last = 0, frame = 0;
export function mountInterior(cv, kind) {
  if (!cv || cv._int) return;
  cv._int = kind; cv.width = W; cv.height = H; MOUNTED.add(cv); paint(cv.getContext('2d'), kind, 0);
  if (!looping && !matchMedia('(prefers-reduced-motion: reduce)').matches) { looping = true; requestAnimationFrame(loop); }
}
function loop(ts) {
  for (const c of [...MOUNTED]) if (!c.isConnected) MOUNTED.delete(c);
  if (!MOUNTED.size) { looping = false; return; }
  requestAnimationFrame(loop);
  if (document.hidden || ts - last < 120) return;
  last = ts; frame++;
  for (const cv of MOUNTED) { const r = cv.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) paint(cv.getContext('2d'), cv._int, frame); }
}
