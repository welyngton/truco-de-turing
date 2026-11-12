# Manual do código — Truco de Turing

Este manual explica como o código do jogo está organizado, como rodar, testar e publicar, e como
estender o jogo (novo baralho, terreno, oponente, conquista ou verbete da Biblioteca de conceitos).

A lista completa de módulos e funções, com a descrição de cada uma, fica em
[`docs/REFERENCIA.md`](REFERENCIA.md). Ela é gerada a partir dos comentários do código com
`npm run docs`; por isso, toda função nova deve ganhar um comentário `/** ... */` logo acima.

---

## 1. Visão geral

O jogo roda no navegador com **Phaser 3** (carregado do CDN). O código é escrito em **módulos ES**
(`import`/`export`) e em **português do Brasil**: pastas, arquivos, funções, variáveis e comentários.

A regra mais importante da arquitetura é a separação em camadas, em que cada camada só conhece as de baixo:

```
┌───────────────────────────────────────────────────────────────┐
│ principal.js        cria o Phaser.Game com as três cenas      │
├───────────────────────────────────────────────────────────────┤
│ cenas/              Phaser: carregamento, menu e mesa         │
│ interface/          HTML sobreposto: menu, telas, avisos, som │
├───────────────────────────────────────────────────────────────┤
│ arte/               desenho procedural em canvas (sem Phaser) │
│ conteudo/           textos, Biblioteca, conquistas, progresso │
├───────────────────────────────────────────────────────────────┤
│ nucleo/             camada de tradução e modo truco           │
├───────────────────────────────────────────────────────────────┤
│ motor/              regras do NeuroDeck: sem Phaser, sem DOM  │
└───────────────────────────────────────────────────────────────┘
```

- **`motor/`** é o motor de regras do NeuroDeck (estado da partida, ações, baralhos, terrenos,
  desempates e bots), trazido na fusão dos dois jogos. Toda regra do jogo mora aqui. O código está
  em inglês, como no original; a origem, a conferência da cópia e as mudanças estão em
  `src/motor/ORIGEM.md`.
- **`nucleo/`** é a camada de tradução: guarda o estado do motor e entrega às telas a mão, as
  jogadas, a pontuação e os oponentes no formato da interface. Não decide nenhuma regra, com uma
  exceção: o modo truco (tentos e pedidos), que é do Truco de Turing. Como o motor, não usa Phaser
  nem `document`, por isso roda também no Node (testes e simulações em massa).
- **`arte/`** desenha cartas, versos, mesas, avatares e botões em `<canvas>`, em qualquer densidade
  de pixels. Não conhece o Phaser: devolve canvases que as cenas transformam em texturas.
- **`conteudo/`** guarda o que é texto ou dado: verbetes, conquistas, falas dos oponentes e o
  progresso salvo no navegador.
- **`interface/`** cuida das telas em HTML que ficam sobre o canvas (menu, regras, grimório,
  conquistas, sobre, caixas de confirmação e avisos) e do som.
- **`cenas/`** são as cenas do Phaser. A mesa (`cenas/mesa/`) é dividida em partes por assunto.

## 2. Estrutura de pastas

```
index.html                  página de desenvolvimento (carrega src/principal.js como módulo)
package.json                scripts npm
src/
  principal.js              ponto de entrada: cria o Phaser.Game
  aplicacao.js              estado fora da partida: opções, progresso, conquistas, navegação
  configuracao.js           tamanho do mundo, cores, fontes, resolução e densidade das texturas
  estilo.css                estilo dos painéis HTML
  motor/                    REGRAS (motor do NeuroDeck, em inglês; ver ORIGEM.md)
    engine.js                 fachada do motor
    engine/                   core (estado, turnos, desempates), actions, decks, terrains,
                              registry (API de mods), util
    bot.js                    bots: aleatório, guloso e Monte Carlo
    sim.js                    partidas entre bots
  nucleo/                   CAMADA DE TRADUÇÃO (pura) e modo truco
    traducao.js               conversões: cartas, jogadas, situações, motivos de vitória
    partida.js                a mão vista pela interface: estado do motor (mao.nd), visão,
                              jogadas legais, aplicação de jogadas, eventos e registro
    pontuacao.js              pontuação do motor no formato das telas (neurônios, combos, notas)
    baralhos.js               baralhos: nome, resumo, manilhas e pontos de cada carta
    terrenos.js               terrenos (nome e resumo)
    cartas.js                 valores, naipes, nomes das cartas
    rede.js                   formato da rede: 3-5-5-5-5-5-4, nomes das camadas
    aleatorio.js              sorteios com semente (usados pelo menu)
    truco.js                  tentos, pedidos de TRUCO/SEIS/NOVE/DOZE, mão de onze
    oponentes/
      comum.js                  avaliação, determinização e simulação até o fim
      estrategias.js            jogada aleatória, gulosa e Monte Carlo
      index.js                  perfis dos oponentes e decisões de truco
  conteudo/
    grimorio.js               verbetes (conceito de ML + como aparece no jogo)
    dicasDeJogo.js            dicas de estratégia do modo dicas (só informação pública)
    conquistas.js             graduações e conquistas com seus testes
    textos.js                 ambientação das cartas e provocações dos oponentes
    progresso.js              carregar/salvar progresso no localStorage (com migração da v1)
  arte/
    paleta.js                 medidas-base das cartas e cores por naipe
    pincel.js                 utilitários de desenho (degradês, sombras, texto com quebra…)
    moldura.js                corpo da carta, placas e gemas
    emblemas.js               emblemas dos naipes espanhóis
    cenarios.js               paisagens de fundo (montanhas, estrelas, raios…)
    figuras.js                Valete, Dama e Rei
    cartas.js                 carta completa e carta da mesa
    versos.js                 verso de cada baralho
    cartasDeTerreno.js        cartas de terreno (inspeção)
    mesas.js                  fundo da mesa de cada terreno
    avatares.js               retratos dos oponentes e dos jogadores
    botoes.js                 botões e faíscas
    icones.js                 ícones SVG das conquistas
    retrato.js                retrato do professor em moldura medieval
  recursos/
    retratoProfessor.js       foto do professor embutida (data URI)
  interface/
    som.js                    efeitos sonoros sintetizados (WebAudio), fanfarras de vitória
    musica.js                 música de fundo por terreno (blues, valsa, épica, gótica)
    paineis.js                abrir/fechar painéis, avisos e confirmações
    menu.js                   menu inicial e configuração da mesa
    telas/                    regras, grimório, conquistas, sobre e revisão da mão
  cenas/
    recursos.js               câmera, texto nítido, fundo e texturas sob demanda
    CenaCarregamento.js       espera fontes e gera texturas fixas
    CenaMenu.js               fundo animado do menu
    mesa/                     a cena da partida (ver seção 5)
ferramentas/
  empacotar.js              gera dist/truco-de-turing.html (arquivo único)
  simular.js                partidas em massa entre oponentes
  documentar.js             gera docs/REFERENCIA.md
  versionar.js              sobe a versão (package.json, src/versao.js, README, CHANGELOG)
  relatorios.js             roda todos os testes e escreve os relatórios
testes/
  unidade/                  testes de unidade (Node)
  interface/                testes do jogo no Chromium (Playwright)
  performance/              testes de performance com limites
  apoio/                    navegador de mentira, servidor, estados prontos, relator e medidas
relatorios/                 relatórios gerados (resultado, cobertura, performance, capturas)
docs/
  MANUAL.md                 este manual
  REFERENCIA.md             referência gerada das funções
```

## 3. Convenções de código

- **Idioma:** português do Brasil em nomes e comentários. Exceções são só os nomes impostos por
  bibliotecas (`create`, `update`, `preload` do Phaser; `ctx.fillStyle` do canvas) e as abreviações
  geométricas usuais no desenho (`x`, `y`, `w`, `h`, `W`, `H`, `S`, `ctx`).
- **Nomes:** funções com verbo (`pontuarRede`, `desenharVerso`, `abrirPainel`); perguntas com
  `eh`/`pode` (`ehFigura`, `podeTrucar`); constantes de tabela em MAIÚSCULAS (`BARALHOS`, `TERRENOS`).
- **Documentação:** cada arquivo começa com um bloco `@file` dizendo o que ele contém; cada função,
  constante exportada e método tem um comentário `/** ... */`. Regras sutis ganham comentário no ponto
  em que acontecem.
- **Módulos pequenos e com um assunto:** se um arquivo começa a tratar de dois assuntos, ele é dividido.
- **Regras só no motor:** a cena nunca decide uma regra; ela chama `nucleo/`, que traduz para o motor, e desenha o resultado.
- **Identificadores dos dados:** naipes `E` (espadas), `C` (copas), `P` (paus), `O` (ouros); uma
  carta é `{ id, valor, naipe }`, por exemplo `{ id: '7O', valor: '7', naipe: 'O' }`.

## 4. O motor e a camada de tradução

As regras são do motor do NeuroDeck (`src/motor/`). O núcleo (`src/nucleo/`) guarda o estado do motor
e o apresenta às telas com o vocabulário do Truco de Turing:

| Truco de Turing (interface) | Motor do NeuroDeck |
|---|---|
| `mao` (visão) | `state`, guardado em `mao.nd` |
| `jogadores[j].caminho`, `situacao` | `nets[j].path`, `finished` e `reason` |
| neurônio `{ id: 'C2N3', cartas, dono, removido }` | slot `layers[2][3]` com `card`, `stack`, `owner`, `removed` |
| carta `{ valor: 'K', naipe: 'E' }` | carta `{ rank: 13, suit: 'S' }` |
| jogada `ativar` | movimento `advance` |
| jogada `empilhar` | `tune` (no próprio neurônio) ou `overfit`, `earlystop`, `stackoverflow` (no do rival, pelo tamanho final da pilha) |
| `dropout`, `transfer`, `passar`, `inicio` | `dropout`, `transfer`, `pass`, `reveal` |

### 4.1 Estado de uma mão (`nucleo/partida.js`)

`novaMao(opcoes)` cria a partida no motor (`newGame`) e monta a visão. Depois de cada jogada,
`atualizarVisao(mao)` refaz a visão a partir de `mao.nd`. Os campos principais:

| Campo | Conteúdo |
|---|---|
| `config` | `{ baralho, terreno, inicio }` escolhidos no menu |
| `nd` | estado do motor: a fonte da verdade (é o que os bots e as simulações usam) |
| `camadas` | lista de camadas; cada uma é uma lista de neurônios |
| `neuronios` | mapa `id → { id, camada, posicao, cartas, revelado, dono, removido, conhecido }` |
| `jogadores` | `{ nome, tipo: 'humano'|'oponente', oponente, mao, caminho, situacao, dropouts, transferUsado, cartaInicial, estatisticas }` |
| `limbo`, `cemiterio` | cartas fora de jogo |
| `vez`, `primeiro`, `rodada`, `turno` | controle de turnos |
| `fase` | `'inicio'` → `'jogo'` → `'fim'` |
| `eventos` | eventos para a interface animar (esvaziados pela cena) |
| `registro`, `historico` | linhas do registro de jogadas e curva de treino |
| `resultado` | `{ somas, vencedor, motivo, travados }` ao fim |

`situacao` de um jogador: `'construindo'`, `'concluida'` (chegou à saída), `'earlystop'`, `'overflow'`
ou `'travada'` (ficou sem neurônio livre na camada seguinte e a rede foi finalizada).

A visão é só leitura: quem precisa montar uma situação (testes, ferramentas) altera `mao.nd` e chama
`atualizarVisao`. As funções de `testes/apoio/montagem.js` fazem isso (`darMao`, `montarRede`,
`finalizarRede`…).

### 4.2 Jogadas

As jogadas são objetos simples. `jogadasLegais(mao, j)` traduz a lista do motor (`legalMoves`) e
`aplicarJogada(mao, jogada)` traduz a jogada, entrega ao motor (`applyMove`) e refaz a visão; se a
jogada for inválida, lança erro e o estado não muda:

| Jogada | Formato |
|---|---|
| Escolher a carta de início | `{ tipo: 'inicio', jogador, carta }` |
| Ativar neurônio | `{ tipo: 'ativar', jogador, neuronio }` |
| Empilhar cartas (tunagem e ataques) | `{ tipo: 'empilhar', jogador, neuronio, cartas: [ids] }` |
| Dropout | `{ tipo: 'dropout', jogador, n, pagamento: [ids] }` |
| Transfer learning | `{ tipo: 'transfer', jogador, cartas: [4 ids] }` |
| Passar a vez | `{ tipo: 'passar', jogador }` |

O efeito de empilhar depende do tamanho final da pilha (`efeitoDoEmpilhamento`): 2 cartas = tunagem
(própria rede) ou overfit (adversário); 3 = early stop; 4 = stack overflow. Dropout e transfer
learning não gastam a vez. `jogadaParaND` e `jogadaParaTT` fazem a tradução nos dois sentidos.

### 4.3 Eventos

Cada jogada emite eventos em `mao.eventos`, gerados pela camada de tradução comparando o antes e o
depois. A cena da mesa os anima em `efeitos.js` (um método `animar_<tipo>` por evento):

`inicio`, `ativacao`, `completa`, `tunagem`, `overfit`, `earlystop`, `stackoverflow`, `dropout`,
`transfer`, `passe`, `travada`, `vento`, `powerbi`, `fim`.

### 4.4 Pontuação (`nucleo/pontuacao.js`)

`pontuarRede(mao, j)` pede a pontuação ao motor (`score`) e devolve `{ total, neuronios, combos,
vanishing }`. Cada neurônio traz os pontos já com tunagem, terreno e baralho e uma lista `notas`
explicando os ajustes; as sequências de figuras (par, trio, quadra) vêm em `combos`. A soma dos
neurônios mais a dos combos dá o total.

### 4.5 Truco (`nucleo/truco.js`)

`novaPartida(alvo)` cria o placar; `pedirTruco`, `responderTruco('aceitar'|'correr'|'aumentar')`,
`marcarTentos` e `proximaMao` implementam a escada 1 → 3 → 6 → 9 → 12 e a mão de onze. O modo truco
roda por cima das mãos do motor e não depende dele.

### 4.6 Oponentes (`nucleo/oponentes/`)

São os bots do NeuroDeck (`motor/bot.js`); o núcleo só traduz a jogada escolhida.

| Chave | Nome | Nível | Bot do motor |
|---|---|---|---|
| `aleatorio` | Zé do Ruído | Fácil | `randomPolicy`: sorteia uma jogada válida |
| `guloso` | Gradiente Guloso | Médio | `greedyMove`: melhor ganho imediato |
| `montecarlo` | Mestre Monte Carlo | Difícil | `monteCarloResults`: sorteia as cartas ocultas (determinização) e simula partidas até o fim |

`escolherJogada(mao, j)`, `querTrucar(mao, j, perfil)` e `responderAoTruco(...)` são as três decisões
de um oponente. As de truco usam `chanceDeVitoria`, estimada por simulação.

### 4.7 Conjuntos de regras do motor

`newGame({ rules })` aceita `'fusao'` (padrão: regras decididas na fusão) e `'nd-2.0.0'` (o motor
original). O teste `motor-equivalencia` joga 1.000 partidas com `'nd-2.0.0'` e compara com o resumo
gravado no site do NeuroDeck; o `motor-regras` cobre o que mudou.

## 5. A cena da mesa (`cenas/mesa/`)

A classe `CenaMesa` é pequena: o comportamento fica em arquivos por assunto, cujos métodos são
copiados para o protótipo com `Object.assign` no fim de `CenaMesa.js`. Dentro deles, `this` é a cena.

| Arquivo | Responsabilidade |
|---|---|
| `layout.js` | geometria (posições dos painéis e dos neurônios), cores e textos que encolhem para caber |
| `cenario.js` | molduras fixas, criação de botões e de todos os textos dos painéis (`this.painel`) |
| `desenho.js` | `redesenhar()`: neurônios, mãos, placar, curva de treino, dica e alvos destacados |
| `entrada.js` | cliques e toques: neurônios, cartas da mão, botões de ação |
| `turnos.js` | fluxo da mão: `iniciarMao`, `executarJogada`, `avancar`, vez do oponente, troca de aparelho |
| `truco.js` | pedir, anunciar e responder truco |
| `efeitos.js` | animação de cada evento, faíscas, faixas, balão de fala e avisos da Biblioteca de conceitos |
| `resultado.js` | fim da mão, tentos, conquistas, comemoração da vitória e tela de resultado |
| `dicas.js` | modo dicas: sugestão de jogada (busca gulosa) e dicas flutuantes dos botões |

O ciclo de uma jogada:

```
clique → entrada.js → executarJogada(jogada)
                       ├─ nucleo: aplicarJogada(mao, jogada)
                       ├─ redesenhar()
                       ├─ animarEventos(eventos) → espera N ms
                       └─ avancar()
                            ├─ fase 'fim'      → encerrarMao()
                            ├─ vez do oponente → vezDoOponente() → executarJogada(...)
                            └─ vez do humano   → libera os cliques
```

Estado da cena: `this.partida` (tentos), `this.mao` (mão atual), `this.quemVe` (jogador olhando a tela;
−1 durante a troca de aparelho), `this.modo` (`'livre'`, `'inicio'`, `'dropout'`, `'pagarDropout'`),
`this.selecao` (cartas escolhidas), `this.alvos` (neurônios clicáveis), `this.ocupada` (bloqueia
cliques durante animações) e `this.encerrada`.

### 5.1 Dicas, revisão e música

- **Botões da mesa** (`cenario.js` e `entrada.js`): o painel esquerdo tem só **REGRAS** (janela com
  Regras, Ajuda das ações, Biblioteca de conceitos e a chave das dicas) e **MENU** (janela com som, música, voltar ao jogo e sair
  da partida); o direito tem TRUCO e a linha Dropout · Transfer · Passar. Os botões são grandes e
  quase quadrados, ficam longe da borda de baixo (gestos do celular) e a área de toque passa
  `FOLGA_DE_TOQUE` da borda desenhada. O Phaser acompanha vários dedos (`TOQUES_SIMULTANEOS`), para
  que o polegar apoiado na tela não bloqueie os botões.
- **Dicas** (`dicas.js` e `conteudo/dicasDeJogo.js`): a chave "Ativar dicas" (na janela REGRAS) fica em
  `Aplicacao.dicasLigadas` (só na sessão). Ligada, a cada vez do humano `escolherDicaDeJogo` escolhe
  uma dica de jogo (oportunidade de ataque ou tunagem, risco, terreno, placar ou estratégia geral) e a
  mostra com o conceito da Biblioteca de conceitos ligado a ela. As dicas usam **só informação pública** e nunca
  apontam qual neurônio oculto ativar; um teste em `testes/unidade/conteudo.test.js` sorteia de novo tudo o que
  está escondido e confere que a dica não muda. Os botões que recebem `opcoes.dica` em `criarBotao`
  ganham dicas flutuantes (mouse: ao passar; toque: segurar 0,45 s, e soltar depois de segurar não
  executa a ação). A mão fica marcada em `this.dicasNaMao` e, no fim, não é registrada em
  `Aplicacao.registrarMao` (sem conquistas nem estatísticas).
- **Revisão** (`interface/telas/revisao.js`): cada jogada e cada lance de truco viram um passo em
  `this.linhaDoTempo` (`anotarNaLinhaDoTempo`, em `turnos.js`), com as somas depois do passo. A revisão
  desenha a curva em SVG, aponta maior salto, golpe mais duro e virada, e liga cada tipo de passo ao
  verbete da Biblioteca de conceitos. `this.historicoDaPartida` guarda o placar mão a mão.
- **Música** (`interface/musica.js`): cada terreno tem uma música definida por andamento, acordes por
  compasso e uma função `tocar` chamada a cada passo. Um agendador marca as notas 0,4 s à frente no
  relógio do WebAudio. A música começa ligada até a pessoa escolher (`progresso.musicaEscolhida`). Para uma música nova, acrescente uma entrada em `MUSICAS` com a chave do terreno.

## 6. Arte e nitidez

- O mundo do jogo tem sempre **1280×720** unidades. A câmera aplica o zoom para cada tela
  (`ajustarCamera` em `cenas/recursos.js`), conferindo o tamanho a cada quadro porque o modo EXPAND do
  Phaser não redimensiona a câmera ao girar o aparelho.
- O canvas tem a **resolução física** da tela (`RESOLUCAO` em `configuracao.js`, até 3×); textos são
  criados nessa resolução (`prepararTextoNitido`).
- Toda arte é **procedural**: cada função de `arte/` desenha em coordenadas-base e recebe a densidade
  `S`. As texturas são geradas sob demanda com chaves descritivas (`'carta-mesa:truco:4P'`,
  `'verso-mao@yinyang'`) e as cartas da mão são liberadas a cada mão para poupar memória.
- O redesenho das cartas segue o [guia visual](GUIA-VISUAL-CARTAS.md): o que sai e o que fica na carta, a
  ordem de leitura e o símbolo central escolhido (medalhão com o naipe francês).
- Botões e faíscas são texturas (e não gráficos com degradê ou `tint`) para ficarem iguais nos
  renderizadores WebGL e Canvas. `?renderer=canvas` força o Canvas e `?res=2` força a resolução.

## 7. Como rodar, testar e publicar

```bash
npm install          # instala o esbuild (empacotador) e o Phaser (usado nos testes de navegador)
npm start            # servidor local em http://localhost:8080 (módulos ES exigem http, não file://)
npm run testar       # testes de unidade (Node)
npm run testar:interface    # testes de interface (Chromium, via Playwright)
npm run testar:performance  # testes de performance
npm run relatorios   # roda tudo e escreve os relatórios em relatorios/
npm run simular      # 300 mãos entre o Gradiente Guloso e o Zé do Ruído
node ferramentas/simular.js 60 montecarlo guloso truco oceano
npm run build        # gera dist/truco-de-turing.html, um arquivo único que abre até com duplo clique
npm run docs         # atualiza docs/REFERENCIA.md
```

**Publicação gratuita:** o GitHub Pages serve a pasta do repositório como está (o `index.html` carrega
os módulos de `src/`). Alternativas: enviar `dist/truco-de-turing.html` ao itch.io (projeto HTML),
Netlify Drop ou Cloudflare Pages.

### Versões

`ferramentas/versionar.js` controla o número da versão (MAIOR.MENOR.CORREÇÃO) em `package.json`,
`src/versao.js` (mostrada na tela Sobre), na linha entre `<!-- versao -->` e `<!-- /versao -->` do
README e no `CHANGELOG.md`. O workflow `.github/workflows/versao.yml` o executa:

- em cada **pull request** para a main: testes, empacotamento e a próxima versão no resumo do job;
- em cada **merge ou push na main**: sobe a versão, refaz `dist/` e `docs/REFERENCIA.md`, faz o commit
  `Versão X.Y.Z [versao]`, cria a tag `vX.Y.Z` e a release. O commit do robô (que começa com "Versão ") não gera outra versão.

O tipo vem do pull request: rótulo `versao:maior`/`versao:menor`, ou o título (`feat`, `nova`, `novo` →
menor; `!:` ou BREAKING → maior); nos demais casos, correção. À mão:
`node ferramentas/versionar.js --tipo menor --titulo "Descrição"` (ou `--simular` para só ver o número).

**Autores.** Em cada merge de pull request, o workflow junta quem abriu o PR e quem fez commits nele
(sem robôs) e passa para `versionar.js` (variável `AUTORES`, `login:Nome` por linha). Quem ainda não
está na lista do README, entre `<!-- autores -->` e `<!-- /autores -->`, é acrescentado com o nome do
perfil do GitHub e o @login; a entrada do CHANGELOG ganha "por @login". As linhas já existentes, inclusive
as escritas à mão, ficam como estão: a pessoa é reconhecida pelo `[@login]` da linha.

## 8. Como estender

### Novo baralho
1. No motor: escreva o baralho no formato de `motor/engine/decks.js` (`id`, `name`, `score` e,
   se precisar, `build`, `cardValue`, `stackValue`) e registre com `NeuroDeck.registerDeck`.
2. Em `nucleo/traducao.js`, acrescente a chave em `BARALHO_ND`; em `nucleo/baralhos.js`, a entrada em
   `BARALHOS` com `nome` e `resumo` (e `manilhas` ou `figurasValem`, se for o caso).
3. Em `arte/versos.js`, escreva `versoNovo(ctx, W, H, aleatorio)` e registre em `VERSOS`.
4. O menu lista os baralhos automaticamente. Rode `npm run testar` e uma simulação com o baralho.

### Novo terreno
1. No motor: escreva o terreno no formato de `motor/engine/terrains.js` (ganchos `neuronBonus`,
   `onRoundEnd`, `onCardPlayed`…) e registre com `NeuroDeck.registerTerrain`.
2. `nucleo/traducao.js`: chave em `TERRENO_ND`; `nucleo/terrenos.js`: entrada em `TERRENOS` com `nome` e `resumo`.
3. `arte/mesas.js`: o fundo da mesa (registre na tabela de `desenharMesa`).
4. `arte/cartasDeTerreno.js`: a paleta e a paisagem da carta de terreno.

### Novo oponente
1. Escreva a estratégia em `nucleo/oponentes/estrategias.js`: recebe `mao` e `j`, escolhe um
   movimento do motor (de `ND.legalMoves(mao.nd, j)`) e o devolve traduzido com `jogadaParaTT`.
2. Registre o perfil em `OPONENTES` (`nucleo/oponentes/index.js`) e ligue-o em `escolherJogada`.
3. Desenhe o avatar em `arte/avatares.js` e acrescente a chave em `AVATARES` de `CenaCarregamento.js`.

### Nova conquista
Acrescente em `CONQUISTAS` (`conteudo/conquistas.js`) um objeto `{ id, nome, descricao, graduacao,
teste(ctx) }` e um ícone com o mesmo `id` em `arte/icones.js`. Se ela puder ser obtida numa mão
encerrada por truco, inclua o `id` em `VALEM_SEM_MAO_COMPLETA`.

### Novo verbete da Biblioteca de conceitos
Acrescente em `VERBETES` (`conteudo/grimorio.js`) `{ id, titulo, categoria, conceito, equacao, noJogo, limite }`
(e, se quiser, `figura`, com o nome de uma figura de `conteudo/figurasDaBiblioteca.js`, e `fonte`). A equação é
MathML montada com os auxiliares do topo do arquivo. Para
o aviso aparecer durante a partida, chame `this.avisarVerbete('id')` no ponto certo de `efeitos.js`.

Opcionalmente, acrescente `ideia` (comparação do dia a dia, mostrada como "A ideia"), `autoria` e, para
uma segunda matemática além da equação, `aprofundar` (texto; `$...$` vira fórmula na linha) com `formula`
(LaTeX em destaque, sem cifrões), que aparecem em "Para se aprofundar". Use `String.raw` nos campos com
LaTeX, para não precisar dobrar as barras. Essas fórmulas são desenhadas pelo KaTeX (carregado do CDN em
`index.html`); sem rede, aparecem como código LaTeX. O verbete de Overfitting é um bom modelo.

## 9. Testes e relatórios

Os testes usam o executor nativo do Node (`node:test`), sem framework extra:

| Pasta | O que testa | Como |
|---|---|---|
| `testes/unidade/` | regras, oponentes, conteúdo, arte, telas HTML, som, música, aplicação e ferramentas; em `regras-de-negocio.test.js`, os testes de aceitação RN-01 a RN-40 (ver `relatorios/validacao/`) | Node; `testes/apoio/ambiente.js` cria um navegador de mentira (jsdom + canvas de verdade do `@napi-rs/canvas` + WebAudio que registra os nós) |
| `testes/interface/` | o jogo inteiro: menu, partidas contra cada oponente, duas pessoas, cada ação, truco, dicas (mouse e toque), celular | Chromium via Playwright; `testes/apoio/navegador.js` sobe um servidor local, serve os módulos sem empacotar e acelera o tempo da cena |
| `testes/performance/` | tempos e limites do motor, oponentes, arte, empacotamento e do jogo no navegador | `testes/apoio/medidas.js` cronometra e confere cada limite |

`npm run relatorios` (`ferramentas/relatorios.js`) roda as três suítes e escreve em `relatorios/`:
resumo geral, um relatório por suíte (com JUnit XML), capturas de tela dos testes de interface,
todas as medidas de performance e a **cobertura** juntando Node e navegador (o Chromium mede os
mesmos arquivos de `src/`), com a lista de cada função e método e quantas vezes foi executado.

No GitHub, o workflow `.github/workflows/testes.yml` faz o mesmo em cada pull request e push na
main e publica os relatórios como artefato da execução.

As regras têm três níveis de teste: `motor-equivalencia` (a cópia do motor joga como o site do
NeuroDeck), `motor-regras` e `motor-inicio` (o que a fusão mudou no motor) e `regras-de-negocio`
(os 40 testes RN da especificação, pela interface do núcleo). Para montar uma situação com cartas
escolhidas, use `testes/apoio/montagem.js` (`darMao`, `montarRede`, `finalizarRede`, `encerrar`…),
que altera o estado do motor e refaz a visão; nos testes de interface, `carregarMontagem(pagina)`
deixa as mesmas funções disponíveis na página como `M`.

Em máquinas sem o Chromium do Playwright, aponte `CHROMIUM_DO_SISTEMA` para um Chrome ou Chromium
já instalado (`CHROMIUM_DO_SISTEMA=/usr/bin/google-chrome npm run testar:interface`).

Para testar algo novo: uma função pura vai num arquivo de `testes/unidade/`; uma mudança de
tela ou de fluxo da mesa ganha um caso em `testes/interface/` usando `comecarPartida`, `naCena` e
`esperarCena`. A cena fica acessível na página por `__TRUCO_DE_TURING__.jogo.scene.getScene('Mesa')`.
