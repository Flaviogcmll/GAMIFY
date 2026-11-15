# GAMIFY — guia rápido para quem for mexer no código

Manual completo: `BRIEFING_NOVO_CHAT.md` (leia antes de qualquer mudança).

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
10. O repositório é público: não escrever dados pessoais do dono em arquivos novos.

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
- `drive.js` — sincronização com Google Drive. O dono usa no dia a dia (celular e PC); o Claude não consegue testar o login real, só com um Google simulado (rotas do Playwright).
- `primo.js`, `pdraw.js`, `pacc.js`, `pstate.js`, `falas.js`, `saber.js`, `claude.js` — o mascote PRIMO.
- `v3.js`, `v35.js`, `v4.js` — recursos adicionados por versão (legado; têm imports circulares, cuidado).
- `views/*.js` — uma tela por arquivo. `css/app.css` — todo o visual. `sw.js` — modo offline.

## Armadilhas
- Ao REMOVER um tipo de dado salvo, o dado antigo do dono continua existindo: trate valores legados e crie migração idempotente (registrada em `core.migrations`).
- Trocar TODOS os dados de uma vez (importar, restaurar, Drive): use `restoreDocs()` de `backup.js`, nunca `replaceAll()` direto. Ele guarda antes uma cópia do estado atual.
- O cache de totais depende de `S._epoch++`.
- O topo (`.top` + `.tabs`) só fica preso na primeira tela de rolagem (o `body` tem altura fixa). A variável CSS `--stick`, atualizada em `app.js`, diz onde ele termina; a barra das janelas do QUESTS e o painel da direita usam essa variável.
- Qualquer redesenho (`render()`) recria a tela: o que estiver digitado nas linhas "+ adicionar" e a rolagem do painel da direita são guardados e devolvidos por `render()`. Campo novo desse tipo precisa entrar em `ADD_SEL`.
- O XP do topo anima: leitura no meio da animação dá número intermediário.
- A fonte pixel desenha mal acentos: `deaccent()` tira acentos dos rótulos.
- A IA do PRIMO (`window.claude.use('sample')`) só existe dentro do claude.ai; no GitHub Pages esses botões não têm IA.
- O PRIMO dorme à noite: para testar acordado, simule o horário (mock de `Date`).
