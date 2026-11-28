// v9.9 (pedido do dono): PAGAMENTOS NO BLOCO. Bloco que mexe com dinheiro (marcador $ no título, ex. "PROJETO X 3000$")
// ganha o botão 💰: quanto vale no total, cada valor que já entrou (com data) e quanto falta. A EVE LÃ (que cuida do dinheiro na FEIRA) atende.
// Dados: b.pay = { total?: número (se vazio, vale o do título), got: [{ id, d, v }] }. Opcional: lançar o recebido também na CARTEIRA (A.addGold).
import { S } from './store.js';
import * as R from './rules.js';
import * as A from './actions.js';
import { esc, today, fmtDM, fmtN } from './util.js';
import { openModal, closeModal, toast } from './ui.js';
import { sfx } from './audio.js';
import { quem, sorte } from './elenco.js';

/** é bloco de dinheiro? ($ no título, valor no título, ou já tem pagamento anotado) */
export const isMoney = (b) => !!b && (/💰/.test(b.title) || R.projectValue(b.title) > 0 || !!b.pay);
/** v10.1 (pedido do dono: "tem pagamento que é MENSAL, tipo o da Fabiana"): bloco com "/ MES" no título (ex. "1900$ / MES DIA 05") é mensal */
export const isMonthly = (b) => /\/\s*M[EÊ]S/i.test(b?.title || '');
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesNome = (ym) => `${MES[+ym.slice(5) - 1]}/${ym.slice(2, 4)}`;
const ymAdd = (ym, n) => { const d = new Date(+ym.slice(0, 4), +ym.slice(5) - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
/** total, recebido e o que falta. Mensal: conta só o MÊS ATUAL (e devolve os últimos 6 meses pro histórico) */
export function payOf(b) {
  const all = [...(b?.pay?.got || [])].sort((a, z) => (a.d || '').localeCompare(z.d || '')), total = +b?.pay?.total || R.projectValue(b?.title || '') || 0;
  if (isMonthly(b)) {
    const ym = today().slice(0, 7), sumOf = (m) => all.filter((x) => (x.d || '').startsWith(m)).reduce((a, x) => a + (+x.v || 0), 0);
    const dom = +(/DIA\s*(\d{1,2})/i.exec(b.title)?.[1] || 0), got = sumOf(ym);
    const months = Array.from({ length: 6 }, (_, i) => ymAdd(ym, -i)).filter((m) => !b.created || m >= b.created.slice(0, 7) || sumOf(m)).map((m) => ({ m, nome: mesNome(m), got: sumOf(m) })); // só os meses desde que o bloco existe
    return { monthly: true, ym, mes: mesNome(ym), dom, total, got, left: Math.max(0, total - got), list: all.filter((x) => (x.d || '').startsWith(ym)), months, all };
  }
  const got = all.reduce((a, x) => a + (+x.v || 0), 0);
  return { total, got, left: Math.max(0, total - got), list: all };
}
/** o chip do cabeçalho do bloco: "$ 1.000/3.000" (verde quando quitou) */
export function payChip(b) {
  if (!isMoney(b)) return '';
  const p = payOf(b), ok = p.total && p.got >= p.total;
  return `<button class="chip pay ${ok ? 'ok' : ''}" data-act="pay-open" data-id="${b.id}" title="Pagamentos${p.monthly ? ` de ${p.mes} (mensal${p.dom ? ', dia ' + p.dom : ''})` : ''}: entrou $ ${fmtN(p.got)}${p.total ? ` de $ ${fmtN(p.total)} · falta $ ${fmtN(p.left)}` : ''}">$ ${fmtN(p.got)}${p.total ? '/' + fmtN(p.total) : ''}${p.monthly ? ' · ' + p.mes : ''}</button>`;
}

function payHtml(b) {
  const p = payOf(b), td = today(), pct = p.total ? Math.min(100, Math.round((p.got / p.total) * 100)) : 0;
  return `<div class="pay-box" data-id="${b.id}">${quem('eve-la', 2, sorte(['Dinheiro anotado é dinheiro que não some, sô.', 'Quanto já entrou e quanto falta? Eu anoto tudo no caderninho.', 'Conta certa, amizade longa.']))}
    <h2>💰 pagamentos <small class="meta">${esc(b.title)}</small></h2>
    ${p.monthly ? `<p class="pay-mensal">🔁 <b>MENSAL</b>${p.dom ? ` · vence dia <b>${p.dom}</b>` : ''} · contando só <b>${p.mes}</b></p>` : ''}
    <div class="pay-sum"><span><small>${p.monthly ? 'POR MÊS' : 'TOTAL'}</small><b>$ ${fmtN(p.total)}</b></span><span><small>ENTROU</small><b class="good">$ ${fmtN(p.got)}</b></span><span><small>FALTA</small><b class="${p.left ? 'bad' : 'good'}">$ ${fmtN(p.left)}</b></span></div>
    ${p.total ? `<div class="pay-bar"><i style="width:${pct}%"></i></div>` : ''}
    <label class="lbl" for="pay-total">Valor total <span class="meta">· vazio = o que está no título${R.projectValue(b.title) ? ` ($ ${fmtN(R.projectValue(b.title))})` : ''}</span></label>
    <div class="row"><input class="inp" id="pay-total" type="number" min="0" step="any" value="${esc(b.pay?.total || '')}" placeholder="${R.projectValue(b.title) || 'ex.: 3000'}" style="width:140px"><button type="button" class="btn sm" data-act="pay-total" data-id="${b.id}">SALVAR TOTAL</button></div>
    ${p.monthly ? `<label class="lbl">Últimos meses</label><div class="pay-meses">${p.months.map((x) => `<span class="${p.total && x.got >= p.total ? 'ok' : x.got ? 'meio' : x.m === p.ym ? '' : 'falta'}"><small>${x.nome}</small><b>${x.got ? '$ ' + fmtN(x.got) : '—'}</b></span>`).join('')}</div>` : ''}
    <label class="lbl">Recebidos${p.monthly ? ' em ' + p.mes : ''}</label>
    <div class="list">${p.list.map((x) => `<div class="li"><div class="lt">$ ${fmtN(x.v)}<small>${fmtDM(x.d)}</small></div><button type="button" class="icon-btn" data-act="pay-del" data-id="${b.id}" data-k="${x.id}" title="Apagar este recebido">✕</button></div>`).join('') || '<div class="empty">nada recebido ainda.</div>'}</div>
    <label class="lbl">+ Recebi</label>
    <div class="row"><input class="inp" id="pay-v" type="number" min="0" step="any" placeholder="valor" style="width:120px" data-kbd><input class="inp" id="pay-d" type="date" value="${td}" style="width:auto"><button type="button" class="btn pri sm" data-act="pay-add" data-id="${b.id}">ANOTAR</button></div>
    <label class="row" style="gap:6px;margin-top:6px"><input type="checkbox" id="pay-cart"> lançar também na CARTEIRA da FEIRA (ferro)</label>
    <div class="actions"><button type="button" class="btn" data-close>FECHAR</button></div></div>`;
}
export function openPay(id) { const b = R.findBlock(S, id); if (b) openModal(payHtml(b), { wide: true }); }
const redraw = (id) => { const m = document.querySelector('.modal .pay-box'); const b = R.findBlock(S, id); if (m && b) { m.outerHTML = payHtml(b); window.__deaccent?.(document.querySelector('.modal')); } };

export function extendPagamentos(ACTIONS) {
  Object.assign(ACTIONS, {
    'pay-open': (d) => { closeModal(); setTimeout(() => openPay(d.id), 30); },
    'pay-total': (d) => { const v = +document.getElementById('pay-total')?.value || 0; A.payTotal(d.id, v); sfx('tab'); redraw(d.id); },
    'pay-add': (d) => {
      const v = +document.getElementById('pay-v')?.value || 0, dt = document.getElementById('pay-d')?.value || today();
      if (!(v > 0)) { toast('Escreva o valor que entrou.'); return; }
      const b = R.findBlock(S, d.id);
      A.payAdd(d.id, v, dt);
      if (document.getElementById('pay-cart')?.checked) A.addGold({ date: dt, from: b?.title || '', amount: v, key: isMonthly(b) ? `${b.id}|${dt.slice(0, 7)}` : undefined });
      sfx('coin'); const p = payOf(R.findBlock(S, d.id));
      toast(`💰 Entrou $ ${fmtN(v)}${p.total ? ` · falta $ ${fmtN(p.left)}` : ''}${p.total && !p.left ? ' · QUITADO! 🎉' : ''}`, 'gold');
      redraw(d.id);
    },
    'pay-del': (d) => { A.payDel(d.id, d.k); sfx('tab'); redraw(d.id); },
  });
}
