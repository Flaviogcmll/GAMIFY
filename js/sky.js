// CÉU — cores por hora do dia (madrugada, aurora, dia, hora dourada, pôr do sol, noite), estação do ano no hemisfério sul,
// fase da lua de verdade e o clima do reino (que espelha o seu dia). Usado pelo REINO e pelos cenários das abas.
import { hash, today } from './util.js';

// hora → [topo, meio, horizonte]
const KEYS = [
  [0, '#070a14', '#0e1424', '#1a2236'], [4, '#0a0f1e', '#151c33', '#262f48'], [5, '#1a2040', '#433457', '#7e4a58'],
  [6, '#35477a', '#a35d78', '#f09a5c'], [7, '#5d8fbf', '#c3a59c', '#f6cf98'], [9, '#6aaad6', '#a9cfe2', '#f1e4c8'],
  [12, '#5aa3da', '#9fcbe4', '#ebe6d6'], [15, '#6ea6d2', '#b9d1da', '#f3dcb4'], [16.5, '#7f97c2', '#e2ac86', '#f7c66c'],
  [17.6, '#4a3a70', '#c25a4c', '#f38a3c'], [18.4, '#241f48', '#6b2c4a', '#c4583a'], [19.2, '#121733', '#26244a', '#4a3352'],
  [20.5, '#0a0f1e', '#141b32', '#22293f'], [24, '#070a14', '#0e1424', '#1a2236'],
];
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export function mix(a, b, t) { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); }
export const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

/** hora "do cenário": segue o relógio, mas respeita se você forçou dia/noite no botão ☀/☾ */
export function sceneHour(d = new Date()) {
  let h = d.getHours() + d.getMinutes() / 60;
  let pref = 'auto';
  try { pref = localStorage.getItem('gamify-ui:mode') || 'auto'; } catch { /* */ }
  const mode = document.documentElement.dataset.mode;
  if (pref !== 'auto') { if (mode === 'night' && h >= 6 && h < 18) h = 21; if (mode === 'day' && (h < 6 || h >= 18.5)) h = 10; }
  return h;
}
export function skyAt(h) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const [h0, ...a] = KEYS[i], [h1, ...b] = KEYS[i + 1];
  const t = Math.max(0, Math.min(1, (h - h0) / (h1 - h0 || 1)));
  const top = mix(a[0], b[0], t), midc = mix(a[1], b[1], t), hor = mix(a[2], b[2], t);
  // luz do dia (0 noite … 1 meio-dia) e calor (pôr do sol/aurora)
  const light = h < 5 || h > 20 ? 0 : h < 7 ? (h - 5) / 2 : h > 18 ? (20 - h) / 2 : 1;
  const warm = Math.max(0, 1 - Math.abs(h - 17.8) / 1.4) + Math.max(0, 1 - Math.abs(h - 6.2) / 1.1);
  return { top, mid: midc, hor, light: Math.max(0, Math.min(1, light)), warm: Math.min(1, warm), night: light < 0.35 };
}
/** estação no hemisfério sul (Alfenas-MG): primavera dos ipês, verão das chuvas de tarde, outono dourado, inverno seco */
export function season(ds = today()) {
  const m = +ds.slice(5, 7);
  return m === 12 || m <= 2 ? 'verao' : m <= 5 ? 'outono' : m <= 8 ? 'inverno' : 'primavera';
}
export const SEASON_NAME = { verao: 'VERÃO', outono: 'OUTONO', inverno: 'INVERNO', primavera: 'PRIMAVERA' };
/** fase da lua real: 0 = nova, 0,5 = cheia */
export function moonPhase(d = new Date()) {
  const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
  return ((((d - ref) / 864e5) % syn) + syn) % syn / syn;
}
export const MOON_NAME = (p) => (p < 0.03 || p > 0.97 ? 'lua nova' : p < 0.22 ? 'lua crescente' : p < 0.28 ? 'quarto crescente' : p < 0.47 ? 'crescente gibosa' : p < 0.53 ? 'lua cheia' : p < 0.72 ? 'minguante gibosa' : p < 0.78 ? 'quarto minguante' : 'lua minguante');
/**
 * clima do reino: espelha o seu dia.
 * neblina (debuff) → névoa · envenenado → miasma verde · dia perfeito → arco-íris · senão, sorteio fixo do dia pela estação
 */
export function weather(statusSet, perfect, ds = today(), hour = new Date().getHours()) {
  if (statusSet?.has?.('envenenado')) return 'miasma';
  if (statusSet?.has?.('neblina')) return 'neblina';
  if (perfect) return 'arco-iris';
  const s = season(ds), h = hash('clima' + ds) % 100;
  const rain = { verao: 38, primavera: 22, outono: 14, inverno: 5 }[s];
  if (h < rain && hour >= 13 && hour < 21) return 'chuva';
  if (s === 'inverno' && hour < 9) return 'neblina';
  if (h % 5 === 0) return 'nublado';
  return 'limpo';
}
export const WEATHER_NAME = { limpo: 'céu limpo', nublado: 'nublado', chuva: 'chuva de verão', neblina: 'neblina', miasma: 'miasma (envenenado)', 'arco-iris': 'arco-íris (dia perfeito)' };
