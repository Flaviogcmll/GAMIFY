// SHOP — taverna (XP), mochila (comprou → usa com cronômetro), ferreiro (XP + gold), baú de ouro e registro.
// Regra de ouro da loja: COMPRE ANTES DE FAZER. Fez sem comprar? Paga depois com multa x2.
import { S } from '../store.js';
import * as R from '../rules.js';
import { esc, today, fmtDM, fmtN } from '../util.js';
import { segBar } from '../ui.js';
import { px } from '../icons.js';

const kspr = (i, sheet = 'dungeon') => `<span class="kicon" style="background-image:url(assets/${sheet}.png);background-position:${-(i % 12) * 48}px ${-Math.floor(i / 12) * 48}px"></span>`;
const RAR_ICON = { comum: 113, raro: 116, epico: 115, lendario: 114 };
const kTav = (it, m) => (/ANT[IÍ]DOTO/i.test(it.name) ? kspr(114) : kspr(RAR_ICON[m.rarity.key] || 113));
const CAT_ICON = { EU: [101, 'dungeon'], PC: [130, 'dungeon'], MERCADO: [107, 'town'], CASA: [85, 'town'], ARQUITETURA: [117, 'dungeon'] };
const kFer = (it) => { const [i, sh] = CAT_ICON[it.cat] || [102, 'dungeon']; return kspr(i, sh); };
const TABS = [['taverna', 'TAVERNA'], ['mochila', 'MOCHILA'], ['ferreiro', 'FERREIRO'], ['ouro', 'BAÚ DE OURO'], ['hist', 'REGISTRO']];
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

function taverna(tot, shop) {
  const td = today(), offer = R.offerOfDay(S, td);
  const items = [...S.loja.taverna].sort((a, b) => a.xp - b.xp).map((it) => {
    const m = R.itemMeta(it), price = R.tavernaPrice(S, it, td), can = !shop.locked && tot.balance >= price;
    const n = R.timesBought(S, it.id), goal = S.loja.goal === it.id;
    return `<div class="item ${m.rarity.key} ${offer?.id === it.id ? 'offer' : ''} ${goal ? 'goal' : ''}">
      <span class="rar">${offer?.id === it.id ? 'OFERTA -30%' : m.rarity.name}</span>
      <div class="ic">${kTav(it, m)}</div><div class="in">${m.icon} ${esc(it.name)}</div>
      <div class="ip">${fmtN(price)} XP${price !== it.xp ? `<s>${it.xp}</s>` : ''}</div>
      ${offer?.id === it.id ? `<small class="why">🎁 ${esc(R.offerWhy(S, td))}</small>` : ''}
      <small class="dim">${m.min ? `⏱ ${m.min} min · ` : ''}${R.ticketCost(it)}🎟 · ${n ? `comprei ${n}x` : 'nunca comprei'}</small>
      ${goal && !can ? segBar(tot.balance / price, 'sm') : ''}
      <div class="ia"><button class="btn sm ${can ? 'pri' : ''}" data-act="buy" data-id="${it.id}" ${can ? '' : 'disabled'}>${can ? 'COMPRAR' : shop.locked ? 'TRANCADA' : `FALTA ${fmtN(price - tot.balance)}`}</button>
        ${tot.tickets >= R.ticketCost(it) && !shop.locked ? `<button class="btn sm" data-act="buy-ticket" data-id="${it.id}" title="Pegar com ${R.ticketCost(it)} ticket(s)">${R.ticketCost(it)}${px('ticket', 12)}</button>` : ''}
        <button class="icon-btn" data-act="shop-goal" data-id="${it.id}" title="Marcar como meta">${goal ? '★' : '☆'}</button>
</div>
      <button class="link-btn" data-act="confess" data-id="${it.id}">fiz sem comprar (x2)</button></div>`;
  }).join('');
  const canM = !shop.locked && tot.balance >= R.C.MYSTERY;
  const myst = `<div class="item lendario"><span class="rar">SURPRESA</span><div class="ic">${kspr(92)}</div><div class="in">BAÚ MISTERIOSO</div><div class="ip">${R.C.MYSTERY} XP</div><small class="dim">sorteia 1 recompensa da taverna</small>
    <div class="ia"><button class="btn sm ${canM ? 'pri' : ''}" data-act="mystery" ${canM ? '' : 'disabled'}>ABRIR</button>${tot.tickets > 0 && !shop.locked ? `<button class="btn sm" data-act="mystery-ticket">${px('ticket', 12)}</button>` : ''}</div></div>`;
  return `<div class="shop">${myst}${items}</div>`;
}

function mochila() {
  const now = Date.now();
  const bag = R.bag(S).sort((a, b) => (a.status === 'using' ? -1 : 1) - (b.status === 'using' ? -1 : 1));
  const used = S.loja.purchases.filter((p) => p.status === 'used').slice(-8).reverse();
  const card = (p) => {
    const it = S.loja.taverna.find((x) => x.id === p.itemId) || { name: p.item, xp: p.xp };
    const m = R.itemMeta(it);
    const using = p.status === 'using';
    return `<div class="item ${m.rarity.key}" ${using ? 'style="background:var(--accent-soft)"' : ''}><span class="rar">${p.kind === 'loot' ? 'LOOT' : p.kind === 'bau' ? 'BAÚ' : m.rarity.name}</span>
      <div class="ic">${m.icon}</div><div class="in">${esc(p.item)}</div>
      ${using ? `<div class="ip" data-countdown="${p.endsAt}">${mmss(p.endsAt - now)}</div>${segBar((p.endsAt - now) / (p.endsAt - p.startedAt), 'sm')}` : `<small class="dim">${m.min ? `⏱ ${m.min} min` : 'sem tempo'} · desde ${fmtDM(p.date)}</small>`}
      <div class="ia">${using ? `<button class="btn sm" data-act="finish-item" data-id="${p.id}">ENCERRAR</button>` : `<button class="btn sm pri" data-act="use-item" data-id="${p.id}">USAR AGORA</button>`}</div></div>`;
  };
  return `${bag.length ? `<div class="shop">${bag.map(card).join('')}</div>` : `<div class="card"><p>Mochila vazia. Compre na TAVERNA antes de aproveitar: o prazer comprado tem outro gosto.</p></div>`}
    <div class="card" style="margin-top:16px"><header><h2>Usados recentemente</h2></header><div class="list">${used.map((p) => `<div class="li"><div class="lt">${esc(p.item)}<small>${fmtDM(p.usedAt || p.date)}${p.debt ? ' · 🧾 dívida x2' : ''}</small></div><span class="chip">${p.debt ? 'X2' : 'OK'}</span></div>`).join('') || '<div class="empty">nada ainda.</div>'}</div></div>`;
}

function ferreiro(tot, shop, ui) {
  const cats = S.loja.cats.filter((c) => S.loja.ferreiro.some((f) => f.cat === c));
  const cat = cats.includes(ui.fcat) ? ui.fcat : cats[0];
  const items = S.loja.ferreiro.filter((f) => f.cat === cat).sort((a, b) => a.nv - b.nv);
  const buys = S.loja.purchases.filter((p) => p.kind === 'ferreiro');
  return `<div class="seg" style="margin-bottom:14px">${cats.map((c) => `<button class="${c === cat ? 'on' : ''}" data-act="fcat" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="shop">${items.map((it) => {
      const xp = R.ferreiroXp(it), locked = it.nv > tot.level, got = buys.filter((p) => p.itemId === it.id), bought = got.length && !it.repeat;
      const can = !locked && !bought && !shop.locked && tot.balance >= xp, m = R.itemMeta({ ...it, xp });
      return `<div class="item ${m.rarity.key} ${locked ? 'locked' : ''} ${bought ? 'bought' : ''}"><span class="rar">NV ${it.nv}</span>
        <div class="ic">${kFer(it)}</div><div class="in">${locked ? '🔒 ' : ''}${esc(it.name)}</div>
        <div class="ip">${fmtN(xp)} XP</div><small class="dim">${bought ? `✓ comprado ${fmtDM(got[0].date)}` : locked ? `trancado até o nível ${it.nv}` : it.repeat ? `recorrente · ${got.length}x` : '+ o gold (dinheiro real)'}</small>
        <div class="ia">${bought ? '' : `<button class="btn sm ${can ? 'pri' : ''}" data-act="forge" data-id="${it.id}" ${can ? '' : 'disabled'}>${locked ? 'NV ' + it.nv : can ? 'FORJAR' : shop.locked ? 'TRANCADA' : 'FALTA ' + fmtN(xp - tot.balance)}</button>`}
</div></div>`;
    }).join('')}
</div>`;
}

function ouro() {
  const list = [...S.loja.goldIn].sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = list.reduce((a, g) => a + (+g.amount || 0), 0);
  const prs = R.goldPrompts(S);
  return `<div class="grid"><div class="card c5"><header><h2>Registrar entrada</h2></header>
      ${prs.map((p) => `<div class="banner"><b>${esc(p.title)}</b><br>${esc(p.label)} → sua metade: <b>${fmtN(p.amount)}</b><div class="row" style="margin-top:8px"><button class="btn sm pri" data-act="gold-yes" data-key="${esc(p.key)}">RECEBI</button><button class="btn sm" data-act="gold-edit" data-key="${esc(p.key)}">OUTRO VALOR</button><button class="btn sm" data-act="gold-later" data-key="${esc(p.key)}">AINDA NÃO</button><button class="btn sm ghost" data-act="gold-never" data-key="${esc(p.key)}">NÃO VEM</button></div></div>`).join('')}
      <form data-form="gold" autocomplete="off"><label class="lbl" for="g-from">De onde (cliente / projeto)</label><input class="inp" id="g-from" name="from" required>
        <div class="row"><div class="grow"><label class="lbl" for="g-amount">Valor (R$ = gold)</label><input class="inp" id="g-amount" name="amount" type="number" min="1" required></div><div class="grow"><label class="lbl" for="g-date">Data</label><input class="inp" id="g-date" name="date" type="date" value="${today()}"></div></div>
        <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn pri">GUARDAR NO BAÚ</button></div></form>
      </div>
    <div class="card c7"><header><h2>Entradas</h2><span class="meta gold">total ${fmtN(total)}</span></header>
      <div class="list">${list.map((g) => `<div class="li"><div class="lt">${fmtDM(g.date)} · ${esc(g.from || '—')}</div><div class="row" style="flex-wrap:nowrap"><b class="gold num" style="font-size:9px">+${fmtN(g.amount)}</b><button class="icon-btn" data-act="del-gold" data-id="${g.id}" aria-label="Apagar">×</button></div></div>`).join('') || '<div class="empty">nenhuma entrada ainda.</div>'}</div></div></div>`;
}

function hist() {
  const list = [...S.loja.purchases].sort((a, b) => (a.date < b.date ? 1 : -1));
  return `<div class="card" style="max-width:860px"><header><h2>Registro de compras</h2><span class="meta">${list.length} compras</span></header>
    <div class="list">${list.map((p) => `<div class="li"><div class="lt">${fmtDM(p.date)} · ${esc(p.item)}<small>${p.kind}${p.tickets ? ' · 🎟' : p.xp ? ` · -${fmtN(p.xp)} XP` : ''}${p.gold ? ` · -${fmtN(p.gold)} gold` : ''}${p.debt ? ' · dívida x2' : ''}${p.status ? ' · ' + p.status : ''}</small></div>
      <button class="icon-btn" data-act="undo-buy" data-id="${p.id}" title="Desfazer">↺</button></div>`).join('') || '<div class="empty">nenhuma compra.</div>'}</div></div>`;
}

export function viewShop(ui) {
  const tot = R.totals(S), shop = R.shopState(S), tab = ui.ltab || 'taverna';
  const goalIt = S.loja.taverna.find((i) => i.id === S.loja.goal);
  const nb = R.bag(S).length;
  const body = tab === 'mochila' ? mochila() : tab === 'ferreiro' ? ferreiro(tot, shop, ui) : tab === 'ouro' ? ouro() : tab === 'hist' ? hist() : taverna(tot, shop);
  const fx = shop.mult === 1 ? 'x1' : 'x' + shop.mult.toFixed(2).replace('.', ',');
  return `<div class="page-title"><div><h1><em>shop</em>.</h1><p>${shop.locked ? '🔒 LOJA TRANCADA' : '🟢 LOJA ABERTA'} · NV ${tot.level}</p></div></div>
    ${shop.locked ? `<div class="banner bad">⏰ ATOLADO: ${shop.overdue} tarefas atrasadas. A loja abre quando você zerar as atrasadas (concluir ou remarcar). <a href="#agenda">ver prazos →</a></div>` : ''}
    <div class="stats">
      <div class="stat"><small>Saldo</small><b class="acc">${fmtN(tot.balance)}</b><span>XP</span></div>
      <div class="stat"><small>Gold</small><b class="gold">${fmtN(tot.gold)}</b><span>entrou ${fmtN(tot.goldIn)}</span></div>
      <div class="stat"><small>Tickets</small><b class="tk">${tot.tickets}</b><span>1 grátis cada</span></div>
      <div class="stat"><small>Preço hoje</small><b>${fx}</b><span>índice ×${shop.econ.toFixed(2).replace('.', ',')} (sua média de 14 dias)${shop.status.list.filter((x) => x.shop).map((x) => ' ' + x.icon).join('')}${shop.status.event?.type === 'happy' ? ' 🍺' : ''}</span></div>
      <div class="stat"><small>★ Meta</small>${goalIt ? `<b style="font-size:10px;line-height:1.4">${esc(goalIt.name)}</b>${segBar(tot.balance / R.tavernaPrice(S, goalIt), 'sm')}` : '<span>marque ☆ num item</span>'}</div>
    </div>
    <div class="seg" style="margin-bottom:16px">${TABS.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="ltab" data-tab="${k}">${n}${k === 'mochila' && nb ? ` (${nb})` : ''}</button>`).join('')}</div>
    ${body}`;
}
export { mmss };
