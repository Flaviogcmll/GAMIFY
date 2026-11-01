// SOM — efeitos 8-bit, lo-fi de aventureiro gerado na hora e crepitar de fogueira.
// Tudo sintetizado no navegador (sem arquivos, sem direitos autorais). Só toca depois de um clique (regra dos navegadores).
const KEY = 'gamify-ui:audio';
export const prefs = Object.assign({ on: false, music: 0.5, fire: 0.45, sfx: 0.6 }, (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })());
const savePrefs = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* sem armazenamento */ } };

let ctx = null, master, bus = {}, noiseBuf = null, running = false, timer = null;
function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createDynamicsCompressor();
  master.connect(ctx.destination);
  for (const k of ['sfx', 'music', 'fire']) { bus[k] = ctx.createGain(); bus[k].connect(master); }
  // "fita" do lo-fi: corta os agudos
  const tape = ctx.createBiquadFilter(); tape.type = 'lowpass'; tape.frequency.value = 2600;
  bus.musicIn = ctx.createGain(); bus.musicIn.connect(tape); tape.connect(bus.music);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVolumes();
  return ctx;
}
export function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  bus.sfx.gain.setTargetAtTime(prefs.sfx, t, 0.05);
  bus.music.gain.setTargetAtTime(running ? prefs.music * 0.55 : 0, t, 0.3);
  bus.fire.gain.setTargetAtTime(running ? prefs.fire * 0.6 : 0, t, 0.3);
}
export function setVol(k, v) { prefs[k] = v; savePrefs(); applyVolumes(); }

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
function tone(freq, t, dur, { type = 'square', vol = 0.15, out = 'sfx', attack = 0.005, slide = 0, vib = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5; lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + 0.1); }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out === 'music' ? bus.musicIn : bus[out]);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(t, dur, { vol = 0.2, type = 'bandpass', freq = 1800, q = 1, out = 'sfx' } = {}) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out === 'music' ? bus.musicIn : bus[out]);
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

// ───── efeitos ─────
const SFX = {
  check: (t) => { tone(mtof(76), t, 0.07); tone(mtof(83), t + 0.07, 0.12); },
  xp: (t) => [84, 88, 91].forEach((m, i) => tone(mtof(m), t + i * 0.05, 0.12, { type: 'triangle', vol: 0.18 })),
  coin: (t) => { tone(mtof(83), t, 0.08); tone(mtof(88), t + 0.08, 0.3); },
  level: (t) => { [72, 76, 79, 84].forEach((m, i) => tone(mtof(m), t + i * 0.11, 0.18)); tone(mtof(88), t + 0.45, 0.6, { vib: 6 }); [60, 64, 67].forEach((m) => tone(mtof(m), t + 0.45, 0.6, { type: 'triangle', vol: 0.1 })); },
  chest: (t) => { tone(220, t, 0.5, { slide: 4, type: 'triangle', vol: 0.12 }); for (let i = 0; i < 6; i++) tone(mtof(88 + ((i * 5) % 12)), t + 0.45 + i * 0.06, 0.12, { type: 'square', vol: 0.07 }); },
  loot: (t) => { for (let i = 0; i < 5; i++) tone(mtof(91 + ((i * 7) % 12)), t + i * 0.05, 0.1, { type: 'triangle', vol: 0.12 }); },
  habit: (t) => { noise(t, 0.04, { freq: 3000, vol: 0.25 }); tone(mtof(79), t + 0.02, 0.09, { type: 'triangle', vol: 0.16 }); },
  error: (t) => { tone(160, t, 0.18, { slide: 0.6 }); tone(120, t + 0.12, 0.22, { slide: 0.6 }); },
  tab: (t) => noise(t, 0.03, { freq: 4000, vol: 0.08 }),
  swish: (t) => { noise(t, 0.12, { type: 'bandpass', freq: 1200, q: 0.7, vol: 0.09 }); tone(520, t, 0.08, { type: 'triangle', vol: 0.05, slide: 0.7 }); },
  pick: (t) => tone(mtof(72), t, 0.06, { type: 'triangle', vol: 0.1, slide: 1.3 }),
  drop: (t) => { tone(mtof(67), t, 0.08, { type: 'triangle', vol: 0.12 }); noise(t, 0.05, { freq: 600, vol: 0.12 }); },
  scroll: (t) => noise(t, 0.02, { freq: 2600 + Math.random() * 800, vol: 0.025 }),
  pop: (t) => tone(mtof(84 + ((Math.random() * 5) | 0)), t, 0.05, { type: 'sine', vol: 0.06 }),
  stamp: (t) => { tone(90, t, 0.18, { type: 'sine', slide: 0.5, vol: 0.4 }); noise(t, 0.08, { freq: 900, vol: 0.2 }); },
  bell: (t) => { tone(880, t, 1.4, { type: 'sine', vol: 0.2 }); tone(1320, t, 1, { type: 'sine', vol: 0.08 }); },
  // v4: sound design de tudo
  click: (t) => noise(t, 0.014, { freq: 5200, vol: 0.05 }),
  tick: (t) => tone(mtof(88), t, 0.03, { type: 'square', vol: 0.025 }),
  open: (t) => { tone(mtof(72), t, 0.08, { type: 'triangle', vol: 0.08, slide: 1.4 }); tone(mtof(79), t + 0.05, 0.12, { type: 'triangle', vol: 0.07 }); },
  close: (t) => { tone(mtof(79), t, 0.06, { type: 'triangle', vol: 0.07 }); tone(mtof(71), t + 0.05, 0.1, { type: 'triangle', vol: 0.06, slide: 0.8 }); },
  buy: (t) => { tone(mtof(86), t, 0.06, { vol: 0.12 }); tone(mtof(91), t + 0.07, 0.06, { vol: 0.12 }); tone(mtof(98), t + 0.14, 0.32, { vol: 0.12 }); noise(t + 0.14, 0.14, { type: 'highpass', freq: 6000, vol: 0.06 }); },
  undo: (t) => [84, 79, 74, 69].forEach((m, i) => tone(mtof(m), t + i * 0.05, 0.09, { type: 'triangle', vol: 0.1 })),
  redo: (t) => [69, 74, 79, 84].forEach((m, i) => tone(mtof(m), t + i * 0.05, 0.09, { type: 'triangle', vol: 0.1 })),
  trash: (t) => { noise(t, 0.18, { type: 'bandpass', freq: 900, q: 0.6, vol: 0.14 }); tone(120, t, 0.14, { type: 'sawtooth', slide: 0.5, vol: 0.05 }); },
  build: (t) => { for (let i = 0; i < 3; i++) { noise(t + i * 0.13, 0.05, { freq: 1400, vol: 0.22 }); tone(mtof(55 + i), t + i * 0.13, 0.07, { type: 'square', vol: 0.05, slide: 0.6 }); } },
  upgrade: (t) => { [67, 71, 74, 79, 83].forEach((m, i) => tone(mtof(m), t + i * 0.07, 0.16, { type: 'triangle', vol: 0.14 })); noise(t + 0.3, 0.2, { type: 'highpass', freq: 5000, vol: 0.07 }); },
  ready: (t) => { tone(mtof(88), t, 0.5, { type: 'sine', vol: 0.16 }); tone(mtof(95), t + 0.12, 0.7, { type: 'sine', vol: 0.12 }); tone(mtof(100), t + 0.24, 0.9, { type: 'sine', vol: 0.09 }); },
  progress: (t) => { tone(mtof(79), t, 0.05, { type: 'triangle', vol: 0.07 }); tone(mtof(86), t + 0.05, 0.1, { type: 'triangle', vol: 0.07 }); },
  count: (t) => tone(mtof(91 + ((Math.random() * 3) | 0)), t, 0.025, { type: 'square', vol: 0.02 }),
  breathIn: (t) => noise(t, 2.2, { type: 'lowpass', freq: 700, vol: 0.12 }),
  breathOut: (t) => noise(t, 5.5, { type: 'lowpass', freq: 500, vol: 0.1 }),
};
/** nota da aba: cada aba tem o seu tom (escala pentatônica) */
export function sfxNav(i) {
  if (prefs.sfx <= 0) return;
  try { if (!ensure()) return; if (ctx.state === 'suspended') ctx.resume(); const t = ctx.currentTime + 0.01; tone(mtof([72, 74, 76, 79, 81, 84, 86, 88, 91, 93][i % 10]), t, 0.14, { type: 'triangle', vol: 0.09 }); } catch { /* sem som */ }
}
/** marco da meta do dia: 25% 50% 75% 100% (cada um mais alto) */
export function sfxMilestone(i) {
  if (prefs.sfx <= 0) return;
  try { if (!ensure()) return; if (ctx.state === 'suspended') ctx.resume(); const t = ctx.currentTime + 0.01, base = [72, 76, 79, 84][i] || 72; for (let k = 0; k <= i; k++) tone(mtof(base + k * 4), t + k * 0.09, 0.22, { type: 'triangle', vol: 0.16 }); if (i === 3) { tone(mtof(96), t + 0.45, 0.7, { type: 'sine', vol: 0.12, vib: 5 }); } } catch { /* sem som */ }
}
export function sfx(name) {
  if (prefs.sfx <= 0) return;
  try { if (!ensure()) return; if (ctx.state === 'suspended') ctx.resume(); SFX[name]?.(ctx.currentTime + 0.01); } catch { /* sem som */ }
}

// ───── lo-fi do aventureiro (gerado) ─────
// ii–V–I–vi em Dó com nonas: Dm9 · G13 · Cmaj9 · Am9 — 70 bpm, swing leve
// v4: cada aba tem o seu lo-fi (progressões, andamento e escala próprios). Tudo gerado: sem download, sem direitos autorais.
const THEMES = {
  work: { bpm: 84, a: [[50, 57, 60, 64, 65], [43, 53, 57, 59, 64], [48, 55, 59, 62, 64], [45, 55, 60, 64, 67]], b: [[41, 57, 60, 64, 67], [40, 55, 59, 62, 67], [38, 57, 60, 62, 65], [43, 53, 57, 60, 62]], penta: [72, 74, 76, 79, 81, 84] },
  plan: { bpm: 76, a: [[41, 57, 60, 64, 67], [40, 55, 59, 62, 66], [38, 53, 57, 60, 64], [36, 55, 59, 62, 64]], b: [[38, 53, 57, 60, 64], [43, 53, 57, 60, 62], [36, 55, 59, 62, 64], [31, 55, 59, 62, 64]], penta: [69, 72, 74, 77, 79, 81] },
  shop: { bpm: 96, a: [[36, 55, 59, 64, 67], [33, 55, 61, 64, 67], [38, 53, 57, 60, 64], [31, 53, 59, 62, 65]], b: [[41, 57, 60, 64, 67], [34, 57, 62, 65, 69], [38, 53, 57, 60, 64], [33, 55, 61, 64, 67]], penta: [72, 76, 79, 81, 84, 88] },
  zen: { bpm: 72, a: [[33, 55, 60, 64, 67], [41, 57, 60, 64, 67], [36, 55, 60, 64, 67], [31, 55, 59, 62, 64]], b: [[38, 57, 60, 64, 65], [31, 55, 59, 62, 67], [36, 55, 59, 64, 67], [33, 55, 60, 64, 67]], penta: [69, 72, 76, 79, 81, 84] },
  night: { bpm: 78, a: [[38, 53, 57, 60, 64], [34, 57, 62, 65, 69], [31, 53, 58, 62, 65], [33, 55, 61, 64, 67]], b: [[43, 53, 57, 60, 62], [41, 57, 60, 64, 67], [38, 53, 57, 60, 64], [33, 55, 61, 64, 67]], penta: [74, 77, 79, 81, 84, 86] },
};
const THEME_OF = { quests: 'work', filtro: 'work', agenda: 'plan', arquivo: 'plan', shop: 'shop', cofre: 'shop', domingo: 'zen', survival: 'zen', rotina: 'night', regras: 'night', conquistas: 'shop' };
let THEME = THEMES.work, CHORDS = THEME.a, PENTA = THEME.penta, BPM = THEME.bpm;
export function setLofiTheme(route) { const t = THEMES[THEME_OF[route] || 'work']; if (t !== THEME) { THEME = t; CHORDS = t.a; PENTA = t.penta; BPM = t.bpm; } }
let step = 0, nextT = 0, bar = 0;
let melodyIdx = 3;
/** um passo (1/16) do lo-fi: acordes picados com swing, baixo andando, bateria com variação, melodia que passeia e preenchimento a cada 4 compassos */
function scheduleStep(t, s) {
  const beat = 60 / BPM / 4, sw = s % 4 === 2 ? beat * 0.22 : 0, ch = CHORDS[bar % 4], odd = bar % 2 === 1, root = ch[0];
  if (s === 0 && bar % 8 === 0) CHORDS = (bar / 8) % 2 ? THEME.b : THEME.a;
  const stabs = odd ? [0, 5, 8, 11, 14] : [0, 3, 6, 10, 14];
  if (stabs.includes(s)) ch.slice(1).forEach((m, i) => { const f = mtof(m); tone(f, t + sw + i * 0.012, beat * 2.4, { type: 'sine', vol: 0.05, out: 'music', attack: 0.01 }); tone(f * 2, t + sw + i * 0.012, beat * 1.2, { type: 'triangle', vol: 0.012, out: 'music', attack: 0.008 }); });
  if (s === 0) ch.slice(2, 4).forEach((m) => tone(mtof(m - 12), t, beat * 16, { type: 'sine', vol: 0.022, out: 'music', attack: 0.8 }));
  if (s === 0) tone(mtof(root), t, beat * 3.4, { type: 'sine', vol: 0.2, out: 'music', attack: 0.01 });
  if (s === 6) tone(mtof(root + 7), t + sw, beat * 1.8, { type: 'sine', vol: 0.15, out: 'music', attack: 0.01 });
  if (s === 10) tone(mtof(root + 12), t + sw, beat * 2, { type: 'sine', vol: 0.14, out: 'music', attack: 0.01 });
  if (s === 14) tone(mtof(root + (odd ? 5 : 10)), t + sw, beat * 1.4, { type: 'sine', vol: 0.12, out: 'music', attack: 0.01 });
  if (s === 0 || s === 6 || (s === 10 && odd)) tone(110, t, 0.2, { type: 'sine', slide: 0.4, vol: 0.34, out: 'music', attack: 0.003 });
  if (s === 4 || s === 12) { noise(t, 0.12, { freq: 1800, vol: 0.09, out: 'music', q: 0.8 }); tone(190, t, 0.06, { type: 'triangle', vol: 0.05, out: 'music', slide: 0.5 }); }
  if (s === 15 && Math.random() < 0.4) noise(t, 0.05, { freq: 1800, vol: 0.04, out: 'music' });
  if (s % 2 === 0) noise(t + sw, 0.03, { type: 'highpass', freq: 7000, vol: (s % 4 === 0 ? 0.04 : 0.026) + Math.random() * 0.012, out: 'music' });
  if (s === 14) noise(t + sw, 0.12, { type: 'highpass', freq: 6000, vol: 0.03, out: 'music' });
  if (bar % 4 === 3 && s >= 12) noise(t, 0.05, { freq: 2000 + s * 100, vol: 0.05, out: 'music' });
  if (s % 2 === 0 && Math.random() < 0.42) { melodyIdx = Math.max(0, Math.min(PENTA.length - 1, melodyIdx + [-2, -1, -1, 0, 1, 1, 2][(Math.random() * 7) | 0])); tone(mtof(PENTA[melodyIdx] - 12), t + sw, beat * (1 + ((Math.random() * 3) | 0)), { type: 'triangle', vol: 0.055, out: 'music', vib: 3, attack: 0.02 }); }
  if (Math.random() < 0.15) noise(t + Math.random() * beat, 0.008, { type: 'highpass', freq: 3000, vol: 0.03 + Math.random() * 0.03, out: 'music' }); // chiado de vinil
}
let realFire = false;
/** fogueira de verdade: gravação CC0 ("Fireplace sound loop", PagDev, OpenGameArt) em loop; se falhar, usa a sintetizada */
async function loadFire() {
  try {
    const res = await fetch('audio/fire.mp3');
    if (!res.ok) throw new Error('sem arquivo');
    const buf = await ctx.decodeAudioData(await res.arrayBuffer());
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf; src.loop = true; g.gain.value = 0.9;
    src.connect(g).connect(bus.fire); src.start();
    fireSrc = [src]; realFire = true;
  } catch { startFireBed(); }
}
function crackle(t) {
  if (realFire) return;
  // fogueira: estalos aleatórios
  if (Math.random() < 0.35) noise(t + Math.random() * 0.1, 0.02 + Math.random() * 0.04, { type: 'highpass', freq: 1500 + Math.random() * 3000, vol: 0.1 + Math.random() * 0.25, out: 'fire' });
}
let fireSrc = null;
function startFireBed() {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 380; g.gain.value = 0.35;
  lfo.frequency.value = 0.3; lg.gain.value = 0.12; lfo.connect(lg).connect(g.gain);
  s.connect(f).connect(g).connect(bus.fire); s.start(); lfo.start();
  fireSrc = [s, lfo];
}
function tick() {
  const beat = 60 / BPM / 4;
  while (nextT < ctx.currentTime + 0.25) {
    scheduleStep(nextT, step);
    crackle(nextT);
    step = (step + 1) % 16;
    if (step === 0) bar++;
    nextT += beat;
  }
}
export function startAmbience() {
  if (!ensure()) return false;
  ctx.resume?.();
  if (running) return true;
  running = true;
  nextT = ctx.currentTime + 0.1;
  if (!fireSrc) { fireSrc = ['carregando']; loadFire(); }
  timer = setInterval(tick, 60);
  applyVolumes();
  prefs.on = true; savePrefs();
  return true;
}
export function stopAmbience() {
  running = false;
  clearInterval(timer);
  applyVolumes();
  prefs.on = false; savePrefs();
}
export const ambienceOn = () => running;

// ───── v3.5: VOZ DO PRIMO (estilo "animalese": um bip por sílaba, com a altura da vogal) ─────
const VOWEL = { a: 0, á: 0, à: 0, ã: -1, â: 0, e: 4, é: 5, ê: 4, i: 9, í: 9, o: -3, ó: -2, ô: -3, õ: -4, u: -5, ú: -5 };
/** um bip de voz. `base` = altura da voz em Hz; `ch` = a letra (vogais mudam o tom) */
export function blip(ch, base = 240, vol = 0.07) {
  if (prefs.sfx <= 0) return;
  try {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + 0.005, semi = VOWEL[ch?.toLowerCase?.()] ?? ((ch?.charCodeAt?.(0) || 0) % 5) - 2;
    const f = base * 2 ** ((semi + (Math.random() - 0.5) * 1.5) / 12);
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'square'; o.frequency.value = f; o2.frequency.value = f * 2.01;
    lp.type = 'lowpass'; lp.frequency.value = 1800 + semi * 60;
    const g2 = ctx.createGain(); g2.gain.value = 0.18;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(bus.sfx);
    o.start(t); o2.start(t); o.stop(t + 0.09); o2.stop(t + 0.09);
  } catch { /* sem som */ }
}
