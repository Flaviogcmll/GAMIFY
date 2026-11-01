// ÍCONES EM PIXEL ART — cada ícone é um desenho 10x10 em texto; vira SVG nítido (crispEdges).
// c = cor do texto (contorno) · a = óxido · o = laranja · y = amarelo · r = vermelho · g = ouro · b = prússia · G = verde · w = claro · n = madeira
const PAL = { a: '#8a4e2a', o: '#e8793a', y: '#f5c84c', r: '#a8323e', g: '#e0a82e', b: '#0f5552', G: '#6b6f4e', w: '#e6e0d6', n: '#8a5a2b', p: '#4b1e23' };
const ICONS = {
  quests: ['..cccccc..', '.cwwwwwwc.', '.cwccccwc.', '.cwwwwwwc.', '.cwcccwwc.', '.cwwwwwwc.', '.cwccccwc.', '.cwwwwwwc.', 'cccccccccc', '.c......c.'],
  survival: ['..........', '.cc...cc..', 'crrc.crrc.', 'crrrcrrrc.', 'crrrrrrrc.', '.crrrrrc..', '..crrrc...', '...crc....', '....c.....', '..........'],
  agenda: ['.c.....c..', 'cccccccccc', 'caaaaaaaac', 'cccccccccc', 'cw.w.w.w.c', 'c.........', 'cw.w.w.aac', 'c.......ac', 'cw.w.w.w.c', 'cccccccccc'],
  shop: ['...cccc...', '..c....c..', '..c....c..', 'cccccccccc', 'caaaaaaaac', 'caaaggaaac', 'caaaggaaac', 'caaaaaaaac', 'caaaaaaaac', 'cccccccccc'],
  domingo: ['..........', '.cccccccc.', 'cnnnnnnnnc', 'cnnnggnnnc', 'cccccccccc', 'cnnnggnnnc', 'cnnnnnnnnc', 'cnnnnnnnnc', 'cccccccccc', '..........'],
  conquistas: ['cccccccccc', 'cggggggggc', '.cggggggc.', '.cggwgggc.', '..cggggc..', '...cggc...', '....cc....', '...cggc...', '..cccccc..', '..........'],
  filtro: ['..cccc....', '.cwwwwc...', 'cwwwwwwc..', 'cwwwwwwc..', 'cwwwwwwc..', '.cwwwwc...', '..ccccc...', '......cc..', '.......cc.', '........cc'],
  rotina: ['..cccccc..', '.cwwwwwwc.', 'cwwwcwwwwc', 'cwwwcwwwwc', 'cwwwccccwc', 'cwwwwwwwwc', 'cwwwwwwwwc', '.cwwwwwwc.', '..cccccc..', '..........'],
  regras: ['.ccccccc..', 'cbbbbbbbc.', 'cbwwwwwbc.', 'cbbbbbbbc.', 'cbwwwwbbc.', 'cbbbbbbbc.', 'cbwwwwwbc.', 'cbbbbbbbc.', 'cwwwwwwwc.', '.ccccccc..'],
  arquivo: ['cccccccccc', 'cnnnnnnnnc', 'cccccccccc', '.cnnnnnnc.', '.cnnccnnc.', '.cnnnnnnc.', '.cnnnnnnc.', '.cnnnnnnc.', '.cccccccc.', '..........'],
  fire: ['....o.....', '...oo.....', '...ooo..o.', '..ooyoo.o.', '..oyyyooo.', '.ooyyyyoo.', '.oyywyyyo.', '.oyywwyyo.', '..oyyyyo..', '.nnnnnnnn.'],
  coin: ['..cccccc..', '.cggggggc.', 'cggyyygggc', 'cgygggyggc', 'cgygggyggc', 'cgygggyggc', 'cggyyygggc', '.cggggggc.', '..cccccc..', '..........'],
  ticket: ['..........', 'cccccccccc', 'cppppppppc', '.cpwwwwpc.', 'cpppppwppc', '.cpwwwwpc.', 'cppppppppc', 'cccccccccc', '..........', '..........'],
  sword: ['........cc', '.......cwc', '......cwc.', '.....cwc..', '.c..cwc...', '..ccwc....', '..ncc.....', '.nnc......', 'nn.c......', 'n.........'],
  feed: ['.cccccccc.', '.cwwwwwwc.', '.caaaaaac.', '.caaaaaac.', '.cwwwwwwc.', '.cwccccwc.', '.cwwwwwwc.', '.cwccwwwc.', '.cwwwwwwc.', '.cccccccc.'],
  sos: ['..cccccc..', '.crrwwrrc.', 'crrc..crrc', 'cwc....cwc', 'cwc....cwc', 'crrc..crrc', '.crrwwrrc.', '..cccccc..', '..........', '..........'],
  music: ['....ccccc.', '....c...c.', '....ccccc.', '....c...c.', '....c...c.', '.ccc..ccc.', 'cccc.cccc.', '.cc...cc..', '..........', '..........'],
  sun: ['....y.....', '.y..y..y..', '..yyyyy...', '.yyyyyyy..', 'yyyyyyyyy.', '.yyyyyyy..', '..yyyyy...', '.y..y..y..', '....y.....', '..........'],
  moon: ['...cccc...', '..cwwc....', '.cwwc.....', '.cwwc.....', '.cwwc.....', '.cwwwc....', '..cwwwcccc', '...cwwwwc.', '....cccc..', '..........'],
  chest: ['.cccccccc.', 'cnnnnnnnnc', 'cnngggnnnc', 'cccccccccc', 'cnnnggnnnc', 'cnnnnnnnnc', 'cnnnnnnnnc', 'cccccccccc', '..........', '..........'],
  potion: ['...cccc...', '....cc....', '...cwwc...', '..cwwwwc..', '.cGGGGGGc.', '.cGwGGGGc.', '.cGGGGGGc.', '..cGGGGc..', '...cccc...', '..........'],
  bag: ['...cccc...', '..c....c..', '.cnnnnnnc.', 'cnnnnnnnnc', 'cnnnggnnnc', 'cnnnggnnnc', 'cnnnnnnnnc', 'cnnnnnnnnc', '.cccccccc.', '..........'],
  hammer: ['.ccccc....', 'cwwwwwc...', 'cwwwwwc...', '.ccccnc...', '....cnc...', '....cnc...', '....cnc...', '....cnc...', '....cnc...', '....ccc...'],
};
const cache = {};
/** ícone pixel como string SVG; size em px (múltiplo de 10 fica perfeito) */
export function px(name, size = 20, title = '') {
  const key = name + size;
  if (cache[key]) return cache[key];
  const rows = ICONS[name];
  if (!rows) return '';
  let rects = '';
  rows.forEach((row, y) => {
    [...row.padEnd(10, '.').slice(0, 10)].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      const fill = ch === 'c' ? 'currentColor' : PAL[ch] || 'currentColor';
      rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${fill}"/>`;
    });
  });
  return (cache[key] = `<svg class="pxi" width="${size}" height="${size}" viewBox="0 0 10 10" aria-hidden="${title ? 'false' : 'true'}"${title ? ` role="img"><title>${title}</title>` : '>'}${rects}</svg>`);
}
