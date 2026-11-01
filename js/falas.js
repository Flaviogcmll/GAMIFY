// O QUE O PRIMO FALA — um banco grande de frases, cada uma com a expressão do rosto dele (neutro, feliz, animado, orgulhoso,
// cansado, dormindo, preocupado, bravo, surpreso, pensativo, debochado, apaixonado, triste, festa, enjoado, suspeito, piscada).
// Modelos: {n} {xp} {falta} {tarefa} {streak} {dias} {nome}. Nada se repete em sequência (guarda as últimas 60).
import { S } from './store.js';
import * as R from './rules.js';
import { today, weekday, fmtDM, hash } from './util.js';
import { pickSaber } from './saber.js';

const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
export const EXPRS = ['neutro', 'feliz', 'animado', 'orgulhoso', 'cansado', 'dormindo', 'preocupado', 'bravo', 'surpreso', 'pensativo', 'debochado', 'apaixonado', 'triste', 'festa', 'enjoado', 'suspeito', 'piscada'];

export const BANK = {
  manha: [
    ['feliz', 'Bom dia, primo! O café já tá passado e a fogueira, acesa.'], ['animado', 'Manhã é ouro! A tarefa mais chata cabe antes do almoço.'],
    ['cansado', 'Bom dia… me dá 5 minutinhos e uma xícara que eu viro gente.'], ['piscada', 'Acordou cedo, hein? Hoje o dia é nosso.'],
    ['pensativo', 'Qual vai ser a primeira pedra de hoje? Escolhe a menor e começa.'], ['orgulhoso', 'Já de pé e já pensando em produtividade. Tô orgulhoso de você.'],
    ['debochado', 'Bom dia! Ou "bom dia, deixa eu ver o celular antes de levantar", como diz o povo.'], ['neutro', 'Dia novo, placar zerado. Bora marcar o primeiro ponto?'],
    ['feliz', 'O sol bateu na janela e eu bati no despertador. Quem ganhou foi o sol.'], ['animado', 'Primeira tarefa feita antes das 10h vale ouro, prata e um café.'],
    ['surpreso', 'Opa, já acordado? Eu ainda tava terminando de sonhar com planta aprovada!'], ['suspeito', 'Tem alguma tarefa que você tá fingindo que não viu desde ontem? Eu vi.'],
    ['feliz', 'Respira fundo, bebe água e escolhe UMA coisa pra fechar até o almoço.'], ['piscada', 'Se começar agora, às 11h você já pode se achar o máximo.'],
  ],
  tarde: [
    ['neutro', 'Boa tarde! Metade do dia: dá tempo de virar o placar.'], ['animado', 'Tarde boa pra fechar pendência. Uma só já muda o dia.'],
    ['cansado', 'Bateu aquele soninho pós-almoço, né? Dez minutos de foco e passa.'], ['pensativo', 'Se o dia fosse um projeto, a gente tá na fase de detalhamento.'],
    ['debochado', 'A tarde é a hora em que a gente descobre que a manhã passou rápido, né?'], ['feliz', 'Cafezinho da tarde + uma tarefa de 15 minutos = combo perfeito.'],
    ['orgulhoso', 'Olha o que você já fez hoje! Dá pra confiar em você.'], ['preocupado', 'O relógio andou. Ainda dá tempo, mas bora não enrolar.'],
    ['suspeito', 'Tarde silenciosa demais… você não abriu o Instagram, abriu?'], ['piscada', 'Uma tarefa agora e o resto do dia vai leve.'],
    ['animado', 'Hora de ouro pra tarefa de cabeça! Depois das 16h eu desconto energia.'], ['neutro', 'Respira, estica as costas e escolhe a próxima.'],
  ],
  noite: [
    ['feliz', 'Fim de expediente. Que tal anotar 3 micro-vitórias do dia?'], ['neutro', 'A noite chegou. A fogueira tá boa pra planejar amanhã.'],
    ['cansado', 'Hoje o dia foi longo, mas você tá aqui. Isso já é uma vitória.'], ['pensativo', 'Qual foi a melhor coisa de hoje? Eu fico com o café da manhã.'],
    ['orgulhoso', 'Se parar agora, já deu pra se orgulhar. Se for mais um pouco, melhor ainda.'], ['piscada', 'Deixa amanhã organizado hoje e acorda com vantagem.'],
    ['apaixonado', 'Noite de fogueira é a minha favorita. Ficar aqui com você também.'], ['debochado', 'Noite é a hora de "só mais uma tarefa" virar quatro. Eu apoio.'],
    ['feliz', 'Antes de dormir: água, hábitos marcados e prazo de amanhã olhado. Só isso.'], ['preocupado', 'Cuidado pra não varar a noite, hein? Sono também é produtividade.'],
    ['neutro', 'Fecha o dia com calma. O que ficou pra trás, a gente remarca com carinho.'], ['festa', 'Acabou o dia! Hora de comemorar o que foi feito, pequeno ou grande.'],
  ],
  madrugada: [
    ['dormindo', 'zzz… amanhã a gente conquista mais um pedaço do mapa…'], ['dormindo', 'zzz… sonhei que o APÊ ficou pronto e tinha varanda…'],
    ['cansado', 'Madrugada, primo? Vai dormir. O reino precisa de você inteiro amanhã.'], ['dormindo', 'zzz… não é preguiça… é recarregar a bateria…'],
    ['surpreso', 'Ué, acordado a essa hora? Só se for pra ver estrela.'], ['cansado', 'Tô de olho fechado, mas ouvi o teclado. Dorme, primo.'],
    ['dormindo', 'zzz… ploft… hmm? a planta já saiu? zzz…'], ['preocupado', 'Sono atrasado cobra juros. E a taxa é alta.'],
    ['dormindo', 'zzz… cinco minutinhos… zzz…'], ['cansado', 'Quem dorme bem rende mais. Isso não é frase de calendário, é ciência.'],
  ],
  dia: [ // por dia da semana (0 = domingo)
    [['feliz', 'Domingo! O baú da semana tá esperando suas notas.'], ['neutro', 'Domingo é dia de olhar pra trás e escolher o que vem.'], ['apaixonado', 'Domingo bom é o que tem descanso e um pouquinho de planejamento.'], ['pensativo', 'Já escolheu as 3 pedras grandes da semana que vem?']],
    [['animado', 'Segunda: dia de escolher as 3 pedras grandes da semana.'], ['cansado', 'Segunda-feira… eu também preferia sábado, mas bora.'], ['piscada', 'Segunda começa de verdade quando a primeira tarefa fecha.'], ['orgulhoso', 'Quem começa a segunda organizado já ganhou metade da semana.']],
    [['animado', 'Terça é o dia mais produtivo da semana, dizem os estudos. Vamos provar?'], ['neutro', 'Terça: o entusiasmo da segunda acabou e a disciplina entrou.'], ['feliz', 'Terça! Já deu pra pegar o ritmo, né?'], ['piscada', 'Terça tem cara de dia de reunião e de projeto andando.']],
    [['pensativo', 'Quarta: meio da semana. O que já fechou? O que ainda dá tempo?'], ['neutro', 'Quarta é o domingo da produtividade: olha o que falta e ajusta.'], ['debochado', 'Quarta-feira, a montanha-russa na parte do meio.'], ['feliz', 'Metade da semana! Respira e confere os prazos.']],
    [['animado', 'Quinta: quase lá. Fecha as pendências antes que elas virem sexta-feira.'], ['neutro', 'Quinta é o dia de "ainda dá tempo".'], ['piscada', 'Quinta já tem cheiro de sexta. Mas sem pressa: primeiro as tarefas.'], ['orgulhoso', 'Quinta-feira bem usada é sexta-feira tranquila.']],
    [['festa', 'Sextou! Mas antes, fecha o que falta pra curtir o fim de semana de verdade.'], ['feliz', 'Sexta: dia de limpar a mesa e deixar a segunda leve.'], ['debochado', 'Sexta-feira: a hora em que todo mundo descobre prazo.'], ['piscada', 'Fecha as pendências e o sábado fica de brinde.']],
    [['feliz', 'Sábado! Descanso também é parte do treino.'], ['animado', 'Sábado é dia de aventura e de uma tarefa leve pra manter a corrente.'], ['apaixonado', 'Sábado bom tem sol, pão de queijo e zero reunião.'], ['neutro', 'Fim de semana: o bônus de lazer tá ligado. Aproveita.']],
  ],
  meta_zero: [
    ['neutro', 'A meta do dia é {meta} XP e a gente ainda tá no zero. Uma tarefa média resolve.'], ['pensativo', 'Placar zerado. Qual a menor tarefa que você consegue fechar em 10 minutos?'],
    ['piscada', 'Todo mundo começa em zero. A diferença é quem dá o primeiro passo.'], ['debochado', 'Placar do dia: PRIMO 0 × 0 você. Alguém vai marcar primeiro?'],
    ['animado', 'Faltam {falta} XP. Um passo, depois outro. É só isso.'], ['preocupado', 'Hoje ainda não pontuou. Bora antes que o dia escape?'],
    ['suspeito', 'Hmm, nenhuma tarefa ainda. Tá guardando energia pra algo grande?'], ['feliz', 'A primeira tarefa do dia é a mais difícil. Depois o corpo pega no tranco.'],
    ['cansado', 'Sei que tá difícil começar. Abre o arquivo e fica 2 minutos. Só 2.'], ['orgulhoso', 'Só de abrir o app você já fez mais que o "depois eu faço".'],
  ],
  meta_meio: [
    ['animado', 'Já fez {xp} XP hoje! Faltam {falta} pra meta.'], ['feliz', 'Tá andando! Metade do caminho é o mais difícil, a outra metade a gente carrega.'],
    ['piscada', 'Mais uma tarefa e a meta fica no bolso.'], ['orgulhoso', 'Olha o ritmo! Eu tava dormindo e você já pontuando.'],
    ['neutro', 'Faltam {falta} XP. Uma tarefa média resolve.'], ['pensativo', 'Se a próxima for do boss, rende em dobro. Só uma ideia.'],
    ['feliz', 'Não pare agora: com embalo a gente vai longe.'], ['animado', 'XP rolando. Dá pra sentir o cheiro de meta batida.'],
  ],
  meta_perto: [
    ['animado', 'Falta quase nada! {falta} XP e a meta cai.'], ['festa', 'Tá na reta final! Dá pra ouvir a torcida.'], ['piscada', 'Só uma tarefinha e eu te chamo de lenda do dia.'],
    ['orgulhoso', 'Falta pouco e você já tá com cara de quem bateu.'], ['feliz', 'Último esforço! Já já eu acendo as tochas da muralha.'], ['surpreso', 'Já?! Falta tão pouco que eu até me assustei.'],
    ['animado', 'A meta tá ali, olha! É só esticar o braço.'], ['neutro', 'Falta {falta}. Não pense: faça.'],
  ],
  meta_batida: [
    ['festa', 'META DO DIA BATIDA! {streak} dia(s) em chama. As tochas estão acesas por sua causa.'], ['orgulhoso', 'Meta batida. Daqui pra frente tudo é bônus.'],
    ['feliz', 'Bateu a meta! Se quiser descansar, tá liberado. Se quiser mais, eu cuido da fogueira.'], ['animado', 'Isso! {xp} XP hoje. Eu sabia que você ia conseguir.'],
    ['apaixonado', 'Dia perfeito pra se orgulhar. Eu tô aqui comemorando.'], ['piscada', 'Meta batida e ainda é cedo? Você é perigoso.'],
    ['festa', 'Placar final: PRIMO 1 × 0 procrastinação!'], ['orgulhoso', 'Um dia de cada vez, e hoje foi dos bons.'],
    ['surpreso', 'Eita! Já bateu a meta? Vou pegar uma pipoca e assistir você continuar.'], ['feliz', 'Parabéns! Agora uma água, um alongamento e, se quiser, mais uma tarefa.'],
    ['debochado', 'Quem diria, hein? O mesmo primo que "ia fazer depois" hoje já fez.'], ['festa', 'Gol! Torcida em pé, bateria tocando, fogueira a todo vapor.'],
  ],
  sequencia: [
    ['orgulhoso', '{streak} dias seguidos batendo a meta. Isso é hábito virando identidade.'], ['festa', 'Sequência de {streak} dias! A corrente tá linda, não quebra.'],
    ['animado', '{streak} dias em chama. Cada dia é um tijolo na muralha.'], ['piscada', 'Sequência é tipo planta: se regar todo dia, vira árvore.'],
    ['feliz', 'Com {streak} dias de chama, a fogueira nem precisa de lenha extra.'], ['pensativo', 'A sequência não é o objetivo, é o sinal de que o sistema funciona.'],
  ],
  tarefa: [
    ['feliz', 'Mais uma! +{xp} XP no bolso.'], ['animado', 'Feito! Isso aí é a diferença entre querer e fazer.'], ['orgulhoso', 'Tarefa fechada. Pode riscar, pode comemorar.'],
    ['piscada', 'Uma a menos na lista. A lista que se cuide.'], ['festa', 'Isso! Mais um tijolo na parede.'], ['debochado', 'Olha só, a tarefa que tava te olhando de canto agora tá riscada.'],
    ['feliz', '+{xp} XP! Eu tô até com vergonha de tanto orgulho.'], ['surpreso', 'Já terminou? Eu mal levantei pra pegar água!'],
    ['neutro', 'Fechou. Respira e escolhe a próxima.'], ['apaixonado', 'É por isso que eu gosto de você, primo. Fecha o que começa.'],
    ['animado', 'Isso aí! Com esse ritmo, a meta cai antes do jantar.'], ['orgulhoso', 'Missão cumprida. Guarda esse gostinho pra próxima.'],
    ['piscada', 'Tarefa feita é tarefa que não volta pra assombrar à noite.'], ['festa', 'Concluída! E dá pra ouvir o som da moedinha!'],
  ],
  tarefa_grande: [
    ['festa', 'ISSO! Tarefa pesada derrubada. +{xp} XP!'], ['orgulhoso', 'Essa era das grandes, hein? Tô até me abanando de emoção.'], ['surpreso', 'Eita! Você derrubou aquele trem enorme!'],
    ['animado', 'Peso pesado no chão! O resto do dia agora é só ladeira.'], ['apaixonado', 'Eu sabia que você tinha essa força toda escondida.'], ['festa', 'Isso é o que eu chamo de arquiteto de resultado!'],
    ['orgulhoso', 'Tarefa dura, resultado bonito. Guarda essa foto mental.'], ['piscada', 'Se tem coisa que dá gosto, é fechar uma chata. Parabéns!'],
  ],
  tarefa_no_prazo: [
    ['orgulhoso', 'No prazo! Isso é ser profissional.'], ['feliz', 'Entregou no dia certo. Bônus de pontualidade garantido.'], ['piscada', 'Prazo cumprido, reputação intacta.'],
    ['animado', 'Pontualidade é a elegância dos organizados!'], ['festa', 'No prazo e sem drama. Esse é o jeito.'], ['neutro', 'Prazo bateu, tarefa fechou. Casadinho perfeito.'],
  ],
  atrasada_feita: [
    ['neutro', 'Fechou, mesmo atrasada. XP menor, mas tirou o peso das costas.'], ['pensativo', 'Atrasada, mas concluída. Na próxima, põe um prazo que caiba.'], ['cansado', 'Pelo menos acabou. Bora aprender a estimar melhor?'],
    ['debochado', 'Entregou depois do prazo... mas entregou! O XP reclamou, mas passou.'], ['feliz', 'Melhor tarde do que nunca, só que cobra desconto de XP.'], ['preocupado', 'Fechou com atraso. Combina uma data mais realista da próxima vez?'],
  ],
  atrasadas: [
    ['preocupado', 'Tem {n} tarefa(s) atrasada(s). Resolve a menor primeiro.'], ['pensativo', 'Atrasada pesa na cabeça mais do que pesaria feita.'], ['suspeito', 'Aquela tarefa atrasada tá me olhando torto. Vai lá resolver?'],
    ['neutro', 'Atrasada é só uma tarefa com mais pressa. Dá pra fechar ou quebrar em pedaços.'], ['cansado', 'Sei que dá preguiça. Faz só 10 minutos dela e vê como vai.'], ['bravo', 'Prazo é compromisso com o seu eu do futuro, primo!'],
  ],
  atrasadas_muitas: [
    ['preocupado', 'Temos {n} atrasadas e a taverna trancou. Bora limpar uma agora? A menor primeiro.'], ['bravo', '{n} tarefas passaram do prazo. A gente precisa conversar.'],
    ['triste', 'Tô triste vendo {n} atrasadas. Quebra uma em passos pequenos que eu ajudo.'], ['suspeito', 'Isso aqui virou um cemitério de prazos. Vamos ressuscitar um por um?'],
    ['preocupado', 'Remarcar custa XP, atrasar tira XP. O melhor é fechar. Começa pela menor.'], ['cansado', 'Acúmulo dá cansaço. Uma por vez e a pilha desce.'],
  ],
  remarcou: [
    ['suspeito', 'Remarcou, é? Deu {xp} XP de pedágio. O prazo foi realista da próxima vez?'], ['pensativo', 'Remarcar custa porque prazo é palavra dada. Põe uma data que dê pra cumprir.'],
    ['neutro', 'Prazo novo registrado. Foram {xp} XP. Respira e dessa vez cumpre.'], ['debochado', 'Mais uma remarcação, mais um pedágio. A estrada do prazo é cara.'],
    ['preocupado', 'Cuidado: cada remarcação da mesma tarefa fica mais cara.'], ['triste', 'Remarcou. Tá tudo bem, mas a próxima custa mais. Bora cumprir?'],
  ],
  sem_prazo: [
    ['pensativo', 'Sem data não é missão, é desejo. Põe um prazo nela.'], ['piscada', 'Tarefa sem prazo é tarefa que vira "um dia". Coloca data!'], ['neutro', 'Se você dá prazo, eu te dou bônus de pontualidade.'],
    ['suspeito', 'Tem tarefa solta por aí sem prazo… dá pra organizar.'],
  ],
  habito_feito: [
    ['feliz', 'Hábito marcado! Energia subindo.'], ['animado', 'Isso! Constância vale mais que intensidade.'], ['orgulhoso', 'Mais um dia mantendo o combo.'], ['piscada', 'Hábito feito é investimento sem juros.'],
    ['festa', 'Todos os hábitos de hoje! DIA PERFEITO!'], ['apaixonado', 'Cuidar de si é a tarefa mais bonita da lista.'],
  ],
  habitos: [
    ['preocupado', 'Ainda falta {tarefa} hoje. Marca lá no SURVIVAL que eu ganho energia.'], ['pensativo', 'Hábito é aquele amigo que a gente só valoriza quando falta.'], ['neutro', 'Se der, marca um hábito agora. Leva 10 segundos.'],
    ['cansado', 'Quando o corpo pede, é pra escutar. Descanso também é hábito.'], ['piscada', 'Água, movimento e sono: a trilogia clássica.'],
  ],
  boss: [
    ['festa', 'BOSS DERROTADO! Isso vai pra história do reino!'], ['surpreso', 'Eita, caiu o bichão! Eu nem acreditei.'], ['orgulhoso', 'Você derrubou um boss. Eu tô de joelhos.'],
    ['animado', 'Quanto mais forte o boss, mais gostosa a vitória. Esse foi lendário!'], ['apaixonado', 'Eu sempre soube que você ia derrubar esse. Sempre.'], ['festa', 'Fogos! Tambor! Torcida! O boss caiu!'],
  ],
  compra: [
    ['feliz', 'Compra feita! Aproveita sem culpa, você ganhou.'], ['piscada', 'Recompensa merecida. Gastou XP, mas ganhou prazer.'], ['debochado', 'O mercado agradece a preferência. E o PRIMO também, pela companhia.'],
    ['animado', 'Isso! Agora é aproveitar. Se der, usa na hora certa.'], ['apaixonado', 'Descansar também é produtividade, primo.'], ['neutro', 'Registrado na mochila. Lembra: comprar antes de aproveitar é a regra.'],
  ],
  foco_inicio: [
    ['animado', 'Fogueira acesa! Fica comigo nesses minutos, sem celular.'], ['neutro', 'Foco ligado. Eu seguro as pontas, você faz o trabalho.'], ['piscada', 'Vai com tudo. Quando acabar, tem pausa e tem XP.'],
    ['feliz', 'Só uma coisa de cada vez. É isso, é só isso.'], ['pensativo', 'O truque do foco é começar feio. Depois ele melhora sozinho.'], ['orgulhoso', 'Uma rodada de foco vale por duas de enrolação.'],
  ],
  foco_fim: [
    ['festa', 'Rodada de foco completa! Bota o XP no bolso e dá uma esticada.'], ['orgulhoso', 'Isso é concentração de verdade. Tô de boca aberta.'], ['feliz', 'Pausa merecida: água, olhos longe da tela, respira.'],
    ['animado', 'Mais uma rodada e a gente zera essa lista.'], ['apaixonado', 'Foco bonito de ver. Parabéns.'], ['piscada', 'A fogueira fica mais quentinha quando você termina o que começa.'],
  ],
  foco_cancela: [
    ['triste', 'A fogueira apagou. Sem XP dessa vez, mas amanhã tem outra.'], ['neutro', 'Acontece. Respira e acende de novo quando der.'], ['preocupado', 'Interrompeu, né? O celular é um predador silencioso.'],
    ['pensativo', 'Se foi difícil focar, tenta 10 minutos em vez de 25.'],
  ],
  exp_ida: [
    ['animado', 'Partiu expedição! Volto com novidades e, quem sabe, uns trocados.'], ['piscada', 'Fica de olho na fogueira que eu volto antes de esfriar.'], ['feliz', 'Vou ver o mundo e trazer um souvenir. Tchau!'],
    ['orgulhoso', 'Eu sou o explorador mais fofo do estado.'], ['debochado', 'Se eu não voltar, o mapa é pra esquerda depois do pão de queijo.'], ['animado', 'Mochila nas costas, bota no pé e coragem no peito!'],
    ['neutro', 'Tô indo! Se concluir tarefas enquanto isso, eu volto mais rápido.'], ['surpreso', 'Já vou! Esqueci o chapéu… ok, esqueci só o chapéu mesmo.'],
  ],
  exp_volta: [
    ['festa', 'Voltei! Trouxe muita coisa e muita história!'], ['feliz', 'A expedição foi boa! Olha o que eu achei na estrada.'], ['animado', 'Primo! Você nem imagina o que eu vi lá.'],
    ['orgulhoso', 'Missão cumprida. E com lucro, ainda por cima.'], ['piscada', 'Trouxe um agradinho. Abre a mochila!'], ['surpreso', 'Achei coisa que eu nem sabia que existia!'],
    ['cansado', 'Estrada longa… mas valeu cada passo. Posso sentar?'], ['apaixonado', 'Senti sua falta. Mas a estrada tinha pão de queijo.'],
  ],
  pedido_novo: [
    ['pensativo', 'Tenho um pedido pra você hoje. Dá uma olhada no cartão do PRIMO.'], ['piscada', 'Hoje eu pedi uma coisa especial. Topa o desafio?'], ['animado', 'Pedido do dia no ar! Cumpriu, tem recompensa.'],
    ['debochado', 'Hoje eu tô mandão: tem pedido especial pra você.'], ['suspeito', 'Duvido você cumprir o pedido de hoje. Duvido mesmo.'],
  ],
  pedido_ok: [
    ['festa', 'Cumpriu o pedido do dia! Pode vir buscar o presente.'], ['orgulhoso', 'Eu pedi e você fez. É por isso que a gente é dupla.'], ['animado', 'Missão do dia concluída! Isso rende bônus!'],
    ['apaixonado', 'Pedido atendido. Você sabe quando eu preciso.'], ['piscada', 'Dessa vez eu nem precisei insistir!'],
  ],
  armario: [
    ['feliz', 'Ficou bom em mim? Eu me sinto uma estrela.'], ['piscada', 'Visual novo! Agora sim.'], ['apaixonado', 'Gostei! Dá até vontade de posar.'], ['debochado', 'Ficou chique! Só falta o tapete vermelho.'],
    ['orgulhoso', 'Olha esse caimento! Alfaiataria de primeira.'], ['surpreso', 'Eita! Quem é esse bonitão no espelho?'],
  ],
  mascote: [
    ['surpreso', 'O ovo mexeu! Tá nascendo alguma coisa!'], ['festa', 'A FAÍSCA evoluiu! Olha só como ela cresceu!'], ['apaixonado', 'Cuida dela com sequência e ela cuida da gente.'],
    ['feliz', 'A FAÍSCA tá feliz porque a meta foi batida.'], ['animado', 'Mais uns dias de sequência e ela evolui de novo!'],
  ],
  levelup: [
    ['festa', 'SUBIU DE NÍVEL! Eu vi o brilho daqui.'], ['orgulhoso', 'Nível novo, primo. Você tá virando outra pessoa.'], ['animado', 'Isso! Mais um andar e a vista melhora.'], ['apaixonado', 'Cada nível é uma versão sua que eu conheço.'],
  ],
  conquista: [
    ['festa', 'Conquista desbloqueada! Eu tava torcendo por essa.'], ['orgulhoso', 'Medalha nova no peito. Merecida.'], ['surpreso', 'Eita, não é que saiu?!'], ['piscada', 'Mais uma pro troféu. A estante tá ficando pequena.'],
  ],
  carinho: [
    ['feliz', 'Hehe, isso faz cócegas!'], ['apaixonado', 'Valeu, primo. Bora pra cima.'], ['piscada', 'Carinho recebido. Moral +10.'], ['animado', 'Tô contigo até o castelo.'], ['surpreso', 'Opa! Tava distraído contando as nuvens.'],
    ['debochado', 'Se eu tivesse rabo, ele estaria abanando agora.'], ['orgulhoso', 'Você é o melhor arquiteto desse reino. E o único, mas ainda conta.'], ['feliz', 'Psiu… a fogueira gosta quando você passa por aqui.'],
    ['suspeito', 'Tá me elogiando pra eu fazer o quê? Pode falar.'], ['festa', 'Mais um carinho e eu viro cachorrinho!'], ['pensativo', 'Sabia que a gente se conhece desde o capítulo 1? Parece uma vida.'],
    ['cansado', 'Aaah, bem na minha nuca. Obrigado.'], ['neutro', 'Tá tudo bem por aí? Se precisar, é só falar.'], ['feliz', 'Gosto quando você me visita sem precisar de nada.'],
    ['surpreso', 'Cuidado! Eu cosquinha fácil.'], ['piscada', 'Ainda bem que ninguém tá vendo a gente assim.'], ['apaixonado', 'Primo de sangue, de estrada e de fogueira.'], ['orgulhoso', 'Meu tempo preferido é o que a gente gasta junto.'],
  ],
  idle: [
    ['pensativo', 'Sabia que Mies van der Rohe dizia "menos é mais"? E Venturi respondia "menos é um saco". Eu sou do time do equilíbrio.'], ['piscada', 'Planta aprovada na prefeitura é o boss final de todo arquiteto.'],
    ['debochado', 'Cliente pediu "só um ajustezinho"? Marca como 🔁 vai e volta.'], ['feliz', 'Régua T numa mão, café na outra: modo arquiteto ligado.'], ['neutro', 'Detalhamento é onde o projeto vira obra. E obra vira gold.'],
    ['pensativo', 'Hoje é dia de prancheta ou de canteiro?'], ['orgulhoso', 'Primeiro a estrutura, depois o acabamento. Na obra e na vida.'], ['animado', 'Já reparou que a luz da tarde é o melhor render que existe?'],
    ['suspeito', 'Eu vi a sua aba do navegador... são vinte abertas. Vinte!'], ['debochado', 'Tem projeto que só fica pronto no prazo da pessoa que desistiu dele.'], ['cansado', 'Só mais uma xícara de café e eu viro engenheiro de estruturas.'],
    ['feliz', 'Se a cidade fosse tarefa, o Brasil ia ser a lista dos "depois eu vejo".'], ['pensativo', 'Uma boa janela vale mais que três ideias de fachada.'], ['piscada', 'Já pensou se existisse app que faz o cliente decidir rápido?'],
    ['neutro', 'Lembra de beber água. Eu lembro por mim e por você.'], ['animado', 'Descobri que pão de queijo funciona como combustível. Só que acaba rápido.'], ['pensativo', 'A gente planeja pra não improvisar. Mas improvisar também é arte.'],
    ['debochado', 'Tem coisa mais mineira que dizer "já tô indo" e continuar sentado?'], ['feliz', 'Alfenas tem uma luz que arquiteto nenhum consegue simular.'], ['surpreso', 'Achei um lápis atrás da orelha. Há quanto tempo ele tava ali?'],
  ],
  dica: [
    ['neutro', 'Começa pelo menor passo possível: abrir o arquivo já conta.'], ['pensativo', 'Não quebre a corrente duas vezes seguidas. Uma, acontece.'], ['orgulhoso', 'Seu eu do futuro agradece cada tarefa chata de hoje.'],
    ['animado', 'Energia segue a ação. Começa, que a vontade vem no caminho.'], ['feliz', 'Quem guarda um pouco todo mês, constrói casa.'], ['piscada', 'A mais chata primeiro. Só 10 minutos.'],
    ['neutro', 'Descanso também é parte do treino.'], ['orgulhoso', 'Feito hoje vale mais que perfeito semana que vem.'], ['pensativo', 'Se demora menos de 2 minutos, faz agora. Se demora mais, dá prazo.'],
    ['feliz', 'Divide a tarefa grande em cinco pequenas. A pequena a gente já fecha agora.'], ['neutro', 'Metas sem prazo viram sonho. Metas com prazo viram plano.'], ['piscada', 'Prazo realista é presente pro seu eu do futuro.'],
    ['pensativo', 'O que é medido é melhorado. Foi o Drucker que disse.'], ['orgulhoso', 'Disciplina é a ponte entre metas e conquistas. Jim Rohn tinha razão.'], ['animado', 'Pequenos passos todos os dias. Parece pouco, mas é o que constrói casa.'],
  ],
  descanso: [
    ['preocupado', '5 dias fortes seguidos! Hoje que tal um dia leve? Marque 🏕 DESCANSO no SURVIVAL: amanhã +20% nos hábitos.'], ['cansado', 'Você tá no limite. Parar um pouco hoje é estratégia, não preguiça.'],
  ],
  envenenado: [
    ['enjoado', 'Tô envenenado… uma missão de REDENÇÃO cura a gente.'], ['enjoado', 'Eu tô verde. Faz uma REDENÇÃO que eu melhoro.'],
  ],
  vazio: [
    ['neutro', 'Lista zerada? Tenho a sensação de que é hora de planejar a próxima.'], ['pensativo', 'Sem tarefas abertas. Que tal registrar a próxima ideia de projeto?'], ['feliz', 'Lista limpa! Respira. Você merece.'],
  ],
  tab: { // comentário do PRIMO em cada aba
    quests: [['feliz', 'Casa em ordem? Escolhe a próxima tarefa e vamos.'], ['pensativo', 'Aqui é onde tudo começa. Qual a primeira?'], ['piscada', 'QUESTS: o lugar onde a mágica acontece (e a procrastinação perde).']],
    survival: [['animado', 'Hábitos de hoje: bora marcar o que já fez!'], ['neutro', 'Constância vale mais que intensidade.'], ['orgulhoso', 'Marcando hábito a gente constrói o jogo de longo prazo.'], ['piscada', 'Aqui a gente treina. Eu cuido da hidratação.']],
    agenda: [['pensativo', 'Aqui a gente vê quando cada coisa precisa sair. Prazos realistas são o segredo.'], ['neutro', 'Atrasar tira XP e remarcar custa XP. Escolhe bem a data.'], ['suspeito', 'Se arrastar muita tarefa pra hoje, a gente conversa.'], ['feliz', 'Prazos bem postos viram bônus de pontualidade.']],
    shop: [['feliz', 'Descanso e lazer: compre antes de aproveitar!'], ['piscada', 'Oferta do dia em destaque. Eu escolhi pensando em você.'], ['debochado', 'Cuidado com o XP: gastar é fácil, ganhar é que dá trabalho.'], ['apaixonado', 'Tem coisa boa aqui. Mas só depois da tarefa, combinado?']],
    ferreiro: [['orgulhoso', 'Upgrades permanentes: investimento que dura.'], ['pensativo', 'Cada item novo é um bônus pra sempre.'], ['animado', 'Forja, martelo e XP: a receita do upgrade.'], ['piscada', 'Aqui o XP vira poder.']],
    domingo: [['feliz', 'Domingo: dê notas pra semana e escolha as 3 pedras da próxima.'], ['pensativo', 'Olhar pra trás ensina mais do que olhar pra frente.'], ['apaixonado', 'O baú da semana tá cheio de coisa boa.'], ['neutro', 'Sem pressa. Domingo é tempo de revisar com calma.']],
    conquistas: [['orgulhoso', 'Salão dos troféus! Cada medalha é uma história.'], ['festa', 'Olha quantas já saíram! E tem mais pela frente.'], ['piscada', 'Conquista é consequência. Quem faz todo dia, ganha.'], ['feliz', 'Metas para alcançar: a trilha tá aqui, é só seguir.']],
    filtro: [['neutro', 'Tudo em aberto numa tabela só. Procura, filtra e fecha.'], ['pensativo', 'Quando a cabeça tá confusa, a tabela organiza.'], ['suspeito', 'Dá uma olhada em quem ficou sem prazo.'], ['piscada', 'Filtro é a lupa do arquiteto de tarefas.']],
    rotina: [['feliz', 'A semana-tipo mostra o ritmo ideal. Ajusta quando precisar.'], ['pensativo', 'Rotina é o esqueleto; o resto é flexibilidade.'], ['neutro', 'Cada bloco da rotina é um compromisso com o seu futuro.'], ['piscada', 'Tem espaço pra tudo: trabalho, descanso e pão de queijo.']],
    regras: [['pensativo', 'Aqui moram as regras do jogo. Se não gostou, muda.'], ['neutro', 'XP, prazos, multas: tudo pode ser ajustado.'], ['piscada', 'Mexe com cuidado: o jogo que você ajusta é o jogo que você joga.'], ['orgulhoso', 'Bom jogo é aquele que combina com o jogador.']],
    arquivo: [['pensativo', 'Tudo que você já fechou mora aqui. É um museu das suas vitórias.'], ['feliz', 'Olha quanta coisa você já fez! A gente esquece fácil.'], ['neutro', 'Meses antigos ficam guardados. Nada se perde.'], ['apaixonado', 'Dá saudade de ler o que a gente já conquistou.']],
  },
};

// ───────────────────────── escolha ─────────────────────────
let _expr = 'neutro';
export const lastExpr = () => _expr;
const memKey = 'gamify-ui:psaid';
const recent = () => { try { return JSON.parse(ls.get(memKey)) || []; } catch { return []; } };
function fill(text, c = {}) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => (c[k] != null ? c[k] : m));
}
function choose(list, c = {}) {
  const mem = recent(), used = new Set(mem);
  const opts = list.filter((x) => !used.has(hash(fill(x[1], c))));
  const pool = opts.length ? opts : list;
  const it = pool[Math.floor(Math.random() * pool.length)] || list[0];
  const text = fill(it[1], c);
  ls.set(memKey, JSON.stringify([...mem, hash(text)].slice(-60)));
  _expr = it[0];
  return text;
}
const clean = (t) => String(t || '').replace(/\s*\(\d+\s*XP\)/i, '').replace(/^(↳|>)\s*/, '');

/** curiosidade verificada, com a fonte (farmácia leva um aviso) */
function saberLine(group) {
  const x = pickSaber(group);
  _expr = x.topic === 'farmacia' ? 'neutro' : 'pensativo';
  return `${x.label}: ${x.text} — ${x.by}${x.topic === 'farmacia' ? ' (informação geral: na dúvida, fale com o farmacêutico ou o médico)' : ''}`;
}
/** a fala certa pro momento. kind: 'auto' (contexto do dia), um nome do banco, ou 'tab:<rota>'. ctx = valores dos {modelos} */
export function primoLine(kind = 'auto', ctx = {}) {
  if (kind.startsWith('tab:')) return choose(BANK.tab[kind.slice(4)] || BANK.idle, ctx);
  if (kind === 'saber') return saberLine(ctx.group || 'all');
  if (kind !== 'auto') return choose(BANK[kind] || BANK.idle, ctx);
  const td = today(), c = R.companion(S), g = R.dailyGoal(S), st = R.dayStatus(S, td), hr = new Date().getHours(), wd = weekday(td);
  const base = { meta: g.goal, xp: g.today, falta: Math.max(0, g.goal - g.today), streak: g.streak, ...ctx };
  if (c.mood === 'dormindo') return choose(BANK.madrugada, base);
  if (Math.random() < 0.2) return saberLine('all'); // de vez em quando ele conta uma curiosidade
  const pool = [];
  const add = (w, list) => pool.push([w, list]);
  if (R.restSuggest(S)) add(3, BANK.descanso);
  if (st.has('envenenado')) add(3, BANK.envenenado);
  const over = R.overdueTasks(S).length;
  if (over >= 3) add(3.5, BANK.atrasadas_muitas); else if (over >= 1) add(1.8, BANK.atrasadas);
  base.n = over;
  add(2, hr < 12 ? BANK.manha : hr < 18 ? BANK.tarde : BANK.noite);
  add(0.9, BANK.dia[wd]);
  if (g.today >= g.goal) add(2.4, BANK.meta_batida); else if (g.today / g.goal >= 0.75) add(2.2, BANK.meta_perto); else if (g.today > 0) add(1.6, BANK.meta_meio); else add(2.2, BANK.meta_zero);
  if (g.streak >= 3) add(1, BANK.sequencia);
  add(1.6, BANK.idle); add(1.1, BANK.dica);
  if (!R.openTasks(S).length) add(2, BANK.vazio);
  // linhas dinâmicas com dados reais
  const dyn = [];
  const q = R.deadlineQueue(S, td)[0];
  if (q) dyn.push(['pensativo', `Próximo prazo: ${clean(q.text)}${q.due ? ` (${q.due < td ? 'atrasada' : q.due === td ? 'hoje' : fmtDM(q.due)})` : ''}.`]);
  const wk = R.weeklyMissions(S, td);
  if (!wk.tasks.length) dyn.push(['neutro', 'Ainda não escolhemos as 3 missões da semana. Toca no 📌 lá em cima.']);
  else if (!wk.complete) { const t = wk.tasks.find((x) => x.st !== 'done'); if (t) dyn.push(['animado', `Missão da semana: ${clean(t.text)}. Já são ${wk.done}/3.`]); }
  const rn = hr >= 6 && hr < 23 ? R.routineNow(S) : null;
  if (rn?.task) dyn.push(['animado', `Agora (${rn.hour}h) a rotina diz ${rn.slot}. Que tal: ${clean(rn.task.text)}?`]);
  const habs = (S.core.habits || []).filter((h) => !S.marks.days[td]?.h?.[h.id]);
  if (habs.length && hr >= 9) { base.tarefa = habs[0].name.toLowerCase(); add(1.2, BANK.habitos); }
  if (dyn.length) add(1.8, dyn);
  const total = pool.reduce((a, [w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [w, list] of pool) { r -= w; if (r <= 0) return choose(list, base); }
  return choose(BANK.idle, base);
}

/** quantas frases existem (curiosidade pro painel) */
export const bankSize = () => {
  let n = 0;
  const walk = (v) => { if (Array.isArray(v)) { if (typeof v[0] === 'string' && typeof v[1] === 'string' && EXPRS.includes(v[0])) n += 1; else v.forEach(walk); } else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(BANK); return n;
};

// ───────────────────────── JEITO MINEIRO (uai, trem, sô) + memes ─────────────────────────
const MINEIRO = {
  manha: [['feliz', 'Bão dia, sô! Já passei o café e a broa tá na mesa, uai.'], ['animado', 'Acordô cedo, é? Hoje o trem vai andar!'], ['cansado', 'Ô sô, deixa eu tomar o café primeiro que eu ainda tô com a alma no travesseiro.'], ['piscada', 'Dia bonito pra fechar tarefa, uai. Até a galinha já levantou.'], ['debochado', 'Segunda-feira de novo? Que trem sem vergonha, sô.'], ['animado', 'It\'s a beautiful day... pra riscar tarefa da lista, uai!'], ['feliz', 'Pão de queijo quentinho e meta na mão. Quer mais o quê?']],
  tarde: [['cansado', 'Depois do almoço dá aquele sono de vaca no pasto, né? Cinco minutinhos de foco e passa, uai.'], ['piscada', 'Tarde de sol e trem pra resolver. Bora, sô!'], ['pensativo', 'Cafezinho coado no fogão a lenha resolve metade da vida, uai. A outra metade é a lista.'], ['debochado', 'Só mais uma tarefinha, sô… foi o que ele disse e ficou até as dez da noite.'], ['animado', 'Tá no rolê da produtividade, uai? Então segura que o trem tá bão!']],
  noite: [['feliz', 'Noite chegou, sô. Hora de fechar o dia e olhar a fogueira.'], ['apaixonado', 'Fogueira, silêncio e uma lista riscada. Isso é que é vida boa, uai.'], ['cansado', 'Hoje foi trem puxado, mas tá aqui, firme. Isso já é vitória.'], ['debochado', 'Quem dorme cedo, uai, acorda com a lista menor. Dizem.'], ['piscada', 'Deixa o amanhã arrumadinho que a vida agradece.']],
  madrugada: [['dormindo', 'zzz... sonhei com pão de queijo do tamanho de uma casa... zzz'], ['cansado', 'Ô sô, dorme, uai! Madrugada é pra galo cantar, não pra planilha.'], ['dormindo', 'zzz... uai... quem é que tá mexendo na lista a essa hora... zzz']],
  tarefa: [['festa', 'Eita trem bão! Mais uma riscada, sô!'], ['animado', 'Uai, já fez? Nem vi o trem passar!'], ['orgulhoso', 'É nóis! Mais uma pra conta, +{xp} XP.'], ['piscada', 'Vai ter que ser na raça? Foi, e deu certo, sô.'], ['festa', 'Ê, trem bão demais! Pode riscar com gosto.'], ['debochado', 'Cê nem enrolou muito dessa vez, hein? Tô até desconfiado, uai.'], ['feliz', 'Boa, sô! Um passo de cada vez e a gente chega em Alfenas.'], ['orgulhoso', 'Mission accomplished! Só que em mineirês: deu certo, uai.'], ['animado', 'Gol! Gol! Goooool! Tarefa na rede, sô!']],
  tarefa_grande: [['festa', 'Misericórdia, sô! Derrubou o trem grandão! +{xp} XP!'], ['surpreso', 'Uai, cê é brabo mesmo, hein! Eu nem acreditei.'], ['orgulhoso', 'Isso é que é arquiteto de resultado, uai!'], ['festa', 'It\'s over 9000! Quer dizer, +{xp} XP, mas me deixa sonhar, sô.']],
  tarefa_no_prazo: [['orgulhoso', 'No prazo, sô! Isso que é gente séria.'], ['piscada', 'Pontual igual trem de ferro. Bão demais!']],
  atrasada_feita: [['debochado', 'Entregou atrasado, uai... mas entregou! O XP reclamou, mas passou.'], ['pensativo', 'Mais vale tarde que nunca, sô. Só que o desconto de XP é da casa.'], ['cansado', 'Tá feito. This is fine... (o prazo pegando fogo atrás).']],
  atrasadas: [['preocupado', 'Uai, tem {n} tarefa atrasada me olhando torto. Dá um jeito nela, sô.'], ['suspeito', 'Esse trem atrasado tá com cara de quem vai virar problema, hein?'], ['bravo', 'Prazo é prazo, sô! Não é sugestão.']],
  atrasadas_muitas: [['preocupado', 'Misericórdia, {n} atrasadas! Parece fila de banco em dia de pagamento, uai.'], ['triste', 'Ô sô, {n} atrasadas... isso aqui virou um "esse é o pior dia da minha vida", sô.'], ['bravo', 'Agora é na raça, uai: começa pela menor e vai.']],
  remarcou: [['suspeito', 'Remarcou de novo, é? Pagou {xp} XP de pedágio, sô. A estrada do prazo é cara.'], ['debochado', 'Deixa pra depois, deixa pra depois... e lá se foram {xp} XP, uai.'], ['pensativo', 'Remarcar custa porque prazo é palavra de mineiro: tem que cumprir, sô.']],
  meta_zero: [['pensativo', 'Placar zerado, uai. Bora fazer o trem andar?'], ['piscada', 'Todo mundo começa do zero, até o pão de queijo começa de massa, sô.'], ['debochado', 'Faltam {falta} XP. Sem pressa... mas com pressa, uai.']],
  meta_meio: [['animado', 'Já tem {xp} XP, sô! Falta só um tiquinho pra meta.'], ['feliz', 'Tá indo que é uma beleza, uai! Continua assim.']],
  meta_perto: [['festa', 'Falta {falta} XP, sô! Dá pra sentir o cheiro de meta batida, uai!'], ['animado', 'Vai que é tua! Não para agora não, sô.']],
  meta_batida: [['festa', 'META BATIDA, uai! Hoje é dia de pão de queijo com café, sô!'], ['orgulhoso', 'Bateu a meta e ainda sobrou fôlego? Cê é de ferro, sô!'], ['festa', 'Eita que a fogueira acendeu de vez! {streak} dia(s) em chama, uai!'], ['feliz', 'Você é o cara, sô. Tipo... o Chuck Norris das tarefas.'], ['debochado', 'Nóis é pobre mas é produtivo, uai!']],
  sequencia: [['orgulhoso', '{streak} dias seguidos, sô! Isso é constância de gente grande.'], ['festa', 'Streak de {streak}! Não quebra essa corrente, uai!']],
  habito_feito: [['feliz', 'Hábito marcado, uai! Trem bão é constância.'], ['piscada', 'Mais um tijolinho na muralha da disciplina, sô.']],
  habitos: [['preocupado', 'Uai, ainda falta {tarefa} hoje. Marca lá que eu tô de olho, sô.'], ['suspeito', 'Esqueceu de {tarefa}, é? Eu não esqueci não.']],
  boss: [['festa', 'CAIU O BOSS, sô! Que trem bonito de ver!'], ['surpreso', 'Misericórdia! Derrubou o bichão! Eu tô até arrepiado, uai!']],
  compra: [['feliz', 'Comprou, curtiu e sem culpa, uai! Cê ganhou.'], ['piscada', 'Descanso merecido, sô. Aproveita esse trem direito.']],
  foco_inicio: [['animado', 'Fogueira acesa, sô! Silêncio e foco, que trem bão a gente faz.'], ['neutro', 'Celular no bolso, mente na tarefa. Bora, uai.']],
  foco_fim: [['festa', 'Rodada de foco feita, uai! Merece um cafezinho, sô.'], ['orgulhoso', 'Concentrou igual lavrador na roça. Orgulho, sô!']],
  foco_cancela: [['triste', 'Apagou a fogueira, uai... acontece. Amanhã acende de novo.']],
  exp_ida: [['animado', 'Vou ali na venda e já volto, sô! Se tardar, guarda pão de queijo.'], ['piscada', 'Partiu, uai! Mochila, chapéu e coragem.'], ['debochado', 'Hasta la vista, baby! Volto com trocado, uai.']],
  exp_volta: [['festa', 'Cheguei, sô! Trouxe trem bão da estrada!'], ['feliz', 'Voltei! Tem história pra contar e pão de queijo pra dividir, uai.'], ['cansado', 'Ô estrada comprida... mas valeu cada passo, sô.']],
  pedido_novo: [['pensativo', 'Tenho um pedido pro cê hoje, sô. Dá uma olhada no cartão.'], ['debochado', 'Hoje tô mandão, uai: tem pedido do dia!']],
  pedido_ok: [['festa', 'Pedido cumprido, sô! Eu falei que cê dava conta, uai!'], ['orgulhoso', 'Eu pedi, cê fez. Isso é parceria de verdade.']],
  carinho: [['feliz', 'Uai, carinho no PRIMO? Pode continuar, sô!'], ['surpreso', 'Eita! Quase que eu derrubei o chapéu, uai.'], ['piscada', 'Ô sô, cê é bão demais.'], ['debochado', 'Tá me paparicando pra quê, hein? Pode falar, uai.'], ['apaixonado', 'Nóis dois é parceiro de estrada, sô.'], ['festa', 'Cócegas! Cócegas! Não vale, uai!'], ['neutro', 'Keep calm and carry on, sô. Digo, e segue a lista, uai.'], ['cansado', 'Ai, que gostoso. Mais pra esquerda, sô.']],
  idle: [['pensativo', 'Dizem que o mineiro desconfia até de elogio. Eu também, uai.'], ['piscada', 'Trem de arquiteto: se tá torto, é conceito, sô.'], ['debochado', 'Quem vê cara não vê coração, nem planta de prefeitura, uai.'], ['feliz', 'Arquiteto bão é aquele que faz projeto e ainda lembra de pagar o boleto, sô.'], ['suspeito', 'O cliente falou "é rapidinho"? Fica de olho, sô. Rapidinho nunca é rapidinho.'], ['neutro', 'Café na mão, régua na outra e é nóis, uai.'], ['pensativo', 'Sabe o que é bão? Uma varanda, uma rede e a obra terminada, sô.'], ['debochado', 'Se o prazo é amanhã e o projeto tá em 20%, é "pressão faz diamante", uai.'], ['surpreso', 'Uai, eu falei "trem" cinco vezes hoje. É sintoma de mineiridade avançada, sô.'], ['feliz', 'Já tomou água, sô? Hidratação é meme que a gente leva a sério.'], ['animado', 'Hakuna matata, sô! Quer dizer: sem pressão, mas com prazo.'], ['debochado', 'Mestre Yoda diria: "Faça ou não faça. Tentativa não há." E eu diria: faz logo, uai.'], ['piscada', 'Isso aí é o suco, sô. Ou melhor, é o café.'], ['pensativo', 'Tudo é possível, só falta tempo... e cafezinho, uai.'], ['cansado', 'Alguém aí viu minha energia? Perdi ela debaixo do sofá, sô.'], ['festa', 'Nóis vai, nóis vai, nóis vai! Mas primeiro o café, uai.'], ['debochado', 'Meu planejamento tá igual obra pública: previsto pra março, entrega... a gente vê.']],
  dica: [['neutro', 'Dica de mineiro: devagar e sempre, uai. O trem anda.'], ['pensativo', 'Sem data não é missão, é desejo, sô.'], ['feliz', 'Quem guarda um pouquinho todo mês, constrói casa, uai.'], ['orgulhoso', 'Feito é melhor que perfeito, sô. Mas feito e bão é ouro.'], ['piscada', 'Começa pelo trem mais chato, uai. Depois o resto é ladeira.']],
};
const mineiroize = (t) => t.replace(/\bprimo\b/g, 'sô').replace(/^Bom dia/, 'Bão dia').replace(/Boa tarde!/, 'Boa tarde, uai!').replace(/\bmuito bom\b/g, 'bão demais');
(function merge() {
  for (const k of Object.keys(BANK)) if (Array.isArray(BANK[k]) && k !== 'dia') BANK[k] = BANK[k].map(([e, t]) => [e, mineiroize(t)]);
  for (const [k, v] of Object.entries(MINEIRO)) BANK[k] = (BANK[k] || []).concat(v);
  BANK.dia = BANK.dia.map((d) => d.map(([e, t]) => [e, mineiroize(t)]));
})();
