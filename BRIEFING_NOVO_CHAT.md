# BRIEFING — GAMIFY (leia tudo antes de mexer em qualquer coisa)

Atualizado em 17/11/2026: repositório real conferido (v5.1) e dez rodadas feitas (v5.2 a v5.11; a última: chapéu de palha, limpeza, castigo por prazos e dados reorganizados).
Este arquivo substitui o briefing antigo. O que mudou em relação a ele está na seção "CONFERIDO EM 15/11/2026".

## PASSO 0: ALINHAR ANTES DE TUDO
1. O repositório do GitHub é a verdade. A branch `main` é o app no ar (GitHub Pages).
2. Rode `node --check` em cada `.js` e o teste de fumaça descrito no `CLAUDE.md`.
3. Peça ao dono um backup recente (PERKS AND RULES → BAIXAR) para testar com dados reais. O backup não entra no repositório.
4. Só depois comece os ajustes: branch nova, plano, perguntas com alternativas, Pull Request.
5. O artifact do claude.ai é uma cópia antiga que pode estar desatualizada.

## COMO TRABALHAR COM O DONO
- Arquiteto autônomo, fala português do Brasil, está aprendendo a programar: explique tudo em linguagem simples.
- Escreve com pressa e manda listas grandes. Responda item por item.
- Regras (valem sempre):
  1. Orçamento curto: trabalhe enxuto, sem subagentes à toa, testes focados.
  2. Mostre um PLANO antes de começar e faça perguntas com ALTERNATIVAS de múltipla escolha.
  3. Nunca mexer direto na `main`. Uma branch por rodada + Pull Request para ele aprovar.
  4. Antes de cada rodada grande, crie uma tag/versão do estado atual (ex.: `v5.2`).
  5. NADA de arte com direitos autorais. Só arte original, CC0 ou CC-BY com crédito.
  6. Quando pedir "me manda os arquivos": zips bem separados + um LEIA-ME explicando cada arquivo.
  7. Fim de cada resposta: o que mudou, o que NÃO foi testado (honestidade), próximos passos.
  8. Arquivo novo → adicionar na lista do `sw.js` e trocar a versão do cache.
- Testa no celular Android e no PC. Sempre verifique mobile (390 px) e sem rolagem horizontal.
- Design: pixel art 8/16 bits, visual de jogo (Press Start 2P + Roboto Mono), dia = papel claro, noite = escuro com fogueira. Botões e caixas se adaptam ao tamanho do texto.

## O QUE É O APP
GAMIFY: metas, tarefas e hábitos viram um jogo. Nasceu de uma planilha Excel. HTML + CSS + JavaScript puro (módulos ES), sem build, sem dependências.
Abas: QUESTS, SURVIVAL, AGENDA, SHOP, REFLEXÃO (rota `#domingo`), CONQUISTAS, FILTRO, ROTINA, PERKS AND RULES (rota `#regras`), ARQUIVO. A ordem das abas do topo é arrastável.
Celular: barra de baixo = QUESTS, SURVIVAL, SHOP (centro, destaque), AGENDA, MAIS.
O PRIMO (mascote) é o centro do jogo.

### Mecânicas
- XP/nível: início do nível N = 150·(N−1)² + 500·(N−1). O texto da tarefa manda: ⭐ chata x2, 🛡 casa/família 50 XP, 💰 x1,5, (60XP) valor fixo, ⚔ mini-boss, ↳/> passo, 🎯 meta. Hábitos 5 XP, combo 7d x1,5 / 14d x2, dia perfeito x2.
- Prazos com consequência: concluir atrasada paga −20%/dia (mín. 40%); empurrar o prazo custa XP (10, 20, 40… até 16x; sai do SALDO, nunca do nível; compra `kind:'remarca'`); 1 remarcação grátis por semana (`core.freeResched`); dia de descanso (`core.rests`) sem multa. 3+ atrasadas = ATOLADO: loja trancada.
- Ao abrir o app, tarefas novas de IMEDIATOS/CURTO sem prazo ganham prazo sozinhas (aviso na tela).
- Gold = metade do projeto. Tickets: 1 por nível, 1 por boss, 1 a cada 10 no prazo.
- Loja (taverna/ferreiro/mochila): comprar ANTES de aproveitar; "fiz sem comprar" paga x2. Preços editáveis em PERKS.
- Buffs/debuffs (`STATUS_INFO` em `rules.js`, 24 itens). Clicar no status do dia abre a explicação.
- BOSSES = blocos do grupo `bs` (`quests.bosses[]` → `boss.block`). Lista ↔ BREAKDOWN: `task.link` ↔ `block.src` (sem XP duplo).
- Fogueira de foco = Pomodoro. SOS travei. Loot aleatório ao concluir.
- REFLEXÃO: baú de domingo, PESO (`core.weights`, gráfico), "Como foi a semana".
- Rituais: continuam no SURVIVAL (`core.rituals`, `core.ritualLog`); saíram só da AGENDA.
- Conquistas (`ACHIEVEMENTS` em `rules.js`, 71 itens). Meta do dia sugerida (PERKS). Editor de regras e preços em PERKS.

### O PRIMO
- Visual: um PORQUINHO. Sprite "Free Pets Pack" de Frakassets (CC BY 4.0, crédito obrigatório), em `assets/pets/piglet.png` + `piglet.json`. Animações: parado, feliz, dormindo, andando. Muda com buff/debuff.
- Acessórios (`js/pacc.js`): armário com 18 itens (`WARDROBE` em `pstate.js`) liberados por nível, expedições, bosses e conquistas.
- Falas (`falas.js`): 584 frases, 17 expressões, jeito mineiro + memes. Inclui piadas, ditados e causos de roça (botão 😂 PROSA no cartão do PRIMO; também saem sozinhos de vez em quando). `primoLine(kind | 'auto' | 'tab:<rota>', ctx)`. Cada aba tem uma faixa fina com o rosto dele comentando.
- Curiosidades (`saber.js`): 140 itens verificados com fonte. Nada inventado.
- Expedições: passeio 30 min / feira 2 h / viagem 8 h / aventura 1 dia. Tarefa concluída tira 3 min, 25 min de foco tira 1 h, ticket termina na hora. Ao voltar: seguro (XP normal) ou arriscado (50% dobra, 50% metade).
- Pedido do dia, mascote FAÍSCA (8 fases, nunca regride), diário semanal, amizade (corações).
- Claude como auxiliar e IA do PRIMO (`window.claude.use('sample')`, 4 pontos no código): só funcionam dentro do claude.ai. No app do GitHub Pages esses recursos ficam sem IA.

### REMOVIDO a pedido (não recriar sem o dono pedir)
FEED e notícias; A VILA inteira; BUJO; janela TUDO; CRÔNICA; Google Agenda; aba COFRE; PERGUNTA DO DIA e 3 MICRO-VITÓRIAS; botão "personalizar painel"; bloco PROGRESSO do QUESTS; "Metas para alcançar"; RITUAIS na AGENDA; macaco e polvo.

## ARQUITETURA (`js/`)
- `app.js`: navegação `#hash`, cliques (`data-act`), formulários, janelas, atalhos, barra de baixo, rede de segurança de erro por aba. `render()` redesenha a aba inteira a cada mudança.
- `rules.js`: TODAS as regras (funções puras).
- `actions.js`: tudo que MUDA dados, sempre via `commit(docs, fn, opts)` (desfazer/refazer 40 passos); migrações no `startup()`.
- `store.js`: carrega/salva (banco do claude.ai ou `localStorage`); `S` = estado global.
- `backup.js`: proteção dos dados no aparelho (cópia automática diária, lembrete de backup, restaurar). Toda troca geral de dados passa por `restoreDocs()`.
- `review.js`: entrevista do dia e revisão de retorno com o PRIMO.
- `trip.js`: modo VIAGEM/VISITAS (telas e botões). Regras em `rules.js` (`tripNow`, `tripDay`) e dados em `actions.js` (`startTrip`, `endTrip`).
- `drive.js`: sync com Google Drive (OAuth GIS, escopo `drive.appdata`, arquivo `gamify-backup.json`). O dono usa no dia a dia para ter os dados no celular e no PC. O Claude não consegue testar o login real: só com um Google simulado.
- `primo.js` (telas e animação), `pnew.js` (desenho NOVO em alta definição), `pdraw.js` + `pacc.js` (porquinho clássico em pixel, reserva), `pstate.js`, `falas.js`, `saber.js`, `claude.js`: o PRIMO.
- `v3.js`, `v35.js`, `v4.js`: legado por versões. Imports circulares (primo ↔ v35 ↔ v3): cuidado.
- `kingdom.js`, `interiors.js`, `sky.js`: sobras da época da VILA, ainda usadas em parte (cenas, céu, estação). Têm funções que ninguém usa mais.
- `views/*.js`: uma tela por arquivo. `audio.js` (sons e lo-fi gerados no aparelho), `fx.js`, `icons.js`, `ui.js`, `util.js`.
- CSS: `css/app.css`. PWA: `manifest.json` + `sw.js` (lista de arquivos guardados para uso offline; ao criar arquivo novo, adicione na lista e troque a versão `V`).
- Assets: ícones PWA, `assets/pets/*`, `dungeon.png` + `town.png` (Kenney CC0, ícones da SHOP), `audio/fire.mp3` (CC0; gravação real da fogueira, tocada junto com o lo-fi; se não carregar, o app usa um som gerado).

## DADOS
- No GitHub Pages (app no ar): `localStorage` do navegador. Documentos com prefixo `gamify:` (core, quests, marks, loja, arq-AAAA-MM); preferências do aparelho com `gamify-ui:`.
- Os dados ficam POR ENDEREÇO e POR APARELHO: mudar de endereço, limpar os dados do navegador ou trocar de celular = app vazio. Proteção: BAIXAR/IMPORTAR backup (manual, com lembrete a cada 7 dias) + cópias automáticas no próprio navegador. O Drive ainda não foi testado.
- Cópias automáticas (`backup.js`): `gamify-bak:AAAA-MM-DD` (uma por dia, tirada ao abrir o app antes das migrações; ficam as 3 últimas) e `gamify-bak:pre` (estado anterior à última importação/restauração/download do Drive). Elas NÃO protegem de limpar os dados do navegador. Se faltar espaço, `store.js` apaga as cópias para salvar os dados de verdade. Preferências: `gamify-ui:lastBackup`, `gamify-ui:bakSnooze`, `gamify-ui:bakPreAt`.
- No claude.ai: banco do artifact, coleção `gamify` (máx. 256 KB por documento).
- Campos do `core` desta fase: `lastOpen` (última visita), `windows[]` (janelas do dono), `labels{}` (nomes personalizados); nos blocos: `win` (janela) e `rev` (revisado); nos rituais: `plan` (dia marcado); nas tarefas: `who` e `dep` (aguardando).
- Campos do `core`: `trip` (viagem em andamento: `{ from, until }`), `trips[]` (viagens encerradas: `{ from, to }`), `primo`, `weights`, `rests`, `settings.rules`, `bonus[]`, `migrations[]`, `savings[]` (o que foi guardado para o BOSS DO CAPÍTULO, botão GUARDEI), `cofre` (lido em `rules.js` para NO AZUL/VAZANDO; a aba foi removida e os dados atuais do dono não têm esse campo), `inbox`, `claude`.
- Migrações já aplicadas nos dados do dono: `gestao`, `bosses4`, `shop4`, `vila-off`, `v5-clean`.
- ARMADILHA QUE JÁ QUEBROU O QUESTS: ao REMOVER um tipo de dado salvo, o dado antigo continua lá e o código novo quebra. Sempre trate valores legados e crie migração idempotente.

## HOSPEDAGEM
- GitHub Pages, repositório PÚBLICO, publicado a partir da `main`. Qualquer pessoa pode ler o código (não os dados: esses ficam no aparelho).
- No código há referências pessoais do dono (comentários, frases do mascote, texto enviado à IA). Podem ser trocadas por genéricas se ele quiser.
- Se um dia o repositório virar privado: GitHub Pages grátis deixa de publicar; alternativas grátis são Cloudflare Pages ou Netlify (o endereço muda → dados do navegador não acompanham; use backup).

## LICENÇAS
- Porquinho: "Free Pets Pack" por Frakassets, CC BY 4.0 (https://frakassets.itch.io/free-pets-pack). Crédito em PERKS (rodapé) e em `assets/pets/LICENCA-Frakassets-CC-BY-4.0.txt`.
- Ícones da loja: Kenney (CC0). Fogueira: "Fireplace sound loop" (CC0). Lo-fi: gerado no aparelho.
- Fontes: Press Start 2P e Roboto Mono (Google Fonts, licença aberta), carregadas da internet.

## CONFERIDO EM 15/11/2026 (diferenças entre o briefing antigo e o repositório real)
1. O ZIP enviado pelo dono e o repositório são idênticos. Um único envio no histórico ("Add files via upload"), sem tags.
2. Não existem no repositório (existiam só no ambiente antigo): `CLAUDE.md`, este briefing, `GUIA_LANCAMENTO.md`, `tools/pack_pages.py`, `tests/rules.test.mjs`. O cartão do Drive em PERKS ainda manda ler o `GUIA_LANCAMENTO.md`, que não existe.
3. `audio/fire.mp3` (469 KB) é usado pelo lo-fi (`audio.js`), mas não está na lista offline do `sw.js`: fica guardado só depois de tocar a primeira vez.
4. Falas: 413 no banco (o briefing antigo dizia ~480).
5. `core.cofre` continua sendo lido pelo código, mas os dados atuais do dono não têm esse campo. `core.savings` é outra coisa (poupança do boss do capítulo).
6. `manifest.json` ainda descreve o app como "jogo de vila" (a vila foi removida).
7. `sw.js` não guarda `assets/icon-maskable-512.png` para uso offline; e se um arquivo da lista faltar, ele falha em silêncio.
8. Todos os `.js` passam no `node --check`. Com os dados reais do dono: as 10 abas abrem sem erro e sem rolagem horizontal em 390 px e 1366 px.
9. Velocidade medida (simulando celular médio): redesenhar uma aba leva de 0,06 a 0,3 s. As mais pesadas: PERKS, CONQUISTAS (7.700 elementos na tela), FILTRO e AGENDA.
10. Tamanho dos dados do dono: maior documento com 37 KB (longe do limite).

## RODADA 1 — v5.2 (15/11/2026)
- Novo `js/backup.js`: cópia automática diária, cópia antes de trocas gerais, lembrete de backup (3 dias de jogo sem nenhum backup; depois a cada 7 dias; botão DEPOIS adia 1 dia), painel em PERKS → AJUSTES para restaurar, pedido de armazenamento persistente ao navegador.
- Corrigido: importar/restaurar não deixa mais meses antigos do ARQUIVO "ressuscitarem" (só no modo local).
- `sw.js`: versão `gamify-v5-2`, guarda `js/backup.js` e o ícone maskable, e guarda os arquivos um por um (um arquivo faltando não derruba os outros).
- `manifest.json`: descrição sem "vila". Cartão do Drive: não cita mais o guia que não existe e avisa que está em teste.
- Os itens 2 (texto do guia), 6 e 7 da lista acima ficaram resolvidos.

## RODADA 2 — v5.3 (15/11/2026): bugs e praticidade
O dono usa muito mais o PC. Pedidos atendidos:
- Clicar no texto de uma tarefa ligada ao BREAKDOWN abre as configs (antes pulava pro BREAKDOWN); o chip 🔗 BREAKDOWN leva pra lá.
- Prazo único entre tarefa da lista e bloco ligado (`syncLink` em `actions.js`): muda de um lado, muda do outro; mudar pelo bloco segue a regra de remarcação da tarefa. Ao abrir, pares diferentes são igualados (vale o da tarefa).
- Painel da direita do QUESTS não volta mais pro topo a cada clique (a rolagem própria é guardada no `render()`).
- Texto não se perde: sair de uma linha "+ adicionar" com texto já adiciona (sem Enter); o texto digitado sobrevive a redesenhos; na janela de tarefa/bloco/boss o texto salva ao sair do campo e em qualquer forma de fechar.
- Botão RECOLHER TUDO / ABRIR TUDO na barra das janelas (vale para a janela aberta).
- Barra das janelas do QUESTS presa no topo ao rolar (só em tela grande).
- ⬛ parados com botão próprio (MOSTRAR/OCULTAR PARADOS, preferência `gamify-ui:stalled`), separado do MOSTRAR FEITAS; vale para blocos e tarefas com a cor PARADO.
- Recorde de sequência por hábito (`R.bestStreak`): 🏆 no SURVIVAL e na dica do cartão de hábitos.
- Drive: o app guarda a conta usada (`gamify-ui:gmail`, lida do próprio Drive) e a chave de acesso por ~1 h (`gamify-ui:gtok`), para o Google não perguntar "qual conta" a cada abertura. Botão TROCAR DE CONTA em PERKS.
- BOSS DO CAPÍTULO: botão ↩ RETIREI (lançamento negativo em `core.savings`; a vida do boss sobe), limite = o que está guardado no capítulo, e "histórico" com ✕ para apagar lançamento errado. Retirada não dá o bônus POUPADOR.
- Janela da tarefa sem o campo Cor (o dono nunca usou). Tarefas antigas que já tinham cor continuam com ela; a cor do BLOCO continua (é por ela que se marca ⬛ PARADO).
- Publicado na `main` em 15/11/2026 a pedido do dono. Ponto de retorno: branch `versao-v5.1` (o app como estava antes das rodadas 1 e 2).

## RODADA 3a — v5.4 (15/11/2026): limpeza, viagem e PRIMO
- Removido por ser redundante (o dono confirmou): campo "↗ Também em" e botões ↑ ↓ das janelas de tarefa e bloco (dados antigos de `pin` continuam valendo); botão COPIAR BACKUP (o BAIXAR cai nele sozinho se o navegador bloquear o download); atalhos do cartão COMANDOS que repetiam as abas.
- COMANDOS agora: ATUALIZAR, VIAGEM, DESCANSO, REDENÇÃO, SOS TRAVEI, BACKUP.
- Barra das janelas do QUESTS: RECOLHER TUDO, DISTRIBUIR e um menu MOSTRAR ▾ (FEITAS / PARADOS).
- IMPORTAR backup aceita o arquivo `.json` direto (antes só colando o texto).
- **Modo VIAGEM/VISITAS** (botão ✈ em COMANDOS): pode ser ligado com data retroativa (até 30 dias, para quando esquecer). Enquanto dura: hábitos em branco viram folga (sem recalcular o XP do dia: viajar não dá nem tira XP), a sequência da meta do dia não quebra, não há multa de atraso, e uma faixa no topo mostra EM VIAGEM com o botão VOLTEI. Na volta: prazos que venceram durante a viagem andam o mesmo número de dias pra frente, sem custo, e o dono escolhe as tarefas de volta (guardar malas, lavar roupa, revisar agenda…), criadas para hoje. Se a data de volta prevista já passou, o app pergunta ao abrir.
- PRIMO: +171 falas (30 piadas, 24 ditados, 10 causos, falas de viagem e mais falas caipiras nas reações); botão 😂 PROSA.
- `GUIA_SPRITES_IA.md`: guia para o dono gerar o porquinho novo, acessórios e cenários com IA de imagem (Higgsfield), com prompts prontos e a lista de arquivos a enviar.

## RODADA 4a — v5.5 (15/11/2026): listas automáticas e AGUARDANDO
- **LISTAS automáticas pelo prazo.** As listas agora são HOJE, AMANHÃ, ESTA SEMANA, DEPOIS, SEM PRAZO e AGUARDANDO (`R.AREAS`, `R.AREA_KEYS`). A DATA decide a lista: `R.listOf(t)`. `t.area` continua existindo, mas é recalculado sozinho por `syncLists()` em `actions.js` (a cada alteração e ao abrir o app). Atrasada fica em HOJE. As listas antigas (imed/curto/longo) só existem como nomes para tarefas arquivadas (`R.areaName`).
- Adicionar numa lista já dá a data dela (`R.dueForList`). Arrastar para outra lista muda a data; empurrar pra frente segue a regra de remarcação (pergunta antes, `dropTaskSmart` em `v4.js`); mudar a ordem dentro da mesma lista não mexe em nada. Nada mais ganha prazo sozinho ao abrir.
- **AGUARDANDO** junta: tarefas das listas em espera, tarefas em espera DENTRO de blocos (continuam morando no bloco) e blocos inteiros em espera.
- **Um campo só de "aguardando quem ou o quê"** na janela da tarefa: `t.who` (pessoa/motivo) e `t.dep` (id de outra tarefa). Preencher manda pra AGUARDANDO; limpar devolve. Quando a tarefa em `dep` é concluída, cancelada ou arquivada, a que esperava volta sozinha e o app avisa (🔓). FILTRO ganhou a coluna e o filtro PESSOA.
- **DISTRIBUIR** novo: escolha entre "só as que já tinham prazo", "só dar data às sem prazo dos blocos" e "todas". Capacidade de cada dia = 80% do ritmo real do dono naquele dia da semana (`R.weekdayPace`, `R.dayCapacity`), limitado pelo máximo dos AJUSTES; ordem: prioridade, ⭐, mais atrasada primeiro.
- NÃO feito nesta rodada (parou por limite de uso): tudo que está em PRÓXIMAS RODADAS abaixo.

## RODADA 5 — v5.6 (16/11/2026): retorno, rituais, loja, REVISADO, fogos, janelas e nomes
- **Entrevista do dia / revisão de retorno** (`js/review.js`): na 1ª abertura do dia o PRIMO conduz 3 passos (hábitos de ontem em branco, atrasadas com ✓ / ⏳ / ✕, escolher a primeira de hoje → ▶ FAZENDO). Com 3+ dias sem abrir (`core.lastOpen`, calculado no `startup()` em `S._gap`) vira REVISÃO DE RETORNO, com o atalho "foi viagem" (liga o modo VIAGEM desde o dia seguinte à última visita). Botão REVISAR O DIA em COMANDOS. A caixinha "não mostrar" (`gamify-ui:brief-off`) desliga só a diária; o retorno continua. Ela substitui a antiga "abertura do dia" automática (que segue acessível em PERKS).
- **Rituais com dia marcado**: `r.plan` ("vou fazer em"), pelo botão 📅 na linha do ritual ou na janela dele. `R.ritualPlan`, `R.ritualDates`. Enquanto houver dia marcado, ele vale no lugar do aviso automático; ✓ FIZ limpa. Na AGENDA: linha RITUAIS na linha do tempo, 🔁 na faixa de dias e cartão "Rituais · próximos 14 dias".
- **Loja**: migração `shop5` adiciona ACORDAR TARDE (taverna, 90 XP, provisório) e JOGO NA STEAM (forja, JOGOS, nível 2, repetível). Nova aba FORJADOS com tudo que já foi forjado.
- **REDENÇÃO**: só "1 AULA DE CURSO" ou "MEDITAÇÃO"; padrão `RD_XP` passou de 30 para 40 (pedido do dono).
- **REVISADO**: botão no fim do bloco, `b.rev` = hora da marcação, vale 24 h (`R.reviewed`). É só um selo, não dá XP.
- **Fogos de artifício** (`fx.fireworks` + som `fireworks`): boss, bloco fechado, tarefa ⚔ ou ⭐, ou tarefa que rendeu 60 XP ou mais.
- **Janela mãe**: LISTAS fica sempre em primeiro, com cor própria. Botão ＋ cria **janelas do dono** (`core.windows = [{ id, name, base }]`). Uma janela é uma gaveta: o bloco guarda `b.win` e continua com `b.group` = tipo-base (bd, tr, cap, gs), então nenhuma regra de XP muda. Apagar a janela devolve os blocos ao tipo-base. Chave da aba: `w:<id>`.
- **Nomes personalizáveis** (`core.labels`, editor em PERKS → "Nomes das listas e janelas"): `R.applyLabels` troca só o texto de `R.AREAS`, `R.GROUPS` e `R.TAB_NAMES`; as chaves internas não mudam.

## RODADA 6 — v5.7 (16/11/2026): AGUARDANDO só com tarefas principais + cor da janela
- A lista AGUARDANDO mostra só as tarefas PRINCIPAIS (as das LISTAS). Subtarefas em espera e blocos em espera não aparecem mais ali: ficam na janela deles. Motivo do dono: tudo passa pela LISTAS antes de ir pras outras janelas.
- Tarefa da lista ligada a um bloco (`t.link`): o selo 🔗 mostra o NOME da janela onde o bloco está (antes dizia sempre BREAKDOWN) e a linha ganha uma faixa na COR daquela janela (`data-g` + variável CSS `--wc`). As abas das janelas têm a mesma cor na borda de baixo.
- Se o bloco ligado é marcado como "só aguardando", a tarefa principal dele vai pra AGUARDANDO (`syncLists`).

## RODADA 7 — v5.8 (17/11/2026): economia + PRIMO novo
**Economia** (o dono mandou 3 PDFs de referência: economia de jogos/Octalysis, boss battle e protocolo neurocognitivo; a análise usou os 23 dias de dados dele). Diagnóstico: tarefa pagava pouco (média 9 XP) perto dos preços; o índice de preço chegava ao máximo justamente ao bater a meta; multas se empilhavam (dobro + DEVENDO + índice); 93% do XP ia para a taverna e quase nada para a forja. Ele aprovou o pacote:
- `XP_LIST` 10→15, `XP_SUB` 5→8, `XP_STEP` 3→4, `XP_MINI` 30→40 (nada do passado é recalculado).
- `econIndex`: compara a média de 14 dias com a META DO DIA; limites 0,9–1,15 (era base 100 e 0,8–1,4).
- "Fiz sem comprar": `R.DEBT_MULT` = 1,5 (era 2). Remarcação: teto `R.RESCHED_CAP` = 8× (era 16×).
- Curva de níveis, hábitos, rituais, forja e preços base da taverna: não mexidos.

**PRIMO novo** (artes geradas pelo dono no Higgsfield; 78 arquivos, ~290 MB, que NÃO entram no repositório):
- `tools/primo_artes.py` prepara as artes (recorte do fundo, quadros dos vídeos, redução) e gera `assets/primo/` (~1,9 MB): 5 folhas de animação (parado, feliz, dormindo, andando, comendo), `rostos.webp` (17 expressões), `faisca.webp` (8 fases), `acc/` (24 peças × 2 vistas), `cena/` (6 lugares × dia/tarde/noite) e `primo.json` (medidas).
- `js/pnew.js` desenha: `drawPortraitNew`, `drawFace`, `drawMascotNew`, tabela `ACC` (posição de cada acessório na vista de frente e de lado). Dormindo, ele tira os acessórios.
- `js/primo.js`: as telas do desenho agora têm 4× a resolução (`K`); `artOn()` escolhe entre o novo e o clássico; `scenePick()` escolhe o cenário (expedição → estrada/feira; noite → fogueira; manhã cedo e almoço → cozinha; horário de trabalho → escritório; fim de tarde e fim de semana → varanda) e a luz (dia, tarde, noite).
- O porquinho clássico em pixel continua como reserva: seletor "Desenho do PRIMO" em PERKS (`gamify-ui:primo-art`) e volta automática se as artes não carregarem.
- Armário: 6 peças novas (`novo: true` em `WARDROBE`), que só aparecem na arte nova. Ícone do app trocado pelo do dono.
- O cenário da fogueira (dia e noite) tem um porquinho pequeno desenhado junto ao fogo; o dono escolheu deixar.

## RODADA 8 — v5.9 (17/11/2026): armário desligado
- O dono achou os acessórios bugados na arte nova e pediu para tirar a opção por enquanto, mantendo o código. `WARDROBE_ON = false` em `pstate.js`: o botão ARMÁRIO some e o PRIMO aparece sem acessório (nos dois desenhos). A escolha antiga continua salva em `core.primo.wear`. Para religar: `WARDROBE_ON = true` e rever as posições (tabela `ACC` em `pnew.js`), principalmente durante o pulo, o andar e o "comendo".
- O dono anota os pedidos num bloco chamado APP, na janela BREAKDOWN do próprio app. O Claude só enxerga esse bloco por um backup (PERKS → BAIXAR BACKUP): peça um backup novo sempre que ele disser "está anotado no bloco APP".
- Do bloco APP de 15/11 ficaram dois itens sem fazer, por estarem ambíguos (perguntar antes): "BOTÃO DE RESETAR PROGRESSO nas configs" (zerar o quê?) e "REMOVER OPÇÃO DE ÁREA … ir para o local certo apenas colocando a cor" (dependia de um print).

## RODADA 9 — v5.10 (17/11/2026): pedidos do bloco APP (backup de 17/11)
Feitos:
- MOSTRAR FEITAS (bug): concluídas e canceladas somem de verdade quando FEITAS está desligado (antes as do próprio dia ficavam).
- ESVAZIAR o arquivo (bug: só liberava meses com mais de 30 dias): agora escolhe quaisquer meses. O XP de cada dia vai para `core.legacy.days` (`{ data: [xp, concluídas] }`), somado em `R.idx`, então nível, meta do dia, sequências e preços não mudam.
- Listas de 3 em 3 (PC); dentro de cada lista, ordem pela data. Blocos das janelas em mosaico (CSS columns, `.masonry`): bloco aberto não deixa buraco.
- REVISADO também nas listas (`core.rev`, `R.listReviewed`); aba da janela fica verde (`.allrev`) quando todas as listas com tarefa, ou todos os blocos ativos, estão revisados.
- BOSSES em vermelho e em destaque na barra.
- Cores dos blocos: URGENTE (vermelho), FAZENDO (amarelo), ESTÁVEL (verde), PARADO (preto). Migração `cores5`: laranja → verde.
- Tarefa ligada a bloco: só uma bolinha na cor da janela (`.lnk-dot`), que leva ao bloco. VAI E VOLTA ganhou cor própria (magenta).
- Prazo de subtarefa não passa do prazo final do bloco (`updateTask` recusa; campo de data limitado; DISTRIBUIR respeita).
- 📌 Fixar um bloco no painel da direita (`gamify-ui:pinblock`), com a linha de adicionar: anotar sem trocar de janela.
- Topo: REFAZER sempre ao lado do DESFAZER, saíram fogueira de foco e SOS (continuam no cartão do PRIMO e em COMANDOS), entrou TELA CHEIA.
- Botão direito no quadradinho (ou segurar o dedo, no celular) cancela a tarefa; de novo reabre; ↩ desfaz.
- Entrevista do dia: bronca do PRIMO pelos hábitos que ficaram em branco ontem; nas atrasadas, um campo de data para escolher o dia de remarcar (segue a regra de custo).
- AGENDA: saiu a linha CARGA DO DIA da linha do tempo.
Pendentes (precisam de decisão do dono; perguntar com alternativas): remover redundâncias (botões de status etc.); punição acumulada por prazos perdidos; repensar a loja (ele quase não compra; usa mais para organizar); IA para reorganizar metas, redistribuir o bloco GESTÃO e planejar (a IA do app só existe no claude.ai; o Claude da sessão pode fazer pelo backup, mas o dono precisaria importar e não mexer no app no meio); imagens e prints nas tarefas (onde guardar: o localStorage tem ~5 MB); repaginar a janela BOSSES; repaginada visual (modo noturno com as cores do claro, menus, menos texto, mais visual, botões e espaços); sprites no topo de cada aba; previsão do tempo (localização + serviço grátis); mais conquistas; novos sprites. Mecânica de COMPROMISSOS da AGENDA: explicada ao dono; ele nunca usou (candidata a remover).

## RODADA 10 — v5.11 (17/11/2026): chapéu, limpeza, castigo e dados reorganizados
- PRIMO: só o **chapéu de palha** (identidade caipira dele), com o botão 🤠 CHAPÉU para tirar e pôr (`PS.hatOn`, `PS.toggleHat`; dado `core.primo.wear.hat` = 'palha' ou null). Armário e os outros acessórios foram APAGADOS do código e dos arquivos (só `assets/primo/acc/palha-*.webp` ficou). Migração `chapeu5` põe o chapéu de volta uma vez.
- Removidos a pedido: COMPROMISSOS da AGENDA (`core.commitments` não é mais lido) e os botões ABERTA/FAZENDO da janela da tarefa (o status `doing` continua existindo internamente: entrevista e SOS usam). A Fila de prazos ficou.
- **Castigo por prazos estourados** (opção A do dono): cada tarefa aberta que passa do prazo conta 1, ao abrir o app (`t.lateSeen` evita contar duas vezes; viagem não conta). A cada `R.BLOW_EVERY` (5), a loja fica `R.BLOW_MULT` (1,2) mais cara por `R.BLOW_DAYS` (3) dias: status 💥 CASTIGO. Dados: `core.blow = { n, hits[] }`. Migração `estouro5`: o que já estava atrasado antes não contou. Contador na AGENDA.
- Revisão e simplificação do código (4 revisores): regra única do prazo máximo da subtarefa (`R.dueCap`), abas do QUESTS por `R.tabBlocks` / `R.tabReviewed`, bloco fixado via `togglePin` (quests.js), sem restos da CARGA DO DIA, do armário e do "prazo automático ao abrir". Corrigido o botão OUTRA ▶ das curiosidades (tinha sido apagado junto com o armário).
- **Dados do dono reorganizados** (ele pediu e esperou sem mexer no app): feito com o próprio app sobre o backup de 17/11, entregue como arquivo para IMPORTAR (não entra no repositório). 23 itens do bloco APP concluídos; GESTÃO dividido em REDES SOCIAIS, PRESENÇA ONLINE, FINANCEIRO E CONTRATOS e ORGANIZAÇÃO E ARQUIVOS; duplicadas canceladas (APP na lista, GOOGLE MEU NEGÓCIO na gestão); ligações lista↔bloco (CODAR E AJUSTES APP ↔ APP, ORGANIZAR PAPÉIS ↔ ORGANIZAÇÃO E ARQUIVOS); dependências para testar (ORGANIZAR CASA espera ⚔ DECIDIDO; ⚔ MUDANÇA FEITA espera ⚔ APÊ ESCOLHIDO); mini-bosses nas metas vazias (90 KG, 600 SEGUIDORES, PROJETO INDICAÇÃO, MORAR SOZINHO); PADRÕES com prazo novo; DISTRIBUIR deu data a 24 próximas ações.
- Loja (opção B: recompensa automática ao bater a meta): o dono gostou, mas quer pensar melhor antes. NÃO implementado.

## RODADA 11 — v5.12 (17/11/2026): colunas fixas e janela mãe
- O mosaico com CSS columns (v5.10) redistribuía os blocos entre colunas ao abrir um bloco e virava 2 colunas com um bloco grande: o dono não gostou. Agora são **3 colunas fixas** (`inColumns` em `v35.js`; `cols3` em `quests.js`): o item i fica sempre na coluna i % 3, e abrir um bloco só empurra os de baixo dele. Vale para LISTAS (`arrange(..., { cols: 3 })`), janelas de blocos e BOSSES. No celular vira uma coluna só, na ordem original (`order`). O arrastar das listas ordena por `data-ord`.
- AGENDA: saiu a faixa "📊 Carga do dia · 6 semanas" (era isso que o dono chamava de "carga do dia da linha do tempo") e o arrastar da fila até ela.
- **LISTAS = janela mãe de verdade**: em `syncLists()`, todo bloco ativo (não fechado nem parado) sem tarefa nas LISTAS ganha uma, ligada a ele (`t.link`, `b.src`, `t.mother = true`), com o prazo final do bloco. Vale para blocos novos em qualquer janela e para os bosses. Apagar o bloco apaga a tarefa-mãe criada sozinha.
- Pendente: reorganização dos dados do dono (precisa de backup NOVO, para não perder o que ele fez depois da importação de 17/11) e as anotações restantes do bloco APP.

## PRÓXIMAS RODADAS
Princípio do dono: qualidade de vida e praticidade; tudo integrado como um ecossistema; simples no fim das contas (o app não pode tomar o tempo das tarefas). Ele aceita sugestões melhores que o pedido. **Sem mecânicas novas por enquanto** (pedido dele em 16/11).
- Acompanhar a economia nova por umas duas semanas e reavaliar com os dados (saldo sobrando? forja andando?). Preços de ACORDAR TARDE e JOGO NA STEAM seguem provisórios.
- Ajustes finos do PRIMO novo se ele pedir: posição de algum acessório (tabela `ACC` em `pnew.js`), o vídeo opcional "cansado", escolher o cenário à mão, refazer a fogueira sem o porquinho.
- Mecânicas sugeridas e NÃO pedidas (só se ele quiser): "o que eu faço agora?", fechamento do dia, combo de foco, dia mínimo.

## LIÇÕES TÉCNICAS
- Playwright (Chromium) já vem instalado: `require('playwright')`. Servidor local: `python3 -m http.server 8080`.
- No ambiente do Claude, enviar TAG para o GitHub pode ser recusado (só branch passa). Alternativa: o dono cria a versão em GitHub → Releases → "Draft a new release".
- Para testar o PRIMO acordado à noite: mock de `Date`.
- `commit()` tira foto de 4 docs para desfazer; o cache de totais depende de `S._epoch++`.
- O XP do topo anima: leitura no meio dá número intermediário.
- Google Fonts precisa de internet na 1ª vez.
- A fonte pixel desenha mal acentos (há `deaccent()` para rótulos).

## BACKLOG
- Escrever o passo a passo do ID de acesso do Google Drive (o dono já tem o dele funcionando).
- Otimizações ainda não feitas: abrir da cópia offline primeiro e fontes dentro do app; aliviar abas pesadas (CONQUISTAS, PERKS, FILTRO); trocar nomes pessoais do código; remover sobras da VILA.
- Trocar o mascote por um com fases de vida reais (Gridwright Virtual Pet Kit, pago, não redistribuir os arquivos).
- Mais frases e curiosidades; evolução visual do porquinho; sons por expressão.
- COFRE (`core.cofre`) ligado à planilha de gastos.
- Tarefas compartilhadas do casal (precisa de servidor).
- Expedições com eventos mais variados.
