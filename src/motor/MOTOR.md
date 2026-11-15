# Motor de regras

Esta pasta guarda o motor de regras do jogo: estado da partida, ações, baralhos, terrenos,
desempates e oponentes, sem Phaser e sem DOM. As regras são as do prof. Peng Yaohao
(FPO 2026/2, tema 4), com as decisões registradas abaixo.

## Arquivos

| Arquivo | O que é |
|---|---|
| `engine.js` | Fachada: reexporta `engine/index.js` |
| `engine/index.js` | Ponto de entrada: registra ações, baralhos e terrenos nativos |
| `engine/registry.js` | Registro de módulos (API de mods): `Motor.registerDeck/Terrain/Action` |
| `engine/core.js` | Núcleo: estado, turnos, validação, fim de partida e desempates |
| `engine/actions.js` | Ações: avançar, tunagem, overfit, early stop, stack overflow, dropout, transfer, passar |
| `engine/decks.js` | Baralhos e pontuação |
| `engine/terrains.js` | Terrenos |
| `engine/util.js` | Constantes e utilidades (gerador aleatório com semente, cartas) |
| `bot.js` | Oponentes: aleatório, guloso e Monte Carlo |
| `sim.js` | Simulação de partidas entre bots |

## Decisões de regra

As decisões de regra do professor e do grupo ficam registradas aqui, cada uma com teste em
`testes/unidade/motor-regras.test.js`. O conjunto de regras anterior a essas decisões continua disponível com
`newGame({ rules: 'original' })`, e é com ele que o teste de equivalência roda. O padrão do
jogo é `rules: 'fusao'`.

| Mudança | Antes | Agora | Onde |
|---|---|---|---|
| B1: desempate "carta mais alta" | Comparava os pontos da carta: K contra J (0 a 0) caía no naipe | Compara a força da carta (A > K > Q > J > 10 … 2); o naipe só decide entre cartas iguais | `core.js`, `compareTwo` |
| B2: valor do trio | 20 no total, igual ao par | 30 (10 por figura) | `decks.js`, `sumScore` |
| R1: carta empilhada (decisão do professor) | Não entrava na sequência de figuras; somava +10 | Entra na sequência (par, trio, quadra) e vale 10 como as outras figuras, sem bônus extra. O exemplo do slide (8-K-K-3 com um K tunado) continua valendo 41; tunar os dois Ks de um par forma quadra e zera a rede | `decks.js`, `sumScore` |
| R2: passar | Só quem sofreu early stop do rival | Qualquer early stop, do rival ou aplicado na própria rede | `core.js`, `canPass` |

Também mudaram os textos de regra que descreviam o comportamento antigo (baralho Clássico,
Tunagem e Passar), e `sim.js` passou a aceitar a opção `rules`.

Acréscimos que não mudam o comportamento anterior (testes em `testes/unidade/motor-inicio.test.js`):

| Acréscimo | Para quê | Onde |
|---|---|---|
| `firstRule: 'reveal-keep'` | Opção (b) do slide para decidir quem começa: a carta revelada volta para a mão. O padrão continua sendo `'reveal'` (a carta vai para o cemitério) | `core.js`, `applyReveal`; `bot.js`, `revealPick` |
| `monteCarloResults` | Devolve a taxa de vitória de cada jogada simulada, para a interface mostrar o que o Mestre Monte Carlo calculou | `bot.js` |
