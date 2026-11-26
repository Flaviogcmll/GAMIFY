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
  const tape = ctx.createBiquadFilter(); tape.type = 'lowpass'; tape.frequency.value = 2300; // v6: um pouco mais abafado = mais aconchegante
  bus.musicIn = ctx.createGain(); bus.musicIn.connect(tape); tape.connect(bus.music);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // v6: eco de sala pequena (gerado aqui mesmo): deixa o lo-fi e os efeitos quentinhos, como numa cabana
  try {
    const len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const x = ir.getChannelData(ch); for (let i = 0; i < len; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2; }
    const room = ctx.createConvolver(); room.buffer = ir;
    const wetM = ctx.createGain(); wetM.gain.value = 0.28; tape.connect(wetM).connect(room);
    const wetS = ctx.createGain(); wetS.gain.value = 0.1; bus.sfx.connect(wetS).connect(room);
    room.connect(master);
  } catch { /* sem eco */ }
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
let detune = 1; // v6: cada efeito sai um tiquinho diferente (não cansa o ouvido)
let warp = 0;
function tone(freq, t, dur, { type = 'square', vol = 0.15, out = 'sfx', attack = 0.005, slide = 0, vib = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  if (out === 'sfx') freq *= detune;
  else if (warp) freq *= 1 - warp * Math.random(); // v6.6: A PRAGA desafina a música (cada nota cai um pouco, sem padrão)
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
  // fogos: assobio do rojão subindo + estouro com chiado, três vezes
  fireworks: (t) => { for (let i = 0; i < 3; i++) { const u = t + i * 0.27; tone(700, u, 0.2, { slide: 2.4, type: 'sine', vol: 0.05 }); noise(u + 0.22, 0.34, { freq: 900, vol: 0.3, q: 0.6 }); noise(u + 0.24, 0.6, { freq: 5200, vol: 0.1, q: 0.8 }); } },
  // v6: concluir tarefa = "tic" curtinho e suave, com 4 variações (o PDF: pequeno e não musical; a festa fica pro que custou)
  check: (t) => { const v = (Math.random() * 4) | 0; const P = [[79, 86], [81, 88], [76, 84], [83, 88]][v]; tone(mtof(P[0]), t, 0.05, { type: 'triangle', vol: 0.13 }); tone(mtof(P[1]), t + 0.045, 0.09, { type: 'sine', vol: 0.11 }); noise(t, 0.02, { freq: 4200, vol: 0.05 }); },
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
// v9.2 (pedido do dono: "adicionar alguns, pode pegar da net"): sons de verdade do pacote CC0 do Kenney (assets/sons/k-*.mp3, créditos em CREDITOS.txt)
// tocam por cima do efeito gerado: moedas na compra, pano ao soltar, livro nas páginas, papel no lixo
const FILE_FOR = { buy: [['k-moedas', 0.55]], coin: [['k-moedas2', 0.5]], drop: [['k-pano', 0.45]], trash: [['k-livro-fecha', 0.4]], stamp: [['k-livro-fecha', 0.45]], chest: [['k-moedas', 0.4]], open: [['k-livro', 0.18]] };
export function sfx(name) {
  if (prefs.sfx <= 0) return;
  try { if (!ensure()) return; if (ctx.state === 'suspended') ctx.resume(); detune = 2 ** (((Math.random() - 0.5) * 0.6) / 12); SFX[name]?.(ctx.currentTime + 0.01); detune = 1; } catch { /* sem som */ }
  for (const [f, v] of FILE_FOR[name] || []) playFile(f, { vol: v });
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
// v6: "cozy" = mais lento e mais jazzístico (Fmaj9 · Em7 · Dm9 · G13), pro QUESTS, que é onde você passa mais tempo
THEMES.cozy = { bpm: 70, a: [[41, 57, 60, 64, 67], [40, 55, 59, 62, 67], [38, 57, 60, 64, 65], [43, 53, 57, 59, 64]], b: [[45, 55, 60, 64, 67], [38, 57, 60, 64, 65], [41, 57, 60, 64, 69], [43, 53, 59, 62, 64]], penta: THEMES.zen.penta };
const THEME_OF = { quests: 'cozy', filtro: 'work', agenda: 'plan', arquivo: 'plan', shop: 'shop', cofre: 'shop', domingo: 'zen', survival: 'zen', rotina: 'night', regras: 'night', conquistas: 'shop' };
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
/** v8.9 (pedido do dono): 🔇 desliga TODO som do app (efeitos, música, Praga); 🔊 volta como estava */
export function toggleMute() {
  if (prefs.mute) { prefs.mute = false; prefs.sfx = prefs.sfxPrev ?? 0.6; }
  else { prefs.mute = true; prefs.sfxPrev = prefs.sfx || 0.6; prefs.sfx = 0; if (running) stopAmbience(); pragaDrone(0); }
  savePrefs(); applyVolumes(); return prefs.mute;
}
// v8.3 (pedido do dono): sair do app no celular sem fechar a aba deixava a música tocando. Aba escondida = som pausado; voltou = continua.
document.addEventListener('visibilitychange', () => { if (!ctx) return; try { if (document.hidden) ctx.suspend(); else if (prefs.sfx > 0 || running) ctx.resume(); } catch { /* */ } });
window.addEventListener('pagehide', () => { try { ctx?.suspend(); } catch { /* */ } });

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

// ───── v6.6: SONS DE ARQUIVO (CC0, assets/sons — créditos em assets/sons/CREDITOS.txt): A PRAGA e o BANHO DE SAL GROSSO ─────
const FILES = {};
const fileBuf = (n) => (FILES[n] ||= fetch(new URL(`assets/sons/${n}.mp3`, document.baseURI).href).then((r) => (r.ok ? r.arrayBuffer() : null)).then((a) => (a ? ctx.decodeAudioData(a) : null)).catch(() => null));
let heard = false; // o navegador só deixa tocar som depois do 1º toque/clique
document.addEventListener('pointerdown', () => { heard = true; if (pendingDrone != null) { const l = pendingDrone; pendingDrone = null; pragaDrone(l); } }, { capture: true });
export async function playFile(n, { vol = 1, rate = 1 } = {}) {
  if (prefs.sfx <= 0 || !heard) return;
  try {
    if (!ensure()) return; if (ctx.state === 'suspended') ctx.resume();
    const b = await fileBuf(n); if (!b) return;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; s.playbackRate.value = rate * (0.97 + Math.random() * 0.06); g.gain.value = vol;
    s.connect(g).connect(bus.sfx); s.start();
  } catch { /* sem som */ }
}
let drone = null, pendingDrone = null;
/** ronco de fundo da Praga: 0 desliga · 1 baixinho (TREM TRAPAIADO) · 2 forte e mais grave (LAMBEHOMI) */
export async function pragaDrone(level) {
  if (!heard) { pendingDrone = level; return; }
  if (!level || prefs.sfx <= 0) { if (drone) { const d = drone; drone = null; try { d.g.gain.setTargetAtTime(0, ctx.currentTime, 0.5); setTimeout(() => { try { d.s.stop(); } catch { /* */ } }, 2500); } catch { /* */ } } return; }
  try {
    if (!ensure()) return; if (ctx.state === 'suspended') ctx.resume();
    const vol = level >= 2 ? 0.5 : 0.22, rate = level >= 2 ? 0.82 : 1;
    if (drone) { drone.g.gain.setTargetAtTime(vol, ctx.currentTime, 0.8); drone.s.playbackRate.setTargetAtTime(rate, ctx.currentTime, 1.5); return; }
    const b = await fileBuf('praga-drone'); if (!b || drone) return;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; s.loop = true; s.playbackRate.value = rate; g.gain.value = 0;
    s.connect(g).connect(bus.sfx); s.start(); g.gain.setTargetAtTime(vol, ctx.currentTime, 1.5);
    drone = { s, g };
  } catch { /* sem som */ }
}
/** v7.7: UIVO do LAMBEHOMI, gerado no aparelho (sem arquivo): sobe, segura tremendo e cai, com um eco longe */
export function uivo(vol = 1) {
  if (!heard || prefs.sfx <= 0) return;
  try {
    if (!ensure()) return; if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + 0.05, v = 0.07 * vol;
    for (const [d, k] of [[0, 1], [0.32, 0.35]]) { // o uivo e o eco
      tone(230, t + d, 1.0, { type: 'triangle', vol: v * k, attack: 0.35, slide: 2.25, vib: 5 });
      tone(515, t + d + 0.95, 1.9, { type: 'triangle', vol: v * k * 0.9, attack: 0.08, slide: 0.58, vib: 10 });
      tone(258, t + d + 0.95, 1.9, { type: 'sine', vol: v * k * 0.35, attack: 0.1, slide: 0.6, vib: 6 });
    }
  } catch { /* sem som */ }
}
/** v8: ZUMBIDO de mosca, gerado no aparelho (sem arquivo): passa perto e vai embora (no lugar do corvo/urubu) */
export function zumbido(vol = 1) {
  if (!heard || prefs.sfx <= 0) return;
  try {
    if (!ensure()) return; if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + 0.03, dur = 1.3 + Math.random() * 0.6, f0 = 175 + Math.random() * 40;
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), am = ctx.createOscillator(), amg = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t); // a mosca chega, desvia e vai embora (o tom sobe e desce um pouco)
    o.frequency.linearRampToValueAtTime(f0 * 1.12, t + dur * 0.35); o.frequency.linearRampToValueAtTime(f0 * 0.94, t + dur * 0.7); o.frequency.linearRampToValueAtTime(f0 * 1.05, t + dur);
    lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 2;
    am.frequency.value = 24 + Math.random() * 8; amg.gain.value = 0.35; // as asas batendo
    const v = 0.05 * vol;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    am.connect(amg).connect(g.gain);
    let node = o.connect(lp).connect(g);
    if (pan) { pan.pan.setValueAtTime(-0.7, t); pan.pan.linearRampToValueAtTime(0.7, t + dur); node = node.connect(pan); }
    node.connect(bus.sfx);
    o.start(t); am.start(t); o.stop(t + dur + 0.05); am.stop(t + dur + 0.05);
  } catch { /* sem som */ }
}
/** música desafinada (0 = normal; 0.06 = bem torta) */
export const pragaWarp = (v) => { warp = v || 0; };

// ───── v9.0 (pedidos do dono): SONS DO ELENCO, gerados no aparelho (sem arquivo, sem direitos autorais), no clima cozy ─────
const ok = () => { if (!heard || prefs.sfx <= 0) return false; try { if (!ensure()) return false; if (ctx.state === 'suspended') ctx.resume(); return true; } catch { return false; } };
/** voz "de bicho": uma onda passando por 2 filtros (as vogais), com a altura e as vogais mudando no tempo */
function voice(t, dur, { f0 = [300, 300], f1 = [700, 700], f2 = [1200, 1200], vol = 0.12, type = 'sawtooth', vib = 0, trem = 0, q = 9 } = {}) {
  const o = ctx.createOscillator(), a = ctx.createBiquadFilter(), b = ctx.createBiquadFilter(), g = ctx.createGain(), mix = ctx.createGain();
  o.type = type;
  const ramp = (p, arr) => { p.setValueAtTime(arr[0], t); arr.slice(1).forEach((v, i) => p.linearRampToValueAtTime(v, t + (dur * (i + 1)) / (arr.length - 1))); };
  ramp(o.frequency, f0); a.type = b.type = 'bandpass'; a.Q.value = b.Q.value = q; ramp(a.frequency, f1); ramp(b.frequency, f2);
  if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 6; lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.06, dur / 4)); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (trem) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = trem; lg.gain.value = vol * 0.8; l.connect(lg).connect(g.gain); l.start(t); l.stop(t + dur + 0.05); }
  o.connect(a).connect(mix); o.connect(b).connect(mix); mix.gain.value = 1.6; mix.connect(g).connect(bus.sfx);
  o.start(t); o.stop(t + dur + 0.05);
}
/** lata/panela batendo: parciais "tortos" (som de metal) que somem rápido + o estalo */
function lata(t, f = 900, vol = 0.07) {
  for (const [k, d, v] of [[1, 0.35, 1], [2.76, 0.22, 0.6], [5.4, 0.12, 0.4], [8.93, 0.08, 0.25]]) tone(f * k, t, d + Math.random() * 0.1, { type: 'sine', vol: vol * v, attack: 0.002 });
  noise(t, 0.04, { freq: 3500, q: 0.8, vol: vol * 1.6 });
}
const miau = (t, base = 1, vol = 0.1) => voice(t, 0.55 * (0.85 + Math.random() * 0.3), { f0: [480 * base, 760 * base, 430 * base], f1: [350, 850, 420], f2: [2300, 1250, 800], vol, vib: 12 });
const chiadoGato = (t, vol = 0.12) => noise(t, 0.38, { type: 'highpass', freq: 3200, q: 0.7, vol });
const boing = (t) => tone(180, t, 0.35, { type: 'sine', vol: 0.09, slide: 3.2, vib: 25 });
/** a BAGUNÇA dos TREM: latas, panela, tralha caindo e, às vezes, gato brigando. Tom e Jerry de roça. n = quanto barulho (1 a 3) */
export function bagunca(n = 2) {
  if (!ok()) return;
  const t = ctx.currentTime + 0.03, k = Math.max(1, Math.min(3, n));
  // v9.2: panela e lata de verdade (Kenney, CC0) por baixo da bagunça gerada
  const real = ['k-panela1', 'k-panela2', 'k-lata']; playFile(real[(Math.random() * 3) | 0], { vol: 0.35 + k * 0.08 }); if (k >= 2) setTimeout(() => playFile('k-lata', { vol: 0.35, rate: 0.9 + Math.random() * 0.3 }), 350 + Math.random() * 300);
  for (let i = 0; i < 2 + k * 2; i++) lata(t + Math.random() * (0.5 + k * 0.35), 500 + Math.random() * 1500, 0.04 + Math.random() * 0.04);
  if (Math.random() < 0.5) boing(t + 0.2 + Math.random() * 0.5);
  if (Math.random() < 0.35 + k * 0.15) { miau(t + 0.3 + Math.random() * 0.4, 0.9 + Math.random() * 0.4); if (k >= 2 && Math.random() < 0.6) { chiadoGato(t + 0.9); miau(t + 1.05, 1.35, 0.08); } }
  // o tombo final: tralha no chão
  noise(t + 0.9 + k * 0.25, 0.3, { type: 'lowpass', freq: 700, q: 0.5, vol: 0.18 }); lata(t + 0.92 + k * 0.25, 420, 0.08);
}
/** BANHO DE SAL GROSSO: grãos caindo (chuvinha de cliques agudos), um sininho e um suspiro de alívio */
export function salGrosso() {
  if (!ok()) return;
  const t = ctx.currentTime + 0.03;
  for (let i = 0; i < 46; i++) { const u = t + (i / 46) ** 1.6 * 1.3 + Math.random() * 0.03; noise(u, 0.012 + Math.random() * 0.02, { freq: 5000 + Math.random() * 4000, q: 4, vol: 0.05 + Math.random() * 0.05 }); }
  [84, 88, 91, 96].forEach((m, i) => tone(mtof(m), t + 0.5 + i * 0.12, 1.6, { type: 'sine', vol: 0.07 - i * 0.01 }));
  noise(t + 1.2, 1.2, { type: 'lowpass', freq: 600, vol: 0.06 }); // o "ufa"
}
/** a voz de cada um do ELENCO (toque no personagem do banner) */
const VOZES = {
  primo: (t) => { voice(t, 0.16, { f0: [130, 110], f1: [500, 400], f2: [1100, 900], vol: 0.13, q: 6 }); voice(t + 0.2, 0.22, { f0: [125, 95], f1: [520, 380], f2: [1000, 850], vol: 0.12, q: 6 }); }, // ronc ronc
  brasinha: (t) => { for (let i = 0; i < 3; i++) tone(mtof(91 + i * 3), t + i * 0.09, 0.08, { type: 'sine', vol: 0.08, slide: 1.25 }); for (let i = 0; i < 6; i++) noise(t + Math.random() * 0.4, 0.02, { freq: 2500, vol: 0.06 }); },
  cajulina: (t) => miau(t, 1.25), rosemia: (t) => { miau(t, 1.05); [96, 100, 103].forEach((m, i) => tone(mtof(m), t + 0.45 + i * 0.07, 0.5, { type: 'sine', vol: 0.03 })); },
  'tia-mia': (t) => voice(t, 0.8, { f0: [380, 520, 330], f1: [380, 800, 400], f2: [2100, 1150, 760], vol: 0.09, vib: 22 }), // miau de vó, tremido
  'eve-la': (t) => voice(t, 0.7, { f0: [330, 310, 290], f1: [520, 560, 500], f2: [1900, 1850, 1700], vol: 0.11, trem: 9 }), // béééé
  'frog-lipe': (t) => { for (const u of [0, 0.22]) voice(t + u, 0.16, { f0: [95, 80], f1: [300, 260], f2: [800, 700], vol: 0.16, trem: 38, q: 5 }); }, // croac croac
  'boi-nilton': (t) => voice(t, 1.0, { f0: [120, 128, 92], f1: [300, 520, 380], f2: [700, 900, 650], vol: 0.15, q: 5 }), // múúú
  megg: (t) => { for (let i = 0; i < 3; i++) voice(t + i * 0.13, 0.08, { f0: [620, 520], f1: [800, 700], f2: [1800, 1500], vol: 0.09, q: 4 }); voice(t + 0.42, 0.35, { f0: [600, 780, 560], f1: [800, 900, 700], f2: [1900, 2000, 1600], vol: 0.08, q: 4 }); }, // có có có cocóóó
  guarana: (t) => { noise(t, 0.25, { type: 'bandpass', freq: 900, q: 1.5, vol: 0.08 }); voice(t + 0.05, 0.3, { f0: [520, 600, 480], f1: [700, 800, 600], f2: [1400, 1500, 1200], vol: 0.06, type: 'triangle' }); }, // bufo e latidinho
  lambehomi: () => uivo(0.8),
  cumpadi: (t) => { for (let i = 0; i < 4; i++) tone(mtof(93 + ((i * 5) % 7)), t + i * 0.08, 0.07, { type: 'sine', vol: 0.07, slide: 1.4 }); }, // piu piu
  'trem-1': () => bagunca(1), 'trem-2': () => bagunca(2), 'trem-3': () => bagunca(3),
};
/** v9.2: sons de arquivo com nome (aviso da hora, lobo, antídoto) */
export const somArq = (n, vol = 0.6) => playFile(n, { vol });
export function voz(nome) { if (!ok()) return; try { VOZES[nome]?.(ctx.currentTime + 0.03); } catch { /* sem som */ } }
