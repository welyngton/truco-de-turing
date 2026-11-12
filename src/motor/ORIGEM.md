# Motor do NeuroDeck

Esta pasta guarda o motor de regras do **NeuroDeck** (versão 2.0.0 do motor), o jogo do colega
Francisco para o mesmo trabalho (FPO 2026/2, tema 4). Por decisão do professor, o NeuroDeck é a
base das regras do jogo unificado; o Truco de Turing entra com a interface.

- **Origem:** https://neurodeck-fpo.web.app/js/ (arquivos servidos pelo site publicado)
- **Cópia feita em:** 10/11/2026
- **Autor do código original:** Francisco Lima, com a concordância do grupo para a fusão

## Arquivos

| Arquivo | O que é |
|---|---|
| `engine.js` | Fachada: reexporta `engine/index.js` |
| `engine/index.js` | Ponto de entrada: registra ações, baralhos e terrenos nativos |
| `engine/registry.js` | Registro de módulos (API de mods): `NeuroDeck.registerDeck/Terrain/Action` |
| `engine/core.js` | Núcleo: estado, turnos, validação, fim de partida e desempates |
| `engine/actions.js` | Ações: avançar, tunagem, overfit, early stop, stack overflow, dropout, transfer, passar |
| `engine/decks.js` | Baralhos e pontuação |
| `engine/terrains.js` | Terrenos |
| `engine/util.js` | Constantes e utilidades (gerador aleatório com semente, cartas) |
| `bot.js` | Oponentes: aleatório, guloso e Monte Carlo |
| `sim.js` | Simulação de partidas entre bots |

## Como a cópia foi conferida

1. **Arquivo a arquivo:** o SHA-256 de cada arquivo copiado é igual ao do arquivo servido pelo
   site (tabela abaixo). O commit que trouxe o motor tem os arquivos sem nenhuma alteração.
2. **Partida a partida:** 1.000 partidas com semente (19.862 jogadas), cobrindo os 7 baralhos, os
   4 terrenos, 2 a 4 jogadores, 1 e 2 baralhos, as duas regras de início e os três bots, foram
   jogadas no site e na cópia. Vencedor, placar, desempate, ranking e todas as jogadas são iguais.
   O teste `testes/unidade/motor-equivalencia.test.js` repete essa conferência a cada execução,
   contra o resumo gravado do site.

| Arquivo | SHA-256 do original |
|---|---|
| `engine.js` | `3c14cd8428fe4bf157c97fad2897fda426e6fa24f8eb73991b56d15f8a9c7442` |
| `engine/actions.js` | `004474e63aaf155f08bac83fee581688b1c2e73cc3a3445306b81b7d84955a3f` |
| `engine/core.js` | `5d0711f45e557917838235e49e6f46d0df7e714bd4543f07e7f612029adbe64e` |
| `engine/decks.js` | `5ad20836424d4ecb73f7345d618842c2b8b228fe895007dfa2b48802a26edb6e` |
| `engine/index.js` | `3d302f8c236fca4c1dc4005436f86c996c8a630e84f45fc616240e5fe2433ece` |
| `engine/registry.js` | `f744e806db700caf46039537652d5cd6ca161ca725319f4da2908a7e611bfab9` |
| `engine/terrains.js` | `b25f14792aa04e9e7b6c8879deee5c52236d1b29eceea6cbe54601617f670965` |
| `engine/util.js` | `a5e2ef03cdef336189b502fa6df936eedd4a27907d60ad6ffb9b002129b352eb` |
| `bot.js` | `4bfc1923f0a28a777d60b53d6b38cea65b179f3f6a75cb7d62b685cc6ad0bcf0` |
| `sim.js` | `6c6b3bd00e3bbf26e7df6a81dd6a5961748f454970a4fa50d92efcf0f9e2d46b` |

## Alterações feitas depois da cópia

As mudanças de regra da fusão ficam registradas aqui, cada uma com teste em
`testes/unidade/motor-regras.test.js`. O conjunto de regras original continua disponível com
`newGame({ rules: 'nd-2.0.0' })`, e é com ele que o teste de equivalência roda. O padrão do
jogo unificado é `rules: 'fusao'`.

| Mudança | No motor original | Na fusão | Onde |
|---|---|---|---|
| B1: desempate "carta mais alta" | Comparava os pontos da carta: K contra J (0 a 0) caía no naipe | Compara a força da carta (A > K > Q > J > 10 … 2); o naipe só decide entre cartas iguais | `core.js`, `compareTwo` |
| B2: valor do trio | 20 no total, igual ao par | 30 (10 por figura) | `decks.js`, `sumScore` |
| R1: carta empilhada (decisão do professor) | Não entrava na sequência de figuras; somava +10 | Entra na sequência (par, trio, quadra) e vale 10 como as outras figuras, sem bônus extra. O exemplo do slide (8-K-K-3 com um K tunado) continua valendo 41; tunar os dois Ks de um par forma quadra e zera a rede | `decks.js`, `sumScore` |
| R2: passar | Só quem sofreu early stop do rival | Qualquer early stop, do rival ou aplicado na própria rede | `core.js`, `canPass` |

Também mudaram os textos de regra que descreviam o comportamento antigo (baralho Clássico,
Tunagem e Passar), e `sim.js` passou a aceitar a opção `rules`.

Acréscimos que não mudam o comportamento original (testes em `testes/unidade/motor-inicio.test.js`):

| Acréscimo | Para quê | Onde |
|---|---|---|
| `firstRule: 'reveal-keep'` | Opção (b) do slide para decidir quem começa: a carta revelada volta para a mão. O padrão continua sendo `'reveal'` (a carta vai para o cemitério) | `core.js`, `applyReveal`; `bot.js`, `revealPick` |
| `monteCarloResults` | Devolve a taxa de vitória de cada jogada simulada, para a interface mostrar o que o Mestre Monte Carlo calculou | `bot.js` |
