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
  const scale = 4;
  const resize = () => { c.width = Math.ceil(innerWidth / scale); c.height = Math.ceil(innerHeight / scale); };
  resize(); addEventListener('resize', resize);
  const ps = [];
  let last = 0;
  (function loop(ts) {
    if (!emberCanvas) return;
    requestAnimationFrame(loop);
    if (document.hidden || ts - last < 60) return;
    last = ts;
    if (ps.length < 26 && Math.random() < 0.3) ps.push({ x: Math.random() * c.width, y: c.height + 2, vy: -0.25 - Math.random() * 0.35, ph: Math.random() * 6, life: 0 });
    ctx.clearRect(0, 0, c.width, c.height);
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life++; p.y += p.vy; p.x += Math.sin(p.life / 12 + p.ph) * 0.2;
      ctx.fillStyle = p.life % 20 < 14 ? '#e8793a' : '#ffd27a';
      ctx.globalAlpha = Math.max(0, 1 - p.life / 260);
      ctx.fillRect(p.x | 0, p.y | 0, 1, 1);
      if (p.y < -2 || p.life > 260) ps.splice(i, 1);
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

export function floatXp(text, at) {
  const el = document.createElement('div');
  el.className = 'float-xp';
  el.textContent = text;
  el.style.left = (at?.x ?? innerWidth / 2) + 'px';
  el.style.top = (at?.y ?? innerHeight / 2) - 12 + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}
