// Utilidades: datas (sempre "AAAA-MM-DD" no fuso local), ids, escape de HTML, feriados.

export const pad = (n) => String(n).padStart(2, '0');
export const toDS = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDS = (ds) => {
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(y, m - 1, d);
};

let FIXED_TODAY = null; // usado nos testes para "congelar" o dia
export const setToday = (ds) => { FIXED_TODAY = ds; };
export const today = () => FIXED_TODAY || toDS(new Date());

export const addDays = (ds, n) => {
  const d = parseDS(ds);
  d.setDate(d.getDate() + n);
  return toDS(d);
};
/** b - a, em dias */
export const diffDays = (a, b) => Math.round((parseDS(b) - parseDS(a)) / 864e5);
/** 0 = domingo ... 6 = sábado */
export const weekday = (ds) => parseDS(ds).getDay();
/** segunda-feira da semana de ds */
export const weekStart = (ds) => addDays(ds, -((weekday(ds) + 6) % 7));
export const range = (from, n) => Array.from({ length: n }, (_, i) => addDays(from, i));

export const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
export const fmtDM = (ds) => (ds ? `${ds.slice(8, 10)}/${ds.slice(5, 7)}` : '');
export const fmtDMY = (ds) => (ds ? `${ds.slice(8, 10)}/${ds.slice(5, 7)}/${ds.slice(0, 4)}` : '');

export const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const fmtN = (n) => Math.round(n).toLocaleString('pt-BR');

/** hash estável (FNV-1a) para sorteios determinísticos por data */
export function hash(str) {
  let h = 2166136261;
  for (const ch of str) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher) */
export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${y}-${pad(month)}-${pad(day)}`;
}

const HOL_CACHE = {};
/** Feriados nacionais do Brasil: { 'AAAA-MM-DD': 'NOME' } */
export function holidays(y) {
  if (HOL_CACHE[y]) return HOL_CACHE[y];
  const e = easter(y);
  const list = {
    [`${y}-01-01`]: 'ANO NOVO',
    [addDays(e, -48)]: 'CARNAVAL',
    [addDays(e, -47)]: 'CARNAVAL',
    [addDays(e, -2)]: 'SEXTA-FEIRA SANTA',
    [`${y}-04-21`]: 'TIRADENTES',
    [`${y}-05-01`]: 'DIA DO TRABALHO',
    [addDays(e, 60)]: 'CORPUS CHRISTI',
    [`${y}-09-07`]: 'INDEPENDÊNCIA',
    [`${y}-10-12`]: 'N. SRA. APARECIDA',
    [`${y}-11-02`]: 'FINADOS',
    [`${y}-11-15`]: 'PROCLAMAÇÃO DA REPÚBLICA',
    [`${y}-11-20`]: 'CONSCIÊNCIA NEGRA',
    [`${y}-12-25`]: 'NATAL',
  };
  HOL_CACHE[y] = list;
  return list;
}
export const holidayName = (ds) => holidays(+ds.slice(0, 4))[ds] || null;
export const isWorkday = (ds) => {
  const w = weekday(ds);
  return w !== 0 && w !== 6 && !holidayName(ds);
};
