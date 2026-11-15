# Guia: criar o PRIMO novo com IA de imagem (Higgsfield)

Objetivo: um porquinho mais bem feito, menos pixelado, com a cara do jogo, mais acessórios e cenários.
Você gera as imagens e vídeos; o Claude recorta o fundo, monta as folhas de animação e encaixa no app.

> Os modelos mudam de nome e versão toda hora. Este guia cita as **famílias**; no Higgsfield escolha sempre a versão mais nova de cada uma.
> Regra do projeto: nada de personagem, jogo ou artista com direitos autorais nos prompts. Descreva o estilo com palavras, sem citar nomes.

---

## 1. Qual IA usar dentro do Higgsfield

| Para quê | Família recomendada | Por quê |
|---|---|---|
| Criar o porquinho, poses, acessórios e cenários (imagem) | **Nano Banana Pro** (ou Nano Banana mais novo) | É a melhor em manter o MESMO personagem quando você manda uma imagem de referência e pede "igual a este, em outra pose". |
| Plano B para imagem | **GPT Image** ou **Seedream** | Seguem bem instruções de enquadramento e fundo liso. Use se o Nano Banana estiver mudando o bicho. |
| Animar (vídeo curto a partir de uma imagem) | **Kling** (mais novo) | Aceita imagem inicial E final. Com as duas iguais, a animação fecha em ciclo (loop). |
| Plano B para vídeo | **Seedance** ou **Veo** | Bons em movimento suave; nem sempre fecham o ciclo. |
| Não usar | **Soul** e modelos "cinema/foto real" | São feitos para foto realista de pessoas, não para personagem de jogo. |

Antes de gastar créditos em tudo, faça só o Passo 1 e me mande: eu confirmo se o estilo serve para o app.

---

## 2. As 5 regras que fazem dar certo

1. **Fundo liso verde-limão** (`#00FF00`), sem sombra no chão, sem degradê, sem textura. É o que permite recortar o fundo depois. Se a peça for verde (ex.: um cachecol verde), use fundo azul puro (`#0000FF`). Nunca use rosa ou magenta: o porco é rosa.
2. **Sempre a mesma imagem de referência.** Depois de escolher o porquinho oficial (Passo 1), anexe essa imagem em TODOS os pedidos seguintes.
3. **Corpo inteiro, centralizado, com folga.** O bicho ocupa uns 60% do quadro e nada encosta na borda.
4. **Câmera parada.** Nos vídeos, o porco se mexe; a câmera não.
5. **Cole o BLOCO DE ESTILO em todo prompt.** É ele que mantém tudo com a mesma cara.

### BLOCO DE ESTILO (copie e cole no fim de cada prompt)

```
STYLE: high-resolution "hi-bit" pixel art illustration, soft small pixels (clearly more detailed than 16-bit, not blocky), clean dark-brown outline, cel shading with 3 to 4 tones per color, no gradients, no realistic textures, no blur. Cute chibi proportions (big head, small body). Warm cozy palette: cream paper #f7f5f0, terracotta orange #c2602f, deep brown #2b241d, campfire amber, soft pink for the pig. Cozy farm-life adventure game mood. Flat solid pure green background #00FF00, no ground shadow, no text, no watermark, no border.
```

---

## 3. Passo a passo

### Passo 1 — O porquinho oficial (imagem de referência)
Modelo: Nano Banana Pro · formato 1:1 · gere 4 a 8 opções e escolha UMA.

```
A cute small farm piglet character for a cozy productivity game mascot, standing on four legs, 3/4 front view facing slightly right, friendly calm expression, big round dark eyes, pink body, slightly darker pink snout and ears, small curly tail, tiny hooves. Full body, centered, character fills about 60% of the frame. No clothes, no accessories.
[BLOCO DE ESTILO]
```

Salve como `primo-ref.png`. É a "identidade" do PRIMO: tudo o mais nasce dela.

### Passo 2 — Folha de vistas (frente, lado, costas)
Anexe `primo-ref.png`. Formato 16:9.

```
Character turnaround sheet of this exact same piglet (same colors, same proportions, same outline style): four views side by side in one row, evenly spaced, same size and same ground line: (1) front 3/4 view, (2) right side view, (3) back view, (4) left side view. Standing neutral pose in all four. No accessories.
[BLOCO DE ESTILO]
```

Salve como `primo-vistas.png`. Se alguma vista sair diferente do original, gere de novo só ela:
`This exact same piglet, right side view, standing, full body, centered.` + bloco de estilo → `primo-lado.png`.

### Passo 3 — Animações (vídeo curto que eu transformo em quadros)
Modelo: Kling · imagem inicial = a pose certa do porquinho · **imagem final = a MESMA imagem** (fecha o ciclo) · 5 segundos · formato 1:1 · sem áudio.

Frase fixa para TODOS os vídeos (cole no fim):

```
Locked static camera, no zoom, no camera movement. The character stays in the same place in the frame and keeps exactly the same design, colors and outline. Flat solid pure green background #00FF00 that never changes, no shadow, no particles, no text. Smooth seamless loop: last frame identical to first frame.
```

| Arquivo | Imagem inicial | Prompt do movimento |
|---|---|---|
| `primo-parado.mp4` | frente 3/4 | `The piglet stands still and breathes gently, tiny body bob, blinks twice, ears twitch once, tail wiggles a little.` |
| `primo-feliz.mp4` | frente 3/4 | `The piglet does two small happy hops in place, eyes closed in a smile, ears flapping, then lands back in the starting pose.` |
| `primo-dormindo.mp4` | pose deitada (ver abaixo) | `The piglet sleeps lying down, slow deep breathing, body rising and falling, one ear twitches, eyes stay closed.` |
| `primo-andando.mp4` | lado direito | `The piglet walks in place to the right (treadmill walk cycle), legs moving in a clear 4-step cycle, head bobbing slightly, staying centered in the frame.` |
| `primo-comendo.mp4` (opcional) | frente 3/4 | `The piglet lowers its head and munches happily, cheeks moving, then looks up to the starting pose.` |
| `primo-cansado.mp4` (opcional) | frente 3/4 | `The piglet looks tired, head lowered, slow sigh, droopy ears, slow blink.` |

Pose deitada para o "dormindo" (imagem, Nano Banana, com `primo-ref.png` anexada):

```
This exact same piglet lying down asleep, curled on its belly, eyes closed, peaceful, front 3/4 view, full body, centered.
[BLOCO DE ESTILO]
```

Para andar para a esquerda não precisa gerar: o app espelha o vídeo da direita.

**Se o vídeo mudar o desenho do bicho ou mexer no fundo:** gere de novo com "keep the design exactly the same" no começo do prompt, ou use o Plano B abaixo.

**Plano B (sem vídeo): quadro a quadro.** Com `primo-ref.png` anexada, no Nano Banana, formato 16:9:

```
Sprite animation sheet of this exact same piglet: 6 frames in one horizontal row, evenly spaced, same size, same ground line, showing a [IDLE BREATHING / HAPPY HOP / WALK CYCLE TO THE RIGHT] sequence step by step. Each frame is the full body. Thin empty gap between frames.
[BLOCO DE ESTILO]
```

Fica menos suave, mas o desenho se mantém mais fiel.

### Passo 4 — Acessórios (um arquivo por peça)
Modelo: Nano Banana · formato 1:1 · anexe `primo-ref.png` só como referência de estilo.
Cada peça sai **sozinha, sem o porco**, em duas vistas na mesma imagem (frente 3/4 à esquerda, lado direito à direita).

Prompt base:

```
A single game accessory item, isolated, NOT worn by any character: [PEÇA]. Two views of the same item side by side: left = front 3/4 view, right = right side view. Sized and shaped to fit the head/neck/back of the small chibi piglet in the reference image. Same art style as the reference.
[BLOCO DE ESTILO]
```

Troque `[PEÇA]` por:

| Arquivo | [PEÇA] |
|---|---|
| `acc-bone.png` | `a red baseball cap` |
| `acc-palha.png` | `a woven straw farmer hat with a red band` |
| `acc-gorro.png` | `a knitted wool beanie with a pompom` |
| `acc-bandana.png` | `a tied head bandana` |
| `acc-capacete.png` | `a yellow construction hard hat` |
| `acc-fone.png` | `over-ear headphones` |
| `acc-cartola.png` | `a black top hat` |
| `acc-mago.png` | `a pointed wizard hat with stars` |
| `acc-coroa.png` | `a small golden crown with gems` |
| `acc-oculos.png` | `round reading glasses` |
| `acc-sol.png` | `dark sunglasses` |
| `acc-monoculo.png` | `a golden monocle with a chain` |
| `acc-cachecol.png` | `a striped knitted scarf` |
| `acc-gravata.png` | `a bow tie` |
| `acc-medalha.png` | `a gold medal on a ribbon` |
| `acc-mochila.png` | `a small adventure backpack with a bedroll` |
| `acc-capa.png` | `a short red cape` |
| `acc-capaazul.png` | `a blue hero cape with a golden clasp` (use fundo verde mesmo) |

Ideias novas, se quiser ampliar o armário: chapéu de cozinheiro, lenço de festa junina, óculos de solda, lanterna de mineiro, capa de chuva amarela, violão nas costas.

### Passo 5 — Cenários (fundo da cena do PRIMO)
Modelo: Nano Banana · formato 16:9, a maior resolução disponível · **sem o porco** · **aqui NÃO use fundo verde**: troque a última frase do bloco de estilo por `Full scenery background, no characters, no text.`

Prompt base:

```
Wide game background scene, side view, no characters: [CENA]. The lower third is an empty flat ground area where a small character can stand, nothing important in the bottom center. Soft depth with 3 layers (far, middle, near).
[BLOCO DE ESTILO, com a última frase trocada]
```

| Arquivo | [CENA] |
|---|---|
| `cena-fogueira-dia.png` | `the backyard of a small countryside farmhouse in the hills of southeast Brazil, a stone campfire ring with logs to sit on, a wooden fence, banana trees and a yellow ipê tree, clear morning sky` |
| `cena-varanda-dia.png` | `the porch of a simple rural house with a hammock, clay pots with plants, a coffee cloth filter on a small table, rolling green hills far away` |
| `cena-cozinha.png` | `a cozy rural kitchen interior with a wood-burning stove, iron pots, a cheese on the table, checkered cloth, warm light from a window` |
| `cena-escritorio.png` | `a small architecture studio interior with a drafting table, rolled blueprints, a scale model of a house, a desk lamp and a big window` |
| `cena-estrada.png` | `a red dirt country road with a wooden gate, barbed wire fence, cattle far away and blue mountains on the horizon` (expedições) |
| `cena-feira.png` | `a street market with colorful fruit stalls and striped awnings on a small-town square with a church tower far away` (expedição "feira") |

Para a versão da noite e do fim de tarde, use **editar imagem** em cima do cenário de dia (não gere do zero, senão muda tudo):

```
Same exact scene and composition, now at night: dark blue starry sky, the campfire lit with warm orange glow lighting the ground nearby, fireflies. Keep every object in the same place.
```
```
Same exact scene and composition, now at golden sunset: orange and pink sky, long warm light. Keep every object in the same place.
```

Salve como `cena-fogueira-noite.png`, `cena-fogueira-tarde.png` etc.

### Passo 6 — A FAÍSCA (mascote pequena), se quiser renovar também
```
A tiny cute living campfire flame spirit character, round body made of orange and yellow flame, two dot eyes, small smile, sitting on the ground, front view, full body, centered.
[BLOCO DE ESTILO]
```
Ela tem 8 fases. Para cada fase, edite a anterior: `Same character, slightly bigger and brighter, with [a small spark crown / tiny arms / a second flame tip]`. Arquivos `faisca-1.png` até `faisca-8.png`.

---

## 4. O que me mandar

Um ZIP (ou os arquivos soltos na conversa) com estes nomes:

```
primo-ref.png            primo-vistas.png         primo-lado.png (se refez)
primo-parado.mp4         primo-feliz.mp4          primo-dormindo.mp4       primo-andando.mp4
acc-*.png                cena-*.png               faisca-*.png (opcional)
```

- Imagens em PNG, na maior resolução que o plano permitir. Não precisa recortar nem tirar o fundo.
- Vídeos em MP4, do jeito que saírem.
- Pode mandar em partes: primeiro só `primo-ref.png` para eu validar o estilo.

## 5. O que o Claude faz com isso
1. Tira o fundo verde e apara as sobras.
2. Escolhe os quadros de cada vídeo (8 a 12 por animação) e alinha todos pelo chão.
3. Monta a folha de animação e o arquivo de posições (cabeça, olhos, pescoço e costas em cada quadro), no formato de `assets/pets/`.
4. Encaixa os acessórios novos por cima do bicho, quadro a quadro.
5. Troca o fundo desenhado por código pelos cenários (dia, tarde e noite conforme o relógio).
6. Mantém o porquinho atual como reserva até você aprovar o novo.

## 6. Cuidados
- **Direitos de uso:** confira no seu plano do Higgsfield se as imagens geradas são suas para usar em projeto público. Em geral os planos pagos permitem.
- **Crédito:** quando o PRIMO novo entrar, o rodapé de PERKS passa a dizer que a arte foi gerada por IA com a sua direção. O crédito do pacote atual (Frakassets, CC BY 4.0) sai junto com o sprite antigo.
- **Consistência é o maior risco.** Se uma peça sair com traço diferente, refaça antes de seguir: uma peça destoando aparece muito no app.
- **Tamanho:** os arquivos finais que vão para o app são pequenos (eu reduzo). Os originais grandes não entram no repositório.
