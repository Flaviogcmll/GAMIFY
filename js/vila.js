// v9.9 (pedido do dono: "os personagens precisam parecer vivos, como um jogo mesmo"): A VILA REAGE.
// Quando você faz alguma coisa, alguém do BARRANCO BAIXO aparece num balãozinho no canto e comenta (com a voz dele):
//  SAPO 🐸 = FROG LIPÊ · ⭐ chata = MEGG · dinheiro = EVE LÃ · casa 🛡 = TIA MIA · bloco fechado = BOI NILTON · boss = PRIMO ·
//  hábito = os CUMPADIS · e cada janela tem o seu morador (GERAL = BOI NILTON, TRABALHO = FROG, CAPTAÇÕES = ROSEMIA, GESTÃO = CAJULINA).
// De vez em quando (sem você fazer nada) um morador comenta o estado da vila (a mesma fala do dono da aba, vozes.js).
// Regras pra não virar barulho: um balão por vez, some sozinho em 5 s, tocar = ouvir a voz; tarefa comum fala só às vezes;
// nada com "reduzir movimento"? (o balão aparece, só não pula). Desliga junto com os sons? Não: é texto. Desliga em PERKS → 🧠 (settings.neuro.vila).
import { S } from './store.js';
import * as R from './rules.js';
import { esc } from './util.js';
import { fig, NOMES } from './elenco.js';
import { voz } from './audio.js';
import { vozDaAba } from './vozes.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clean = (t) => String(t || '').replace(/\s*\(\d+\s*XP\)/i, '').replace(/^\s*(↳|>|⚔)\s*/, '').replace(/[⭐🛡💰]/g, '').trim();
const short = (t) => { const c = clean(t); return c.length > 34 ? c.slice(0, 32) + '…' : c; };

const LINES = {
  sapo: ['frog-lipe', 2, (t) => [`Ribbit! Engoliu o SAPO "${short(t)}". O resto do dia desce que é uma beleza.`, `Sapo engolido, sô! Esse era o que pesava.`, `"${short(t)}" já era. Tô orgulhoso, ribbit.`]],
  chata: ['megg', 2, (t) => [`Tá no livro: tarefa chata vale dobro. "${short(t)}" pagou bonito.`, `Fez a chata! Regra é regra: x2 pra você, meu filho.`, `Ninguém gosta de fazer "${short(t)}". Você fez. Anotado.`]],
  dinheiro: ['eve-la', 1, (t) => [`Trem que dá dinheiro feito! Vou anotar no caderninho.`, `"${short(t)}" pronto? Dinheiro na mão, calcinha no varal, sô!`, `Conta certa, amizade longa. Bom serviço.`]],
  casa: ['tia-mia', 2, (t) => [`Casa em ordem é alma em paz, meu fio.`, `"${short(t)}" feito. Agora senta e toma um café.`, `Devagar e sempre. A casa agradece.`]],
  bloco: ['boi-nilton', 3, (t) => [`OBRA ENTREGUE! "${short(t)}" fechado, sô. Bora pra próxima.`, `Bloco fechado é parede de pé. Muuuito bem.`, `Fechou "${short(t)}"! Até o galpão ficou mais bonito.`]],
  boss: ['primo', 3, (t) => [`DERRUBOU O BOSS! "${short(t)}" caiu! O BARRANCO BAIXO inteiro tá falando de você.`, `Boss no chão, primo! Hoje tem festa na varanda.`]],
  habito: ['cumpadi', 3, () => [`Isso aí, cumpadi! Hábito feito é semente plantada.`, `Mais um dia na roça. A plantação agradece.`, `Feito! A gente repara quando você cuida de si.`]],
  bd: ['boi-nilton', 2, (t) => [`Mais um tijolo na obra: "${short(t)}".`, `Trabalho bem feito, sô. Pode por na conta.`]],
  tr: ['frog-lipe', 1, (t) => [`Ferro batido! "${short(t)}" saiu da bigorna.`, `Bom serviço na forja, ribbit.`]],
  cap: ['rosemia', 2, (t) => [`As cartas já sabiam: "${short(t)}" ia sair hoje.`, `Captação feita. O futuro gostou disso, menino.`]],
  gs: ['cajulina', 2, (t) => [`Carimbado e arquivado: "${short(t)}".`, `Papelada em dia é paz no cartório.`]],
  comum: ['primo', 1, (t) => [`Feito! "${short(t)}" saiu da lista.`, `Bão demais! Uma a menos.`, `Isso, primo. Uma de cada vez.`]],
};
const on = () => R.neuroOn ? R.neuroOn(S, 'vila') !== false : true;
let last = 0, timer = 0;

/** mostra um morador falando no cantinho (um por vez) */
export function bark(who, pose, text, force = false) {
  if (!S.core || (!force && Date.now() - last < 12000)) return;
  last = Date.now();
  let el = document.getElementById('vila-bark');
  if (!el) { el = document.createElement('button'); el.id = 'vila-bark'; el.type = 'button'; document.body.appendChild(el); el.addEventListener('click', () => { voz(el.dataset.who); el.classList.remove('on'); }); }
  el.dataset.who = who;
  el.innerHTML = `${fig(who, pose, 'vb-art', '', false)}<span class="vb-say"><b>${esc(NOMES[who] || who.toUpperCase())}</b> ${esc(text)}</span>`;
  el.title = 'Toque pra ouvir';
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  clearTimeout(timer); timer = setTimeout(() => el.classList.remove('on'), 5200);
}

/** chamado no onFeedback (depois de cada ação): escolhe quem comenta */
export function vilaReage(fb) {
  if (!on() || !fb) return;
  let k = null, txt = '';
  if (fb.boss) { k = 'boss'; txt = fb.boss.text; }
  else if (fb.closedBlock) { k = 'bloco'; txt = fb.closedBlock.title; }
  else if (fb.task && fb.xp > 0) {
    const t = fb.task, b = t.block && R.findBlock(S, t.block);
    k = t.prio ? 'sapo' : /⭐/.test(t.text) ? 'chata' : /💰/.test(t.text) ? 'dinheiro' : /🛡/.test(t.text) ? 'casa' : null;
    if (!k) { if (Math.random() > 0.4) return; k = b && LINES[b.group] ? b.group : 'comum'; }
    txt = t.text;
  } else if (fb.habit) { if (Math.random() > 0.5) return; k = 'habito'; }
  if (!k) return;
  const [who, pose, lines] = LINES[k];
  setTimeout(() => bark(who, pose, pick(lines(txt)), ['boss', 'bloco', 'sapo'].includes(k)), 650);
}

/** de vez em quando, sem você fazer nada, um morador comenta o estado da vila */
const ABAS = ['survival', 'agenda', 'shop', 'conquistas', 'arquivo', 'regras'];
export function vilaViva() {
  setInterval(() => {
    if (!on() || document.hidden || document.querySelector('.overlay') || Date.now() - last < 150000) return;
    const v = vozDaAba(pick(ABAS)); if (v) bark(v.who, 1, v.text);
  }, 60000);
}
