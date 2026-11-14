# Referência do código

> Gerado por `npm run docs` (ferramentas/documentar.js) a partir dos comentários do código. Não edite à mão.

## `src/aplicacao.js`

Estado da aplicação fora da partida: opções do menu, progresso salvo, conquistas, som e navegação entre o menu e a mesa. É um objeto único (`Aplicacao`) compartilhado pelas cenas e pelas telas HTML.

| Nome | Tipo | Descrição |
|---|---|---|
| `OPCOES_PADRAO` | constante (exportada) | Opções usadas na primeira visita. `jogadores` é o total na mesa (2 a 5), `humanos` quantos deles jogam no mesmo aparelho (os outros são oponentes do perfil `oponente`), `arquitetura` é uma das arquiteturas do NeuroDeck e `baralhos` quantos baralhos entram na partida. |
| `faixaDeExperiencia(maos)` | função (exportada) | Faixa de experiência do jogador pelo número de mãos jogadas (propriedade `experiencia`). |
| `normalizarOpcoes(opcoes)` | função (exportada) | Normaliza as opções do menu: completa as que faltam (progresso de versões antigas) e converte o antigo oponente "2 humanos no mesmo aparelho" em `humanos: 2`. |
| `iniciar()` | método | Carrega opções e preferência de som. |
| `atualizarJogadorNasEstatisticas()` | método | Passa às estatísticas de uso a experiência, as conquistas, o avatar e os verbetes lidos. |
| `salvar()` | método | Grava o progresso. |
| `salvarOpcoes()` | método | Grava as escolhas do menu para a próxima visita. |
| `alternarSom()` | método | Liga ou desliga o som e lembra a escolha. |
| `alternarMusica(terreno)` | método | Liga ou desliga a música de fundo e lembra a escolha. |
| `jogar()` | método | Sai do menu e abre a mesa. |
| `irParaMenu()` | método | Volta da mesa para o menu. |
| `modoImersivo()` | método | Em celulares e tablets: tela cheia e trava na horizontal, onde o navegador permite (Chrome no Android). No iPhone isso não existe; ali vale o aviso para girar o aparelho. |
| `registrarMao(ctx)` | método | Registra o fim de uma mão contra o computador e devolve as conquistas novas. |
| `marcarVerbeteLido(id)` | método | Marca um verbete como lido e concede "Bibliotecário" quando todos foram lidos. |

## `src/arte/avatares.js`

Retratos redondos dos participantes: os três oponentes, o jogador (rosto com chapéu de palha) e os avatares extras que o jogador escolhe (alguns liberados por conquistas, ver conteudo/avatares.js). Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.

| Nome | Tipo | Descrição |
|---|---|---|
| `desenharAvatar(tipo, cor, S)` | função (exportada) | Desenha um avatar redondo de 112x112 (base). |
| `olho(ctx, x, y, r, iris)` | função | Olho redondo com brilho. |
| `RETRATOS_EXTRAS` | constante (exportada) | Retratos extras, pelo tipo. Cada um desenha dentro do círculo já recortado (112x112). |

## `src/arte/botoes.js`

Texturas dos botões da mesa e da faísca das explosões. São imagens próprias porque o renderizador Canvas do Phaser não tem degradês nem tint. Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.

| Nome | Tipo | Descrição |
|---|---|---|
| `desenharFaisca(S, cor)` | função (exportada) | Faísca radial (32x32 base) usada nas explosões de partículas, na cor pedida. |
| `MARGEM_BOTAO` | constante (exportada) | Margem em volta do botão, reservada para a sombra. |
| `desenharBotao(w, h, S, variante, estado)` | função (exportada) | Textura de um botão de w × h (base). |

## `src/arte/cartas.js`

Cartas de neurônio: dados exibidos (nome, tipo, regras, raridade), carta completa (mão e inspeção) e carta da mesa. Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.

| Nome | Tipo | Descrição |
|---|---|---|
| `dadosDaCarta(carta, baralho)` | função (exportada) | Dados que a carta mostra. regras: string, ambientacao: string, raridade: 'comum'\|'incomum'\|'rara'\|'mitica'}} |
| `PESO_BACKPROP` | constante | Baralho Backprop: peso de cada naipe e ativação de cada figura (iguais às do motor). |
| `RARIDADE` | constante | Cores da gema de raridade (claro, escuro). |
| `simboloDeColecao(ctx, x, y, s, raridade)` | função (exportada) | Símbolo de coleção (gema de raridade) à direita da linha de tipo. |
| `ilustracaoDaCarta(ctx, carta, info, x, y, w, h, aleatorio)` | função | Desenha a ilustração da janela de arte: cena com figura (J, Q, K), emblema grande (Ás e manilhas) ou emblemas repetidos (cartas numéricas). |
| `posicoesDosNaipes(n)` | função | Posições dos naipes numa janela de arte paisagem |
| `desenharCartaCompleta(carta, baralho, S)` | função (exportada) | ---------- carta completa ---------- |
| `desenharCartaDaMesa(carta, baralho, S)` | função (exportada) | ---------- carta da mesa ---------- |

## `src/arte/cartasDeTerreno.js`

Cartas de terreno exibidas na inspeção (estilo "terreno básico"). Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.

| Nome | Tipo | Descrição |
|---|---|---|
| `desenharCartaDeTerreno(terreno, S)` | função (exportada) | Desenha a carta de terreno mostrada na inspeção (paisagem do terreno, linha de tipo e caixa de regras). |

## `src/arte/cenarios.js`

Cenários pintados das janelas de arte: montanhas ao luar (espadas), salão de banquete (copas), floresta (paus) e deserto dourado (ouros), com uma constelação em forma de rede neural. Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.

| Nome | Tipo | Descrição |
|---|---|---|
| `perfilDeSerra(aleatorio, w, aspereza)` | função (exportada) | Gera o perfil de uma serra (alturas de 0 a 1) por subdivisão aleatória; `aspereza` controla o serrilhado. |
| `montanhas(ctx, x, y, w, h, aleatorio, camadas)` | função (exportada) | Desenha camadas de montanhas, da mais distante à mais próxima, com neve opcional nos picos. |
| `estrelas(ctx, x, y, w, h, aleatorio, n, cor)` | função (exportada) | Espalha `n` estrelas pequenas na área. |
| `constelacao(ctx, x, y, w, h, aleatorio, cor)` | função (exportada) | Constelação em forma de rede neural: o toque de ML no céu |
| `vinheta(ctx, x, y, w, h, a)` | função (exportada) | Escurece as bordas da área (efeito de vinheta) com intensidade `a`. |
| `raios(ctx, cx, cy, n, comprimento, abertura, cor, a)` | função (exportada) | Desenha `n` raios de luz saindo de (cx, cy). |
| `cenarioDoNaipe(ctx, naipe, x, y, w, h, aleatorio, opcoes)` | função (exportada) | Fundo temático de cada naipe (espadas: noite e montanhas; copas: salão; paus: floresta; ouros: deserto dourado). Opções: `constelacao` (falso para omitir) e `escurecer` (0 a 1). |

## `src/arte/emblemas.js`

Naipes espanhóis do truco desenhados à mão: espada, copa, ouro e pau (bastão).

| Nome | Tipo | Descrição |
|---|---|---|
| `desenharEmblema(ctx, tipo, cx, cy, s, rot, opcoes)` | função (exportada) | Desenha o emblema do naipe espanhol: 'espada', 'copa', 'ouro' ou 'pau'. Opção `sombra` (falso para desenhar sem sombra). |

## `src/arte/figuras.js`

Retratos das figuras (Rei, Dama e Valete) no estilo do baralho espanhol. Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.

| Nome | Tipo | Descrição |
|---|---|---|
| `coroa(ctx, valor, s, cor)` | função (exportada) | Desenha a coroa (ou chapéu) da figura conforme o valor J, Q ou K. |
| `desenharFigura(ctx, valor, naipe, cx, by, s)` | função (exportada) | Retrato meio-corpo; (cx, by) = base central, s = altura do retrato |

## `src/arte/icones.js`

Ícones em SVG (nítidos em qualquer tamanho): conquistas, cadeado das bloqueadas e um ícone para cada ação da mesa (faixa no centro da mesa e ajuda das ações). Avançar, a jogada comum de revelar um neurônio, não abre faixa: o ícone dele aparece na ajuda das ações.

| Nome | Tipo | Descrição |
|---|---|---|
| `I` | constante | Cor do traço dos ícones. |
| `svg` | constante | Envolve o desenho num SVG 48x48. |
| `gato` | constante | Gato do GatoNet (dropout), base de duas conquistas. |
| `ICONES_CONQUISTAS` | constante (exportada) | Ícone SVG de cada conquista, pelo id. |
| `ICONE_CADEADO` | constante (exportada) | Cadeado das conquistas bloqueadas. |
| `ICONES_DAS_ACOES` | constante (exportada) | Ícone SVG de cada ação da mesa, pelo id da barra de ações (mais `avancar` e `vanishing`). |

## `src/arte/mesas.js`

Fundos da mesa: feltro verde (neutro) e um fundo por terreno (montanha, pântano, oceano). Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.

| Nome | Tipo | Descrição |
|---|---|---|
| `desenharFeltro(W, H, S)` | função (exportada) | Feltro verde da mesa neutra, com fibras e vinheta. |
| `fibras(ctx, W, H, aleatorio, n, clara, escura)` | função | Fibras do tecido: `n` riscos curtos alternando a cor clara e a escura. |
| `mesaMontanha(ctx, W, H, aleatorio)` | função | Fundo da mesa no terreno montanha: céu de entardecer, cordilheira e trilha subindo. |
| `vitoriaRegia(ctx, x, y, r, rot, aleatorio)` | função | Desenha uma vitória-régia (folha flutuante) no pântano. |
| `mesaPantano(ctx, W, H, aleatorio)` | função | Fundo da mesa no terreno pântano: água escura, névoa, vitórias-régias e vaga-lumes. |
| `rosaDosVentos(ctx, cx, cy, R, cor)` | função | Desenha uma rosa dos ventos de raio R. |
| `mesaOceano(ctx, W, H, aleatorio)` | função | Fundo da mesa no terreno oceano: ondas, espuma e rosa dos ventos. |
| `desenharMesa(terreno, W, H, S)` | função (exportada) | Desenha o fundo da mesa do terreno (W×H unidades na densidade S). |

## `src/arte/moldura.js`

Moldura das cartas no estilo de card game de fantasia: corpo texturizado, placas de nome/tipo/poder e gemas de custo. Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.

| Nome | Tipo | Descrição |
|---|---|---|
| `corpoDaMoldura(ctx, W, H, P, aleatorio, lendaria)` | função (exportada) | Corpo da carta: borda preta, moldura texturizada na cor do naipe e, nas lendárias, acabamento dourado. |
| `placa(ctx, x, y, w, h, P, opcoes)` | função (exportada) | Placa (barra de nome / linha de tipo / caixa de poder) |
| `gema(ctx, cx, cy, r, cor, rotulo, opcoes)` | função (exportada) | Gema redonda (símbolo de custo) |

## `src/arte/paleta.js`

Medidas-base das cartas, cores por naipe e fontes usadas na arte.

| Nome | Tipo | Descrição |
|---|---|---|
| `CARTA_L` | constante (exportada) | Tamanho-base da carta completa (mão e inspeção), em unidades de desenho. |
| `MINI_L` | constante (exportada) | Tamanho-base da carta da mesa (neurônio). |
| `TINTA` | constante (exportada) | Cor de tinta dos textos sobre pergaminho. |
| `FONTE_SIMBOLOS` | constante (exportada) | Fontes com os símbolos ♠♥♣♦ desenhados de forma consistente. |
| `PALETA_NAIPE` | constante (exportada) | Paleta de cada naipe: tons da moldura (clara, media, escura), gema de custo, brilho dos cenários, barra de título (titulo, tituloEscuro), céu do cenário (3 tons) e tinta clara. |

## `src/arte/pincel.js`

Pincel: utilitários de desenho em canvas 2D (telas com densidade, caminhos, degradês, texto, texturas, sombras e cores). Todo o resto da arte é construído sobre estas funções. Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.

| Nome | Tipo | Descrição |
|---|---|---|
| `criarTela(w, h, S)` | função (exportada) | Cria um canvas de w×h unidades na densidade S e devolve `{ c: canvas, ctx }` já escalado. |
| `caminhoArredondado(ctx, x, y, w, h, r)` | função (exportada) | Traça (sem preencher) um retângulo de cantos arredondados. |
| `hashDoTexto(texto)` | função (exportada) | Número inteiro derivado do texto (para sementes estáveis por carta). |
| `geradorComSemente(semente)` | função (exportada) | Gerador de números aleatórios reprodutível (mulberry32) a partir da semente. |
| `degradeLinear(ctx, x0, y0, x1, y1, paradas)` | função (exportada) | Cria um degradê linear a partir de uma lista de paradas `[posição, cor]`. |
| `degradeRadial(ctx, x0, y0, r0, x1, y1, r1, paradas)` | função (exportada) | Cria um degradê radial a partir de uma lista de paradas `[posição, cor]`. |
| `escreverComQuebra(ctx, texto, x, y, larguraMax, alturaLinha)` | função (exportada) | Escreve o texto quebrando linhas em `larguraMax`; respeita "\n". Devolve o número de linhas usadas. |
| `ajustarFonte(ctx, texto, larguraMax, tamanho, peso, familia, min)` | função (exportada) | Define a fonte no maior tamanho (até `tamanho`, no mínimo `min`) em que o texto cabe em `larguraMax`. |
| `granulado(ctx, x, y, w, h, aleatorio, intensidade, alfa)` | função (exportada) | Textura de grão: pontinhos claros e escuros |
| `escovado(ctx, x, y, w, h, aleatorio, alfa)` | função (exportada) | Linhas de escova (metal/pedra da moldura) |
| `sombraSuave(ctx, desfoque, deslocY, alfa)` | função (exportada) | Liga uma sombra preta suave para os próximos desenhos. |
| `semSombra(ctx)` | função (exportada) | Desliga a sombra. |
| `brilho(ctx, x, y, r, cor, a)` | função (exportada) | Desenha um brilho radial (halo) de raio r e opacidade a. |
| `comAlfa(hex, a)` | função (exportada) | Converte uma cor #rrggbb em rgba() com opacidade a. |
| `tonalizar(hex, f)` | função (exportada) | Clareia (f > 0) ou escurece (f < 0) uma cor #rrggbb. |

## `src/arte/retrato.js`

Moldura medieval do retrato do professor no quadro de conquistas.

| Nome | Tipo | Descrição |
|---|---|---|
| `caminhoArredondado(ctx, x, y, w, h, r)` | função | Caminho de retângulo arredondado. |
| `arcoGotico(ctx, x, y, w, h)` | função | Caminho de arco gótico (janela da moldura). |
| `dourado(ctx, x0, y0, x1, y1)` | função | Degradê dourado da moldura. |
| `desenharRetratoEmMoldura(src, S, nome, titulo, pronto)` | função (exportada) | Desenha a foto numa moldura medieval (arco gótico dourado, brasão e fita com o nome). A foto carrega de forma assíncrona; `pronto(canvas)` é chamado quando o desenho termina. |

## `src/arte/versos.js`

Versos das cartas, um por baralho: clássico (damasco), truco (baralho espanhol), nobreza (coroa em veludo), backprop (grafo de computação), fraternidade (anéis), yin-yang (A e 2) e Power BI (painel de indicadores). Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.

| Nome | Tipo | Descrição |
|---|---|---|
| `molduraDourada(ctx, W, H, dourado)` | função | Moldura dourada dupla do verso das cartas. |
| `legenda(ctx, W, y, a, b, cor, larguraMax)` | função | Escreve o título do verso (linha a) e o subtítulo (linha b) centralizados. |
| `versoClassico(ctx, W, H, aleatorio)` | função | Clássico: damasco vinho com a rede neural dourada |
| `versoTruco(ctx, W, H, aleatorio)` | função | Truco: verso de baralho espanhol, margem branca, treliça azul, espada e pau cruzados |
| `versoFraternidade(ctx, W, H, aleatorio)` | função | Fraternidade: corrente de anéis dourados sobre verde, quatro naipes de mãos dadas |
| `simboloYinYang(ctx, cx, cy, r)` | função | Yin-yang: campo dividido em preto e marfim, só Ás e Dois |
| `versoYinYang(ctx, W, H, aleatorio)` | função | Verso do baralho yin-yang: metades clara e escura e o símbolo no centro. |
| `versoPowerBI(ctx, W, H, aleatorio)` | função | Power BI: painel de indicadores (gráficos e um botão de atualizar), que embaralha a mão |
| `versoNobreza(ctx, W, H, aleatorio)` | função | Nobreza: veludo púrpura com flores-de-lis e uma coroa dourada no medalhão |
| `florDeLis(ctx, x, y, s)` | função | Flor-de-lis simples, centrada em (x, y), de tamanho s. |
| `coroa(ctx, cx, cy, l, ouro)` | função | Coroa de três pontas com gemas, de largura l, base em (cx, cy). |
| `versoBackprop(ctx, W, H, aleatorio)` | função | Backprop: papel de projeto azul com o grafo de computação de um neurônio (x·w + b → f → a) |
| `desenharVerso(formato, S, baralho)` | função (exportada) | Desenha o verso do baralho. |

## `src/cenas/CenaCarregamento.js`

Cena de carregamento: espera as fontes e gera as texturas fixas (verso clássico, cartas de terreno, avatares, faísca e a textura da inspeção). Depois abre o menu.

| Nome | Tipo | Descrição |
|---|---|---|
| `FONTES_NECESSARIAS` | constante | Fontes usadas pelo canvas; precisam estar carregadas antes de desenhar as cartas. |
| `AVATARES` | constante | Avatares gerados: chave → cor do aro. |
| `gerarTexturas()` | método | Gera as texturas que não dependem da partida. |

## `src/cenas/CenaMenu.js`

Cena do menu: fundo animado (uma rede neural pulsando e cartas flutuando) atrás do painel HTML do menu.

| Nome | Tipo | Descrição |
|---|---|---|
| `COLUNAS` | constante | Neurônios por coluna da rede decorativa. |
| `tocarMusicaDoMenu()` | método | Trilha do menu. O navegador só libera som depois de um gesto: se ainda não liberou, a música começa no primeiro toque ou clique na página (sem pedir nada à pessoa). |
| `espalharCartas()` | método | Nove cartas semitransparentes flutuando devagar. |
| `update(tempo)` | método | Redesenha a rede com conexões que pulsam (azul e laranja, como no TensorFlow Playground). |

## `src/cenas/mesa/CenaMesa.js`

Cena da mesa: onde a partida acontece. A classe é pequena de propósito. Os métodos ficam em arquivos separados por assunto e são copiados para o protótipo no fim deste arquivo: | Arquivo | Assunto | |---------------|--------------------------------------------------------------------| | cenario.js | molduras fixas, botões e criação dos textos dos painéis | | desenho.js | desenhar o estado: neurônios, mãos, placar, curva, dica, alvos | | entrada.js | cliques e toques do jogador | | turnos.js | fluxo da mão: iniciar, executar jogada, vez de cada jogador | | truco.js | pedir, anunciar e responder truco | | efeitos.js | animações dos eventos, faíscas, faixas, balão e avisos do Glossário | | ambiente.js | ambiente animado do terreno (neve, neblina, vaga-lumes, ondas, vento) | | paineis.js | painéis de leitura: placar por camada, registro completo, cemitério | | online.js | partida online: ações pela sala, fila, vez dos outros aparelhos | | resultado.js | fim da mão, tentos, conquistas, comemoração e tela de resultado | | dicas.js | modo dicas: sugestão de jogada e dicas flutuantes dos botões | Estado principal da cena: - `this.partida`: placar de tentos e truco (nucleo/truco.js); - `this.mao`: estado da mão atual (nucleo/partida.js); - `this.quemVe`: índice do jogador que está olhando a tela (-1 enquanto o aparelho troca de mãos); - `this.numJogadores`, `this.humanos`, `this.variosHumanos`: quem está na mesa (os humanos são os primeiros índices; os demais são oponentes do computador); - `this.modo`, `this.selecao`, `this.alvos`: o que o jogador está escolhendo; - `this.ocupada`: verdadeiro durante animações e a vez do oponente (bloqueia cliques); - `this.encerrada`: a mão acabou.

| Nome | Tipo | Descrição |
|---|---|---|
| `create()` | método | Monta a mesa e começa a primeira mão (depois das regras, na primeira visita). |
| `update(tempo)` | método | A cada quadro: conexões animadas, contornos pulsantes e o destaque de quem está na vez. |

## `src/cenas/mesa/ambiente.js`

Parte da CenaMesa: ambiente animado de cada terreno. Tem duas camadas: - **fundo** (profundidade 0,5): por cima da pintura do terreno e por baixo de tudo; aparece nas bordas, entre as colunas e através dos painéis translúcidos; - **frente** (profundidade 4,5): por cima das cartas da mesa e por baixo dos destaques, dos painéis e da mão. Só leva **partículas pequenas** (flocos, sementes, bolhas, brilhos, riscos de vento, vaga-lumes), poucas e já adiantadas (`advance`), para a mesa parecer viva desde o primeiro quadro sem poluir as cartas: elas continuam opacas em relação ao fundo. Numa tela pequena (celular) essas partículas crescem até 1,8× (`escalaDaTela`), para terem na tela o tamanho que têm no desktop em vez de sumirem. Véus que cobrem uma área grande (neblina, sombras de nuvem, raios de sol, cáusticas, halos) ficam sempre no fundo, por trás das cartas — por cima delas, deixavam o terreno "aparecer através" das cartas. | Terreno | Fundo | Frente | |----------|------------------------------------------------------------------|------------------------------------------| | Planície | luz quente que respira, raios de sol, sombras de nuvens, pólen | sementes de dente-de-leão, pólen fino | | Montanha | sol do entardecer, nuvens, névoa rasteira, neve grossa | neve fina, rajadas de vento | | Pântano | neblina, halos dos vaga-lumes e do fogo-fátuo, bolhas subindo | vaga-lumes, bolhas, fogo-fátuo que vagueia | | Oceano | ondas que correm, cáusticas (a luz dançando no fundo do mar), espuma | brilhos, riscos de corrente, bolhas, vento | Em todos, a pintura do terreno se aproxima e se afasta devagar. Tudo é desenhado por código (texturas pequenas geradas na hora). Com "reduzir movimento" no sistema, o ambiente fica parado: só as camadas de luz e cor.

| Nome | Tipo | Descrição |
|---|---|---|
| `FUNDO` | constante | Profundidade da camada de fundo (por cima da pintura do terreno). |
| `FRENTE` | constante | Profundidade da camada da frente (por cima das cartas da mesa, por baixo dos destaques): só partículas pequenas. |
| `MESA` | constante | Área da mesa entre os dois painéis. |
| `reduzirMovimento()` | função | Sistema pediu menos movimento? |
| `AMPLIACAO_MAXIMA` | constante | Maior ampliação das partículas da frente numa tela pequena. |
| `escalaDaTela(cena)` | função (exportada) | Quanto ampliar as partículas da frente para que tenham, na tela, o tamanho que têm no desktop: no celular a mesa de 1280 é exibida com 650–850 px de largura e flocos, bolhas e riscos encolhiam até quase sumir. 1 no desktop; até 1,8 num celular deitado. |
| `ampliarParticulas(config, k)` | função (exportada) | Copia a configuração de um emissor multiplicando o tamanho das partículas por `k`. |
| `criarAmbiente(terreno)` | método | Cria o ambiente do terreno da partida. |
| `particulasDaFrente(x, y, textura, config)` | método | Emissor da camada da frente (por cima das cartas), com as partículas ampliadas em tela pequena. |
| `respirarFundo()` | método | A pintura do terreno se aproxima e se afasta devagar (dá vida até às bordas da tela). |
| `criarTexturasDoAmbiente()` | método | Texturas pequenas das partículas (uma vez por jogo). |
| `criarTexturaDeCausticas()` | método | Cáusticas: rede de linhas claras e onduladas que emenda nas bordas (a textura se repete sem costura quando rola). Cada linha é uma senoide com número inteiro de ondas na largura. |
| `guardar(...objetos)` | método | Guarda um objeto do ambiente (para os testes contarem e para destruir junto com a mesa). |
| `luzDoTerreno(cor, alfa, cx = MUNDO.largura / 2, cy = MUNDO.altura * 0.4)` | método | Luz colorida por cima do fundo, para o terreno ficar mais claro e reconhecível. |
| `atravessar(objeto, duracao, desde = objeto.x)` | método | Nuvem (ou sombra, ou neblina) que atravessa a tela da esquerda para a direita, para sempre. |
| `fogoFatuo()` | método | Fogo-fátuo: uma luz azulada que aparece, vagueia pela mesa deixando rastro e some (o halo fica por trás das cartas). |
| `desenharOndas(tempo)` | método | Ondas do oceano: nove linhas que correm devagar. |
| `atualizarAmbiente(tempo)` | método | A cada quadro (CenaMesa.update): ondas e cáusticas do oceano. |

## `src/cenas/mesa/cenario.js`

Parte da CenaMesa: elementos fixos da tela (molduras dos painéis, colunas das camadas), botões e criação de todos os textos e imagens dos painéis. Os métodos daqui são copiados para CenaMesa.prototype; `this` é a cena.

| Nome | Tipo | Descrição |
|---|---|---|
| `COR_ROTULO` | constante | Cor do rótulo de cada variante de botão. |
| `TEMPO_DE_SEGURAR` | constante | Quanto tempo (ms) o dedo precisa ficar no botão para mostrar a dica em vez de executar a ação. |
| `desenharCenarioFixo()` | método | Molduras dos painéis laterais, divisórias e colunas das camadas com seus nomes. |
| `criarBotao(x, y, l, a, rotulo, acao, opcoes = {})` | método | Cria um botão com textura própria e rótulo que se ajusta à largura. O objeto devolvido ganha `definirRotulo(texto)` e `habilitar(sim)`. Com `opcoes.dica`, o botão mostra uma dica flutuante (modo "dicas" ligado): ao passar o mouse, ou, no celular, ao segurar o botão apertado. Soltar depois de segurar não executa a ação, para que dê para ler a dica sem jogar sem querer. A ação roda ao soltar o toque/clique. `explicar`, quando dado, devolve o texto que aparece no quadro de instruções (painel esquerdo) enquanto o cursor está sobre o botão: o que a ação faria agora, antes de confirmar. |
| `criarPaineis()` | método | Cria os textos, imagens e botões dos painéis. Ficam em `this.painel`. |
| `criarTexto(x, y, s, estilo)` | método | Atalho para criar texto na fonte do corpo, já na profundidade dos painéis. |
| `criarPainelEsquerdo(p)` | método | Painel esquerdo: inspeção, limbo e cemitério (como pilhas), terreno e dica do turno. |
| `criarPlacar(p)` | método | Placar (painel direito): título da mão e um bloco por jogador com avatar, nome, nível, situação, detalhes, tentos e soma da rede. Os blocos de cima são os adversários de quem está vendo; o dele fica por último. Com mais de 2 jogadores os blocos são compactos (ver `blocosDoPlacar` em layout.js). |
| `criarBlocoCompacto(rx, y, rl, a)` | método | Bloco compacto do placar (mesas com 3 a 5 jogadores): avatar pequeno, nome, uma linha com a situação e a mão, e a soma à direita. Tem os mesmos campos do bloco grande, para que `atualizarBlocoDoJogador` sirva aos dois. |
| `criarBotoesDeAcao(p)` | método | Botão de truco e a barra de ações, como no NeuroDeck: selecione cartas da mão e acendem só os botões das jogadas possíveis com elas; passar o cursor num botão explica o efeito no quadro de instruções antes de confirmar. Os botões ficam em `p.acoes[id]`; dropout, transfer e passar também em `p.botaoDropout`, `p.botaoTransfer` e `p.botaoPassar`. |
| `atualizarChaves()` | método | Atualiza os rótulos das chaves (som, música e dicas) nas janelas REGRAS e MENU, se abertas. O botão REGRAS ganha uma estrela quando as dicas estão ligadas. |

## `src/cenas/mesa/desenho.js`

Parte da CenaMesa: desenhar o estado da mão na tela. Neurônios, mãos, placar, curva de treino, dica do turno, alvos destacados e as conexões animadas entre os neurônios de cada rede. Nada aqui muda as regras; só lê `this.mao` e `this.partida`.

| Nome | Tipo | Descrição |
|---|---|---|
| `corDaSoma` | constante | Cor da soma no placar: vermelha se uma quadra zerou a rede, laranja se a saída do Backprop saturou. |
| `inspecionar(textura, nota)` | método | Mostra uma textura na inspeção, com uma nota explicativa embaixo. |
| `mostrarDica(texto)` | método | Mostra a dica do turno no rodapé do painel esquerdo. |
| `redesenhar()` | método | Redesenha tudo a partir do estado: pontuações, alvos, neurônios, mãos e painéis. |
| `desenharMaos()` | método | Desenha a mão do jogador de baixo (aberta) e a do de cima (versos). |
| `posicaoDaMaoDeCima(k, n)` | método | Centro e largura do leque de cartas de um adversário no alto da mesa. |
| `notaDaCartaDaMao(carta)` | método | Nota da inspeção para uma carta da mão: onde ela pode ser usada agora. |
| `atualizarPaineis()` | método | Atualiza os textos e botões dos painéis. |
| `textoComDicaDeJogo()` | método | Dica do turno e, com as dicas ligadas, o título da dica de jogo atual. |
| `atualizarPilha(pilha, nome, quantidade, texturaDoTopo)` | método | Desenha uma pilha (limbo ou cemitério): a carta do topo (ou o verso), bordas de cartas empilhadas por baixo quando há mais de uma, o contador e o rótulo. |
| `atualizarBlocoDoJogador(b, j)` | método | Bloco de placar de um jogador: avatar, nome, nível, situação, detalhes, tentos e soma. |
| `textoDaSituacao(j)` | método | Situação da rede do jogador e a camada em que está: "em construção · camada 3/6". |
| `atualizarBlocoCompacto(b, j, naVez)` | método | Bloco compacto do placar (3 a 5 jogadores): nome, situação, mão e tentos numa linha, e a soma. |
| `estaNaVez(j)` | método | O jogador `j` está na vez (e a mão está em andamento)? |
| `desenharDestaqueDaVez(tempo)` | método | Brilho pulsante em volta do bloco de placar de quem está na vez (desenhado a cada quadro). |
| `atualizarBotoes()` | método | Habilita os botões conforme o que o jogador pode fazer agora. |
| `atualizarRegistro()` | método | Registro de jogadas: as linhas mais recentes que couberem. |
| `desenharCurva()` | método | Curva de treino: soma de cada rede a cada turno. |
| `textoDaDica()` | método | Texto de ajuda do momento, conforme a fase e o modo de seleção. |
| `alvosDaAcao(tipo)` | método | Neurônios onde a ação da barra pode ser feita com a seleção atual. "Tunagem" é qualquer pilha na própria rede (inclusive a de 3 e 4 cartas, que aplica early stop ou stack overflow em si); os outros três são ataques à rede de um rival. |
| `dropoutPossivel()` | método | Dá para fazer dropout agora? Com cartas selecionadas, desfazendo uma camada por carta. |
| `valorSelecionado()` | método | Valor (A, 2…K) das cartas selecionadas na mão. |
| `calcularAlvos()` | método | Calcula quais neurônios podem ser clicados agora e com que efeito (em `this.alvos`). |
| `desenharConexoesEAlvos(tempo)` | método | Desenho contínuo (a cada quadro): contorno e conexões de cada rede, com espessura proporcional ao valor, pulsos de "sinal" percorrendo as ligações e o contorno pulsante dos alvos. |

## `src/cenas/mesa/dicas.js`

Parte da CenaMesa: o modo "dicas". Com as dicas ligadas, o jogador recebe: - a cada vez, uma **dica de jogo** (conteudo/dicasDeJogo.js) no estilo do Glossário: uma oportunidade, um risco ou uma estratégia geral, sempre com o conceito de redes neurais por trás. As dicas usam só informação pública e nunca apontam qual neurônio oculto ativar; - **dicas flutuantes** nos botões de ação (Dropout, Transfer, Passar e TRUCO): ao passar o mouse ou, no celular, ao segurar o botão. Explicam a ação, o que vale fazer agora (no truco, a chance estimada por simulação) e o conceito do Glossário; - a chance estimada de vitória também na caixa de resposta ao truco. Em troca, a mão jogada com dicas (ligadas em algum momento) não vale conquistas nem conta nas estatísticas. O aviso aparece ao ligar.

| Nome | Tipo | Descrição |
|---|---|---|
| `SIMULACOES_DA_DICA` | constante | Simulações usadas para estimar a chance de vitória mostrada nas dicas. |
| `MEMORIA_DE_DICAS` | constante | Quantas dicas recentes evitar repetir. |
| `conceitoCurto(id)` | função | Primeira frase do conceito de um verbete (para a linha "conceito" das dicas). |
| `alternarDicas()` | método | Botão "Ativar dicas": avisa sobre as conquistas antes de ligar; desliga direto. |
| `darDicaDoTurno()` | método | Mostra a dica de jogo da vez do humano (só com as dicas ligadas e só se mudou). |
| `textoDaDicaDeJogo()` | método | Linha curta da dica atual, para o rodapé do painel esquerdo. |
| `mostrarDicaDoBotao(chave, x, y, l, a)` | método | Mostra a dica do botão `chave` ao lado do retângulo (x, y, l, a) do mundo do jogo. |
| `esconderDicaDoBotao()` | método | Esconde a dica flutuante. |
| `conteudoDaDica(chave)` | método | Texto da dica de cada botão: o que faz, o que vale fazer agora e o conceito de ML. |
| `dicaDaRespostaAoTruco(quem)` | método | Linha com a chance estimada, para a caixa de resposta ao truco (só com dicas ligadas). |

## `src/cenas/mesa/efeitos.js`

Parte da CenaMesa: animações e falas. Traduz os eventos das regras (ver nucleo/partida.js) em giros de carta, cartas voando, faíscas, faixas de texto, tremidas de câmera, balão de fala do oponente e avisos do Glossário.

| Nome | Tipo | Descrição |
|---|---|---|
| `ATAQUES` | constante | Cor e título de cada ataque. |
| `corCss` | constante | Número de cor 0xRRGGBB para texto CSS. |
| `posicaoDoNeuronio(id)` | método | Centro do neurônio na tela. |
| `origemDasCartas(j)` | método | Ponto de onde saem as cartas jogadas por `j` (a mão de baixo ou o leque dele no alto). |
| `animarEventos(eventos, jogada)` | método | Anima uma lista de eventos das regras. |
| `animar_ativacao(evento)` | método | Neurônio revelado: gira a carta e mostra os pontos ganhos. |
| `animar_tunagem(evento)` | método | Tunagem: cartas voam para o neurônio e somam pontos. |
| `animar_ataque(evento, jogada)` | método | Ataques (overfit, early stop, stack overflow): cartas voam, o neurônio treme e some. |
| `animar_dropout(evento)` | método | Dropout: os neurônios desfeitos saem da mesa e vão para o cemitério. |
| `animar_transfer()` | método | Transfer learning. |
| `animar_completa(evento)` | método | Rede chegou à camada de saída. |
| `animar_vento(evento)` | método | Terreno oceano: o vento mudou de naipe. |
| `animar_powerbi(evento)` | método | Baralho Power BI: as cartas da mão foram trocadas. |
| `animar_travada(evento)` | método | Rede finalizada porque não sobrou neurônio livre na camada seguinte. |
| `animar_passe(evento)` | método | Alguém passou a vez. |
| `animar_inicio(evento)` | método | Quem começa: mostra as cartas reveladas (ou anuncia o sorteio). |
| `verificarVanishing()` | método | Avisa quando uma rede acaba de formar uma quadra de figuras (vanishing gradient) ou, no baralho Backprop, quando a saída fica saturada depois das ativações (saturação no forward pass, com verbete próprio). |
| `voarCarta(carta, x0, y0, x1, y1, atraso = 0)` | método | Uma carta voa de (x0, y0) até (x1, y1) e some. |
| `explodir(x, y, cor, quantidade)` | método | Explosão de `quantidade` faíscas da cor dada. A faísca colorida é uma textura própria (Canvas não tem tint). |
| `textoFlutuante(x, y, texto, cor = '#fff', tamanho = 20)` | método | Texto que sobe e desaparece. |
| `faixa(texto, cor = '#f6dc8f', tamanho = 48, icone = null)` | método | Faixa grande no centro do tabuleiro (gritos de truco, ataques). |
| `falar(texto, quem)` | método | Balão de fala de um oponente. Fica à esquerda do placar, na altura do bloco dele, com a ponta virada para o avatar. |
| `impactoDoTruco(valor)` | método | Impacto do grito de truco: tapa na mesa, flash e tremor de tela mais fortes que o do stack overflow, crescendo a cada degrau (TRUCO 3, SEIS 6, NOVE 9, DOZE 12). |
| `avisarVerbete(id)` | método | Mostra uma vez por sessão o resumo do verbete do Glossário ligado ao que aconteceu. |

## `src/cenas/mesa/entrada.js`

Parte da CenaMesa: respostas a toques e cliques do jogador. Passar o cursor nos neurônios, clicar neles, selecionar cartas da mão, dropout, transfer, passar a vez e voltar ao menu. Modos de seleção (`this.modo`): 'livre' (padrão), 'inicio' (escolher a carta que decide quem começa), 'dropout' (escolher até onde desfazer) e 'pagarDropout' (escolher as cartas que pagam).

| Nome | Tipo | Descrição |
|---|---|---|
| `ACAO_DO_MOTOR` | constante | Ação do motor do NeuroDeck correspondente a cada botão (para o texto da regra). |
| `realcarNeuronio(id, entrando)` | método | Aproxima a carta da mesa sob o cursor (zoom leve, por cima das vizinhas) e a devolve ao sair. |
| `aoPassarNoNeuronio(id, entrando)` | método | Cursor sobre um neurônio: mostra a carta na inspeção e explica o efeito de clicar. |
| `executarAcao(tipo)` | método | Botão de empilhar da barra (tunagem, overfit, early stop, stack overflow): com um alvo só, joga direto; com mais de um (vários rivais), destaca só os alvos dessa ação e espera o clique. |
| `acionarDropout()` | método | Botão Dropout: com cartas selecionadas, desfaz uma camada por carta e paga com elas (como no NeuroDeck); sem seleção, entra no modo de escolher até onde desfazer no tabuleiro. |
| `explicarAcao(id)` | método | Texto do quadro de instruções para um botão da barra: o que ele faria agora, com as cartas selecionadas, ou o que falta para ele acender; depois, a regra do NeuroDeck. |
| `aoClicarNoNeuronio(id)` | método | Clique num neurônio: ativa, empilha as cartas selecionadas ou escolhe o alcance do dropout. |
| `aoClicarNaCarta(idCarta)` | método | Clique numa carta da mão: escolhe a carta de início, paga o dropout ou monta a seleção. |
| `cancelarSelecao()` | método | Esc: limpa a seleção e sai do modo de dropout. |
| `alternarDropout()` | método | Botão Dropout: entra ou sai do modo de escolher o alcance. |
| `fazerTransfer()` | método | Botão Transfer: troca as quatro cartas iguais da mão. |
| `passarAVez()` | método | Botão Passar a vez. |
| `abrirRegrasDaMesa()` | método | Botão REGRAS da mesa: como jogar, Glossário e a chave das dicas, numa janela só. |
| `abrirAjudaDaMesa()` | método | Botão "?" da mesa: ajuda das ações, aberta na última ação explicada no quadro. |
| `abrirMenuDaMesa()` | método | Botão MENU da mesa: som e música (a janela fica aberta para ligar e desligar), voltar ao jogo ou abandonar a partida. |
| `registrarAbandono()` | método | Estatísticas de uso: saiu da partida antes do fim (`jogo_abandonado`). |

## `src/cenas/mesa/layout.js`

Geometria da mesa e utilitários de texto que se ajusta ao espaço. Tudo em coordenadas do mundo (1280x720). Painel esquerdo: inspeção, pilhas e dica. Centro: as camadas da rede e as mãos. Painel direito: placar, truco, curva e ações. A geometria do tabuleiro depende da mesa (arquitetura e número de jogadores): `definirMesa` calcula, uma vez por partida, o espaço entre colunas e linhas e o tamanho das cartas da mesa, e `colunaX`, `linhaY` e `cartaDaMesa` passam a responder para essa mesa. Os botões são grandes (≥ 52 de altura) para o toque no celular, e a área de toque passa um pouco da borda desenhada (`FOLGA_DE_TOQUE`).

| Nome | Tipo | Descrição |
|---|---|---|
| `PAINEL_ESQ` | constante (exportada) | Painel esquerdo (inspeção, pilhas e dica). |
| `PAINEL_DIR` | constante (exportada) | Painel direito (placar, curva, registro e ações). |
| `ESQ` | constante (exportada) | Posições verticais dentro do painel esquerdo, de cima para baixo. `pilha` é o tamanho das cartas do limbo e do cemitério. |
| `DIR` | constante (exportada) | Posições verticais dentro do painel direito. Os blocos de placar ficam empilhados a partir de `blocos`, cada um com altura `alturaBloco`; o botão de truco fica logo acima das ações. |
| `NOME_DA_ACAO` | constante (exportada) | Nome de cada ação da barra, para dicas e explicações. |
| `BARRA_DE_ACOES` | constante (exportada) | Ações da barra, na ordem: [id, rótulo, linha]. O id é o tipo de alvo (ver calcularAlvos) ou a ação. |
| `blocosDoPlacar(n)` | função (exportada) | Posição dos blocos do placar. Com 2 jogadores, os dois blocos grandes de sempre; com mais, blocos compactos dividindo o mesmo espaço (do topo dos blocos até a curva de treino). |
| `FOLGA_DE_TOQUE` | constante (exportada) | Quanto a área de toque de um botão passa da borda desenhada, de cada lado. |
| `TABULEIRO` | constante (exportada) | Área do tabuleiro: entre os painéis, abaixo dos nomes das camadas e acima da mão de baixo. Na mesa padrão (7 camadas de até 5 neurônios) as colunas ficam a 97 e as linhas a 95, com as cartas no tamanho cheio; mesas maiores encolhem espaço e cartas para caber. |
| `mesa` | constante | Geometria da mesa em uso (ver `definirMesa`). Começa pela mesa padrão. |
| `definirMesa(tamanhos)` | função (exportada) | Calcula a geometria do tabuleiro para os tamanhos de camada da mesa. |
| `geometria` | constante (exportada) | Geometria da mesa em uso. |
| `totalDeCamadasDaMesa` | constante (exportada) | Número de camadas da mesa em uso. |
| `colunaX` | constante (exportada) | X do centro da coluna da camada. |
| `linhaY` | constante (exportada) | Y do centro do neurônio `posicao` na camada. |
| `cartaDaMesa()` | função (exportada) | Tamanho de exibição de uma carta da mesa (`l` x `a`) e as metades, para contornos e ligações. |
| `COR_JOGADOR` | constante (exportada) | Cor de cada jogador (até 5), em número (Phaser) e em texto (CSS). |
| `COR_DO_ALVO` | constante (exportada) | Cor do contorno que destaca cada tipo de alvo. |
| `NOME_SITUACAO` | constante (exportada) | Texto da situação de cada rede. |
| `ajustarCartaDaMesa(imagem)` | função (exportada) | Ajusta a imagem de um neurônio ao tamanho da carta da mesa e guarda a escala-base (para animar o giro). |
| `ajustarLinha(texto, conteudo, tamanho, larguraMax, minimo)` | função (exportada) | Texto de uma linha que encolhe até caber em `larguraMax`; se ainda não couber, corta com "…". Não refaz o cálculo se nada mudou. |
| `ajustarBloco(texto, conteudo, tamanho, larguraMax, alturaMax, minimo)` | função (exportada) | Bloco de texto com quebra de linha que encolhe até caber na altura. |

## `src/cenas/mesa/online.js`

Parte da CenaMesa: partida online (src/online/sala.js). Cada aparelho mostra a mesa do ponto de vista da própria cadeira e aplica as ações na ordem numerada pela sala: - jogadas, pedidos de truco e respostas deste aparelho não são aplicados na hora: vão para a sala (`enviarOnline`) e voltam numerados, como as dos outros; - as ações chegam numa fila e são aplicadas uma de cada vez, quando a mesa está parada esperando (`aguardandoRede`), com as mesmas animações de uma partida local; - só o anfitrião joga pelos oponentes do computador (e responde truco por eles); - todos criam cada mão com a mesma semente (`sementeDaMao`), então o estado é igual em todas as telas; ações de uma mão que este aparelho ainda não abriu esperam na fila; - quem cai vira oponente do computador no mesmo ponto em todas as telas (ação `substituir`).

| Nome | Tipo | Descrição |
|---|---|---|
| `prepararOnline()` | método | Liga a cena à sala (se a partida for online). Chamado no início de `create`. |
| `cadeiraOnline()` | método | Cadeira deste aparelho na sala. |
| `souAnfitriaoOnline()` | método | Este aparelho joga pelos oponentes do computador? |
| `chaveDaMao()` | método | Identifica a mão atual (partida e número da mão), para separar as ações de cada mão. |
| `sementeDaMao()` | método | Semente da mão atual: a mesma em todos os aparelhos. |
| `jogadoresOnline()` | método | Jogadores da partida online: as pessoas pelo nome, as outras cadeiras com o perfil escolhido. |
| `enviarOnline(acao)` | método | Manda uma ação deste aparelho para a sala e espera ela voltar numerada. |
| `esperarRede()` | método | A mesa para e espera a próxima ação da sala. |
| `processarFilaOnline()` | método | Aplica a próxima ação da fila, se a mesa estiver esperando e a ação for da mão atual. |
| `aplicarSubstituicao(acao)` | método | Alguém caiu: a cadeira passa para um oponente do computador nesta mão e nas próximas. |
| `avancarNoInicioOnline()` | método | Escolha de quem começa, online: o anfitrião manda a carta dos oponentes do computador (uma vez por mão); este aparelho escolhe a própria carta; os outros escolhem nas telas deles. Quando todos escolheram, as cartas aparecem juntas, como na partida local. |
| `avancarOnline()` | método | Vez de alguém que não é este aparelho: o anfitrião joga pelos oponentes do computador; nos outros casos, a mesa espera a ação chegar pela sala. |

## `src/cenas/mesa/paineis.js`

Painéis de leitura da mesa, como no NeuroDeck: placar por camada (clique num bloco do placar), registro completo da mão (clique no registro) e lista do cemitério e do limbo (clique na pilha). São só leitura: abrem por cima da mesa e fecham com Esc, no X ou clicando fora.

| Nome | Tipo | Descrição |
|---|---|---|
| `listaDeCartas(cartas, vazio)` | função | Lista de cartas como selos "7♥", ou um aviso quando a pilha está vazia. |
| `abrirPlacarPorCamada()` | método | Placar por camada: uma coluna por jogador, uma linha por camada, com a carta ativada e os pontos de cada neurônio, os combos de figuras e a soma. |
| `abrirRegistroCompleto()` | método | Registro completo da mão, da primeira jogada à última (o painel da mesa mostra só o fim). |
| `abrirCemiterio()` | método | Cartas fora de jogo: o cemitério (abertas) e o limbo (só a quantidade, porque são ocultas). |

## `src/cenas/mesa/resultado.js`

Parte da CenaMesa: fim da mão. Marca os tentos, registra conquistas e mostra a tela de resultado com a soma detalhada de cada rede.

| Nome | Tipo | Descrição |
|---|---|---|
| `TROFEU` | constante | Troféu desenhado em SVG para a tela de vitória. |
| `encerrarMao(corrida)` | método | Encerra a mão. truco, ou null quando a mão foi jogada até o fim. |
| `registrarEstatisticas(vencedor, humanoVenceu, completa, valorDaMao)` | método | Estatísticas de uso do fim da mão (interface/analise.js): `fim_mao` sempre e, se a partida acabou, `jogo_finalizado` mais `vitoria_do_jogador` ou `derrota_jogador`. "Jogador" é quem joga neste aparelho: a cadeira dele na partida online, ou qualquer humano no jogo local. |
| `comemorar(nivel, nome)` | método | Comemoração da vitória: fanfarra, clarão dourado, faixa grande, fogos e chuva de confete. |
| `faixaDeVitoria(titulo, subtitulo, duracao)` | método | Faixa dourada de vitória com título e subtítulo, que cresce e pulsa. |
| `chuvaDeConfete(duracao)` | método | Confete colorido caindo do alto da tela. |
| `htmlDaRede(j)` | método | HTML com a soma detalhada da rede do jogador `j`. |
| `mostrarResultado()` | método | Tela de resultado: vencedor, critério, redes, placar de tentos, conquistas novas e o botão de revisão da mão. Usa `this.ultimoResultado` (guardado em `encerrarMao`), para poder reabrir depois da revisão. |

## `src/cenas/mesa/truco.js`

Parte da CenaMesa: o truco. Pedir, anunciar com grito na tela, perguntar a resposta (ao humano numa caixa, ao oponente pelo seu perfil) e aplicar aceitar, correr ou aumentar.

| Nome | Tipo | Descrição |
|---|---|---|
| `pedirTrucoHumano()` | método | Botão TRUCO! do jogador humano. |
| `anunciarTruco(j, daRede = false)` | método | Registra o pedido de `j`, grita na tela e pergunta a resposta ao outro jogador. |
| `pedirResposta()` | método | Pergunta a resposta a quem recebeu o pedido. |
| `aplicarResposta(quem, resposta, daRede = false)` | método | Aplica a resposta de `quem`. |

## `src/cenas/mesa/turnos.js`

Parte da CenaMesa: o fluxo da mão. Começar a mão, executar jogadas, decidir quem joga a seguir, passar o aparelho no modo de dois jogadores e a vez do oponente do computador. O ciclo é: `avancar()` olha o estado e entrega a vez (humano, oponente ou troca de aparelho); cada jogada passa por `executarJogada()`, que aplica as regras, anima os eventos e chama `avancar()` de novo quando a animação termina.

| Nome | Tipo | Descrição |
|---|---|---|
| `verso(uso)` | método | Chave da textura do verso do baralho em uso. |
| `jogadorDeBaixo()` | método | Jogador mostrado embaixo (quem está vendo; o 0 enquanto o aparelho troca de mãos). |
| `outrosJogadores()` | método | Os outros jogadores, na ordem em que jogam depois de quem está embaixo (mãos de cima, da esquerda para a direita). |
| `ordemDoPlacar()` | método | Ordem dos blocos do placar, de cima para baixo: os outros jogadores e, por último, quem está vendo. |
| `avatarDe(j)` | método | Textura do avatar do jogador. O primeiro humano usa o avatar escolhido (tela de avatares); os outros humanos do aparelho usam o truqueiro que sobrar. |
| `montarJogadores()` | método | Jogadores da mão: os humanos primeiro ("Você", ou "Jogador 1", "Jogador 2"… quando há mais de um), depois os oponentes do computador, numerados quando há mais de um do mesmo perfil. |
| `ehVezDoHumano()` | método | O jogador humano que está vendo a tela pode jogar agora? |
| `iniciarMao()` | método | Distribui uma mão nova: cria o estado, os neurônios na tela e começa o fluxo. |
| `criarNeuronios()` | método | Cria uma imagem clicável para cada neurônio, com a animação de distribuição. |
| `executarJogada(jogada, daRede = false)` | método | Aplica uma jogada (de qualquer jogador), anima os eventos e segue o fluxo. |
| `registrarJogadaNasEstatisticas(jogada, eventos)` | método | Estatísticas de uso: a jogada de quem está neste aparelho vira o evento `acao_jogada`. Empilhar vira o efeito que a pilha teve (tunagem, overfit, early stop ou stack overflow). |
| `avancar()` | método | Decide o próximo passo: fim da mão, escolha de quem começa, vez do humano ou do oponente. |
| `anotarNaLinhaDoTempo(jogada, eventos, texto)` | método | Guarda um passo da mão para a revisão didática do fim (interface/telas/revisao.js): quem jogou, o que aconteceu (texto do registro e tipos de evento) e as somas depois da jogada. |
| `avancarNoInicio()` | método | Fase de início: oponentes escolhem a carta; humanos escolhem um de cada vez. |
| `passarAparelho(j, continuar)` | método | Modo de dois jogadores: esconde a mão e pede para passar o aparelho. |
| `vezDoOponente()` | método | Vez do oponente do computador: talvez pede truco, depois escolhe e executa a jogada. `this.notaDoOponente` substitui a linha de nível no painel ("pensando…", resultado da simulação). |

## `src/cenas/recursos.js`

Recursos compartilhados pelas cenas do Phaser: texto nítido, câmera ajustada à tela, fundo da mesa e texturas das cartas geradas sob demanda. As texturas são geradas pela arte (pasta arte/) na densidade certa para cada uso e guardadas no gerenciador de texturas do Phaser com chaves descritivas ('carta-mesa:truco:4P', 'verso-mao@yinyang').

| Nome | Tipo | Descrição |
|---|---|---|
| `prepararTextoNitido()` | função (exportada) | Todo texto do Phaser nasce na resolução interna, para não borrar com o zoom da câmera. A resolução vai no estilo, na criação: o renderizador Canvas só a lê nesse momento. Chamada uma vez em principal.js, antes de criar o jogo. |
| `ajustarCamera(cena)` | função (exportada) | Ajusta a câmera para mostrar o mundo (1280x720) inteiro e centralizado em qualquer tela. O Phaser, no modo EXPAND, não redimensiona a câmera ao girar o aparelho; por isso o ajuste é conferido no evento de resize e a cada quadro (custo: uma comparação). |
| `texturaDaMesa(cena, terreno = 'neutro')` | função (exportada) | Chave da textura do fundo da mesa do terreno (mantém em memória só o neutro e o atual). |
| `colocarFundo(cena, terreno)` | função (exportada) | Coloca o fundo da mesa (feltro ou terreno) atrás de tudo. Fica em `cena.fundo`. |
| `texturaDoVerso(cena, uso, baralho = 'classico')` | função (exportada) | Chave da textura do verso do baralho. |
| `texturaDaCartaNaMao(cena, carta, baralho)` | função (exportada) | Textura da carta no tamanho da mão: a face limpa (índices grandes, medalhão central e gema de pontos), a mesma da mesa em densidade maior. A carta completa, com tipo e texto de regras, aparece na inspeção ao passar o cursor. |
| `texturaDaCartaMedia(cena, carta, baralho)` | função (exportada) | Textura da carta completa em tamanho médio (cartas reveladas para decidir quem começa). |
| `texturaDaCartaNaMesa(cena, carta, baralho)` | função (exportada) | Textura da carta da mesa (neurônio). |
| `desenhosDeInspecao` | constante | Cartas completas já desenhadas em alta densidade para a inspeção (guarda as 14 mais recentes). |
| `criarTexturaDeInspecao(cena)` | função (exportada) | Cria a textura única da inspeção, redesenhada a cada carta mostrada. |
| `texturaDeInspecao(cena, carta, baralho)` | função (exportada) | Desenha a carta na textura da inspeção e devolve a chave dela. |
| `liberarCartasDaMao(cena)` | função (exportada) | Libera as cartas da mão da mão anterior (memória de vídeo é limitada em celulares). |
| `retanguloNaTela(cena, x, y, l, a)` | função (exportada) | Converte um retângulo do mundo do jogo (centro x, y e tamanho l × a) em pixels da página, para posicionar elementos HTML (como as dicas flutuantes) sobre o canvas. |
| `carregarIconesDasAcoes(cena)` | função (exportada) | Carrega os ícones das ações (SVG) como texturas `icone-acao:<id>`, em 128 px. O carregamento é assíncrono; quem usa confere `textures.exists` e segue sem o ícone se ele ainda não chegou. |

## `src/configuracao.js`

Configurações visuais compartilhadas: tamanho do mundo do jogo, cores das redes, resolução de renderização e densidade das texturas.

| Nome | Tipo | Descrição |
|---|---|---|
| `MUNDO` | constante (exportada) | O mundo do jogo tem sempre 1280x720 unidades; a câmera aplica o zoom para cada tela. |
| `CORES` | constante (exportada) | Cores das duas redes (padrão do TensorFlow Playground), do dourado e afins, em número (Phaser). |
| `CORES_CSS` | constante (exportada) | As mesmas cores em texto CSS. |
| `CORES_JOGADORES` | constante (exportada) | Cor da rede de cada jogador, até 5 (azul e laranja do Playground, depois verde, lilás e rosa). Com 2 jogadores, ficam as duas primeiras. |
| `FONTES` | constante (exportada) | Fontes dos textos desenhados pelo Phaser. |
| `RESOLUCAO` | constante (exportada) | Resolução interna: o canvas tem os pixels físicos que a tela consegue mostrar em tela cheia (tamanho da tela × densidade de pixels), até 3x o mundo. Pode ser forçada com `?res=2` na URL. |
| `DENSIDADE` | constante (exportada) | Densidade (fator sobre o tamanho-base) com que cada tipo de textura é gerado. |
| `TAMANHO_CARTA` | constante (exportada) | Tamanho de exibição das cartas no mundo do jogo. |
| `FORCAR_CANVAS` | constante (exportada) | Diz se a página foi aberta pedindo o renderizador Canvas (`?renderer=canvas`), útil em testes. |

## `src/conteudo/avatares.js`

Avatares que o jogador pode escolher. Os livres valem desde o início; os outros são liberados por uma conquista. A escolha fica no progresso salvo no navegador (`progresso.avatar`) até existirem contas (issue #11).

| Nome | Tipo | Descrição |
|---|---|---|
| `AVATARES_DO_JOGADOR` | constante (exportada) | Avatares do jogador, na ordem da tela de escolha. `conquista` é o id da conquista que libera o avatar (null = livre). `tipo` é o desenho em arte/avatares.js. |
| `avatarLiberado(avatar, progresso)` | função (exportada) | O avatar está liberado neste progresso? |
| `avatarDoJogador(progresso)` | função (exportada) | Id do avatar do jogador: o escolhido, se estiver liberado; senão, o truqueiro. |
| `conquistaQueLibera(avatar)` | função (exportada) | Nome da conquista que libera o avatar. |
| `avataresDaConquista(id)` | função (exportada) | Avatares liberados por uma conquista (para avisar quando ela sai). |

## `src/conteudo/conquistas.js`

Conquistas e suas graduações (bronze a antimatéria, como sugere a especificação). Cada conquista tem um `teste(ctx)` avaliado ao fim de cada mão contra oponentes. O contexto é: ``` { mao, eu, venceu, completa, // estado final da mão, índice do humano, resultado, se foi jogada até o fim partida, venceuPartida, valorDaMao, // camada de truco oponenteCorreu, opcoes, // se o oponente correu do truco; opções do menu progresso } // contadores acumulados (ver progresso.js) ```

| Nome | Tipo | Descrição |
|---|---|---|
| `GRADUACOES` | constante (exportada) | Graduações com nome e cor da medalha. |
| `meu` | constante | Atalho: dados do jogador humano na mão encerrada. |
| `VALEM_SEM_MAO_COMPLETA` | constante (exportada) | Conquistas que podem ser ganhas mesmo quando a mão termina porque alguém correu do truco. |

## `src/conteudo/dicasDeJogo.js`

Dicas de jogo do modo "dicas": como jogar bem e o conceito de redes neurais por trás. Regra de ouro: as dicas usam **só informação pública** — as cartas da mão de quem pede a dica, os neurônios já revelados na mesa, as somas e o placar. Nunca apontam qual neurônio oculto ativar nem dizem o que há embaixo de uma carta virada; isso seria trapaça, não dica. `escolherDicaDeJogo` olha a situação e devolve a dica mais útil agora (oportunidades e riscos primeiro), ou uma dica geral de estratégia ligada a um verbete do Glossário. Não depende do Phaser: roda também no Node (testes).

| Nome | Tipo | Descrição |
|---|---|---|
| `DICAS_GERAIS` | constante (exportada) | Dicas gerais de estratégia, usadas quando nenhuma situação especial aparece. Cada uma liga uma boa prática do jogo a um verbete do Glossário (`verbete`). |
| `contarValores(mao)` | função | Contagem de cartas da mão por valor. |
| `escolherDicaDeJogo(mao, j, partida, recentes = [])` | função (exportada) | Escolhe a dica de jogo para o jogador `j` agora. |

## `src/conteudo/figurasDaBiblioteca.js`

Figuras do Glossário: diagramas em SVG, desenhados à mão e embutidos no verbete. Usam as cores do papel das telas (tinta marrom, vinho, azul e laranja das redes) e escalam com a largura do verbete.

| Nome | Tipo | Descrição |
|---|---|---|
| `svg` | constante | Abre um SVG responsivo com título acessível. |
| `traco` | constante | Linha de uma polilinha a partir de pontos [[x, y], ...]. |
| `eixos` | constante | Eixos x e y com rótulos. |
| `amostrar(f, a, b, n, paraTela)` | função | Amostra uma função em [a, b] e devolve os pontos já na tela. |
| `neuronio()` | função | Neurônio artificial: entradas, pesos, soma com viés e ativação. |
| `ativacoes()` | função | As três ativações mais conhecidas lado a lado. |
| `rede()` | função | Rede densa (todas as ligações) e, por cima, o caminho de uma rede do jogo. |
| `curvas()` | função | Perda de treino e de validação ao longo das épocas, com o ponto de parada antecipada. |
| `sobreajuste()` | função | Os mesmos pontos ajustados por uma curva simples e por uma que decora o ruído. |
| `dropout()` | função | Dropout: alguns neurônios ocultos desligados e as ligações deles apagadas. |
| `vanishing()` | função | Tamanho do gradiente camada a camada, da saída para a entrada, com sigmoide. |
| `FIGURAS` | constante (exportada) | Figuras disponíveis, pelo nome usado nos verbetes. |
| `figuraDaBiblioteca(nome)` | função (exportada) | SVG da figura `nome`, ou texto vazio se não existir. |

## `src/conteudo/grimorio.js`

Glossário (antes "Biblioteca de conceitos" e, antes ainda, "Grimório"): cada mecânica do jogo explicada como conceito de aprendizado de máquina. O arquivo e os ids continuam com o nome antigo para não perder os verbetes já lidos (conquista "Bibliotecário") salvos no navegador. Cada verbete tem `id`, `titulo`, `categoria`, `conceito` (o que é em ML), `equacao` (MathML, em bloco), `figura` (nome em figurasDaBiblioteca.js, opcional), `noJogo` (como aparece na mesa), `limite` (até onde a comparação vale) e `fonte` (referência, opcional). A mesa mostra o verbete como aviso na primeira vez que a mecânica acontece; a ajuda de cada ação leva ao verbete dela. Os verbetes de Ação têm ainda `ideia` (comparação do dia a dia) e `autoria`; alguns trazem `aprofundar` (texto com fórmulas MathML na linha, montadas com `na`) e `formula` (MathML em bloco), redigidos por Suzy Arcanjo (issue #23 do repositório original). Toda a matemática é MathML nativo, desenhado pelo próprio navegador: funciona sem rede e no arquivo único.

| Nome | Tipo | Descrição |
|---|---|---|
| `NOME_DA_BIBLIOTECA` | constante (exportada) | Nome da tela, num lugar só. |
| `na` | constante | Fórmula no meio da frase (usada em `aprofundar`). |
| `mspace()` | função | Espaço entre duas equações na mesma linha. |
| `mover(x)` | função | Variável com til (versão perturbada ou mascarada). |

## `src/conteudo/modExemplo.js`

Mod de exemplo mostrado na tela "Mods" (interface/telas/mods.js). O código fica num texto para a tela poder exibi-lo e copiá-lo; o teste `testes/unidade/mods.test.js` carrega esse mesmo texto como módulo e confere que ele funciona com o motor do NeuroDeck.

| Nome | Tipo | Descrição |
|---|---|---|
| `CODIGO_DO_MOD_DE_EXEMPLO` | constante (exportada) | Código do mod de exemplo: o terreno "Regularização L1". |

## `src/conteudo/progresso.js`

Progresso do jogador guardado no navegador (localStorage): contadores, conquistas, verbetes lidos, avatar escolhido, opções do menu e preferência de som. O armazenamento pode falhar (janela anônima, armazenamento bloqueado); por isso toda leitura e escrita é protegida e o jogo funciona normalmente sem ele.

| Nome | Tipo | Descrição |
|---|---|---|
| `progressoInicial()` | função | Progresso vazio. |
| `migrarV1(antigo)` | função | Converte o formato da versão anterior (nomes em inglês) para o atual, sem perder conquistas. |
| `carregarProgresso()` | função (exportada) | Lê o progresso salvo (ou o inicial). |
| `salvarProgresso(progresso)` | função (exportada) | Salva o progresso. Falhas são ignoradas. |

## `src/conteudo/textos.js`

Textos de ambientação das cartas e falas dos oponentes.

| Nome | Tipo | Descrição |
|---|---|---|
| `AMBIENTACAO` | constante (exportada) | Frase em itálico na caixa de texto de cada carta (por valor, ou pelo nome da manilha). |
| `PROVOCACOES` | constante (exportada) | Falas dos oponentes por situação. |
| `provocar(situacao)` | função (exportada) | Sorteia uma fala da situação. |

## `src/interface/analise.js`

Estatísticas de uso com o Google Analytics 4 (fluxo "Truco de Turing", ID G-VWSGVWJK6Q). Regras: - Só mede no site publicado (`https://welyngton.github.io`). Em localhost, no arquivo único aberto por `file://`, em forks publicados em outro endereço e nos testes automatizados (navegador controlado por WebDriver/Playwright) nada é carregado nem enviado. - Só mede com consentimento. Na primeira visita aparece uma faixa com "Aceitar" e "Recusar"; a escolha fica neste aparelho (`localStorage`) e pode ser mudada na tela "Sobre". O script do Google só é baixado depois do "Aceitar". - Sem sinais de publicidade (Google Signals e personalização de anúncios desligados). Os eventos do jogo (ver `EVENTOS`) passam por `registrarEvento`, que não faz nada enquanto a medição estiver desligada. Jogadores diferentes: cada aparelho recebe um código anônimo e aleatório (`a-…`, guardado no `localStorage`); quem entra numa conta passa a ser `c-<uid da conta>` e o uid vai também como `user_id`, para o Google juntar os aparelhos da mesma pessoa. O código vai na propriedade do usuário `id_jogador`, junto com o tipo de conta, a experiência, as conquistas e o avatar (ver `PROPRIEDADES_DO_JOGADOR`). Nome, e-mail e nome na mesa nunca são enviados.

| Nome | Tipo | Descrição |
|---|---|---|
| `ID_GOOGLE_ANALYTICS` | constante (exportada) | ID da métrica do fluxo da Web no Google Analytics. |
| `HOSTS_MEDIDOS` | constante (exportada) | Endereços onde o jogo publicado mede (o do fluxo de dados no Google Analytics). |
| `CHAVE_DO_CONSENTIMENTO` | constante (exportada) | Chave do consentimento no `localStorage`: 'sim', 'nao' ou ausente (ainda não perguntado). |
| `EVENTOS` | constante (exportada) | Nomes dos eventos enviados. `jogoIniciado`, `jogoFinalizado`, `vitoria` e `derrota` têm os nomes cadastrados em "Criar eventos" no Google Analytics (jogo_iniciado, jogo_finalizado, vitoria_do_jogador, derrota_jogador). O jogo envia esses nomes direto, então lá não é preciso regra nenhuma: uma regra que recria um evento com o próprio nome o conta em dobro. |
| `PROPRIEDADES_DO_JOGADOR` | constante (exportada) | Propriedades do usuário (no Google Analytics: dimensões personalizadas com escopo "Usuário"). `id_jogador` separa os jogadores; as outras ajudam a comparar grupos. |
| `CHAVE_DO_JOGADOR` | constante (exportada) | Chave do código anônimo do aparelho no `localStorage`. |
| `estado` | constante | Estado do módulo: a janela onde o Analytics foi ligado (ou null). |
| `idDoAparelho(janela = globalThis)` | função (exportada) | Código anônimo deste aparelho (criado na primeira vez que a medição liga). |
| `idDoJogador(janela = globalThis)` | função (exportada) | Código do jogador enviado ao Google: `c-<uid>` com conta, `a-<código do aparelho>` sem. |
| `enviarJogador(janela)` | função | Envia ao gtag o `user_id` e as propriedades do jogador. |
| `atualizarJogador(dados)` | função (exportada) | Atualiza as propriedades do jogador (experiência, conquistas, avatar…). Guarda mesmo com a medição desligada, para valer assim que ela ligar. |
| `definirConta(uid, metodo)` | função (exportada) | Entrou numa conta (`uid` e o método) ou saiu dela (`uid` null). O uid do Firebase é aleatório e não identifica a pessoa fora do jogo; nome e e-mail não são enviados. |
| `podeMedir(janela = globalThis)` | função (exportada) | O jogo está no site publicado, num navegador comum (não automatizado)? |
| `consentimento(janela = globalThis)` | função (exportada) | Lê a escolha guardada: 'sim', 'nao' ou null. |
| `medindo()` | função (exportada) | A medição está ligada agora (site publicado, consentimento dado e script carregado)? |
| `carregar(janela)` | função | Carrega o gtag.js e configura o fluxo, sem sinais de publicidade. |
| `apagarCookies(janela)` | função | Apaga os cookies do Google Analytics (`_ga`, `_ga_…`) deste site. |
| `definirConsentimento(escolha, janela = globalThis)` | função (exportada) | Guarda a escolha da pessoa e liga ou desliga a medição na hora. |
| `TEXTO_DAS_ESTATISTICAS` | constante (exportada) | Texto da faixa de consentimento (também usado na tela "Sobre"). |
| `mostrarFaixa(janela)` | função | Mostra a faixa de consentimento no rodapé da página. |
| `iniciarAnalise(janela = globalThis)` | função (exportada) | Liga a medição se a pessoa já aceitou; na primeira visita, pergunta. Fora do site publicado, não faz nada. |
| `registrarEvento(nome, dados = {})` | função (exportada) | Envia um evento do jogo ao Google Analytics (se a medição estiver ligada). |
| `reiniciarAnalise()` | função (exportada) | Volta ao estado inicial (para os testes). |

## `src/interface/menu.js`

Menu principal: apresentação do jogo, botões das telas e configuração da mesa. A mesa reúne as configurações do NeuroDeck (jogadores, humanos no aparelho, oponentes do computador, arquitetura da rede e número de baralhos) com as do Truco de Turing (baralho, terreno, quem começa e tipo de partida).

| Nome | Tipo | Descrição |
|---|---|---|
| `ESCOLHAS_OPONENTE` | constante | Opções da lista de oponentes do computador (todos os oponentes da mesa têm o mesmo perfil). |
| `ESCOLHAS_JOGADORES` | constante | Jogadores na mesa (2 a 5, como no NeuroDeck). |
| `ESCOLHAS_BARALHOS` | constante | Baralhos na partida: a mão e o limbo crescem junto. |
| `escolhasDeHumanos(n)` | função | Opções da lista "Humanos no aparelho" para uma mesa de `n` jogadores. |
| `miniaturas` | constante | Miniaturas do verso e da mesa já desenhadas (evita redesenhar a cada troca). |
| `mostrarMiniatura(elemento, chave, desenhar)` | função | Mostra a miniatura `chave` dentro do elemento, desenhando-a na primeira vez com `desenhar()`. |
| `opcoesHtml(rotulos, selecionado)` | função | Gera as `<option>` de uma lista. `rotulos` mapeia valor → texto (ou objeto com `nome`). |
| `BOTOES_DO_MENU` | constante (exportada) | Botões do menu inicial e o nome de cada um nas estatísticas de uso (evento `menu_clique`). |
| `htmlDoMenu(opcoes)` | função | HTML do menu. |
| `abrirMenu(app)` | função (exportada) | Abre o menu principal. |
| `atualizarDicas()` | função | Atualiza descrições, listas dependentes e miniaturas conforme as escolhas. |
| `lerEscolhas()` | função | Guarda as escolhas atuais na aplicação (as opções que não estão nesta tela continuam como estavam). |

## `src/interface/musica.js`

Música de fundo sintetizada com WebAudio: uma trilha para o menu e uma para cada terreno. | Trilha | Estilo | Andamento | |---------------------|---------------------------------------------------------------|--------------| | menu | baião em Sol: sanfona, zabumba, triângulo e palmas; refrão que convida a jogar | 118 bpm | | neutro (Planície) | blues lento em Mi, tema cantado com notas longas e poucos saltos | 72 bpm | | oceano | valsa em Sol: marimba ao fundo, coro que preenche os repousos | 63 bpm (3/4) | | montanha | épica em Lá menor: trompa, harpa ao fundo e tambores nos repousos | 84 bpm | | pantano | dança de fada em Ré menor: harmônica de vidro, glockenspiel e pizzicato | 60 bpm | Cada trilha é um laço de compassos com acordes, baixo, acompanhamento, melodia e percussão. As melodias são compostas (uma tabela de notas por compasso), então o laço sempre se repete igual e o tema fica na cabeça. Um agendador olha 0,4 s à frente e marca as notas no relógio do WebAudio.

| Nome | Tipo | Descrição |
|---|---|---|
| `VOLUME` | constante | Volume geral da música (baixo, para não brigar com os efeitos). |
| `ANTECEDENCIA` | constante | Quanto tempo à frente as notas são agendadas, em segundos. |
| `hz` | constante | Frequência de uma nota MIDI (69 = Lá 440 Hz). |
| `sorteador(semente)` | função | Gerador reprodutível (mesmo compasso, mesma melodia). |
| `voz(saida, tempo, midi, duracao, { forma = 'triangle', volume = 0.1, ataque = 0.01, liberacao = 0.15, filtro = 0, vibrato = 0, desafinar = 0 } = {})` | função | Toca uma nota com envelope (ataque, sustentação, liberação), filtro passa-baixa opcional e vibrato opcional. |
| `chiado(saida, tempo, duracao, { volume = 0.05, filtro = 8000, tipo = 'highpass', ataque = 0.002 } = {})` | função | Ruído filtrado: chimbal, prato, ondas do mar. |
| `tambor(saida, tempo, { volume = 0.35, de = 110, para = 42, duracao = 0.45 } = {})` | função | Tambor grave (bumbo, taiko): seno que despenca de frequência. |
| `sino(saida, tempo, midi, volume = 0.06)` | função | Sino: parciais inarmônicas que somem devagar. |
| `harpa(saida, tempo, midi, volume = 0.04)` | função | Harpa: corda dedilhada que soa e some devagar. |
| `glockenspiel(saida, tempo, midi, volume = 0.05)` | função | Glockenspiel e caixinha de música: barra de metal, ataque seco e brilho agudo. |
| `harmonicaDeVidro(saida, tempo, midi, duracao, volume = 0.05)` | função | Harmônica de vidro: senoides puras com entrada macia e um leve tremor. |
| `marimba(saida, tempo, midi, volume = 0.05)` | função | Marimba: tecla de madeira, grave arredondado e um harmônico que some rápido. |
| `pizzicato(saida, tempo, midi, volume = 0.08)` | função | Pizzicato: corda beliscada, curta e abafada. |
| `triangulo(saida, tempo, aberto, volume = 0.02)` | função | Triângulo do forró: barra de metal aguda; fechado é um toque curto, aberto soa mais. |
| `palmas(saida, tempo, volume = 0.05)` | função | Palmas: estalo de ruído em banda média, com um eco curtinho. |
| `sanfona(saida, tempo, midi, duracao, volume = 0.03)` | função | Sanfona: duas palhetas levemente desafinadas (o "batimento" da sanfona), fole com vibrato. |
| `coro(saida, tempo, notas, duracao, volume = 0.018)` | função | Coro (pad): acorde de senoides que entra e sai devagar e passa um pouco do compasso. |
| `melodia(tabela, compasso, passo, tocarNota, d)` | função | Toca a nota da melodia composta que começa neste passo, se houver. Tabela: [passo, midi, passos]. |
| `gravarTrilha(saida, nome, segundos)` | função (exportada) | Toca `segundos` da trilha `nome` numa saída qualquer (por exemplo, um OfflineAudioContext) a partir do tempo 0. Usado para gravar amostras das trilhas e nos testes. |
| `TRILHAS` | constante (exportada) | Nomes das trilhas: menu e terrenos. |
| `agendar()` | função | Agenda as notas que caem nos próximos ANTECEDENCIA segundos. |
| `Musica` | constante (exportada) | Música de fundo: tocar a do terreno, parar, ligar e desligar. |
| `tocar(terreno)` | método | Começa (ou troca para) a música do terreno, com entrada suave. |
| `parar()` | método | Para a música com saída suave. |
| `tocando()` | método | Está tocando? |

## `src/interface/paineis.js`

Base dos painéis HTML sobrepostos ao canvas: abrir e fechar telas, avisos rápidos e caixas de confirmação. As telas específicas (menu, regras, grimório…) usam estas funções. Os painéis vivem em `#paineis` e os avisos em `#avisos` (ver index.html).

| Nome | Tipo | Descrição |
|---|---|---|
| `escaparHtml(texto)` | função (exportada) | Escapa texto para inserir em HTML com segurança. |
| `abrirPainel(html, opcoes = {})` | função (exportada) | Abre uma tela sobre o jogo. |
| `fecharTodos()` | função (exportada) | Fecha todas as telas abertas. |
| `mostrarAviso(titulo, texto, tipo, duracaoMs = 5200)` | função (exportada) | Mostra um aviso rápido no topo da tela (só um por vez). |
| `mostrarDicaDeJogo(titulo, texto, tituloDoConceito, conceito)` | função (exportada) | Dica de jogo do modo "dicas", no estilo do Glossário: título, conselho e o conceito de redes neurais relacionado. Usa a mesma área dos avisos e fica 9 segundos (um toque fecha). |
| `confirmar(titulo, texto, botoes, opcoes = {})` | função (exportada) | Caixa de confirmação com botões. |
| `mostrarDicaFlutuante(titulo, html, alvo)` | função (exportada) | Mostra uma dica no estilo do Glossário ao lado de um elemento da mesa (botão, carta). Fica à esquerda do retângulo quando há espaço; senão, acima ou abaixo. |
| `esconderDicaFlutuante()` | função (exportada) | Esconde a dica flutuante, se houver. |

## `src/interface/som.js`

Efeitos sonoros sintetizados com WebAudio (nenhum arquivo de áudio). O navegador só libera som depois de um clique; `Som.desbloquear()` é chamado no botão "Jogar".

| Nome | Tipo | Descrição |
|---|---|---|
| `contextoDeAudio()` | função (exportada) | Cria (ou retoma) o contexto de áudio. Devolve null se o navegador não tiver WebAudio. |
| `audio()` | função | Contexto de áudio compartilhado com a música (interface/musica.js). |
| `nota(frequencia, duracao, forma, volume, atraso, deslize)` | função | Toca uma nota curta. |
| `ruido(duracao, volume, atraso, filtro)` | função | Toca um chiado filtrado (cartas, impactos). |
| `Som` | constante (exportada) | Efeitos sonoros do jogo, um por acontecimento. |
| `liberado()` | método | O navegador já liberou o som (houve um clique e o contexto está rodando)? Não cria o contexto. |
| `truco(forca = 1)` | método | Grito de truco: tapa na mesa (baque grave e estalo), depois a fanfarra do pedido. |
| `fanfarra()` | método | Fanfarra de vitória da mão, no espírito dos fins de fase dos jogos de 8 bits dos anos 80 (melodia original): escalas rápidas em onda quadrada subindo por três acordes, um rufar e o acorde final sustentado com o baixo. |
| `campeao()` | método | Vitória da partida: a fanfarra seguida de um hino mais longo, com tambores. |

## `src/interface/telas/ajudaDasAcoes.js`

Ajuda das ações, como o botão "?" do NeuroDeck: um cartão por jogada com a regra (texto do próprio motor), quando o botão acende e, no verso, o conceito de machine learning, com um botão "Ver o conceito" que abre o verbete certo do Glossário.

| Nome | Tipo | Descrição |
|---|---|---|
| `ACOES_DA_AJUDA` | constante (exportada) | Ações da ajuda, na ordem da barra da mesa. `motor` é o id da ação no NeuroDeck (de onde vêm a regra e o conceito); `verbete` é o verbete do Glossário. |
| `doMotor(id)` | função | Ação do NeuroDeck, ou um objeto vazio se o motor não tiver aquele id. |
| `abrirAjudaDasAcoes(app, idInicial)` | função (exportada) | Abre a ajuda das ações. |

## `src/interface/telas/avatares.js`

Tela de avatares: o jogador escolhe o retrato que aparece no placar. Os bloqueados mostram a conquista que os libera.

| Nome | Tipo | Descrição |
|---|---|---|
| `retratos` | constante | Retratos já desenhados (data URL), por id. |
| `retratoDoAvatar(id)` | função (exportada) | Data URL do retrato do avatar, desenhado na primeira vez; vazio se não houver canvas. |
| `abrirAvatares(app, aoMudar)` | função (exportada) | Abre a escolha de avatar. |

## `src/interface/telas/conquistas.js`

Quadro de conquistas: retrato do professor em moldura medieval à esquerda e as medalhas à direita (desbloqueadas coloridas; bloqueadas em cinza, com cadeado).

| Nome | Tipo | Descrição |
|---|---|---|
| `medalhaHtml(conquista, desbloqueada)` | função (exportada) | HTML da medalha de uma conquista (também usado no resumo do fim da mão). |
| `itemHtml(conquista, desbloqueada)` | função | HTML de um item da lista de conquistas. |
| `abrirConquistas(app)` | função (exportada) | Abre o quadro de conquistas. |

## `src/interface/telas/grimorio.js`

Tela do Glossário (antes "Biblioteca de conceitos" e "Grimório"): lista de verbetes à esquerda e o verbete escolhido à direita, com o conceito, a equação, a figura, como aparece no jogo e até onde a comparação vale. Ler um verbete conta para a conquista "Bibliotecário".

| Nome | Tipo | Descrição |
|---|---|---|
| `htmlDoVerbete(v)` | função (exportada) | Corpo do verbete: a ideia do dia a dia (verbetes de Ação), o conceito, a equação, a figura, como aparece no jogo, até onde a comparação vale, a matemática para se aprofundar, a fonte e a autoria. Equação, "aprofundar" e fórmula (MathML) e figura (SVG) são conteúdo do próprio jogo, não texto do jogador. |
| `abrirGrimorio(app, idInicial, aoFechar)` | função (exportada) | Abre o Glossário. |
| `desenharLista(ativo)` | função | Desenha a lista com o verbete ativo destacado. |
| `mostrar(id)` | função | Mostra um verbete e o marca como lido. |

## `src/interface/telas/mods.js`

Tela "Mods": como criar baralhos, terrenos e ações para o motor do NeuroDeck, com um mod de exemplo comentado (conteudo/modExemplo.js) e links para os arquivos e exemplos no repositório do jogo no GitHub. A API é a do registro do motor (src/motor/engine/registry.js, apiVersion 2). A tela é honesta sobre o estado atual: o motor aceita mods, mas a interface do jogo unificado ainda não os carrega.

| Nome | Tipo | Descrição |
|---|---|---|
| `REPOSITORIO` | constante (exportada) | Endereço dos arquivos no repositório do jogo no GitHub (ramo main). |
| `linkDoArquivo` | constante | Link para um arquivo do repositório, com o caminho como texto. |
| `ARQUIVOS_DE_MODS` | constante (exportada) | Arquivos do repositório que servem de referência e de exemplo para quem vai escrever um mod. O teste de `testes/unidade/interface.test.js` confere que cada um existe. |
| `TIPOS` | constante | Campos de cada tipo de mod, resumidos do registro do motor. |
| `abrirMods()` | função (exportada) | Abre a tela "Mods". |

## `src/interface/telas/online.js`

Tela "Jogar online": conta e sala. - Conta: com o projeto Firebase configurado (src/online/configuracao.js), entrar com Google ou e-mail e senha guarda o progresso na conta. Sem ele, o jogo usa o nome deste aparelho. - Sala: criar (com as opções do menu e quantas pessoas vão jogar) ou entrar com o código. Com o Firebase, a sala funciona pela internet; sem ele, entre abas e janelas deste navegador. - Espera: o código em destaque e as cadeiras; o anfitrião começa a partida quando quiser (as vagas que sobrarem vão para o computador).

| Nome | Tipo | Descrição |
|---|---|---|
| `clienteDaAba()` | função | Identificador deste aparelho, o mesmo depois de recarregar a aba (para voltar à cadeira). |
| `contaAtual` | constante | Conta atual nesta sessão (Firebase), ou null. |
| `usarConta(app, conta, metodo)` | função | Entrou numa conta: junta o progresso do aparelho com o da conta e passa a salvar nela. |
| `transporte(codigo)` | função | Cria o transporte da sala: Firebase com conta, senão entre abas deste navegador. |
| `abrirOnline(app)` | função (exportada) | Abre a tela "Jogar online". |
| `esperar(novaSala)` | função | Mostra a espera da sala e acompanha as cadeiras até a partida começar. |

## `src/interface/telas/regras.js`

Tela de regras, com o conteúdo do manual do NeuroDeck e as decisões da fusão, em abas: Como jogar, Ações, Pontuação, Baralhos e terrenos (com a arte do Truco de Turing) e Dicas e estratégias. As abas "Cartas" e "Decisões de regra" do NeuroDeck ficaram de fora a pedido do professor; as decisões estão no repositório (docs e testes).

| Nome | Tipo | Descrição |
|---|---|---|
| `AMOSTRA` | constante | Carta de amostra de cada baralho (a que melhor mostra a arte dele). |
| `ABAS_DAS_REGRAS` | constante (exportada) | Abas da tela, na ordem. |
| `abaDeAcoes()` | função | Linha "nome: resumo" de cada ação, com o botão da ajuda. |
| `abaDeExtensoes()` | função | Baralhos e terrenos com a arte do jogo (verso, carta de amostra e carta de terreno). |
| `desenharArte(raiz)` | função | Desenha a arte de uma aba de extensões uma vez (fica guardada como imagem). |
| `abrirRegras(app, aoFechar, abaInicial = 'jogar')` | função (exportada) | Abre a tela de regras. Na primeira partida ela abre sozinha; ao fechar, chama `aoFechar`. |

## `src/interface/telas/revisao.js`

Tela de revisão didática do fim da mão (e da partida). Mostra, a partir da linha do tempo guardada pela mesa (cenas/mesa/turnos.js): - um resumo com os momentos-chave (maior salto, golpe mais duro, a virada) e o que cada um fez; - a curva de treino das duas redes, passo a passo, com marcas nas ações importantes; - a linha do tempo comentada, ligando cada ação ao conceito de redes neurais do Glossário; - na partida com várias mãos, o placar mão a mão.

| Nome | Tipo | Descrição |
|---|---|---|
| `COR` | constante | Cor das redes (até 5 jogadores). |
| `placar` | constante | Junta números com ' × ' (placar de 2 a 5 jogadores). |
| `MARCAS` | constante | Cor e rótulo de cada tipo de acontecimento marcado na curva. |
| `tipoDoPasso(passo)` | função | Tipo principal de um passo: o evento mais marcante, ou o tipo da jogada. |
| `VERBETE_DO_TIPO` | constante | Verbete do Glossário ligado a cada tipo de passo. |
| `variacoes(passos)` | função | Diferença das somas em relação ao passo anterior. |
| `momentosChave(passos, nomes)` | função | Momentos-chave da mão, em frases curtas. |
| `contagens(passos)` | função | Quantas vezes cada jogador fez cada tipo de ação. |
| `graficoDaCurva(passos, nomes)` | função | Gráfico SVG da curva de treino com as marcas das ações. |
| `linhaDoTempoHtml(passos, nomes)` | função | Linha do tempo comentada: cada passo, a variação das somas e o conceito (na primeira vez). |
| `tabelaDaPartida(historico, nomes)` | função | Placar mão a mão da partida. |
| `abrirRevisao({ mao, linhaDoTempo, partida, historicoDaPartida, numeroDaMao, aoFechar })` | função (exportada) | Abre a revisão. |

## `src/interface/telas/sobre.js`

Tela "Sobre": versão, o jogo unificado (NeuroDeck + Truco de Turing), a disciplina, as regras originais, o professor, os autores, as estatísticas de uso (ligar e desligar) e a licença.

| Nome | Tipo | Descrição |
|---|---|---|
| `situacaoDasEstatisticas()` | função | Situação das estatísticas de uso neste aparelho, em texto. |
| `abrirSobre()` | função (exportada) | Abre a tela "Sobre". |

## `src/motor/bot.js`

NeuroDeck - oponentes artificiais Guloso: escolhe a jogada de melhor ganho imediato (sem olhar adiante). Monte Carlo: simula partidas aleatorias para cada jogada e escolhe a de maior taxa de vitoria. A informacao oculta e sorteada a cada simulacao (determinizacao). Com mais de 2 jogadores, a margem e medida contra o melhor rival.

## `src/motor/engine/actions.js`

NeuroDeck - acoes do jogo, cada uma com generate / isValid / execute

## `src/motor/engine/core.js`

NeuroDeck - nucleo do motor

## `src/motor/engine/decks.js`

NeuroDeck - baralhos: cada um define como a rede e pontuada

## `src/motor/engine/index.js`

NeuroDeck - ponto de entrada do motor Registra os modulos nativos e exporta a API. Mods importam './registry.js' (ou usam window.NeuroDeck) e registram seus proprios baralhos, terrenos e acoes.

## `src/motor/engine/registry.js`

NeuroDeck - registro de modulos (API de mods)

## `src/motor/engine/terrains.js`

NeuroDeck - terrenos: ganchos no ciclo do turno que mudam o jogo inteiro

## `src/motor/engine/util.js`

NeuroDeck - constantes e utilidades puras

## `src/motor/engine.js`

NeuroDeck - fachada do motor (compatibilidade com imports antigos) O motor vive em ./engine/: registry (API de mods), core (regras fixas), actions, decks e terrains (modulos registrados).

## `src/motor/sim.js`

NeuroDeck - laboratorio: simulacao de Monte Carlo de partidas bot x bot

## `src/nucleo/aleatorio.js`

Gerador de números aleatórios com semente. Toda a aleatoriedade das regras passa por aqui. Com a mesma semente, a mesma partida se repete, o que permite reproduzir erros e comparar oponentes em simulação.

| Nome | Tipo | Descrição |
|---|---|---|
| `sortear(estado)` | função (exportada) | Sorteia um número em [0, 1) e avança a semente guardada no objeto (algoritmo mulberry32). |
| `sortearInteiro(estado, n)` | função (exportada) | Sorteia um inteiro em [0, n). |
| `embaralhar(lista, estado)` | função (exportada) | Embaralha a lista no lugar (Fisher-Yates) e a devolve. @template T |
| `sementeNova()` | função (exportada) | Cria uma semente nova a partir do relógio, para partidas não reproduzíveis. |

## `src/nucleo/baralhos.js`

Baralhos do jogo e valor em pontos das cartas. As regras de cada baralho (cartas, valores e pontuação) são as do motor do NeuroDeck, em `src/motor/engine/decks.js`. Aqui ficam o nome, o resumo do menu e o que a arte precisa.

| Nome | Tipo | Descrição |
|---|---|---|
| `montarBaralho(chave)` | função | Cartas de um baralho do motor, no formato da interface. |
| `BARALHOS` | constante (exportada) | Cada baralho tem: `nome`, `resumo` (texto do menu) e `montar()`, que gera as cartas. Opcionais: - `manilhas`: nome especial de cartas (truco), usado na arte; - `figurasValem`: as figuras valem pontos próprios e não formam par nem trio (truco, nobreza); - `forward`: a rede vale a ativação da saída, calculada camada a camada (backprop). |
| `pontosDaCarta(carta, baralho)` | função (exportada) | Pontos de uma carta isolada no baralho escolhido: no clássico, 2 a 10 pelo número, Ás 11 e figuras 0; no truco, o valor da carta na ordem do truco. |
| `nomeDaCarta(carta, baralho)` | função (exportada) | Nome por extenso da carta, ou o nome da manilha ("Zap"). |
| `manilhaDaCarta(carta, baralho)` | função (exportada) | Nome da manilha, se a carta for uma no baralho escolhido. |

## `src/nucleo/cartas.js`

Cartas do baralho: valores, naipes e nomes. Uma carta é um objeto simples `{ id, valor, naipe }`: - `valor`: 'A', '2'…'10', 'J' (valete), 'Q' (dama) ou 'K' (rei); - `naipe`: 'E' (espadas), 'C' (copas), 'P' (paus) ou 'O' (ouros); - `id`: identificador único dentro da partida (ex.: 'KC', '2E#7').

| Nome | Tipo | Descrição |
|---|---|---|
| `VALORES` | constante (exportada) | Valores do baralho, do Ás ao Rei. |
| `NAIPES` | constante (exportada) | Naipes na ordem de desempate da especificação: espadas > copas > paus > ouros. |
| `NAIPE` | constante (exportada) | Dados de exibição de cada naipe. `emblema` é o desenho do naipe espanhol usado na arte. |
| `ORDEM_NAIPE` | constante (exportada) | Peso de cada naipe no desempate. |
| `NOME_VALOR` | constante (exportada) | Nome por extenso de cada valor. |
| `PLURAL_FIGURA` | constante (exportada) | Plural das figuras, usado nos nomes de combos ("Trio de Reis"). |
| `FORCA_VALOR` | constante (exportada) | Força de cada valor para decidir quem começa e para desempates (Ás é a mais alta). |
| `ehFigura(carta)` | função (exportada) | Diz se a carta é uma figura (valete, dama ou rei). |
| `rotuloCarta(carta)` | função (exportada) | Rótulo curto da carta, ex.: '10♠'. |
| `baralhoPadrao()` | função (exportada) | Baralho padrão de 52 cartas, sem coringas. |

## `src/nucleo/oponentes/comum.js`

Ferramentas compartilhadas pelos oponentes, sobre o motor do NeuroDeck: gerador aleatório, determinização (sortear o que o jogador não vê) e estimativa da chance de vitória.

| Nome | Tipo | Descrição |
|---|---|---|
| `novoGerador()` | função (exportada) | Gerador aleatório novo para uma decisão de oponente (função que devolve números em [0, 1)). |
| `determinizar(mao, j)` | função (exportada) | Determinização: copia a mão e sorteia uma distribuição plausível para tudo o que `j` não vê (neurônios virados, mão do adversário e limbo). É assim que os oponentes "imaginam" as cartas escondidas antes de simular. |
| `chanceDeVitoria(mao, j, n)` | função (exportada) | Estima a chance de `j` vencer a mão: sorteia `n` vezes o que ele não vê e joga cada mão até o fim com a política aleatória do motor. |

## `src/nucleo/oponentes/estrategias.js`

As três estratégias de jogo, uma por nível de dificuldade. São os bots do NeuroDeck (`src/motor/bot.js`); aqui a jogada escolhida é só traduzida para o formato da interface. - aleatória (Zé do Ruído): sorteia uma jogada válida, com leve preferência por ataques; - gulosa (Gradiente Guloso): escolhe a jogada de melhor ganho imediato, sem olhar adiante; - Monte Carlo (Mestre Monte Carlo): simula partidas inteiras para cada jogada e escolhe a que mais venceu.

| Nome | Tipo | Descrição |
|---|---|---|
| `jogadaAleatoria(mao, j)` | função (exportada) | Estratégia aleatória. |
| `jogadaGulosa(mao, j)` | função (exportada) | Estratégia gulosa: avalia cada jogada um passo à frente (ativações pelo valor esperado). |
| `jogadaMonteCarlo(mao, j, simulacoesPorJogada)` | função (exportada) | Estratégia de Monte Carlo: para cada jogada, sorteia o que está escondido, joga até o fim e conta vitórias. A jogada escolhida leva `simulacao` com a taxa de vitória e o total de partidas simuladas, que a interface mostra. |

## `src/nucleo/oponentes/index.js`

Ponto de entrada dos oponentes: perfis (nome, nível, estilo), escolha de jogada e decisões de truco. As jogadas vêm dos bots do NeuroDeck (ver estrategias.js); as decisões de truco são do Truco de Turing e usam a chance de vitória estimada por simulação.

| Nome | Tipo | Descrição |
|---|---|---|
| `OPONENTES` | constante (exportada) | Perfis exibidos no menu e na mesa. `avatar` é a chave da arte em arte/avatares.js. |
| `cartaDeInicio(mao, j)` | função | Carta que o oponente revela para decidir quem começa. |
| `escolherJogada(mao, j, simulacoes)` | função (exportada) | Escolhe a jogada do oponente `j` conforme o seu perfil. |
| `SIMULACOES_TRUCO` | constante | Simulações usadas para estimar a chance de vitória em cada perfil. |
| `querTrucar(mao, j, perfil)` | função (exportada) | Decide se o oponente pede truco antes da sua jogada. |
| `responderAoTruco(mao, j, perfil, valorPedido, podeAumentar)` | função (exportada) | Resposta do oponente a um pedido de truco. |

## `src/nucleo/partida.js`

Uma mão do jogo, vista pela interface do Truco de Turing e jogada pelo motor do NeuroDeck. Este arquivo é a **camada de tradução** da fusão: as telas e os testes continuam chamando as mesmas funções de antes (`novaMao`, `jogadasLegais`, `aplicarJogada`…), mas as regras agora são as do motor em `src/motor/` (ver `src/motor/ORIGEM.md`). Nenhuma regra é decidida aqui. ## Como funciona A mão guarda o estado do motor em `mao.nd` e uma **visão** dele no formato que a interface conhece (os campos abaixo). Cada jogada é traduzida (`traducao.js`), aplicada pelo motor e, em seguida, a visão é refeita por `atualizarVisao`. Os eventos de animação e as linhas do registro são gerados aqui, comparando o antes e o depois. ## Visão da mão ``` { config: { baralho, terreno, inicio, arquitetura, baralhos }, // opções escolhidas no menu semente, // aleatoriedade reproduzível nd, // estado do motor do NeuroDeck (fonte da verdade) indiceDeCartas, // cartas da interface por id do motor, e vice-versa camadas: Neuronio[][], // a mesa, camada a camada neuronios: { [id]: Neuronio }, // índice dos neurônios por id jogadores: Jogador[], limbo: Carta[], cemiterio: Carta[], vez, primeiro, rodada, turno, vento, fase: 'inicio' | 'jogo' | 'fim', eventos: Evento[], // fila consumida pela interface para animar registro: string[], // texto do histórico de jogadas historico: number[][], // soma de cada rede a cada jogada (curva de treino) resultado: { somas, vencedor, motivo, travados } | null, simulacao: boolean, // em simulações, não gera eventos nem textos } ``` Neurônio: `{ id, camada, posicao, cartas, revelado, dono, removido, conhecido, rodadaRevelada }`. Jogador: `{ indice, nome, tipo: 'humano'|'oponente', oponente, mao, caminho, situacao, dropouts, acoesUsadas, transferUsado, cartaInicial, estatisticas }`. `situacao` é 'construindo', 'concluida', 'earlystop', 'overflow' ou 'travada' (ficou sem neurônio livre na camada seguinte). ## Jogadas `{ tipo: 'inicio', jogador, carta }`, `{ tipo: 'ativar', jogador, neuronio }`, `{ tipo: 'empilhar', jogador, neuronio, cartas }`, `{ tipo: 'dropout', jogador, n, pagamento }`, `{ tipo: 'transfer', jogador, cartas }`, `{ tipo: 'passar', jogador }`. ## O que mudou nas regras com o motor do NeuroDeck - dropout: o neurônio desfeito vai para o cemitério e sai da mesa (antes voltava virado); - quem fica sem neurônio livre na camada seguinte tem a rede finalizada ('travada'); - transfer learning não gasta a vez; - só passa a vez quem teve a rede interrompida por early stop (com cartas na mão) ou quem não tem nenhuma outra jogada; quem não pode jogar é pulado automaticamente; - pontuação, terrenos e desempates: ver `pontuacao.js` e `src/motor/engine/`.

| Nome | Tipo | Descrição |
|---|---|---|
| `FORMAS_DE_INICIO` | constante (exportada) | Formas de decidir quem começa (seção "Inicialização" da especificação). A primeira é o padrão. |
| `NOME_EFEITO` | constante (exportada) | Nome de cada efeito de empilhamento, para a interface. |
| `novoJogador(dados, indice)` | função | Cria o objeto de um jogador no começo da mão. |
| `todasAsCartas(nd)` | função | Todas as cartas da partida no estado do motor, onde quer que estejam. |
| `indexarCartas(nd)` | função | Converte as cartas do motor para o formato da interface, uma vez por partida. motor, e id do motor por id da interface. |
| `montar(nd, config, jogadores, simulacao, cartas)` | função | Monta a visão da interface em volta de um estado do motor. |
| `novaMao(opcoes)` | função (exportada) | Cria uma mão nova: o motor embaralha, monta a mesa, distribui as cartas e separa o limbo. |
| `copiarMao(mao, nd = ND.cloneState(mao.nd)` | função (exportada) | Cópia leve da mão para simulações (sem eventos, textos ou histórico). |
| `atualizarVisao(mao)` | função (exportada) | Refaz a visão da interface a partir do estado do motor (`mao.nd`). É chamada depois de cada jogada; ferramentas e testes que mexem direto em `mao.nd` também precisam chamá-la. |
| `emitir(mao, evento)` | função | Coloca um evento na fila da interface (ignorado em simulação). |
| `anotar(mao, texto)` | função | Acrescenta uma linha ao registro de jogadas (ignorado em simulação). |
| `somas(mao)` | função | Soma atual da rede de cada jogador, pelo motor. |
| `anotarHistorico(mao)` | função | Guarda a soma atual de cada rede para a curva de treino. |
| `totalDeCamadas(mao)` | função (exportada) | Total de camadas da mesa desta mão. |
| `fronteira(mao, j)` | função (exportada) | Último neurônio do caminho do jogador (a "fronteira"), ou null. |
| `alvosDeAtivacao(mao, j)` | função (exportada) | Neurônios livres que o jogador pode ativar na próxima camada da sua rede. |
| `alvosDeEmpilhamento(mao)` | função (exportada) | Neurônios que aceitam cartas empilhadas: a fronteira oculta das redes ainda em construção. |
| `efeitoDoEmpilhamento(mao, j, neuronio, n)` | função (exportada) | Efeito de empilhar `n` cartas no neurônio, pelo tamanho final da pilha: 2 = tunagem (própria) ou overfit (adversário); 3 = early stop; 4 = stack overflow. |
| `podeEmpilhar(mao, j, idNeuronio, idsCartas)` | função (exportada) | Diz se o jogador pode empilhar essas cartas da mão nesse neurônio (quem decide é o motor). |
| `camadasDesfaziveis(mao, j)` | função (exportada) | Quantas camadas ocultas o jogador pode desfazer com dropout. |
| `valorParaTransfer(mao, j)` | função (exportada) | Valor que o jogador tem quatro vezes na mão (para transfer learning), ou null. |
| `podePassar(mao, j)` | função (exportada) | Passar a vez: só quem teve a rede interrompida por early stop e ainda tem cartas (atacar não é obrigatório), ou quem não tem nenhuma outra jogada que gaste a vez. |
| `jogadasLegais(mao, j, opcoes = {})` | função (exportada) | Lista as jogadas legais do jogador, geradas pelo motor. |
| `idsNoMotor(mao, j, ids)` | função | Ids do motor das cartas da mão do jogador, a partir dos ids da interface. |
| `jogadaParaND(mao, jogada)` | função (exportada) | Traduz uma jogada da interface para um movimento do motor. Lança erro se a jogada estiver malformada; a validade pelas regras é conferida pelo motor. |
| `jogadaParaTT(mao, j, movimento)` | função (exportada) | Traduz um movimento do motor (de `legalMoves` ou dos bots) para uma jogada da interface. |
| `RECUSA` | constante | Mensagem de erro de cada tipo de jogada recusada pelo motor. |
| `anunciarInicio(mao)` | função | Depois que todos revelaram a carta: quem começa. |
| `narrarAtivacao(mao, jogada)` | função | Efeitos de uma ativação: evento, registro e, na camada de saída, a rede completa. |
| `narrarEmpilhamento(mao, jogada, antes)` | função | Efeitos de um empilhamento: tunagem, overfit, early stop ou stack overflow. |
| `encerrar(mao)` | função | Fim da mão: resultado no formato da interface. |
| `finalizarMao(mao)` | função (exportada) | Encerra a mão agora, com as redes como estão: o motor apura o vencedor pelos desempates. Serve para o limite de jogadas das simulações e para testes que montam a situação final. |
| `aplicarJogada(mao, jogada)` | função (exportada) | Aplica uma jogada: traduz, entrega ao motor e refaz a visão. Lança erro se a jogada for inválida (o estado não muda nesse caso). |

## `src/nucleo/pontuacao.js`

Soma da rede de um jogador (o "forward pass" do jogo), calculada pelo motor do NeuroDeck. Regras da fusão (ver `src/motor/engine/decks.js`): - 2 a 10 valem o número, Ás 11, figuras 0; - figuras iguais em camadas vizinhas formam uma sequência, e a figura empilhada por tunagem conta nela. Cada figura da sequência vale 10: par 20, trio 30; quadra zera a rede (vanishing gradient); - tunagem de carta numérica soma o valor da carta empilhada. Exemplo do enunciado: "8-K-K-3" com tunagem num K tem três Reis (trio), logo 8 + 30 + 3 = 41. Este arquivo só reorganiza o resultado do motor no formato que as telas usam: os pontos de cada neurônio, e as sequências de figuras ("combos") à parte, de modo que a soma dos neurônios mais a soma dos combos dá o total.

| Nome | Tipo | Descrição |
|---|---|---|
| `arredondar` | constante |  |
| `pontuarRede(mao, j)` | função (exportada) | Calcula a soma da rede do jogador `j`. |
| `decimal` | constante | Número com vírgula decimal e no máximo 2 casas ("1,2", "23,45"). |
| `ROTULO_SAIDA_SATURADA` | constante (exportada) | Rótulo do aviso do baralho Backprop (ver `pontuarForward`). |
| `pontuarForward(mao, resultado)` | função | Baralho Backprop: a rede vale a ativação da saída. Cada neurônio mostra a ativação depois da camada dele (`pontos`) e, nas notas, o peso do naipe, o viés e a função de ativação. Não há combos de figuras. O motor marca (no campo `vanishing`, nome que vem do NeuroDeck) a rede de 3 ou mais neurônios que passou por alguma ativação não linear e terminou abaixo de 20. Sigmoide e tanh do baralho vão no máximo até 20, então isso é saturação da ativação no forward pass, e não vanishing gradient, que acontece no backward e que este baralho não calcula. Aqui o aviso vira `saturada`, e `vanishing` fica falso: nenhum texto do Backprop fala em vanishing gradient. |
| `mediaDePontos(mao, cartas)` | função (exportada) | Média de pontos de um conjunto de cartas. |

## `src/nucleo/rede.js`

Arquitetura da rede neural montada na mesa. Na arquitetura padrão, a camada 0 é a entrada (3 neurônios), 1 a 5 são ocultas (5 cada) e 6 é a saída (4). As arquiteturas do NeuroDeck (curta, larga, profunda) mudam o número e o tamanho das camadas; com mais de 2 jogadores, cada camada ganha um neurônio por jogador a mais (ver `tamanhosDaMesa`). Por isso as funções abaixo recebem o total de camadas da mesa em uso. Cada jogador recebe `TAMANHO_MAO` cartas por baralho; o que sobra vai para o limbo.

| Nome | Tipo | Descrição |
|---|---|---|
| `TAMANHOS_CAMADAS` | constante (exportada) | Neurônios por camada da arquitetura padrão, da entrada à saída. |
| `ARQUITETURAS` | constante (exportada) | Arquiteturas oferecidas no menu (as do NeuroDeck), com o nome para a interface. |
| `tamanhosDaMesa(arquitetura = 'padrao', jogadores = 2)` | função (exportada) | Tamanho de cada camada da mesa para a arquitetura e o número de jogadores: com mais de 2 jogadores, cada camada ganha um neurônio por jogador a mais (regra do NeuroDeck). |
| `TOTAL_CAMADAS` | constante (exportada) | Quantidade de camadas (7). |
| `CAMADA_SAIDA` | constante (exportada) | Índice da camada de saída (6). |
| `TAMANHO_MAO` | constante (exportada) | Cartas na mão de cada jogador no início. |
| `ehOculta(camada, total = TOTAL_CAMADAS)` | função (exportada) | Diz se a camada é oculta (só nelas valem as ações com cartas). |
| `nomeCamada(camada, total = TOTAL_CAMADAS)` | função (exportada) | Nome da camada para a interface: 'Entrada', 'Oculta 3', 'Saída'. |

## `src/nucleo/terrenos.js`

Terrenos (seção "Extensões" da especificação). O efeito de cada um é aplicado pelo motor do NeuroDeck (`src/motor/engine/terrains.js`); aqui ficam só nome e descrição.

## `src/nucleo/traducao.js`

Tradução entre o vocabulário do Truco de Turing (interface) e o do motor do NeuroDeck (regras, em `src/motor/`). As telas continuam falando de `mao`, `jogadores`, `neuronios`, cartas `{ valor: 'K', naipe: 'E' }` e jogadas `{ tipo: 'empilhar', ... }`. O motor fala de `state`, `nets`, `slots`, cartas `{ rank: 13, suit: 'S' }` e movimentos `{ type: 'tune', ... }`. Este arquivo tem só as conversões, sem estado: quem guarda a partida é `partida.js`. | Truco de Turing | Motor do NeuroDeck | |------------------------------|------------------------------------------------------| | `inicio` (carta) | `reveal` (cardId) | | `ativar` (neuronio) | `advance` (slotIndex na próxima camada) | | `empilhar` no próprio | `tune` (cardIds) | | `empilhar` no adversário | `overfit`, `earlystop` ou `stackoverflow`, pelo tamanho final da pilha (2, 3 ou 4) | | `dropout` (n, pagamento) | `dropout` (layers, cardIds) | | `transfer` (cartas) | `transfer` (rank) | | `passar` | `pass` |

| Nome | Tipo | Descrição |
|---|---|---|
| `BARALHO_ND` | constante (exportada) | Baralhos: chave do Truco de Turing → id no motor. |
| `TERRENO_ND` | constante (exportada) | Terrenos: chave do Truco de Turing → id no motor. |
| `INICIO_ND` | constante (exportada) | Formas de decidir quem começa: chave do Truco de Turing → `firstRule` do motor. |
| `OPONENTE_ND` | constante (exportada) | Oponentes: perfil do Truco de Turing → bot do motor. |
| `naipeParaTT(suit)` | função (exportada) | Naipe do motor ('S', 'H', 'C', 'D') → naipe da interface ('E', 'C', 'P', 'O'). |
| `rankDoValor(valor)` | função (exportada) | Valor da interface ('A', '2'…'10', 'J', 'Q', 'K') → rank do motor (1 a 13). |
| `valorDoRank(rank)` | função (exportada) | Rank do motor (1 a 13) → valor da interface. |
| `cartaParaND(carta)` | função (exportada) | Carta da interface → carta do motor, sem id (serve para consultar valor e força no baralho). |
| `cartaParaTT(card, repetida)` | função (exportada) | Carta do motor → carta da interface. O id é `valor + naipe` ('KC') quando a carta é única na partida, e ganha o sufixo `#id` do motor quando há cartas repetidas (2 baralhos, Yin-yang). |
| `idDoNeuronio(camada, posicao)` | função (exportada) | Id do neurônio na interface: camada e posição ('C2N3'). |
| `lugarDoNeuronio(id)` | função (exportada) | Camada e posição a partir do id do neurônio, ou null se o id não for válido. |
| `SITUACAO` | constante | Motivo de fim de rede no motor → situação da rede na interface. |
| `MOTIVOS_AVISADOS` | constante | Motivos sem tradução já avisados (um aviso por motivo, para não poluir o console). |
| `situacaoDaRede(net)` | função (exportada) | Situação da rede de um jogador: 'construindo', 'concluida', 'earlystop', 'overflow' ou 'travada'. Um motivo de fim que o motor não conhecia (de um mod, por exemplo) aparece como 'concluida', mas avisa no console, para a falta de tradução não passar em silêncio. |
| `MOTIVOS_TRADUZIDOS` | constante (exportada) | Motivos de fim de rede que a interface sabe mostrar (para os testes). |
| `motivoDaVitoria(tiebreak, n)` | função (exportada) | Critério de desempate do motor → texto do resultado. `n` é o tamanho da menor mão. |
| `ATAQUE_PELO_TAMANHO` | constante (exportada) | Efeito de uma pilha pelo tamanho final: o tipo de ataque no motor. |

## `src/nucleo/truco.js`

Camada de truco: a partida vale tentos e cada mão pode ser trucada. TRUCO! (3) → SEIS! (6) → NOVE! (9) → DOZE! (12). Quem corre entrega o valor atual. Mão de onze: com alguém a um tento da vitória, ninguém pode trucar. Estado da partida: `{ alvo, tentos: [n, n, …], numeroMao, valor, aumentadoPor, pedido, encerrada, vencedor }`. `pedido` é `{ por, para }` enquanto um truco espera resposta. O truco é de um contra um: com mais de 2 jogadores a partida continua valendo tentos (cada mão vale 1 para quem vence), mas ninguém pode trucar.

| Nome | Tipo | Descrição |
|---|---|---|
| `ESCADA_TRUCO` | constante (exportada) | Valores possíveis de uma mão. |
| `GRITO_TRUCO` | constante (exportada) | O que se grita ao pedir cada valor. |
| `novaPartida(alvo, jogadores = 2)` | função (exportada) | Cria uma partida. |
| `temTruco(partida)` | função (exportada) | A partida aceita pedidos de truco (só entre 2 jogadores e valendo mais de uma mão)? |
| `proximoValor(valor)` | função (exportada) | Próximo degrau da escada a partir de `valor`, ou null no topo. |
| `ehMaoDeOnze(partida)` | função (exportada) | Mão de onze: alguém está a um tento da vitória. |
| `podeTrucar(partida, j)` | função (exportada) | Diz se o jogador pode pedir truco agora (quem aumentou por último não aumenta de novo). |
| `pedirTruco(partida, j)` | função (exportada) | Registra um pedido de truco. Devolve falso se não for permitido. |
| `responderTruco(partida, j, resposta)` | função (exportada) | Responde ao pedido pendente. |
| `marcarTentos(partida, vencedor, pontos)` | função (exportada) | Soma os tentos da mão ao vencedor e encerra a partida se ele chegou ao alvo. Devolve os tentos ganhos. |
| `proximaMao(partida)` | função (exportada) | Prepara a próxima mão da partida. |

## `src/online/configuracao.js`

Configuração do projeto Firebase do grupo (Authentication + Firestore), usada pelas contas e pelas partidas pela internet. Enquanto for `null`, o jogo oferece só a conta local (neste aparelho) e as partidas entre abas e janelas do mesmo navegador. Para ligar: no console do Firebase, crie o projeto, ative Authentication (Google e e-mail/senha) e o Firestore, publique as regras de `firestore.rules`, registre um app da Web e cole aqui o objeto `firebaseConfig` que o console mostra. Esses valores não são segredo: quem protege os dados são as regras do Firestore.

| Nome | Tipo | Descrição |
|---|---|---|
| `VERSAO_FIREBASE` | constante (exportada) | Versão do SDK do Firebase carregada do CDN oficial. |

## `src/online/contas.js`

Contas: o progresso (conquistas, avatares, verbetes lidos e contadores) passa a ficar na conta e vale em qualquer aparelho. Ao entrar, o progresso do aparelho e o da conta se juntam sem perder nada nem contar em dobro (`mesclarProgresso`); depois, cada mão salva na conta.

| Nome | Tipo | Descrição |
|---|---|---|
| `CONTADORES` | constante | Contadores que só crescem: na mescla vale o maior. |
| `CONJUNTOS` | constante | Conjuntos marcados (id → valor): na mescla vale a união. |
| `mesclarProgresso(local, conta)` | função (exportada) | Junta o progresso do aparelho com o da conta. - contadores: o maior dos dois (as mesmas mãos não contam duas vezes); - conquistas: a união, com a data mais antiga de cada uma; - verbetes, terrenos, baralhos e arquiteturas: a união; - avatar: o da conta, se houver; preferências do aparelho (som, música, opções do menu) ficam. |
| `progressoDaConta(progresso)` | função (exportada) | Parte do progresso que vai para a conta (sem preferências do aparelho). |

## `src/online/firebase.js`

Firebase: contas (Google ou e-mail e senha), progresso na conta e o transporte das salas pela internet (Firestore). O SDK só é baixado do CDN quando o projeto está configurado (configuracao.js) e alguém usa uma dessas funções; sem configuração, nada aqui é carregado. Dados no Firestore (ver firestore.rules): - `contas/{uid}`: o progresso da conta (ver contas.js, `progressoDaConta`); - `salas/{codigo}/mensagens/{id}`: as mensagens da sala (sala.js), em ordem de chegada ao servidor. A ordem das ações do jogo não depende disso: o anfitrião numera cada ação.

| Nome | Tipo | Descrição |
|---|---|---|
| `firebaseConfigurado()` | função (exportada) | O projeto Firebase do grupo está configurado? |
| `carregar()` | função | Baixa e inicia o SDK (uma vez). |
| `entrarComGoogle()` | função (exportada) | Entra com a conta Google (janela do Google). Devolve `{ uid, nome, email }`. |
| `entrarComEmail(email, senha, criar = false)` | função (exportada) | Entra com e-mail e senha; com `criar`, cria a conta antes. |
| `sairDaConta()` | função (exportada) | Sai da conta. |
| `aoMudarConta(cb)` | função (exportada) | Avisa `cb(conta \| null)` quando alguém entra ou sai. Devolve a função que para de ouvir. |
| `carregarProgressoDaConta(uid)` | função (exportada) | Progresso salvo na conta, ou null. |
| `salvarProgressoNaConta(uid, progresso)` | função (exportada) | Salva o progresso na conta. |
| `transporteFirebase(codigo)` | função (exportada) | Transporte de sala pelo Firestore: cada mensagem vira um documento em `salas/{codigo}/mensagens`; todos ouvem a coleção e recebem os documentos novos. |

## `src/online/sala.js`

Sala de jogo online: quem está na mesa, em que cadeira, e a ordem das ações. Modelo: **passo a passo com anfitrião** (lockstep). Todos os aparelhos criam a mesma mão com a mesma semente e aplicam as mesmas ações na mesma ordem, então o estado é idêntico em todas as telas sem precisar enviar o estado inteiro. Quem cria a sala é o anfitrião: ele numera as ações (`seq`) e as repassa a todos, inclusive a quem pediu. Cada aparelho aplica a ação de número `n` só depois da `n - 1`. Uma ação inválida é rejeitada igualmente em todas as telas, porque todas têm o mesmo estado. O anfitrião também joga pelos oponentes do computador. Se uma pessoa some (sem sinal de vida por `TEMPO_SEM_SINAL`), o anfitrião passa a cadeira dela para um oponente do computador. Se o anfitrião some, a pessoa na menor cadeira assume (todos fazem a mesma conta) e continua a numeração de onde parou. A sala não sabe nada de Phaser nem de rede: recebe um `transporte` com `enviar(msg)`, `aoReceber(cb)` e `fechar()` (ver transportes.js) e avisa a interface por callbacks.

| Nome | Tipo | Descrição |
|---|---|---|
| `BATIMENTO` | constante (exportada) | Intervalo do sinal de vida, em ms. |
| `TEMPO_SEM_SINAL` | constante (exportada) | Sem sinal de vida por este tempo, a pessoa é considerada desconectada. |
| `codigoDeSala(sortear = Math.random)` | função (exportada) | Código de sala: 5 letras sem as que se confundem (I, O, 0, 1). |
| `idDeCliente(sortear = Math.random)` | função (exportada) | Identificador deste aparelho na sala. |
| `constructor(transporte, eu, relogio = RELOGIO_REAL)` | método |  |
| `on(evento, cb)` | método | Inscreve um ouvinte: 'sala' (config mudou), 'acao' (ação numerada) ou 'aviso' (texto). |
| `off(evento, cb)` | método | Cancela a inscrição de um ouvinte. |
| `criar(codigo, opcoes, pessoas, semente)` | método | Cria a sala com as opções do menu. As cadeiras começam com o anfitrião na 0, vagas para `pessoas - 1` pessoas e oponentes do computador no resto. |
| `anunciarSala()` | método | Repassa a configuração a todos. |
| `comecar()` | método | O anfitrião começa a partida: vagas não ocupadas viram oponentes do computador. |
| `ordenar(acao)` | método | Numera uma ação e a repassa a todos (só o anfitrião). |
| `entrar()` | método | Pede para entrar numa sala já criada. |
| `enviar(acao)` | método | Envia uma ação para ser numerada (direto, se for o anfitrião). |
| `sair()` | método | Sai da sala avisando os outros. |
| `ao_ola(msg)` | método | Alguém quer entrar: o anfitrião dá uma vaga (ou devolve a cadeira de quem voltou). |
| `aceitar(evento)` | método | Entrega as ações em ordem: a de número n só sai depois da n - 1. |
| `ausente(cliente)` | método | Está sem sinal de vida há mais de TEMPO_SEM_SINAL? |
| `verificarAusentes()` | método | O anfitrião troca quem sumiu por um oponente do computador (uma ação numerada, para todos trocarem no mesmo ponto da partida). Se quem sumiu foi o anfitrião, a menor cadeira humana presente assume. |
| `substituir(cadeira)` | método | Aplica a troca de uma cadeira por um oponente do computador (chamado por todos ao receber a ação). |
| `RELOGIO_REAL` | constante | Relógio de verdade. |

## `src/online/transportes.js`

Transportes da sala online: por onde as mensagens passam. Todos têm a mesma forma: `{ enviar(msg), aoReceber(cb) → desinscrever, fechar() }`. - `transporteLocal`: abas e janelas do mesmo navegador (BroadcastChannel). Funciona sem servidor e serve para jogar em várias telas no mesmo computador e para os testes. - `transporteMemoria`: vários clientes no mesmo programa (testes de unidade). - O transporte pela internet (Firebase) fica em firebase.js e só é usado quando o projeto do grupo estiver configurado (configuracao.js).

| Nome | Tipo | Descrição |
|---|---|---|
| `transporteLocal(codigo)` | função (exportada) | Abas e janelas do mesmo navegador, pelo canal `truco-de-turing:<codigo>`. |
| `centralEmMemoria({ atrasar = false } = {})` | função (exportada) | Central em memória: `central.conectar()` devolve um transporte; tudo o que um envia chega aos outros (cópia por JSON, como na rede). Com `atrasar: true` as mensagens só saem em `central.entregar()`, para os testes controlarem a ordem. |

## `src/principal.js`

Ponto de entrada do jogo: prepara o texto nítido, carrega as opções e cria o Phaser.Game com as três cenas (Carregamento → Menu → Mesa). Num celular na vertical, o jogo só é criado depois que o aparelho é girado; até lá aparece o aviso #girar (index.html). O Phaser vem do CDN como variável global `Phaser` (ver index.html).

| Nome | Tipo | Descrição |
|---|---|---|
| `celularEmPe` | constante | Celular na vertical (o aviso para girar aparece no lugar do jogo; ver #girar em estilo.css). |
| `TOQUES_SIMULTANEOS` | constante (exportada) | Quantos dedos o Phaser acompanha ao mesmo tempo. |
| `remedirAposMudarATela()` | função | Ao entrar ou sair da tela cheia (e ao girar), o canvas muda de tamanho e de posição em etapas. Remede algumas vezes, para que os toques nunca caiam no lugar antigo dos botões. |
| `criarJogo()` | função | Cria o Phaser.Game com as três cenas. |
| `iniciarJogo()` | função | Cria o jogo agora ou, num celular em pé, assim que ele for girado para a horizontal. |

## `src/recursos/retratoProfessor.js`

Foto do prof. Peng Yaohao (360x360, JPEG embutido), enviada pelo autor para o quadro de conquistas.

## `src/versao.js`

Versão do jogo, mostrada na tela "Sobre". Gerado por ferramentas/versionar.js a cada merge na main (GitHub Actions). Não edite à mão.

| Nome | Tipo | Descrição |
|---|---|---|
| `VERSAO` | constante (exportada) | Número da versão (MAIOR.MENOR.CORREÇÃO). |
| `DATA_DA_VERSAO` | constante (exportada) | Data da versão (AAAA-MM-DD). |

## `ferramentas/documentar.js`

Gera docs/REFERENCIA.md: a lista de módulos e funções do projeto, montada a partir dos comentários JSDoc do código (o `@file` de cada arquivo e o comentário `/** ... *\/` logo acima de cada função, constante ou método). Assim a referência nunca fica desatualizada: basta documentar o código e rodar `npm run docs`.

| Nome | Tipo | Descrição |
|---|---|---|
| `raiz` | constante | Pasta do projeto. `TRUCO_RAIZ` permite rodar sobre uma cópia (usado nos testes). |
| `arquivosJs(pasta)` | função | Lista recursiva dos arquivos .js de uma pasta, em ordem alfabética. |
| `limparComentario(bloco)` | função | Texto limpo de um bloco de comentário JSDoc (sem `*` e sem as tags @param/@returns). |
| `lerModulo(caminho)` | função | Extrai a descrição do arquivo e os itens documentados. |

## `ferramentas/empacotar.js`

Empacota o jogo num único arquivo HTML (CSS e JavaScript embutidos; Phaser e fontes via CDN). Saídas: - dist/truco-de-turing.html: página completa, para abrir direto ou hospedar em qualquer lugar; - dist/artifact.html: o mesmo conteúdo sem <html>/<head>/<body>, para publicar como artifact. Uso: `npm run build`.

| Nome | Tipo | Descrição |
|---|---|---|
| `raiz` | constante | Pasta do projeto. `TRUCO_RAIZ` permite rodar sobre uma cópia (usado nos testes). |

## `ferramentas/relatorios.js`

Roda todas as suítes de teste e escreve os relatórios em relatorios/. Suítes: - unidade (testes/unidade): regras, conteúdo, arte, interface HTML, aplicação e ferramentas; - interface (testes/interface): o jogo de verdade no Chromium (menu, partidas, ações, celular); - performance (testes/performance): tempos e limites no Node e no navegador. Saídas (relatorios/): - README.md: resumo geral (versão, commit, ambiente, totais, cobertura e destaques de performance); - unidade/, interface/, performance/: README.md com cada teste e o resultado JUnit (XML); - interface/capturas/: capturas de tela tiradas durante os testes de interface; - performance/medidas.json: todas as medidas; - cobertura/README.md e resumo.json: cobertura de linhas, ramos e funções por arquivo e a lista de todas as funções e métodos com quantas vezes foram executados nos testes (Node + navegador). Uso: `npm run relatorios` (todas) ou `node ferramentas/relatorios.js unidade performance`.

| Nome | Tipo | Descrição |
|---|---|---|
| `raiz` | constante | Pasta do projeto. |
| `SUITES` | constante | Suítes de teste: pasta, título e descrição para o relatório. |
| `rodarSuite(nome)` | função | Roda uma suíte com os relatores JSON, JUnit e o resumo no terminal. |
| `gerarCobertura()` | função | Junta a cobertura do Node e do navegador com o c8. |
| `lerMedidas()` | função | ', '--include', 'ferramentas/**', '--exclude', 'src/recursos/**', '--exclude', 'ferramentas/relatorios.js'].map((p) => JSON.stringify(p)).join(' '), { cwd: raiz, stdio: 'inherit' }); return { resumo: JSON.parse(readFileSync(join(temporaria, 'c8', 'coverage-summary.json'), 'utf8')), detalhe: JSON.parse(readFileSync(join(temporaria, 'c8', 'coverage-final.json'), 'utf8')), }; } /** Medidas de performance gravadas pelos testes. |
| `totais(suite)` | função | Totais de uma suíte (só testes, sem as suítes que os agrupam). |
| `escreverSuite(suite, contexto, extra = '')` | função | Relatório de uma suíte: cada arquivo, cada grupo e cada teste. |
| `galeria()` | função | Galeria das capturas de tela dos testes de interface. |
| `escreverPerformance(suite, medidas, contexto)` | função | Relatório de performance: tabela de medidas com limite e situação. |
| `escreverCobertura(cobertura, contexto)` | função | Relatório de cobertura: totais, tabela por arquivo e a lista de funções e métodos com o número de execuções (funções anônimas, como callbacks, aparecem só nos totais). |
| `escreverResumo(suites, cobertura, medidas, contexto)` | função | Resumo geral em relatorios/README.md. |

## `ferramentas/simular.js`

Laboratório de Monte Carlo no terminal: oponentes jogam entre si e as estatísticas são agregadas. Uso: node ferramentas/simular.js [partidas] [oponente1] [oponente2] [baralho] [terreno] Exemplo: node ferramentas/simular.js 300 guloso aleatorio truco oceano

## `ferramentas/versionar.js`

Versionamento do jogo (versionamento semântico MAIOR.MENOR.CORREÇÃO). Roda no GitHub Actions a cada merge (ou push) na main — ver .github/workflows/versao.yml — e também à mão. Atualiza, de uma vez: - package.json e package-lock.json (`version`); - src/versao.js (mostrada na tela "Sobre"); - README.md (a linha entre os marcadores `<!-- versao -->` e `<!-- /versao -->` e, a cada pull request, os autores novos entre `<!-- autores -->` e `<!-- /autores -->`); - CHANGELOG.md (uma entrada nova no topo, com o título do pull request e quem o fez). Que parte da versão sobe é decidido pelo pull request (ou pela mensagem do commit, sem PR): - rótulo `versao:maior`, ou título com `!:`/"BREAKING" → MAIOR (2.0.0); - rótulo `versao:menor`, ou título começando com `feat`, `nova` ou `novo` → MENOR (1.1.0); - qualquer outro caso → CORREÇÃO (1.0.1). Uso: node ferramentas/versionar.js --tipo auto --titulo "feat: dicas" --rotulos "versao:menor" --pr 12 node ferramentas/versionar.js --tipo correcao node ferramentas/versionar.js --atual (publica a versão atual sem subir; 1ª versão) node ferramentas/versionar.js --simular ... (só mostra a próxima versão, sem gravar) O título e os rótulos também podem vir das variáveis de ambiente TITULO e ROTULOS (mais seguro no CI). AUTORES (uma pessoa por linha, `login:Nome Completo`) traz quem abriu o PR e quem fez commits nele. A versão final é impressa na última linha da saída.

| Nome | Tipo | Descrição |
|---|---|---|
| `raiz` | constante | Pasta do projeto. `TRUCO_RAIZ` permite rodar sobre uma cópia (usado nos testes). |
| `lerArgumentos(lista)` | função | Lê os argumentos `--chave valor` (e `--chave` sozinho como verdadeiro). |
| `tipoDeMudanca(titulo = '', rotulos = [])` | função (exportada) | Decide que parte da versão sobe. |
| `proximaVersao(versao, tipo)` | função (exportada) | Soma uma versão: '1.4.2' + 'menor' → '1.5.0'. |
| `dataEmBrasilia(agora = new Date()` | função (exportada) | Data de hoje (AAAA-MM-DD) no horário de Brasília. |
| `lerAutores(texto = '')` | função (exportada) | Lê a lista AUTORES (`login:Nome`, uma por linha ou separada por vírgula), sem robôs nem repetidos. |
| `registrarAutores(readme, autores)` | função (exportada) | Acrescenta à lista de autores do README (entre `<!-- autores -->` e `<!-- /autores -->`) quem ainda não está nela. Reconhece a pessoa pelo @login do GitHub; as linhas que já existem (inclusive as escritas à mão) ficam como estão. |
| `creditos(autores)` | função (exportada) | Créditos de quem fez o PR, para o CHANGELOG: "por @a e @b". |
| `gravarModuloDeVersao(versao, data)` | função | Grava a versão em src/versao.js. |
| `gravarNoReadme(versao, data, autores = [])` | função | Troca a linha de versão do README (entre os marcadores). |
| `gravarNoHistorico(versao, data, titulo, pr, repositorio, autores = [])` | função | Acrescenta a entrada da versão no topo do CHANGELOG.md. |

