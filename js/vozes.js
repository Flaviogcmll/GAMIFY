// v9.6 (guia de interface 10.5): CADA ABA TEM UM DONO QUE FALA. O personagem do banner comenta o estado de verdade do seu jogo,
// com humor seco e mineirês leve (nunca nojento, nunca cobrança pesada). O PRIMO continua no banner, mas quem fala é o dono do lugar.
import { S } from './store.js';
import * as R from './rules.js';
import { today, addDays, fmtN } from './util.js';
import { NOMES, ANFITRIAO, sorte } from './elenco.js';

const pl = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const FALA = {
  survival: () => { const m = S.marks?.days?.[today()]?.h || {}, falta = (S.core.habits || []).filter((h) => !m[h.id]).length;
    return falta ? sorte([`Faltam ${pl(falta, 'hábito', 'hábitos')} hoje. A gente ajuda, um de cada vez.`, `Piu! ${pl(falta, 'hábito', 'hábitos')} esperando. Devagarinho chega.`]) : sorte(['Hábito tudo marcado hoje. Piu piu!', 'Roça em dia. Pode tomar um café sossegado.']); },
  agenda: () => { const td = today(), open = R.openTasks(S).filter((t) => !t.mother && t.due), late = open.filter((t) => t.due < td).length, sem = open.filter((t) => t.due >= td && t.due <= addDays(td, 7)).length;
    return late ? sorte([`Tem ${pl(late, 'coisa', 'coisas')} que já passou da hora, menino. A bola de cristal não mente.`, `As cartas mostram ${pl(late, 'atraso', 'atrasos')}. Resolve um que o resto anda.`]) : sorte([`As cartas mostram ${pl(sem, 'prazo', 'prazos')} nos próximos 7 dias.`, `Vejo uma semana com ${pl(sem, 'prazo', 'prazos')}... e nenhum atraso. Boa sorte, viu?`]); },
  shop: () => { const tot = R.totals(S); return S.core.shopLock ? 'Hoje a porta tá fechada, sô: resolve as atrasadas que eu abro.' : sorte([`Tá com ${fmtN(tot.balance)} de XP no bolso. Escolhe com calma, que aqui é feira de confiança.`, 'Não gostou? Pode DEVOLVER. Aqui ninguém fica no prejuízo.', 'O mesmo prêmio duas vezes no dia sai mais caro, viu? Prazer repetido cansa.']); },
  ferreiro: () => { const tot = R.totals(S); return sorte([`Calma, calabreso. Forjar gasta FERRO, e você tem ${fmtN(tot.gold)}.`, 'Ferro é raro. O que sai daqui é pra vida inteira.', 'Croac. Engole esse sapo, junta o ferro e volta aqui.']); },
  conquistas: () => { const l = R.achievementList(S), got = l.filter((a) => a.unlocked).length; return sorte([`${got} de ${l.length} troféus pendurados. Ainda tem parede.`, 'Troféu não cai do céu não, sô. Cada um aqui foi suor.', `Mais ${l.length - got} pra pendurar. Bora levantar essa parede.`]); },
  arquivo: () => { const n = Object.values(S.arq || {}).reduce((a, m) => a + (m.tasks || []).length, 0); return sorte([`Já carimbei ${fmtN(n)} coisas feitas. Tudo guardadinho no CARTÓRIO.`, 'Papel guardado é cabeça leve.', 'Tá tudo aqui, em ordem. Pode procurar.']); },
  filtro: () => { const n = R.openTasks(S).filter((t) => !t.mother).length; return `Peneirei tudo: ${pl(n, 'coisa', 'coisas')} em aberto. Escolhe uma.`; },
  regras: () => sorte(['Regra é regra, meu filho. Mas regra boa é a que você entende.', 'Lê com calma. O que não serve, a gente muda junto.', 'Tá tudo no livro. Até o que você esqueceu.']),
  domingo: () => sorte(['Senta aqui na varanda. Como foi a semana?', 'Devagar se vai ao longe, meu fio.']),
};
/** a fala do dono da aba: { who, nome, text } (ou null se a aba não tem dono) */
export function vozDaAba(key) {
  const h = ANFITRIAO[key], f = FALA[key];
  if (!h || !f) return null;
  try { return { who: h[0], nome: NOMES[h[0]] || '', text: f() }; } catch { return null; }
}
