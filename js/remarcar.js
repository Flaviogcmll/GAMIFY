// v9.1 (pedido do dono: "tudo tem que ter um padrão e ser interligado"): UM caminho só pra mudar o prazo de uma tarefa,
// usado por TODAS as telas (janela da tarefa, MEU DIA, PLANEJAR AMANHÃ, MUDANÇA DE PLANOS, CALENDÁRIO, entrevista do dia…).
// Em vez de cada lugar dar um erro diferente, ele resolve na hora, numa janela só:
//  (v9.7: bloco e subtarefa têm prazos independentes; o "empurrar o bloco junto" saiu)
//  2) tarefa já remarcada 3x (travada) → pede o time box (horário + duração) ali mesmo;
//  3) remarcar custa XP → mostra o preço e pergunta.
import { S } from './store.js';
import * as R from './rules.js';
import * as A from './actions.js';
import { esc, fmtDM, fmtN, today, addDays } from './util.js';
import { openModal, closeModal, toast } from './ui.js';
import { sfx } from './audio.js';
import { quem, sorte } from './elenco.js';

const clean = (t) => String(t?.text || '').replace(/\s*\(\d+\s*XP\)/i, '').replace(/^\s*(↳|>)\s*/, '');
const dayTxt = (d) => (!d ? 'sem prazo' : d === today() ? 'HOJE' : d === addDays(today(), 1) ? 'AMANHÃ' : fmtDM(d));

/** janela com botões; devolve a chave do botão escolhido (ou null se fechou) e os valores do formulário */
function choose(html, buttons) {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal(`<form class="resched" autocomplete="off">${html}<div class="actions">${buttons.map(([k, label, cls]) => `<button type="${k === 'no' ? 'button' : 'submit'}" class="btn ${cls || ''}" data-x="${k}">${label}</button>`).join('')}</div></form>`, { onClose: () => { if (!done) resolve(null); } });
    const f = m.querySelector('form');
    let pick = buttons.find((b) => b[0] !== 'no')?.[0];
    m.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-set]'); if (chip) { e.preventDefault(); const [n, v] = chip.dataset.set.split('='); if (f[n]) f[n].value = v; m.querySelectorAll(`[data-set^="${n}="]`).forEach((x) => x.classList.toggle('on', x === chip)); return; }
      const b = e.target.closest('[data-x]'); if (!b) return;
      if (b.dataset.x === 'no') { done = true; closeModal(); resolve(null); return; }
      pick = b.dataset.x;
    });
    f.addEventListener('submit', (e) => { e.preventDefault(); if (!f.reportValidity()) return; done = true; const vals = Object.fromEntries(new FormData(f)); closeModal(); resolve({ k: pick, vals }); });
  });
}

/**
 * Muda o prazo de uma tarefa resolvendo tudo no caminho. Devolve true se mudou.
 * extra = outros campos que vão junto (ex.: { box }) · reopen = função pra reabrir a janela de quem chamou, se uma pergunta precisou aparecer
 */
export async function setDue(id, due, { extra = {}, reopen } = {}) {
  const t = S.quests.tasks.find((x) => x.id === id);
  if (!t) return false;
  due = due || null;
  let asked = false;
  const back = (ok) => { if (!ok && asked && reopen) setTimeout(reopen, 60); return ok; }; // v9.7: salvou = a janela NÃO volta (parecia que não tinha salvo); desistiu = volta pra você continuar
  if ((t.due || null) === due && !extra.box) return true;
  // 2) travada (remarcada 3x ou mais): só empurra com time box. Pede aqui mesmo.
  if (due && t.due && due > t.due && R.reschedLocked(S, t) && !extra.box) {
    asked = true;
    const hours = ['08:00', '10:00', '14:00', '16:00', '19:00'];
    const r = await choose(`${quem('tia-mia', 3, sorte(['Remarcou de novo, meu fio? Então marca a hora. Devagar, mas marca.', 'Quem marca a hora não esquece. Quem não marca, remarca.']))}<h2>🔒 Combinar a hora</h2><p class="muted">"<b>${esc(clean(t))}</b>" já foi remarcada ${t.rs}x. Pra empurrar pra <b>${dayTxt(due)}</b>, combine QUANDO e POR QUANTO TEMPO você faz (time box). Aparece no MEU DIA.</p>
      <label class="lbl">⏰ às</label><div class="row"><input class="inp" type="time" name="at" required value="${esc(t.box?.at || t.at || '')}" style="width:auto">${hours.map((h) => `<button type="button" class="pill" data-set="at=${h}"><span>${h}</span></button>`).join('')}</div>
      <label class="lbl">⏳ por</label><div class="row">${[15, 25, 50, 90].map((m) => `<button type="button" class="pill ${m === (t.box?.min || 25) ? 'on' : ''}" data-set="min=${m}"><span>${m} min</span></button>`).join('')}<input type="hidden" name="min" value="${t.box?.min || 25}"></div>`,
      [['no', 'CANCELAR'], ['box', 'REMARCAR COM TIME BOX', 'pri']]);
    if (!r) return back(false);
    extra = { ...extra, box: { at: r.vals.at, min: +r.vals.min || 25 }, at: r.vals.at };
  }
  // 3) custa XP: mostra o preço
  const cost = A.reschedCost(t, due);
  if (cost) {
    const bal = R.totals(S).balance;
    if (bal < cost) { sfx('error'); toast(`Faltam ${cost - bal} XP pra remarcar "${esc(clean(t))}" (custa ${cost} XP). Conclua algo antes, ou mantenha o prazo.`, 'bad'); return back(false); }
    asked = true;
    const r = await choose(`${quem('megg', 1, sorte(['Regra é regra, meu filho: remarcar custa XP.', 'Prazo é promessa. Quebrou, paga. Tá no livro.']))}<h2>💸 Remarcar custa XP</h2><p class="muted">Empurrar "<b>${esc(clean(t))}</b>" pra <b>${dayTxt(due)}</b> custa <b>${cost} XP</b> (a próxima custa ${Math.min(cost * 2, R.C.RESCHED * R.RESCHED_CAP)}). Seu saldo: ${fmtN(bal)} XP. A 1ª da semana é grátis; prazo posto hoje muda hoje de graça.</p>`,
      [['no', 'CANCELAR'], ['pay', `PAGAR ${cost} XP`, 'pri']]);
    if (!r) return back(false);
  }
  const res = A.updateTask(id, { due, ...extra });
  if (res?.error) { sfx('error'); toast(esc(res.error), 'bad'); return back(false); }
  sfx('drop'); toast(`📅 ${esc(clean(t).slice(0, 40))} → <b>${dayTxt(due)}</b>${cost ? ` · −${cost} XP` : ''}`);
  return back(true);
}
