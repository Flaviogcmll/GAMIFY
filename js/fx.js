// EFEITOS VISUAIS — brasas, confete e "+XP".
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ───── brasas subindo pela tela (só à noite) ─────
let emberCanvas = null;
export function embers(on) {
  if (!on || reduced()) { emberCanvas?.remove(); emberCanvas = null; return; }
  if (emberCanvas) return;
  const c = (emberCanvas = document.createElement('canvas'));
  c.className = 'embers';
  document.body.prepend(c);
  const ctx = c.getContext('2d');
  const scale = 2; // v5.16: brasinhas menores
  const resize = () => { c.width = Math.ceil(innerWidth / scale); c.height = Math.ceil(innerHeight / scale); };
  resize(); addEventListener('resize', resize);
  const ps = [];
  let last = 0;
  (function loop(ts) {
    if (!emberCanvas) return;
    requestAnimationFrame(loop);
    if (document.hidden || ts - last < 60) return;
    last = ts;
    // v5.16: poucas, sutis e saindo de perto da fogueira (embaixo, no meio da tela); somem antes de chegar no meio
    if (ps.length < 9 && Math.random() < 0.18) ps.push({ x: c.width * (0.5 + (Math.random() - 0.5) * 0.22), y: c.height + 2, vy: -0.22 - Math.random() * 0.25, ph: Math.random() * 6, life: 0 });
    ctx.clearRect(0, 0, c.width, c.height);
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life++; p.y += p.vy; p.x += Math.sin(p.life / 12 + p.ph) * 0.2;
      ctx.fillStyle = p.life % 20 < 14 ? '#e8793a' : '#ffd27a';
      ctx.globalAlpha = Math.max(0, 0.75 - p.life / 220);
      ctx.fillRect(p.x | 0, p.y | 0, 1, 1);
      if (p.y < -2 || p.life > 165) ps.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  })(0);
}

// ───── confete pixel ─────
export function confetti(n = 120) {
  if (reduced()) return;
  const c = document.createElement('canvas');
  c.className = 'fxlayer';
  document.body.appendChild(c);
  const s = 3, ctx = c.getContext('2d');
  c.width = Math.ceil(innerWidth / s); c.height = Math.ceil(innerHeight / s);
  const cols = ['#9b4722', '#e8793a', '#f5c84c', '#1c3a5e', '#3f8a55', '#f7f5f0'];
  const ps = Array.from({ length: n }, () => ({ x: c.width / 2 + (Math.random() - 0.5) * 30, y: c.height * 0.4, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 5 - 1.5, col: cols[(Math.random() * cols.length) | 0] }));
  let f = 0;
  (function fr() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of ps) { p.vy += 0.15; p.x += p.vx; p.y += p.vy; p.vx *= 0.98; ctx.fillStyle = p.col; ctx.fillRect(p.x | 0, p.y | 0, 2, 2); }
    if (++f < 110) requestAnimationFrame(fr); else c.remove();
  })();
}

// ───── fogos de artifício (pequenos, em pixel): 3 estouros no alto da tela ─────
export function fireworks(bursts = 3) {
  if (reduced()) return;
  const c = document.createElement('canvas');
  c.className = 'fxlayer';
  document.body.appendChild(c);
  const s = 3, ctx = c.getContext('2d');
  c.width = Math.ceil(innerWidth / s); c.height = Math.ceil(innerHeight / s);
  const pal = [['#f5c84c', '#fff3c4'], ['#e8793a', '#ffd0a8'], ['#e2557a', '#ffc2d4'], ['#5aa9e6', '#cfe8ff'], ['#69c27f', '#d4f5dc']];
  const shots = Array.from({ length: bursts }, (_, i) => ({ t0: i * 16, x: c.width * (0.25 + 0.5 * Math.random()), y: c.height * (0.18 + 0.2 * Math.random()), col: pal[(Math.random() * pal.length) | 0], ps: null, ry: c.height }));
  let f = 0;
  (function fr() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const sh of shots) {
      const t = f - sh.t0;
      if (t < 0) continue;
      if (t < 14) { sh.ry = c.height - (c.height - sh.y) * (t / 14); ctx.fillStyle = sh.col[1]; ctx.fillRect(sh.x | 0, sh.ry | 0, 1, 3); continue; } // o rojão subindo
      sh.ps ||= Array.from({ length: 34 }, (_, k) => { const a = (k / 34) * Math.PI * 2, v = 1.1 + Math.random() * 1.5; return { x: sh.x, y: sh.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v }; });
      const life = (t - 14) / 46;
      if (life > 1) continue;
      for (const p of sh.ps) { p.vy += 0.035; p.vx *= 0.97; p.vy *= 0.97; p.x += p.vx; p.y += p.vy; ctx.fillStyle = sh.col[life < 0.35 ? 1 : 0]; if (life < 0.75 || (f + (p.x | 0)) % 2) ctx.fillRect(p.x | 0, p.y | 0, 2, 2); }
    }
    if (++f < bursts * 16 + 62) requestAnimationFrame(fr); else c.remove();
  })();
}

export function floatXp(text, at) {
  const el = document.createElement('div');
  el.className = 'float-xp';
  el.textContent = text;
  el.style.left = (at?.x ?? innerWidth / 2) + 'px';
  el.style.top = (at?.y ?? innerHeight / 2) - 12 + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

/** v7.3b/v8: o TREM se resolveu (tarefa concluída): uma nuvenzinha de poeira e palha no lugar do clique */
export function poof(at) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.createElement('div');
  el.className = 'poof'; el.setAttribute('aria-hidden', 'true');
  el.style.left = (at?.x ?? innerWidth / 2) + 'px'; el.style.top = (at?.y ?? innerHeight / 2) + 'px';
  el.innerHTML = Array.from({ length: 9 }, (_, i) => `<i style="--a:${i * 40 + Math.random() * 20}deg;--d:${18 + Math.random() * 16}px"></i>`).join('');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}
