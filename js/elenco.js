// v9.0 ELENCO: as artes aprovadas dos personagens (folhas do dono recortadas por tools/elenco_artes.py → assets/elenco/<nome>/<pose>.webp).
// Ainda não são as versões finais do Photoshop: quando chegarem, rode o script de novo (mesmos nomes) e troque a versão do sw.js.
// NUNCA espelhe as poses (transform: scaleX(-1)): os personagens têm lado fixo.
import { esc } from './util.js';

/** quantas poses cada um tem (na ordem da folha, da esquerda pra direita) */
export const POSES = { 'boi-nilton': 4, brasinha: 5, cajulina: 4, cumpadi: 8, 'eve-la': 4, 'frog-lipe': 4, guarana: 4, lambehomi: 4, megg: 4, primo: 4, rosemia: 4, 'tia-mia': 4, 'trem-1': 4, 'trem-2': 4, 'trem-3': 4 };
export const NOMES = { 'boi-nilton': 'BOI NILTON', brasinha: 'BRASINHA', cajulina: 'CAJULINA', cumpadi: 'CUMPADIS', 'eve-la': 'EVE LÃ', 'frog-lipe': 'FROG LIPÊ', guarana: 'GUARANÁ', lambehomi: 'LAMBEHOMI', megg: 'MEGG DE FÁTIMA', primo: 'PRIMO', rosemia: 'ROSEMIA', 'tia-mia': 'TIA MIA', 'trem-1': 'TREM FEI', 'trem-2': 'TREM CUSTOSO', 'trem-3': 'TREM TRAPAIADO' };
/** largura e altura de cada pose (1 pixel = 1 pixel de arte; tools/elenco_artes.py gera assets/elenco/elenco.json) */
export const SIZES = {"boi-nilton":[[87,130],[83,128],[89,130],[103,114]],"brasinha":[[48,44],[40,44],[50,60],[76,83],[135,115]],"cajulina":[[82,135],[70,135],[128,117],[89,138]],"cumpadi":[[94,94],[91,91],[88,92],[81,91],[79,79],[102,72],[83,92],[85,98]],"eve-la":[[92,151],[88,146],[79,152],[111,102]],"frog-lipe":[[90,140],[91,145],[86,147],[109,142]],"guarana":[[87,192],[74,192],[135,186],[87,127]],"lambehomi":[[82,197],[78,197],[129,197],[84,154]],"megg":[[105,127],[79,116],[94,116],[99,110]],"primo":[[91,125],[101,120],[79,126],[106,91]],"rosemia":[[100,144],[77,144],[88,143],[107,145]],"tia-mia":[[79,131],[76,132],[92,133],[108,102]],"trem-1":[[93,106],[86,113],[99,104],[94,109]],"trem-2":[[86,122],[87,133],[97,117],[107,132]],"trem-3":[[93,138],[90,149],[94,130],[104,132]]};
export const elencoSrc = (nome, pose = 1) => `assets/elenco/${nome}/${Math.min(POSES[nome] || 1, Math.max(1, pose))}.webp`;
/** a figura (<img>): cls muda o tamanho pelo CSS; title vira legenda */
/** k = escala INTEIRA (guia de arte: pixel nítido, nunca suavizado). O CSS pode limitar a altura nos lugares pequenos. */
export const fig = (nome, pose = 1, cls = '', title = '', voz = false, k = 1) => { const [w, h] = SIZES[nome]?.[Math.min(POSES[nome] || 1, Math.max(1, pose)) - 1] || [0, 0]; return `<img class="elenco ${cls}" ${w ? `width="${w * k}" height="${h * k}"` : ''} ${voz ? `data-act="voz" data-k="${nome}"` : ''} src="${elencoSrc(nome, pose)}" alt="${esc(title || NOMES[nome] || '')}" ${title ? `title="${esc(title)}"` : ''} loading="lazy" decoding="async" draggable="false">`; };

/** o dono de cada lugar (lore: FOLHINHA, CARTÓRIO, GALPÃO…): aparece no banner da aba, do lado do PRIMO */
export const ANFITRIAO = {
  survival: ['cumpadi', 7, 'os CUMPADIS da roça'], agenda: ['rosemia', 2, 'ROSEMIA lê o futuro da FOLHINHA'], shop: ['eve-la', 1, 'EVE LÃ, do BARZINHO'], ferreiro: ['frog-lipe', 1, 'FROG LIPÊ, o ferreiro'],
  conquistas: ['boi-nilton', 3, 'BOI NILTON cuida do GALPÃO DOS TROFÉUS'], filtro: ['cajulina', 2, 'CAJULINA peneira tudo'], arquivo: ['cajulina', 4, 'CAJULINA guarda tudo no CARTÓRIO'],
  rotina: ['tia-mia', 3, 'TIA MIA e a lida de todo dia'], regras: ['megg', 1, 'MEGG DE FÁTIMA, dona das REGRAS'], domingo: ['tia-mia', 2, 'TIA MIA na varanda'],
};
/** os TREM por nível (1 FEI · 2 CUSTOSO · 3 TRAPAIADO); a pose 4 é ele resolvido (desmontado) */
export const trem = (n, pose = 1, cls = '', title = '') => fig('trem-' + Math.min(3, Math.max(1, n)), pose, cls, title);

/** v9.0: banner recolhível (vitrine) com cenário e um personagem à direita. shut = recolhido (isCollapsed(k) de quem chama) */
export function vitrine({ k, v, title, sub = '', topo, host, shut, body, extra = '' }) {
  const img = new URL(topo, document.baseURI).href;
  return `<section class="vitrine elv ${shut ? 'shut' : ''}" data-v="${v}" id="v-${v}"><header class="vit-h" data-act="collapse" data-k="${k}" title="Toque pra recolher ou abrir" style="--img:url('${img}')"><div><h2><span class="chev">${shut ? '▸' : '▾'}</span> ${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${host ? `<span class="vit-host">${fig(host[0], host[1], '', host[2] || '', true)}</span>` : ''}${extra}</header>
    ${shut ? '' : `<div class="vit-b">${body}</div>`}</section>`;
}

/** v9.0: o que cada um fala quando você toca nele (tom mineiro, nunca nojento) */
export const FALAS = {
  primo: ['Bora, sô. Uma coisa de cada vez.', 'Trem bão é trem resolvido.', 'Tô de olho, uai.'],
  brasinha: ['Piu! (a BRASINHA esquentou um tiquinho)', 'Ela pula de alegria quando você resolve um trem.'],
  cajulina: ['Tudo carimbado e no lugar, viu?', 'Papel solto é TREM FEI esperando acontecer.'],
  rosemia: ['As cartas tão dizendo: faz hoje que amanhã tá cheio.', 'Vejo um prazo no seu futuro... e ele tá chegando.'],
  'tia-mia': ['Ritual é igual chá da tarde: todo dia, sem falta.', 'Devagar se vai ao longe, meu fio.'],
  'eve-la': ['Bééé. Cuidar de si também é tarefa, sô.', 'Uma água, um alongamento e segue o baile.'],
  'frog-lipe': ['Calma, calabreso.', 'Engole esse sapo e faz logo, uai.', 'Croac. Bora forjar um upgrade?'],
  'boi-nilton': ['Põe a mão na massa que o resto vem.', 'Troféu não cai do céu não, sô.'],
  megg: ['Regra é regra, meu filho.', 'Quem avisa amiga é.'],
  guarana: ['Tá tudo em dia? Então eu fico calminho.', 'Esse guaraná é Fanta.'],
  lambehomi: ['AUUUU... (tem trem apodrecendo por aí)'],
  cumpadi: ['Os CUMPADIS tão aqui pra ajudar!', 'Piu piu! Um passo de cada vez.'],
  'trem-1': ['TREM FEI: ainda dá tempo, mas não esquece de mim.'], 'trem-2': ['TREM CUSTOSO: vence já já, hein!'], 'trem-3': ['TREM TRAPAIADO: passei do prazo e tô fazendo bagunça!'],
};
