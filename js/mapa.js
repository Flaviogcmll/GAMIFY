// REFLEXÃO → DESCARREGAR A CABEÇA: rascunho que some sozinho em 2 dias (desatolar a cabeça).
// v8.6 (pedido do dono): o MAPA MENTAL saiu de vez (código, estilos e dados: migração `v8-mapa-off` apaga `core.mapa`).
import { S } from './store.js';
import * as A from './actions.js';
import { esc } from './util.js';
import { sfx } from './audio.js';

export function scratchCard() {
  const now = Date.now(), list = (S.core.scratch || []).filter((x) => now - x.at < A.SCRATCH_TTL).sort((a, b) => b.at - a.at);
  const left = (x) => { const h = Math.max(1, Math.round((A.SCRATCH_TTL - (now - x.at)) / 3600e3)); return h >= 24 ? `${Math.round(h / 24)}d` : `${h}h`; };
  return `<div class="card c12" data-gk="rascunho"><header><h2 title="Escreva o que está rodando na cabeça. Some sozinho em 2 dias: é só pra desatolar.">🫧 Descarregar a cabeça</h2></header>
    <form data-form="scratch" class="scratch-f" autocomplete="off"><textarea class="inp" name="text" rows="3" placeholder="escreva sem filtro… (Enter solta · Shift+Enter pula linha · some em 2 dias)" aria-label="Rascunho"></textarea><button class="btn pri">SOLTAR</button></form>
    ${list.length ? `<div class="scratch-l">${list.map((x) => `<div class="sn"><p>${esc(x.text)}</p><span class="sn-t" title="Some sozinho">⏳ ${left(x)}</span><button class="rx" data-act="scratch-del" data-id="${x.id}" title="Apagar agora" aria-label="Apagar">×</button></div>`).join('')}</div>` : ''}</div>`;
}

export function extendMapa(ACTIONS, FORMS) {
  // no rascunho, Enter solta e Shift+Enter pula linha
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.matches?.('form[data-form="scratch"] textarea')) { e.preventDefault(); e.target.closest('form').requestSubmit(); }
  });
  Object.assign(FORMS, { scratch: (f) => { const v = f.text.value.trim(); if (!v) return; f.text.value = ''; A.addScratch(v); sfx('swish'); } });
  Object.assign(ACTIONS, { 'scratch-del': (d) => { A.delScratch(d.id); sfx('tab'); } });
}
