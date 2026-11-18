# GAMIFY — guia rápido para quem for mexer no código

Manual completo: `BRIEFING_NOVO_CHAT.md`. Ele é PRIVADO (não fica no repositório, assim como os prompts de arte): o dono anexa no chat.
Se não veio, peça antes de qualquer mudança. No fim da rodada, entregue a versão atualizada a ele. O `.gitignore` bloqueia esses arquivos.

## O que é
Metas, tarefas e hábitos viram um jogo. HTML + CSS + JavaScript puro (módulos ES). Sem build, sem dependências, sem servidor.
Publicado pelo GitHub Pages a partir da branch `main` (repositório público). **`main` é o app no ar.**

## Regras de trabalho (do dono)
1. Nunca mexer direto na `main`. Uma branch por rodada + Pull Request para o dono aprovar.
2. Antes de cada rodada grande: marcar uma tag/versão do estado atual (ex.: `v5.2`).
3. Mostrar um PLANO antes e perguntar com alternativas de múltipla escolha.
4. Explicar tudo em português simples (o dono está aprendendo a programar). Responder item por item.
5. Trabalhar enxuto: sem subagentes à toa, testes focados.
6. Testar no celular (390 px, sem rolagem horizontal) e no PC antes do Pull Request.
7. No fim de cada resposta: o que mudou, o que NÃO foi testado, próximos passos.
8. Arte: só original, CC0 ou CC-BY com crédito. Nada com direitos autorais.
9. Arquivo novo usado pelo app → adicionar na lista do `sw.js` e trocar a versão `V` do cache.
10. O repositório é público: não escrever dados pessoais do dono nem as ideias/planos dele em arquivos novos (briefing, prompts e planos vão só para ele). Os PDFs das aulas têm marca d'água com dados pessoais: nunca copie trechos deles para o repositório.

## Rodar e testar
```bash
python3 -m http.server 8080
```
Abrir `http://localhost:8080`. Checar sintaxe: `node --check js/arquivo.js` (um por arquivo).

Teste de fumaça (Playwright já vem instalado no ambiente do Claude): carregar um backup do dono no `localStorage`
(chaves `gamify:core`, `gamify:quests`, `gamify:marks`, `gamify:loja`, `gamify:arq-AAAA-MM`; e `gamify-ui:tour=1` para pular o tour),
abrir cada aba (`#quests`, `#survival`, `#agenda`, `#shop`, `#domingo`, `#conquistas`, `#filtro`, `#rotina`, `#regras`, `#arquivo`)
em 390 px e 1366 px e conferir: nenhum erro no console, nenhum `.banner.bad`, `scrollWidth <= clientWidth`.
No celular as abas de cima ficam escondidas (use `state: 'attached'` ao esperar por `#tabs a`).
O backup do dono NUNCA entra no repositório.

## Mapa do código (`js/`)
- `app.js` — navegação por `#hash`, cliques (`data-act` → `ACTIONS`), formulários (`data-form` → `FORMS`), janelas, atalhos, relógio. `render()` redesenha a aba inteira.
- `rules.js` — todas as regras do jogo (funções puras, sem mexer em dados).
- `actions.js` — tudo que MUDA dados, sempre via `commit()` (desfazer/refazer). Migrações rodam no `startup()`.
- `store.js` — carrega/salva. `S` = estado global. No GitHub Pages os dados ficam no `localStorage` do aparelho.
- `backup.js` — proteção dos dados no aparelho: cópia automática diária (`gamify-bak:*`), lembrete de backup, restaurar.
- `review.js` — entrevista do dia e revisão de retorno (o PRIMO conduz, na 1ª abertura do dia). Também a migração do mês e o lembrete do boss parado.
- `bujo.js` — anotar rápido (botão +), arrastar a tarefa no celular, aviso de HOJE cheio e pato de borracha. Liga/desliga em PERKS → 🧠 (`settings.neuro`).
- `telas.js` — peças da repaginação: `tiles()` (faixa de quadrinhos de resumo, cor pelo significado em `data-tone`, `tip` = legenda) e o índice de PERKS.
- `mapa.js` — REFLEXÃO: rascunho que some em 2 dias (`core.scratch`) e mapa mental escrito como lista recuada (`core.mapa`): desenha em SVG, baixa PNG, anexa na tarefa e vira bloco.
- `trip.js` — modo VIAGEM/VISITAS (congela o jogo; na volta empurra prazos e cria as tarefas de chegada).
- `imgs.js` — imagens e prints nas tarefas: guardadas no aparelho (IndexedDB) e na pasta escondida do app no Drive; na tarefa fica só `t.imgs = [{ k, g }]`.
- `drive.js` — sincronização com Google Drive. O dono usa no dia a dia (celular e PC); o Claude não consegue testar o login real, só com um Google simulado (rotas do Playwright).
- `primo.js` (telas e animação), `pnew.js` (desenho novo, com as artes de `assets/primo/`), `pdraw.js` + `pacc.js` (porquinho clássico em pixel, reserva; `pacc.js` só desenha o chapéu de palha), `pstate.js`, `falas.js`, `saber.js`, `claude.js` — o mascote PRIMO.
- `tools/topo_artes.py` — não é do app: prepara as imagens do topo das abas e as poses do PRIMO.
- `tools/primo_artes.py` — não é do app: prepara as artes do PRIMO (recorta fundo, corta quadros dos vídeos, reduz) quando o dono gera imagens novas.
- `v3.js`, `v35.js`, `v4.js` — recursos adicionados por versão (legado; têm imports circulares, cuidado).
- `postit.js` — post-it flutuante do bloco fixado (arrasta, minimiza, aparece em todas as abas).
- `views/*.js` — uma tela por arquivo. O FILTRO não tem aba própria: `filtroBody()` é desenhado dentro da AGENDA (`#filtro-v`); `#filtro` redireciona (`HIDDEN_TABS` em `app.js`). `css/app.css` — todo o visual. `sw.js` — modo offline.

## Armadilhas
- Ao REMOVER um tipo de dado salvo, o dado antigo do dono continua existindo: trate valores legados e crie migração idempotente (registrada em `core.migrations`).
- Trocar TODOS os dados de uma vez (importar, restaurar, Drive): use `restoreDocs()` de `backup.js`, nunca `replaceAll()` direto. Ele guarda antes uma cópia do estado atual.
- As LISTAS do QUESTS são automáticas: a data decide a lista (`R.listOf`). Não grave `t.area` na mão: `syncLists()` (em `actions.js`, dentro do `commit()`) recalcula. Para pôr uma tarefa numa lista, mude a data (`R.dueForList`).
- LISTAS é a janela mãe: `syncLists()` cria uma tarefa nas LISTAS (`t.mother`) para todo bloco ativo sem `b.src`, menos os BOSSES (são as próprias mães). Blocos e listas ficam em 3 colunas FIXAS (`inColumns` em `v35.js`): nunca use CSS columns (redistribui entre colunas).
- Janelas criadas pelo dono são gavetas: o bloco guarda `b.win`, mas `b.group` continua sendo o tipo-base (bd, tr, cap, gs). Nunca invente um `group` novo: as regras de XP dependem desses quatro. Para saber a aba de um bloco, use `R.winOf`.
- Nomes de listas e janelas são personalizáveis (`core.labels` → `R.applyLabels`). Em código, compare sempre pela CHAVE (`hoje`, `bd`…), nunca pelo texto.
- Os testes do Claude congelam a data (15/11/2026, a do backup de teste): sem isso, tarefas viram atrasadas, a loja tranca (ATOLADO) e os testes falham por motivo errado. Se o relógio congelado cair depois da hora de dormir (padrão 23:00, menos 1 h), o QUESTS mostra o fechamento do dia no lugar das listas: congele num horário de dia ou use o botão "ver as listas mesmo assim".
- Os pedidos do dono ficam no bloco APP (janela BREAKDOWN) do próprio app: para ler, peça um backup novo (PERKS → BAIXAR BACKUP).
- Meses esvaziados do ARQUIVO viram `core.legacy.days`, somados em `R.idx`: ao mexer no histórico de XP por dia, lembre deles.
- Reorganizar os dados do dono: faça rodando o PRÓPRIO app (Playwright + `actions.js`) sobre um backup dele e entregue um arquivo para IMPORTAR; nunca edite o JSON à mão. Ele não pode mexer no app entre o backup e a importação.
- O cache de totais depende de `S._epoch++`.
- Cores têm significado fixo (v5.14): use as variáveis `--c-urg`, `--c-quase`, `--c-atencao`, `--c-ok`, `--c-calma`, `--c-espera`, `--c-neutro`, `--c-premio`, `--c-acao`. Não invente cor nova para enfeitar: cor nova só com significado novo, registrado em `COLOR_MEANING` (v35.js). A faixinha da janela no começo da tarefa usa `--cat-*` (`data-cat` em `taskRow`). Paleta do dono (v6.2, bloco no fim do `app.css`): as cores exatas de uma imagem que ele escolheu (11 famílias: escuro/meio/claro). Ajustes só pequenos e dentro da mesma família (teoria das cores, harmonia). De noite o fundo é o marrom escuro antigo (ele preferiu, mais contraste). Nunca `#000`/`#fff`/`black`/`white` no CSS (o teste confere); use `--ink`, `--panel`, `#1f1712` ou `#fffaf1`. Cuidado: trocar `black` por regex quebra seletores como `[data-color="black"]`.
- A meta diária muda com a escada do esforço: leia sempre por `R.dailyGoal`/`R.goalAt`, nunca `settings.dailyGoal` direto.
- O topo (`.top` + `.tabs`) só fica preso na primeira tela de rolagem (o `body` tem altura fixa). A variável CSS `--stick`, atualizada em `app.js`, diz onde ele termina; a barra das janelas do QUESTS e o painel da direita usam essa variável.
- Qualquer redesenho (`render()`) recria a tela: o que estiver digitado nas linhas "+ adicionar" e a rolagem do painel da direita são guardados e devolvidos por `render()`. Campo novo desse tipo precisa entrar em `ADD_SEL`.
- O XP do topo anima: leitura no meio da animação dá número intermediário.
- A fonte pixel desenha mal acentos: `deaccent()` tira acentos dos rótulos.
- A IA do PRIMO (`window.claude.use('sample')`) só existe dentro do claude.ai; no GitHub Pages esses botões não têm IA.
- O PRIMO dorme à noite: para testar acordado, simule o horário (mock de `Date`).
- O desenho do PRIMO usa um espaço lógico de 72 x 96 numa tela 4× maior (`K` em `primo.js`). Posição de acessório: tabela `ACC` em `pnew.js`, em pontos do quadro de 224. Os originais das artes (centenas de MB) nunca entram no repositório: só o que `tools/primo_artes.py` gera.
- Avisos (`toast` em `ui.js`): aparece UM por vez, iguais viram ×N e a fila guarda 3. Se encher, os avisos SEM tipo (`kind` vazio) saem primeiro. Aviso que não pode se perder precisa de tipo (`good`, `gold` ou `bad`).
- Ícones pixel (`px()` em `icons.js`) são um `<path>` por cor. Não volte para um `<rect>` por pixel: era o que deixava CONQUISTAS e SHOP lentas.
- Animações do PRIMO e dos interiores sabem se estão na tela por `IntersectionObserver` (`cv._vis`). Não meça posição (`getBoundingClientRect`) a cada quadro.
- AGUARDANDO virou uma COR nas janelas de tarefa e bloco, mas por baixo continua sendo o estado `st = 'wait'` (a cor guardada em `t.color`/`b.color` não muda). Na tela, item aguardando ganha `data-color="purple"`.
- Dinheiro: os dados guardam o marcador 💰, mas a tela mostra "$" (troca feita em `deaccent()`, que roda em todo redesenho e em toda janela). O dono escreve `3000$` e `normalizeMoney()` (actions.js) guarda como 💰.
- NOVO CAPÍTULO (`core.season = { from, minus, spentMinus, tickets }`): XP, nível e tickets de `R.totals` contam só a partir de `from`. Gold, compras, conquistas e histórico continuam inteiros. Não use `totals().earned` como "XP de todos os tempos".
- Banners (`.scene.pstrip`, `.vit-h`, `.qscene`): largura toda, proporção 2,4 por 1 (igual no celular) com altura máxima no PC. A imagem vai em `style="--img:url('<endereço COMPLETO>')"` (`new URL(src, document.baseURI)`): `url()` relativa dentro de variável CSS é lida a partir de `css/` e dá 404. No QUESTS o PRIMO tem 27% da largura do cenário e a FAÍSCA 7%: ficam na escala da imagem em qualquer tela.
- Legendas: `tips()` (app.js) dá `title` a tudo que é clicável e não tem (aria-label, `ACT_TIP` ou o texto). Roda em `deaccent()` e no fim do `render()`.
- Nomes de classe CSS antigos podem colidir (ex.: `.sw` era das paletas que saíram). Antes de criar uma classe nova, procure no `app.css`.
- Mecânicas do PDF de gamificação (todas com contrapeso): loja destranca com 1 resgate (`core.rescue`), castigo cancela com resgate e tem intensidade (`settings.castigo`), chama aguenta dia com metade da meta (`FLAME_MIN`, sem somar), escada desce numa semana fraca, bônus de volta (`kind: 'volta'`), FOCO AGORA (`R.focusNow`).

