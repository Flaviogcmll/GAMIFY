// DADOS DA VILA — o que o seu progresso diz (distritos, nível, muralha, APÊ…). O desenho está em village.js (v4).
// Cada construção é um dado seu:
//   base/castelo = seu nível · muralhas = dias em que bateu a meta diária · tochas acesas = sequência viva
//   distritos = notas do baú de domingo (HEVELIN, MÃE, AMIGOS…) · casas da vila = blocos fechados + bosses
//   torres = bosses derrotados · APÊ em obra = o que você GUARDOU pro boss do capítulo
//   biblioteca = SABER · mercado = RIQUEZA · campo de treino = VIGOR · estrada = ORDEM · lanternas = conquistas
//   moradores = LAÇOS (rituais com pessoas) · plantação = hábitos de hoje · clima = seus buffs/debuffs
import { S } from './store.js';
import * as R from './rules.js';
import { today, addDays } from './util.js';
import { season, weather } from './sky.js';


// ───────────────────────── DADOS: o reino a partir do seu progresso ─────────────────────────
const STYLE = [[/HEVELIN|RELACION|MULHER|NAMOR|ESPOSA|AMOR/, 'amor'], [/M[ÃA]E|\bPAI\b|FAM[IÍ]LIA/, 'familia'], [/AMIG/, 'taverna'], [/NETWORK|CONTATO|CLIENTE/, 'mercado'],
  [/CONHEC|ESTUD|LEITUR|SABER/, 'torre'], [/PR[AÁ]TICA|OFIC|PROJETO/, 'oficina'], [/V[IÍ]CIO/, 'fonte'], [/DINHEIRO|FINAN|GRANA/, 'banco'], [/REDES|SOCIAL|INSTA|CONTE/, 'arauto']];
const styleOf = (m) => (STYLE.find(([re]) => re.test(m)) || [0, 'casa'])[1];
export const gradeOf = (avg) => (avg == null ? 0 : avg < 5 ? 1 : avg < 7 ? 2 : avg < 8 ? 3 : 4);
const flagOf = (n) => (n == null ? 'cinza' : n >= 8 ? 'verde' : n >= 6 ? 'laranja' : 'vermelha');
export const WALL_TIERS = [5, 20, 45, 90];
export const KEEP_FORMS = [[1, 'fogueira'], [3, 'tenda'], [5, 'cabana'], [10, 'casa de pedra'], [15, 'castelo']];

export function kingdomData(s = S) {
  const td = today();
  const comp = R.companion(s), tot = R.totals(s), at = R.attributes(s), g = R.dailyGoal(s), st = R.dayStatus(s, td);
  const flameDays = Object.values(R.idx(s).xpByDay).filter((v) => v >= g.goal).length;
  const sundays = [...(s.core.sundays || [])].sort((a, b) => a.date.localeCompare(b.date));
  const districts = (s.core.milestones || []).map((name) => {
    const notes = sundays.map((x) => +(x.notes || {})[name] || 0).filter((v) => v > 0);
    const recent = notes.slice(-4), avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
    const last = notes.length ? notes[notes.length - 1] : null;
    return { name, notes: notes.slice(-12), last, avg, grade: gradeOf(avg), style: styleOf(name.toUpperCase()), flag: flagOf(last) };
  });
  const pessoa = new Set((s.core.rituals || []).filter((r) => r.type === 'pessoa').map((r) => r.id));
  const folk = new Set((s.core.ritualLog || []).filter((r) => r.date >= addDays(td, -30) && pessoa.has(r.rid)).map((r) => r.rid)).size;
  let best = null;
  for (const b of s.quests.blocks) {
    if (b.st === 'done' || b.color === 'black') continue;
    const items = s.quests.tasks.filter((t) => t.block === b.id && t.st !== 'cancel');
    if (!items.length) continue;
    const pct = items.filter((t) => t.st === 'done').length / items.length;
    if (!best || pct > best.pct) best = { title: b.title, pct, left: items.filter((t) => t.st !== 'done').length };
  }
  let bossNext = null;
  for (const b of s.quests.bosses || []) { if (b.st === 'done') continue; const hp = R.bossHp(s, b); if (hp && (!bossNext || hp.pct < bossNext.pct)) bossNext = { text: b.text.replace(/:\s*[\d.]+\s*XP.*$/i, ''), pct: hp.pct }; }
  const keepIdx = KEEP_FORMS.reduce((a, [lv], i) => (tot.level >= lv ? i : a), 0);
  return {
    td, comp, tot, at, g, st, flameDays, districts, folk, best, bossNext, keepIdx, keep: KEEP_FORMS[keepIdx][1],
    wall: WALL_TIERS.filter((n) => flameDays >= n).length, boss: R.chapterBoss(s), wk: R.weeklyMissions(s, td),
    towers: (s.quests.bosses || []).filter((b) => b.st === 'done').length,
    ach: Object.keys(s.core.achievements || {}).length, perfect: R.isPerfect(s, td), chapters: (s.core.chapters || []).length,
    name: comp.name, chapter: s.core.chapter || {}, season: season(td), weather: weather(st, R.isPerfect(s, td), td),
  };
}


