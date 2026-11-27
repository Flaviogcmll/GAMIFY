import { isCollapsed } from '../v3.js';
// SHOP — taverna (XP), mochila (comprou → usa com cronômetro), ferreiro (XP + gold), baú de ouro e registro.
// Regra de ouro da loja: COMPRE ANTES DE FAZER. Fez sem comprar? Paga depois com multa (R.DEBT_MULT).
import { S } from '../store.js';
import * as R from '../rules.js';
import { esc, today, fmtDM, fmtN, addDays, lightNow } from '../util.js';
import { segBar } from '../ui.js';
import { px } from '../icons.js';
import { tiles } from '../telas.js';

const kspr = (i, sheet = 'dungeon') => `<span class="kicon" style="background-image:url(assets/${sheet}.png);background-position:${-(i % 12) * 48}px ${-Math.floor(i / 12) * 48}px"></span>`;
const RAR_ICON = { comum: 113, raro: 116, epico: 115, lendario: 114 };
// v5.16: ícone de cada item: o do cadastro; sem ícone, um pelo nome; sem nada, o baú da raridade. (As artes do Higgsfield entram aqui depois.)
const NAME_ICON = [[/JOGO|GAME|CLASH/, '🎮'], [/BANHO/, '🛁'], [/FOLGA|F[ÉE]RIAS/, '🏖'], [/ANT[IÍ]DOTO/, '🧪'], [/SCROLL|CELULAR|INSTA/, '📱'], [/SONECA|COCHILO/, '😴'], [/V[ÍI]DEO|YOUTUBE|S[ÉE]RIE|MARATONA/, '📺'],
  [/DELIVERY|IFOOD|PEDIR/, '🛵'], [/SOBREMESA|DOCE|BOLO/, '🍰'], [/AULA|CURSO/, '🧠'], [/FILME|CINEMA/, '🍿'], [/DORMIR|ACORDAR/, '🛏'], [/WEED|ERVA/, '🌿'], [/TARDE|LIVRE|DESCANSO/, '🌴'], [/CAF[ÉE]/, '☕'], [/CERVEJA|BAR/, '🍺']];
const iconOf = (it) => it.icon || NAME_ICON.find(([re]) => re.test(it.name || ''))?.[1] || '';
const kTav = (it, m) => (iconOf(it) ? `<span class="eico">${iconOf(it)}</span>` : kspr(RAR_ICON[m.rarity.key] || 113));
const CAT_ICON = { EU: [101, 'dungeon'], PC: [130, 'dungeon'], MERCADO: [107, 'town'], CASA: [85, 'town'], ARQUITETURA: [117, 'dungeon'] };
const FER_ICON = { ARQUITETURA: '📐', CASA: '🏠', EU: '🪞', JOGOS: '🎮', MERCADO: '🧺', MOTO: '🏍', PC: '🖥' };
const kFer = (it) => (it.icon || FER_ICON[it.cat] ? `<span class="eico">${it.icon || FER_ICON[it.cat]}</span>` : (() => { const [i, sh] = CAT_ICON[it.cat] || [102, 'dungeon']; return kspr(i, sh); })());
// v7.4: SACOLA (era MOCHILA), CARTEIRA (era BAÚ DE OURO), NOTA FISCAL (era REGISTRO). As chaves internas não mudam.
const TABS = [['loja', '🎪 BARRACAS'], ['mochila', '🛍 SACOLA'], ['forjados', '⚒ FORJADOS'], ['ouro', '$ CARTEIRA'], ['hist', '🧾 NOTA FISCAL']];
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

function taverna(tot, shop) {
  const td = today(), offer = R.offerOfDay(S, td);
  const items = [...S.loja.taverna].sort((a, b) => a.xp - b.xp).map((it) => {
    const m = R.itemMeta(it), price = R.tavernaPrice(S, it, td), can = !shop.locked && tot.balance >= price;
    const n = R.timesBought(S, it.id), goal = S.loja.goal === it.id;
    return `<div class="item ${m.rarity.key} ${offer?.id === it.id ? 'offer' : ''} ${goal ? 'goal' : ''}">
      <span class="rar">${offer?.id === it.id ? 'OFERTA -30%' : m.rarity.name}</span>
      <div class="ic">${kTav(it, m)}</div><div class="in">${esc(it.name)}</div>
      <div class="ip">${fmtN(price)} XP${price !== it.xp ? `<s>${it.xp}</s>` : ''}</div>
      <div class="itags">${m.min ? `<span title="Ao usar, liga um cronômetro de ${m.min} minutos">⏱ ${m.min}m</span>` : ''}<span title="Ou pegue com ${R.ticketCost(it)} ticket(s), sem gastar XP">🎟 ${R.ticketCost(it)}</span>${n ? `<span title="Você já comprou ${n} vez(es)">×${n}</span>` : ''}${offer?.id === it.id ? `<span class="offer-why" title="${esc(R.offerWhy(S, td))}">🎁</span>` : ''}</div>
      ${R.neuroOn(S, 'calm') && R.boughtLast7(S, it.id, td) >= R.HABIT_BUY ? `<small class="warn" title="Habituação: o cérebro se acostuma com a mesma recompensa e ela perde o efeito">🔁 ${R.boughtLast7(S, it.id, td)}x em 7 dias: varie a recompensa</small>` : ''}
      ${goal && !can ? segBar(tot.balance / price, 'sm') : ''}
      <div class="ia">${can ? `<button class="btn sm pri" data-act="buy-now" data-id="${it.id}" title="Compra e já começa a aproveitar (liga o cronômetro, se tiver)">⚡ USAR AGORA</button><button class="btn sm" data-act="buy" data-id="${it.id}" title="Compra e guarda na SACOLA pra usar depois">🎒 SACOLA</button>` : `<button class="btn sm" disabled>${shop.locked ? 'TRANCADA' : `FALTA ${fmtN(price - tot.balance)}`}</button>`}
        ${tot.tickets >= R.ticketCost(it) && !shop.locked ? `<button class="btn sm" data-act="buy-ticket" data-id="${it.id}" title="Pegar com ${R.ticketCost(it)} ticket(s)">${R.ticketCost(it)}${px('ticket', 12)}</button>` : ''}
        <button class="icon-btn" data-act="shop-goal" data-id="${it.id}" title="Marcar como meta">${goal ? '★' : '☆'}</button>
</div>
      <button class="link-btn" data-act="confess" data-id="${it.id}" title="Aproveitou sem comprar antes? Paga agora com multa de x${String(R.DEBT_MULT).replace('.', ',')}">fiz sem comprar</button></div>`;
  }).join('');
  const canM = !shop.locked && tot.balance >= R.C.MYSTERY;
  const myst = `<div class="item lendario"><span class="rar">SURPRESA</span><div class="ic">${kspr(92)}</div><div class="in">BAÚ MISTERIOSO</div><div class="ip" title="Sorteia 1 recompensa da ALQUIMISTA">${R.C.MYSTERY} XP</div>
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
  return `${bag.length ? `<div class="shop">${bag.map(card).join('')}</div>` : `<div class="card"><p>Sacola vazia. Compre na ALQUIMISTA antes de aproveitar: o prazer comprado tem outro gosto.</p></div>`}
    <div class="card" style="margin-top:16px"><header><h2>Usados recentemente</h2></header><div class="list">${used.map((p) => `<div class="li"><div class="lt">${esc(p.item)}<small>${fmtDM(p.usedAt || p.date)}${p.debt ? ' · 🧾 dívida x2' : ''}</small></div><span class="chip">${p.debt ? 'X2' : 'OK'}</span></div>`).join('') || '<div class="empty">nada ainda.</div>'}</div></div>`;
}

/** v7.7: as BARRACAS do FERREIRO são linhas simples (recolhem como os outros cartões), dentro do banner do FERREIRO */
function barracas(tot, shop, ui) {
  return S.loja.cats.filter((c) => S.loja.ferreiro.some((f) => f.cat === c)).map((c) => {
    const n = S.loja.ferreiro.filter((f) => f.cat === c), open = n.filter((f) => f.nv <= tot.level && !(S.loja.purchases.some((p) => p.kind === 'ferreiro' && p.itemId === f.id) && !f.repeat)).length;
    return `<div class="card barraca"><header><h2>${FER_ICON[c] || '⚒'} BARRACA ${esc(c)}</h2><span class="meta">${n.length} itens · ${open} no seu nível</span></header>${ferreiro(tot, shop, ui, c)}</div>`;
  }).join('');
}
/** itens do FERREIRO de UMA categoria (v7.4: cada categoria era uma banca; v7.7: uma BARRACA, numa linha) */
function ferreiro(tot, shop, ui, only) {
  const cats = S.loja.cats.filter((c) => S.loja.ferreiro.some((f) => f.cat === c));
  const cat = only || (cats.includes(ui.fcat) ? ui.fcat : cats[0]);
  const items = S.loja.ferreiro.filter((f) => f.cat === cat).sort((a, b) => a.nv - b.nv);
  const buys = S.loja.purchases.filter((p) => p.kind === 'ferreiro');
  return `${only ? '' : `<div class="pills fcats">${cats.map((c) => `<button class="pill ${c === cat ? 'on' : ''}" data-act="fcat" data-cat="${esc(c)}"><span>${FER_ICON[c] || '⚒'} ${esc(c)}</span></button>`).join('')}</div>`}
    <div class="shop">${items.map((it) => {
      const xp = R.ferreiroXp(it), locked = it.nv > tot.level, got = buys.filter((p) => p.itemId === it.id), bought = got.length && !it.repeat;
      const can = !locked && !bought && !shop.locked && tot.balance >= xp, m = R.itemMeta({ ...it, xp });
      return `<div class="item ${m.rarity.key} ${locked ? 'locked' : ''} ${bought ? 'bought' : ''}"><span class="rar">NV ${it.nv}</span>
        <div class="ic">${kFer(it)}</div><div class="in">${locked ? '🔒 ' : ''}${esc(it.name)}</div>
        <div class="ip" title="Forjar custa XP + o gold (o dinheiro de verdade)">${fmtN(xp)} XP</div>${bought ? `<div class="itags"><span class="good">✓ ${fmtDM(got[0].date)}</span></div>` : it.repeat && got.length ? `<div class="itags"><span title="Recorrente: dá pra forjar de novo">🔁 ×${got.length}</span></div>` : ''}
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

/** arquivo de tudo que já foi forjado (conquistas de verdade, compradas com XP + gold) */
function forjados() {
  const list = S.loja.purchases.filter((p) => p.kind === 'ferreiro').sort((a, b) => (a.date < b.date ? 1 : -1));
  const xp = list.reduce((a, p) => a + (p.xp || 0), 0), gold = list.reduce((a, p) => a + (p.gold || 0), 0);
  const catOf = (p) => S.loja.ferreiro.find((f) => f.id === p.itemId)?.cat || '';
  return `<div class="card" style="max-width:860px"><header><h2>⚒ Tudo que você já forjou</h2><span class="meta">${list.length} ${list.length === 1 ? 'item' : 'itens'} · ${fmtN(xp)} XP · ${fmtN(gold)} gold</span></header>
    <div class="list">${list.map((p) => `<div class="li"><div class="lt">⚒ ${esc(p.item)}<small>${fmtDM(p.date)}${catOf(p) ? ' · ' + esc(catOf(p)) : ''} · ${fmtN(p.xp || 0)} XP${p.gold ? ` · ${fmtN(p.gold)} gold` : ''}</small></div><span class="chip soon">FORJADO</span></div>`).join('') || '<div class="empty">nada forjado ainda. Vá ao FERREIRO: cada item daqui é uma conquista da vida real.</div>'}</div></div>`;
}
// v9.5 (pedido do dono): NOTA FISCAL como o ARQUIVO: recolhível por mês, ESVAZIAR junta os meses velhos numa linha e o ↺ chama DEVOLVER
function hist() {
  const list = [...S.loja.purchases].sort((a, b) => (a.date < b.date ? 1 : -1)), cur = today().slice(0, 7), months = [...new Set(list.map((p) => p.date.slice(0, 7)))];
  const row = (p) => `<div class="li"><div class="lt">${fmtDM(p.date)} · ${esc(p.item)}<small>${p.kind === 'resumo' ? `${p.n} compras juntadas` : p.kind}${p.tickets ? ` · ${p.tickets > 1 ? p.tickets + ' ' : ''}🎟` : ''}${p.xp ? ` · -${fmtN(p.xp)} XP` : ''}${p.gold ? ` · -${fmtN(p.gold)} ferro` : ''}${p.debt ? ' · fiado' : ''}${p.status ? ' · ' + p.status : ''}</small></div>
      ${p.kind === 'resumo' ? '' : `<button class="btn sm ghost" data-act="undo-buy" data-id="${p.id}" title="Devolver: o produto volta pra barraca e o XP/ferro/ticket volta pro bolso">↺ DEVOLVER</button>`}</div>`;
  return `<div class="card" style="max-width:860px"><header><h2>🧾 Nota fiscal</h2><span class="row" style="gap:6px"><span class="meta">${list.length} linhas</span><button class="btn sm" data-act="nf-esvaziar" title="Junta as compras já usadas dos meses que passaram numa linha por mês (o saldo não muda)">🧹 ESVAZIAR</button></span></header>
    ${months.map((m) => { const k = 'nf:' + m, shut = m === cur ? isCollapsed(k) : !isCollapsed('nf-open:' + m), items = list.filter((p) => p.date.startsWith(m)); return `<div class="nf-m"><h3 class="tg-h" data-act="collapse" data-k="${m === cur ? k : 'nf-open:' + m}"><span class="chev">${shut ? '▸' : '▾'}</span> ${m.slice(5)}/${m.slice(0, 4)} <small>${items.length}</small></h3>${shut ? '' : `<div class="list">${items.map(row).join('')}</div>`}</div>`; }).join('') || '<div class="empty">nenhuma compra.</div>'}</div>`;
}

export function viewShop(ui) {
  const tot = R.totals(S), shop = R.shopState(S), tab = TABS.some(([k]) => k === ui.ltab) ? ui.ltab : 'loja';
  const goalIt = S.loja.taverna.find((i) => i.id === S.loja.goal);
  const nb = R.bag(S).length, dn = lightNow() === 'noite' ? 'noite' : 'dia'; // v7.0: pela hora real
  const fx = shop.mult === 1 ? 'x1' : 'x' + shop.mult.toFixed(2).replace('.', ',');
  // v6: a FEIRA tem barracas (ALQUIMISTA em cima, FERREIRO embaixo), cada uma com o seu banner; outros vendedores entram aqui
  const vitrine = (key, title, sub, body) => { const ck = 'c:shop:' + key, shut = isCollapsed(ck); return `<section class="vitrine ${shut ? 'shut' : ''}" data-v="${key}"><header class="vit-h" data-act="collapse" data-k="${ck}" title="Toque pra recolher ou abrir" style="--img:url('${new URL(`assets/topo/${key === 'tav' ? 'shop' : 'ferreiro'}-${dn}.webp`, document.baseURI).href}')"><div><h2><span class="chev">${shut ? '▸' : '▾'}</span> ${title}</h2><p>${sub}</p></div></header>${shut ? '' : `<div class="vit-b">${body}</div>`}</section>`; };
  const body = tab === 'mochila' ? mochila() : tab === 'forjados' ? forjados() : tab === 'ouro' ? ouro() : tab === 'hist' ? hist()
    : vitrine('tav', '🧪 ALQUIMISTA', 'Os prazeres do dia a dia. Compre ANTES de aproveitar: vai pra SACOLA.', taverna(tot, shop))
      + vitrine('fer', '⚒ FERREIRO', 'Conquistas da vida real: XP + gold. Cada nível destrava itens novos. Uma BARRACA por categoria.', barracas(tot, shop, ui));
  const td7 = today(), days7 = Array.from({ length: 7 }, (_, i) => addDays(td7, -i)), xbd = R.idx(S).xpByDay;
  const week = { got: days7.reduce((a, d) => a + (xbd[d] || 0), 0), spent: (S.loja.purchases || []).filter((p) => days7.includes(p.date)).reduce((a, p) => a + (p.xp || 0), 0) };
  return `<div class="page-title"><div><h1><em>feira</em>.</h1></div></div>
    ${shop.locked ? `<div class="banner bad">🔒 Loja trancada: ${shop.overdue} tarefas atrasadas. Resolva ou remarque TODAS e ela abre. <a href="#agenda">ver prazos →</a></div>` : ''}
    ${tiles([
      { label: '📥 Ganho 7 dias', value: fmtN(week.got), tone: 'ok', tip: 'XP que você ganhou nos últimos 7 dias' },
      { label: '📤 Gasto 7 dias', value: fmtN(week.spent), tone: week.spent > week.got ? 'urg' : 'neutro', sub: week.got ? `${Math.round((week.spent / week.got) * 100)}% do ganho` : '', tip: 'XP gasto na FEIRA nos últimos 7 dias. Gastar menos do que ganha = saldo crescendo.' },
      { label: '✨ Saldo', value: fmtN(tot.balance), cls: 'gold', tone: 'premio', tip: 'XP pra gastar na ALQUIMISTA e no FERREIRO' },
      { label: '$ Gold', value: fmtN(tot.gold), cls: 'gold', tone: 'premio', tip: `Dinheiro de verdade que entrou (${fmtN(tot.goldIn)} no total). Usado no FERREIRO.` },
      { label: '🎟 Tickets', value: tot.tickets, cls: 'tk', tone: 'premio', tip: 'Cada ticket troca por um item da ALQUIMISTA sem gastar XP (itens caros pedem mais de um).' },
      { label: '📈 Preço hoje', value: fx, tone: shop.mult > 1 ? 'urg' : 'ok', tip: `Os preços acompanham o seu ritmo: índice x${shop.econ.toFixed(2).replace('.', ',')} (sua média de 14 dias)${shop.status.list.filter((x) => x.shop).map((x) => ' · ' + x.name).join('')}` },
      goalIt ? { label: '★ Meta', value: `<span class="lastm">${esc(goalIt.name)}</span>`, sub: segBar(tot.balance / R.tavernaPrice(S, goalIt), 'sm'), tone: 'premio', tip: 'O item que você está juntando XP pra comprar' } : { label: '★ Meta', value: '—', tone: 'neutro', tip: 'Toque na ☆ de um item pra marcar como meta' },
    ])}
    <div class="seg shoptabs" style="margin-bottom:16px">${TABS.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="ltab" data-tab="${k}">${n}${k === 'mochila' && nb ? ` (${nb})` : ''}</button>`).join('')}</div>
    ${body}`;
}
export { mmss };
