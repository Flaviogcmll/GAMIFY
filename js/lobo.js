// v9.2 (guia de interface 10.4, resposta do dono 9A): O LOBO COMO TERMÔMETRO e a TELA DO ANTÍDOTO.
// Um cantinho fixo da tela com o lobo: tudo em dia = GUARANÁ calmo (cheirando o chão); TREM TRAPAIADO = emburrado (rosnando pra mosca);
// tarefa apodreceu = LAMBEHOMI. Do lado, um termômetro de 5 marcas (0 calmo … 4 LAMBEHOMI). Tocar = a janela do termômetro.
// ANTÍDOTO (todas as atrasadas resolvidas): a maior recompensa emocional do app. CAJULINA acha a receita, EVE LÃ faz a garrafada,
// o LAMBEHOMI vira GUARANÁ de novo. Aparece sozinha quando acontece e dá pra rever na janela do termômetro.
import { S } from './store.js';
import * as R from './rules.js';
import { esc } from './util.js';
import { openModal, closeModal } from './ui.js';
import { sfx, voz, somArq } from './audio.js';
import { fig } from './elenco.js';
import { confetti } from './fx.js';

/** 0 a 4: quanto a raiva subiu */
export function loboNivel() {
  const l = R.lobo(S), pg = R.praga(S);
  if (l.mood === 'lambehomi') return 4;
  if (l.mood === 'tregua') return 0;
  return Math.min(3, pg.phase || 0);
}
const POSE = { calmo: ['guarana', 4], tregua: ['guarana', 2], emburrado: ['guarana', 3], lambehomi: ['lambehomi', 4] };

/** o cantinho fixo (fica no body: atravessa as abas). Chamado depois de cada redesenho */
export function loboTermo() {
  let el = document.getElementById('lobo-termo');
  const l = S.core ? R.lobo(S) : null;
  if (!l?.on) { el?.remove(); return; }
  if (!el) { el = document.createElement('button'); el.id = 'lobo-termo'; el.type = 'button'; el.dataset.act = 'lobo-termo'; document.body.appendChild(el); }
  const n = loboNivel(), [who, pose] = POSE[l.mood] || POSE.calmo, key = `${l.mood}|${n}`;
  if (el.dataset.k === key) return;
  el.dataset.k = key; el.dataset.mood = l.mood; el.dataset.n = n;
  el.title = `${l.name} (${l.sub}): ${l.tip}`;
  el.setAttribute('aria-label', `Termômetro do lobo: ${l.name}, ${l.sub}`);
  el.innerHTML = `${fig(who, pose, 'lt-art')}<span class="lt-bar" aria-hidden="true">${[4, 3, 2, 1, 0].map((i) => `<i class="${i <= n ? 'on' : ''}" data-i="${i}"></i>`).join('')}</span>`;
}

/** a janela do termômetro: o que é, em que pé está, o que fazer */
export function openTermo() {
  const l = R.lobo(S), n = loboNivel(), pg = R.praga(S), c = l.curas || {};
  const [who, pose] = POSE[l.mood] || POSE.calmo;
  const passos = [['calmo', 'GUARANÁ calmo', 'tudo em dia'], ['e1', 'emburrado', 'tem TREM TRAPAIADO'], ['e2', 'rosnando', 'atrasando mais'], ['e3', 'se isolando', 'quase apodrecendo'], ['lambehomi', 'LAMBEHOMI', 'uma tarefa apodreceu']];
  openModal(`<div class="termo"><div class="termo-art" data-mood="${l.mood}">${fig(who, pose, '', l.name, true, 2)}</div>
    <div class="termo-txt"><h2>🌡 ${esc(l.name)} <small class="meta">${esc(l.sub)}</small></h2><p>${esc(l.tip)}</p>
      <ol class="termo-escala">${passos.map(([k, a, b], i) => `<li class="${i === n ? 'cur' : i < n ? 'past' : ''}"><b>${a}</b> <span class="meta">${b}</span></li>`).join('')}</ol>
      <p class="meta">${pg.list.length ? `Atrasadas agora: <b>${pg.list.length}</b>. Resolve TODAS e a CAJULINA e a EVE LÃ acham o ANTÍDOTO.` : 'Nenhuma atrasada. Trem bão.'} Curas até hoje: ${c.antidoto || 0} pelo ANTÍDOTO · ${c.noite || 0} pela PRAGA.</p></div></div>
    <div class="actions">${c.antidoto ? '<button class="btn" data-act="antidoto-ver">🧪 REVER O ANTÍDOTO</button>' : ''}${pg.list.length ? '<button class="btn" data-act="praga-pop">🧂 VER AS ATRASADAS</button>' : ''}<button class="btn pri" data-close>FECHAR</button></div>`, { wide: true });
  voz(who);
}

/** A TELA DO ANTÍDOTO: curta (uns 5 s), bonita, e só aparece quando acontece (ou quando você pede pra rever) */
export function antidotoScreen() {
  const m = openModal(`<div class="antidoto"><div class="ant-cena">
      <span class="ant-caj">${fig('cajulina', 2, '', 'CAJULINA achou a receita', false, 1)}</span>
      <span class="ant-lobo"><span class="ant-lb">${fig('lambehomi', 2, '', 'LAMBEHOMI', false, 1)}</span><span class="ant-gu">${fig('guarana', 2, '', 'GUARANÁ', false, 1)}</span></span>
      <span class="ant-eve">${fig('eve-la', 3, '', 'EVE LÃ fez a garrafada', false, 1)}</span>
      <span class="ant-garrafa" aria-hidden="true"></span>${Array.from({ length: 14 }, (_, i) => `<i class="ant-faisca" style="--i:${i}"></i>`).join('')}</div>
    <h2 class="ant-t">🧪 ANTÍDOTO!</h2>
    <p class="ant-p">Nenhuma atrasada. A <b>CAJULINA</b> achou a receita nos livros, a <b>EVE LÃ</b> fez a garrafada e o <b>LAMBEHOMI</b> voltou a ser <b>GUARANÁ</b>. A BRASINHA ficou com a gente. Trégua até amanhã.</p>
    <p class="meta ant-m">"Esse guaraná é Fanta." · ninguém fabrica atraso pra ganhar ponto: o prêmio é a paz</p></div>
    <div class="actions"><button class="btn pri" data-close>TRÉGUA ✓</button></div>`, { wide: true });
  m.classList.add('ant-modal');
  sfx('level'); somArq('k-sino', 0.5);
  setTimeout(() => voz('cajulina'), 500); setTimeout(() => voz('eve-la'), 1300); setTimeout(() => { voz('guarana'); try { confetti(); } catch { /* */ } }, 2300);
}

export function extendLobo(ACTIONS) {
  Object.assign(ACTIONS, {
    'lobo-termo': () => openTermo(),
    'lobo-info': () => openTermo(), // a linha do lobo no cartão do PRIMO abre a mesma janela (um jeito só)
    'antidoto-ver': () => { closeModal(); setTimeout(antidotoScreen, 60); },
  });
}
