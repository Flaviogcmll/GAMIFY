// v10 (pedido do dono): o MEU DIA vira uma IMAGEM (PNG) pra mandar no WhatsApp (num grupo só dele) e ver o dia sem abrir o app.
// Desenho feito à mão num <canvas> (sem biblioteca): data, SAPO, as horas com tarefas e rituais, o que está sem horário, os hábitos.
// Compartilhar: no celular abre a janela de compartilhar do sistema (WhatsApp aparece lá); no PC baixa o arquivo.
import { S } from './store.js';
import * as R from './rules.js';
import { today, addDays, fmtDM, DOW, weekday } from './util.js';
import { toast } from './ui.js';
import { sfx } from './audio.js';

const clean = (t) => String(t || '').replace(/\s*\(\d+\s*XP\)/i, '').replace(/^\s*(↳|>)\s*/, '').replace(/[⭐🛡💰]/g, '').replace(/\s+/g, ' ').trim();
export const markIcons = (t) => [t.prio && '🐸', /⭐/.test(t.text) && '⭐', /🛡/.test(t.text) && '🛡', /💰/.test(t.text) && '$'].filter(Boolean).join('');
const hourOf = (t) => t.at || t.box?.at || '';
const toMin = (h) => { const [a, b] = String(h).split(':'); return +a * 60 + (+b || 0); };

/** o que entra na imagem (o mesmo que o MEU DIA mostra) */
export function diaResumo(d = today()) {
  const td = today(), hoje = d === td;
  const tasks = R.openTasks(S).filter((t) => t.due && (hoje ? t.due <= d : t.due === d) && t.st !== 'wait' && !t.who);
  const rits = (S.core.rituals || []).filter((r) => { const n = R.ritualStatus(r, td).next; return n && (hoje ? n <= d : n === d); });
  const timed = [...tasks.filter(hourOf).map((t) => ({ h: hourOf(t), txt: clean(t.text), mk: markIcons(t), late: t.due < d, c: R.colorOfTask(S, t) })), ...rits.filter((r) => r.at).map((r) => ({ h: r.at, txt: '🔁 ' + r.name, mk: '', rit: true }))].sort((a, b) => toMin(a.h) - toMin(b.h));
  const loose = [...tasks.filter((t) => !hourOf(t)).map((t) => ({ txt: clean(t.text), mk: markIcons(t), late: t.due < d, c: R.colorOfTask(S, t) })), ...rits.filter((r) => !r.at).map((r) => ({ txt: '🔁 ' + r.name, mk: '', rit: true }))];
  const feitas = S.quests.tasks.filter((t) => t.st === 'done' && t.doneAt === d).length;
  const sapo = R.openTasks(S).filter((t) => t.prio && t.st !== 'wait').sort((a, b) => (a.due || '9').localeCompare(b.due || '9'))[0];
  const m = S.marks.days[d]?.h || {}, habs = (S.core.habits || []).map((h) => ({ icon: h.icon, name: h.name, v: m[h.id] || '' }));
  return { d, timed, loose, feitas, total: feitas + tasks.length, sapo: sapo && clean(sapo.text), habs, xp: R.idx(S).xpByDay[d] || 0 };
}

const COR = { red: '#c8402f', yellow: '#d9a520', green: '#3f8a55', '': '#8c7b6b' };
/** desenha o PNG (1080 de largura, altura conforme o dia) e devolve um Blob */
export async function diaPng(d = today()) {
  const r = diaResumo(d), W = 1080, pad = 56, lh = 54;
  const lines = r.timed.length + r.loose.length + (r.loose.length ? 2 : 0) + (r.timed.length ? 1 : 0);
  const H = 360 + lines * lh + (r.habs.length ? 170 : 0) + 120;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const font = (px, w = 700) => `${w} ${px}px "Roboto Mono", ui-monospace, monospace`;
  const fit = (txt, max) => { let s = txt; while (g.measureText(s).width > max && s.length > 4) s = s.slice(0, -2); return s === txt ? s : s.trimEnd() + '…'; };
  // fundo creme com borda ameixa (cara do app)
  g.fillStyle = '#fbf3e4'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#2e2430'; g.fillRect(0, 0, W, 210);
  g.fillStyle = '#eeb35a'; g.font = font(30); g.fillText('GAMIFY · BARRANCO BAIXO', pad, 70);
  g.fillStyle = '#fffaf1'; g.font = font(64, 800); g.fillText(`MEU DIA · ${DOW[weekday(d)].toUpperCase()} ${fmtDM(d)}`, pad, 150);
  g.fillStyle = '#f5d9a8'; g.font = font(28, 600); g.fillText(`✓ ${r.feitas} de ${r.total} feitas · +${r.xp} XP`, pad, 192);
  let y = 270;
  if (r.sapo) { g.fillStyle = '#e6f0df'; g.fillRect(pad - 16, y - 44, W - 2 * pad + 32, 66); g.fillStyle = '#2f5d3a'; g.font = font(32, 800); g.fillText(fit(`🐸 SAPO: ${r.sapo}`, W - 2 * pad), pad, y); y += 70; }
  const row = (h, x) => {
    g.fillStyle = x.late ? '#c8402f' : x.rit ? '#3f6f9a' : COR[x.c || ''] || '#8c7b6b'; g.fillRect(pad, y - 34, 10, 42);
    g.fillStyle = '#2e2430'; g.font = font(30, 800); if (h) g.fillText(h, pad + 26, y);
    g.font = font(32, 600); const x0 = pad + (h ? 160 : 26); g.fillText(fit(`${x.txt}${x.mk ? ' ' + x.mk : ''}${x.late ? ' (atrasada)' : ''}`, W - x0 - pad), x0, y);
    y += lh;
  };
  if (r.timed.length) { g.fillStyle = '#a8742a'; g.font = font(26, 800); g.fillText('COM HORÁRIO', pad, y); y += lh; r.timed.forEach((x) => row(x.h, x)); }
  if (r.loose.length) { y += 10; g.fillStyle = '#a8742a'; g.font = font(26, 800); g.fillText('SEM HORÁRIO (BAGUNÇA DO DIA)', pad, y); y += lh; r.loose.forEach((x) => row('', x)); }
  if (!r.timed.length && !r.loose.length) { g.fillStyle = '#3f8a55'; g.font = font(36, 800); g.fillText('Dia livre. Trem bão! 🎉', pad, y); y += lh; }
  if (r.habs.length) {
    y += 30; g.fillStyle = '#a8742a'; g.font = font(26, 800); g.fillText('HÁBITOS', pad, y); y += 56;
    let x = pad; g.font = font(28, 700);
    for (const h of r.habs) { const lab = `${h.v === 'x' ? '✓' : h.v === '-' ? '–' : '○'} ${h.icon}`; const w = g.measureText(lab).width + 28; if (x + w > W - pad) { x = pad; y += 52; } g.fillStyle = h.v === 'x' ? '#dcefd9' : h.v === '-' ? '#efe6d6' : '#f6e1dc'; g.fillRect(x, y - 36, w, 48); g.fillStyle = '#2e2430'; g.fillText(lab, x + 14, y); x += w + 10; }
    y += 40;
  }
  g.fillStyle = '#8c7b6b'; g.font = font(22, 600); g.fillText(`gerado ${new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · abra o app pra mexer`, pad, H - 40);
  return new Promise((res) => cv.toBlob(res, 'image/png'));
}

/** compartilhar (celular: WhatsApp e cia) ou baixar (PC) */
export async function shareDia(d = today()) {
  try {
    const blob = await diaPng(d), name = `meu-dia-${d}.png`, file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: `Meu dia ${fmtDM(d)}`, text: `🗓 Meu dia ${fmtDM(d)} (GAMIFY)` }); sfx('ready'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('📸 Imagem do dia baixada. No celular, o botão abre o WhatsApp direto.', 'good');
  } catch (err) { if (err?.name !== 'AbortError') toast('Não deu pra gerar a imagem agora.', 'bad'); }
}
export const amanha = () => addDays(today(), 1);
