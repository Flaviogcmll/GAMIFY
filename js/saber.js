// SABER DO PRIMO — citações, ideias e curiosidades de muitos temas (filosofia, psicologia, neurociência, sociologia, política,
// arquitetura, arte, comportamento, economia, ciência, história, livros e dicas). Só entra o que dá pra atribuir e conferir.
// Formato: [tema, texto, autor/fonte]. O PRIMO sorteia sem repetir até esgotar (guarda o que já viu neste aparelho).
export const TOPICS = { filosofia: '🏛 FILOSOFIA', psicologia: '🧠 PSICOLOGIA', neuro: '⚡ NEUROCIÊNCIA', sociologia: '👥 SOCIOLOGIA', politica: '🗳 POLÍTICA', arquitetura: '📐 ARQUITETURA', arte: '🎨 ARTE', comportamento: '🧭 COMPORTAMENTO', economia: '💰 ECONOMIA', ciencia: '🔭 CIÊNCIA', historia: '📜 HISTÓRIA', livros: '📚 LIVROS', dica: '💡 DICA', brasil: '🇧🇷 BRASIL', farmacia: '💊 FARMÁCIA E SAÚDE', espaco: '🚀 ESPAÇO E TECNOLOGIA' };
export const BANK = [
  // filosofia
  ['filosofia', 'O impedimento à ação avança a ação. O que está no caminho se torna o caminho.', 'Marco Aurélio, Meditações 5.20'],
  ['filosofia', 'Não é que tenhamos pouco tempo, mas que perdemos muito dele.', 'Sêneca, Sobre a brevidade da vida'],
  ['filosofia', 'Não são as coisas que perturbam as pessoas, e sim os julgamentos que elas fazem sobre as coisas.', 'Epicteto, Manual 5'],
  ['filosofia', 'Quem tem um porquê para viver suporta quase qualquer como.', 'Nietzsche, Crepúsculo dos Ídolos (citada por Frankl)'],
  ['filosofia', 'O homem está condenado a ser livre: condenado porque não se criou a si mesmo e, no entanto, livre.', 'Sartre, O existencialismo é um humanismo'],
  ['filosofia', 'Ninguém educa ninguém, ninguém se educa sozinho: as pessoas se educam entre si, mediatizadas pelo mundo.', 'Paulo Freire, Pedagogia do Oprimido'],
  ['filosofia', 'Somos o que fazemos repetidamente. A excelência, então, não é um ato, mas um hábito.', 'Will Durant, resumindo Aristóteles'],
  ['filosofia', 'Alegações extraordinárias exigem evidências extraordinárias.', 'Carl Sagan, Cosmos'],
  ['filosofia', 'O primeiro princípio é que você não deve enganar a si mesmo, e você é a pessoa mais fácil de enganar.', 'Richard Feynman, Cargo Cult Science'],
  ['filosofia', 'A banalidade do mal: pessoas comuns, sem pensar, podem cometer atos terríveis dentro de um sistema.', 'Hannah Arendt, Eichmann em Jerusalém (1963)'],
  ['filosofia', 'Inverta, sempre inverta: muitos problemas ficam claros quando você pergunta como garantir o fracasso e evita isso.', 'Charlie Munger, citando o matemático Jacobi'],
  // livros / literatura
  ['livros', 'O correr da vida embrulha tudo. O que ela quer da gente é coragem.', 'Guimarães Rosa, Grande Sertão: Veredas'],
  ['livros', 'Tudo vale a pena se a alma não é pequena.', 'Fernando Pessoa, Mensagem'],
  ['livros', 'Você não sobe ao nível das suas metas; cai ao nível dos seus sistemas.', 'James Clear, Hábitos Atômicos'],
  ['livros', 'Registre o passado, organize o presente, desenhe o futuro.', 'Ryder Carroll, O Método Bullet Journal'],
  ['livros', 'Nada na vida é tão importante quanto você pensa que é enquanto está pensando nisso.', 'Daniel Kahneman, Rápido e Devagar'],
  ['livros', 'Trabalho profundo é a capacidade de focar sem distração numa tarefa cognitivamente exigente: cada vez mais rara e valiosa.', 'Cal Newport, Deep Work (2016)'],
  ['livros', 'No meio do caminho tinha uma pedra. Tinha uma pedra no meio do caminho.', 'Carlos Drummond de Andrade (1928)'],
  ['livros', 'Os Olhos da Pele: a arquitetura moderna privilegiou a visão e esqueceu do tato, do som, do cheiro e da memória do corpo.', 'Juhani Pallasmaa (1996)'],
  ['livros', 'Uma Linguagem de Padrões descreve 253 padrões de projeto que fazem cidades, edifícios e salas funcionarem para as pessoas.', 'Christopher Alexander et al. (1977)'],
  // psicologia
  ['psicologia', 'Pesquisa da UCL (Lally et al., 2009): levou em média 66 dias para um novo comportamento ficar automático, com variação de 18 a 254 dias.', 'European Journal of Social Psychology'],
  ['psicologia', 'Intenções de implementação ("se acontecer X, então faço Y") aumentam a chance de cumprir metas, mostram meta-análises de Gollwitzer e Sheeran.', 'Peter Gollwitzer'],
  ['psicologia', 'Falácia do planejamento: tendemos a subestimar o tempo de tarefas, mesmo sabendo que projetos parecidos atrasaram antes.', 'Kahneman e Tversky, 1979'],
  ['psicologia', 'Lei de Hofstadter: sempre leva mais tempo do que você espera, mesmo quando você leva em conta a Lei de Hofstadter.', 'Douglas Hofstadter, Gödel, Escher, Bach (1979)'],
  ['psicologia', 'Efeito IKEA: valorizamos mais aquilo que ajudamos a construir, mesmo quando o resultado é mediano.', 'Norton, Mochon e Ariely, 2012'],
  ['psicologia', 'Efeito Zeigarnik: nos anos 1920 observou-se que tarefas interrompidas ficam mais na memória. Replicações dão resultados mistos, mas anotar o próximo passo ao parar ajuda a retomar.', 'Bluma Zeigarnik'],
  ['psicologia', 'Dunning-Kruger: quem tem pouca habilidade tende a superestimar o próprio desempenho. Parte do efeito também vem de artefatos estatísticos e é debatida.', 'Dunning e Kruger, 1999'],
  ['psicologia', 'Viés de confirmação: buscamos e lembramos mais as informações que confirmam o que já pensamos. Procurar ativamente o contra-argumento é o antídoto.', 'Psicologia cognitiva'],
  ['psicologia', 'Adaptação hedônica: depois de uma conquista ou compra, o nível de felicidade tende a voltar ao que era. Por isso o progresso importa mais que o troféu.', 'Brickman e Campbell, 1971'],
  ['psicologia', 'Custo irrecuperável: continuar algo só porque já gastamos tempo ou dinheiro nisso. A pergunta útil é "começaria isso hoje?".', 'Economia comportamental'],
  ['psicologia', 'Técnica Pomodoro: blocos de 25 minutos de foco com pausas curtas. Criada por Francesco Cirillo no fim dos anos 1980.', 'Francesco Cirillo'],
  // neurociência
  ['neuro', 'O cérebro humano tem em média cerca de 86 bilhões de neurônios, contagem feita pela neurocientista brasileira Suzana Herculano-Houzel.', 'Azevedo e Herculano-Houzel, 2009'],
  ['neuro', 'O cérebro é cerca de 2% da massa do corpo e usa cerca de 20% da energia em repouso.', 'Fisiologia humana'],
  ['neuro', 'Taxistas de Londres que decoraram o mapa da cidade tinham o hipocampo posterior maior: o cérebro adulto continua se adaptando.', 'Maguire et al., 2000'],
  ['neuro', 'A dopamina está mais ligada a querer e antecipar do que ao prazer em si, segundo as pesquisas de Kent Berridge. Por isso a barra de progresso motiva.', 'Kent Berridge'],
  ['neuro', 'Efeito de espaçamento: revisar em intervalos cada vez maiores fixa muito mais do que estudar tudo de uma vez.', 'Hermann Ebbinghaus, século XIX'],
  ['neuro', 'Dormir bem ajuda a consolidar memórias: o que você aprendeu durante o dia é reorganizado à noite.', 'Neurociência do sono'],
  ['neuro', 'Exercício aeróbico regular está associado a melhor memória e humor, em parte por aumentar fatores como o BDNF, que favorece neurônios.', 'Neurociência do exercício'],
  ['neuro', 'Luz natural pela manhã ajuda a ajustar o relógio biológico (ritmo circadiano) e a dormir melhor à noite.', 'Cronobiologia'],
  // comportamento / produtividade
  ['comportamento', 'Lei de Parkinson: o trabalho se expande até preencher o tempo disponível para ele.', 'C. Northcote Parkinson, 1955'],
  ['comportamento', 'Lei de Goodhart: quando uma medida vira meta, ela deixa de ser uma boa medida. Cuidado com o placar virar o jogo.', 'Charles Goodhart, 1975'],
  ['comportamento', 'Princípio de Pareto: muitas vezes cerca de 80% dos resultados vêm de 20% das causas. Descubra quais são os seus 20%.', 'Vilfredo Pareto'],
  ['comportamento', 'Regra dos 2 minutos: se leva menos de dois minutos, faça agora em vez de anotar.', 'David Allen, Getting Things Done'],
  ['comportamento', 'Hemingway parava de escrever quando sabia o que vinha a seguir: facilita recomeçar no dia seguinte.', 'Truque de escritor'],
  ['comportamento', 'O número de Dunbar sugere um limite em torno de 150 relações estáveis. Cuidar das poucas que importam é o que escala.', 'Robin Dunbar'],
  // sociologia / política (descrições factuais, sem lado)
  ['sociologia', 'Profecia autorrealizável: uma crença falsa sobre uma situação pode provocar o comportamento que a torna verdadeira.', 'Robert K. Merton, 1948'],
  ['sociologia', 'Capital cultural: gostos, saberes e hábitos herdados também funcionam como vantagem social, não só o dinheiro.', 'Pierre Bourdieu'],
  ['sociologia', 'Modernidade líquida: instituições, relações e identidades ficam mais fluidas e provisórias.', 'Zygmunt Bauman, 2000'],
  ['sociologia', 'Em Bowling Alone, Robert Putnam descreveu a queda da participação cívica e comunitária nos EUA no fim do século XX.', 'Robert Putnam, 2000'],
  ['sociologia', 'Teoria das janelas quebradas: sinais visíveis de desordem poderiam atrair mais desordem. Foi influente e também muito criticada.', 'Wilson e Kelling, 1982'],
  ['politica', 'Para Max Weber, o Estado é a comunidade que reivindica o monopólio do uso legítimo da força física em um território.', 'Max Weber, A Política como Vocação (1919)'],
  ['politica', 'Lei de Duverger: sistemas eleitorais majoritários de turno único tendem ao bipartidarismo.', 'Maurice Duverger'],
  ['politica', 'Paradoxo de Condorcet: com três ou mais opções, as preferências de um grupo podem formar um ciclo, sem vencedor claro.', 'Marquês de Condorcet, 1785'],
  ['politica', 'A Constituição brasileira de 1988 ficou conhecida como "Constituição Cidadã", expressão de Ulysses Guimarães.', 'História do Brasil'],
  ['politica', 'O Brasil usa urna eletrônica desde 1996 (eleições municipais) e em todo o país desde 2000.', 'Justiça Eleitoral'],
  // arquitetura
  ['arquitetura', 'A forma segue a função: a ideia de Louis Sullivan (1896) virou lema do modernismo.', 'Louis Sullivan'],
  ['arquitetura', 'A casa é uma máquina de morar, escreveu Le Corbusier em 1923, provocando e definindo uma era.', 'Le Corbusier, Por uma arquitetura'],
  ['arquitetura', 'O vão livre do MASP, de Lina Bo Bardi (1968), mede 74 metros e deixa a Avenida Paulista visível por baixo.', 'MASP'],
  ['arquitetura', 'Brasília foi inaugurada em 21 de abril de 1960, com plano urbanístico de Lucio Costa e edifícios de Oscar Niemeyer.', 'História do Brasil'],
  ['arquitetura', 'Paulo Mendes da Rocha foi o primeiro brasileiro a receber o Pritzker, o maior prêmio de arquitetura, em 2006.', 'Fundação Pritzker'],
  ['arquitetura', 'A cúpula do Panteão de Roma, de concreto sem armação, tem 43,3 m de diâmetro e foi a maior do mundo por mais de mil anos.', 'Arquitetura romana'],
  ['arquitetura', 'Roberto Burle Marx projetou jardins modernistas usando plantas nativas brasileiras, como no Parque do Flamengo.', 'Paisagismo brasileiro'],
  ['arquitetura', 'A "proporção áurea" aparece muito em teorias de projeto, mas muitas das suas supostas ocorrências em edifícios antigos são exagero.', 'Crítica de arquitetura'],
  ['arquitetura', 'O Partenon tem curvas sutis (a êntase das colunas) para parecer reto aos olhos: precisão a serviço da percepção.', 'Arquitetura grega'],
  // arte
  ['arte', 'A Grande Onda de Kanagawa, de Hokusai, é de cerca de 1831 e influenciou muito os impressionistas.', 'História da arte'],
  ['arte', 'A Semana de Arte Moderna aconteceu em São Paulo em fevereiro de 1922 e marcou o modernismo brasileiro.', 'História da arte brasileira'],
  ['arte', 'Abaporu, de Tarsila do Amaral, é de 1928 e inspirou o Movimento Antropofágico.', 'Tarsila do Amaral'],
  ['arte', 'Guernica, de Picasso, é de 1937 e responde ao bombardeio da cidade basca de Guernica durante a Guerra Civil Espanhola.', 'História da arte'],
  ['arte', 'Van Gogh pintou mais de 800 quadros em cerca de dez anos e vendeu muito pouco em vida.', 'Museu Van Gogh'],
  ['arte', 'Ukiyo-e: as xilogravuras japonesas eram produzidas em série, como pôsteres da época.', 'Arte japonesa'],
  // economia / finanças
  ['economia', 'Juros compostos: R$ 1.000 a 1% ao mês por 10 anos viram cerca de R$ 3.300. O tempo faz o trabalho pesado.', 'Matemática financeira'],
  ['economia', 'Regra dos 72: divida 72 pela taxa de juros (em %) para estimar em quantos períodos o dinheiro dobra.', 'Matemática financeira'],
  ['economia', 'Reserva de emergência: a recomendação mais comum é guardar de 3 a 6 meses das suas despesas.', 'Educação financeira'],
  ['economia', 'A taxa Selic, definida pelo Copom do Banco Central, é a taxa básica de juros do Brasil.', 'Banco Central do Brasil'],
  ['economia', 'Custo de oportunidade: o verdadeiro preço de algo é a melhor alternativa que você deixou de escolher.', 'Economia'],
  // ciência / curiosidades
  ['ciencia', 'Em Vênus, um dia (uma rotação) dura cerca de 243 dias terrestres, mais que o seu ano, de cerca de 225 dias.', 'NASA'],
  ['ciencia', 'A luz do Sol leva cerca de 8 minutos e 20 segundos para chegar à Terra.', 'Astronomia'],
  ['ciencia', 'Polvos têm três corações e sangue azul, por causa da hemocianina.', 'Biologia marinha'],
  ['ciencia', 'Bananas são levemente radioativas por conter potássio-40, em doses inofensivas.', 'Física da radiação'],
  ['ciencia', 'A Voyager 1, lançada em 1977, é o objeto feito por humanos mais distante da Terra.', 'NASA'],
  ['ciencia', 'O telescópio espacial James Webb foi lançado em 25 de dezembro de 2021 e observa o universo em infravermelho.', 'NASA'],
  ['ciencia', 'A Torre Eiffel pode crescer até cerca de 15 cm no verão, por dilatação térmica do ferro.', 'Engenharia'],
  ['ciencia', 'Duas pessoas quaisquer compartilham cerca de 99,9% do DNA: as diferenças são pequenas, mas importam.', 'Genômica'],
  // história
  ['historia', 'Santos-Dumont voou com o 14-Bis em Paris, em 23 de outubro de 1906, em um voo homologado.', 'História da aviação'],
  ['historia', 'A Biblioteca de Alexandria foi um dos grandes centros de saber da Antiguidade e sua decadência foi gradual, não um único incêndio.', 'Historiografia'],
  ['historia', 'A imprensa de tipos móveis de Gutenberg, por volta de 1450, barateou o livro e acelerou a circulação de ideias.', 'História da escrita'],
  // brasil
  ['brasil', 'A represa de Furnas, perto de Alfenas, no sul de Minas, entrou em operação no início dos anos 1960 e formou um dos maiores lagos artificiais do país.', 'Furnas'],
  ['brasil', 'O Brasil abriga a maior biodiversidade entre os países: estimativas apontam entre 15% e 20% das espécies conhecidas do planeta.', 'Estimativas de biodiversidade'],
  ['brasil', 'Suzana Herculano-Houzel, neurocientista brasileira, criou um método para contar neurônios e mudou o que se sabia sobre o cérebro.', 'Ciência brasileira'],
  // dicas práticas
  ['dica', 'Regra 20-20-20: a cada 20 minutos, olhe para algo a 6 metros por 20 segundos para descansar os olhos.', 'Dica de optometria'],
  ['dica', 'Antes de parar o trabalho, escreva o próximo passo concreto. Amanhã você começa sem fricção.', 'Dica de produtividade'],
  ['dica', 'Se uma tarefa trava, quebre até o primeiro passo ficar óbvio e combine só 10 minutos.', 'Dica do GAMIFY'],
  ['dica', 'Defina o que é "pronto" antes de começar: tarefas sem fim claro viram tarefas sem fim.', 'Dica de produtividade'],
  ['dica', 'Respire: inspire pelo nariz, faça uma segunda inspiração curta e solte devagar pela boca. É o suspiro fisiológico.', 'Dica de regulação do estresse'],
  ['dica', 'Dobre o tempo que você acha que a tarefa vai levar. Você vai errar menos do que errando pra baixo.', 'Contra a falácia do planejamento'],
  ['dica', 'Defina um horário de fim do dia de trabalho. Limites claros protegem a energia do dia seguinte.', 'Dica de sustentabilidade'],
  // farmácia e saúde (informação geral: não substitui o farmacêutico nem o médico)
  ['farmacia', 'Todas as substâncias são venenos; só a dose certa separa o veneno do remédio.', 'Paracelso, século XVI'],
  ['farmacia', 'A penicilina, primeiro antibiótico de uso amplo, foi descoberta por Alexander Fleming em 1928.', 'Registro histórico (Fleming, 1928)'],
  ['farmacia', 'Antibióticos agem contra bactérias, não contra vírus como o do resfriado e o da gripe.', 'OMS / Anvisa'],
  ['farmacia', 'Usar antibiótico sem necessidade ou parar no meio do tratamento ajuda a criar bactérias resistentes.', 'OMS (resistência antimicrobiana)'],
  ['farmacia', 'Medicamentos devem ficar em local seco, fresco e longe da luz. Banheiro e cozinha, com calor e umidade, não são bons lugares.', 'Orientação da Anvisa'],
  ['farmacia', 'Ler a bula inteira e checar a validade antes de usar um remédio evita muito problema. Na dúvida, pergunte ao farmacêutico.', 'Anvisa / Conselho Federal de Farmácia'],
  ['farmacia', 'Medicamento genérico tem o mesmo princípio ativo, dose e forma do de referência e passa por teste de bioequivalência.', 'Lei 9.787/1999 · Anvisa'],
  ['farmacia', 'A insulina foi isolada em 1921 por Frederick Banting e Charles Best, na Universidade de Toronto.', 'Registro histórico'],
  ['farmacia', 'O ácido acetilsalicílico (a "aspirina") foi sintetizado em 1897 na Bayer; sua origem é a salicina, da casca do salgueiro.', 'Registro histórico'],
  ['farmacia', 'Adultos precisam em geral de 7 horas ou mais de sono por noite para a saúde.', 'Consenso da American Academy of Sleep Medicine (2015)'],
  ['farmacia', 'O programa Farmácia Popular do Brasil, criado em 2004, oferece alguns medicamentos gratuitos ou com desconto.', 'Ministério da Saúde'],
  ['farmacia', 'A pele produz vitamina D quando exposta ao sol; por isso a rotina de exposição segura importa.', 'Fato fisiológico (OMS)'],
  ['farmacia', 'Remédio com tarja vermelha exige receita; o de tarja preta exige receita retida na farmácia.', 'Anvisa'],
  // psicologia, neurociência e hábitos
  ['psicologia', 'Efeito Zeigarnik: lembramos melhor de tarefas interrompidas do que das concluídas. Anotar o próximo passo acalma a cabeça.', 'Bluma Zeigarnik, 1927'],
  ['comportamento', 'Lei de Parkinson: o trabalho se expande até preencher o tempo disponível. Prazo curto e realista ajuda.', 'C. Northcote Parkinson, The Economist, 1955'],
  ['psicologia', 'Falácia do planejamento: a gente subestima quase sempre o tempo que as tarefas levam, mesmo já tendo errado antes.', 'Kahneman e Tversky, 1979'],
  ['dica', 'A Técnica Pomodoro (25 minutos de foco e 5 de pausa) foi criada por Francesco Cirillo no fim dos anos 1980.', 'Francesco Cirillo'],
  ['neuro', 'O cérebro pesa cerca de 2% do corpo e consome por volta de 20% da energia dele.', 'Fisiologia básica'],
  ['neuro', 'Durante o sono o cérebro consolida memórias; dormir mal depois de estudar atrapalha o que foi aprendido.', 'Revisões em neurociência do sono'],
  ['neuro', 'O cérebro adulto continua se reorganizando com a prática, a chamada neuroplasticidade.', 'Consenso em neurociência'],
  ['psicologia', 'Efeito Dunning-Kruger: quem sabe pouco de um assunto tende a superestimar o que sabe.', 'Dunning e Kruger, 1999'],
  // arquitetura, arte e design
  ['arquitetura', 'Brasília foi inaugurada em 1960, com urbanismo de Lúcio Costa e edifícios de Oscar Niemeyer.', 'Registro histórico'],
  ['arquitetura', 'O MASP, de Lina Bo Bardi (1968), tem um vão livre de 74 metros sob o prédio.', 'MASP'],
  ['arquitetura', 'A Bauhaus foi fundada por Walter Gropius em Weimar, em 1919, unindo arte, ofício e indústria.', 'Registro histórico'],
  ['arquitetura', 'A Sagrada Família, de Gaudí, começou a ser construída em 1882 e segue em obra.', 'Registro histórico'],
  ['arquitetura', 'Paulo Mendes da Rocha, arquiteto paulista, recebeu o Pritzker em 2006.', 'Fundação Hyatt (Pritzker)'],
  ['arquitetura', '"A casa é uma máquina de morar", escreveu Le Corbusier em Por uma arquitetura (1923).', 'Le Corbusier'],
  ['arte', 'Abaporu, de Tarsila do Amaral (1928), inspirou o Movimento Antropofágico.', 'Registro histórico'],
  ['arte', 'Roberto Burle Marx projetou o calçadão de Copacabana e foi pioneiro do paisagismo moderno brasileiro.', 'Registro histórico'],
  // ciência, tecnologia e espaço
  ['espaco', 'A luz do Sol leva cerca de 8 minutos e 20 segundos para chegar até a Terra.', 'NASA'],
  ['espaco', 'A sonda Voyager 1, lançada em 1977, entrou no espaço interestelar em 2012.', 'NASA'],
  ['espaco', 'Marie Curie ganhou dois Prêmios Nobel, em Física (1903) e em Química (1911).', 'Fundação Nobel'],
  ['espaco', 'Ada Lovelace publicou em 1843 o que é considerado o primeiro algoritmo feito para uma máquina.', 'Registro histórico'],
  ['espaco', 'O primeiro e-mail com o símbolo @ foi enviado por Ray Tomlinson em 1971.', 'Registro histórico'],
  ['espaco', 'A World Wide Web foi proposta por Tim Berners-Lee em 1989, no CERN.', 'CERN'],
  ['espaco', 'Santos-Dumont voou com o 14-Bis em Paris, em 1906.', 'Registro histórico'],
  ['ciencia', 'Estima-se que o corpo humano tenha cerca de 37 trilhões de células.', 'Bianconi et al., 2013 (Annals of Human Biology)'],
  // sociedade, história, economia e política (fatos neutros)
  ['historia', 'A Lei Áurea, que aboliu a escravidão no Brasil, foi assinada em 13 de maio de 1888.', 'Registro histórico'],
  ['politica', 'O voto feminino no Brasil foi garantido pelo Código Eleitoral de 1932.', 'Registro histórico'],
  ['politica', 'A Constituição Federal vigente foi promulgada em 5 de outubro de 1988.', 'Congresso Nacional'],
  ['economia', 'O Plano Real foi lançado em 1994 e criou a moeda que usamos até hoje.', 'Banco Central'],
  ['economia', 'Regra dos 72: divida 72 pela taxa de juros ao ano e você tem, aproximadamente, em quantos anos o dinheiro dobra.', 'Regra prática de finanças'],
  ['economia', 'Inflação é o aumento geral e contínuo dos preços; no Brasil, o índice oficial é o IPCA, calculado pelo IBGE.', 'IBGE'],
  ['sociologia', 'Émile Durkheim, um dos fundadores da sociologia, defendia estudar os fatos sociais como "coisas".', 'Durkheim, As regras do método sociológico (1895)'],
];

export const GROUPS = {
  mente: ['🧠 MENTE E HÁBITOS', ['psicologia', 'neuro', 'comportamento', 'dica']],
  arq: ['📐 ARQUITETURA E ARTE', ['arquitetura', 'arte', 'livros']],
  ciencia: ['🔭 CIÊNCIA E ESPAÇO', ['ciencia', 'espaco']],
  sociedade: ['🏛 SOCIEDADE E HISTÓRIA', ['sociologia', 'politica', 'economia', 'historia', 'brasil', 'filosofia']],
  farmacia: ['💊 FARMÁCIA E SAÚDE', ['farmacia']],
};
const KEY = 'gamify-ui:saberseen';
const seenList = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
export const saberCount = () => BANK.length;
/** sorteia 1 item que você ainda não viu (do grupo escolhido ou de qualquer um); quando acaba, recomeça */
export function pickSaber(group = 'all') {
  const topics = group === 'all' ? null : GROUPS[group]?.[1];
  let seen = seenList(), pool = BANK.map((_, i) => i).filter((i) => (!topics || topics.includes(BANK[i][0])) && !seen.includes(i));
  if (!pool.length) { seen = seen.filter((i) => topics && !topics.includes(BANK[i]?.[0])); pool = BANK.map((_, i) => i).filter((i) => !topics || topics.includes(BANK[i][0])); }
  const i = pool[Math.floor(Math.random() * pool.length)];
  try { localStorage.setItem(KEY, JSON.stringify([...seen, i].slice(-BANK.length))); } catch { /* */ }
  const [topic, text, by] = BANK[i];
  return { i, topic, text, by, label: TOPICS[topic] || '💡' };
}
