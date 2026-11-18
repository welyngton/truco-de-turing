/**
 * @file Conteúdo do tutorial: o assistente (Percy), a mesa e as mãos combinadas de antemão e o
 * roteiro, passo a passo. Só dados; quem monta a mão e confere as jogadas é `nucleo/tutorial.js`, e
 * quem mostra os balões é a cena da mesa (`cenas/mesa/tutorial.js`).
 *
 * Um passo sem `jogada` é só uma fala ("Continuar"). Um passo com `jogada` espera essa jogada:
 * do jogador (`jogador: 0`), que só consegue fazer exatamente a jogada destacada, ou do rival
 * (`jogador: 1`), que a faz quando o jogador toca em "Continuar". A jogada nomeia o neurônio pelo id
 * da mesa ('C1N1') e as cartas pelo valor ('6'), nunca pelo id, porque os ids nascem na montagem.
 */

/** O assistente que fala nos balões. */
export const ASSISTENTE = { nome: 'Percy', apelido: 'o perceptron de plantão' };

/**
 * A mesa do treino: arquitetura curta (entrada 3, três camadas ocultas de 4 e saída 3), 2 jogadores.
 * Cada linha é uma camada; cada valor é a carta virada no neurônio daquela posição (o id do neurônio
 * é 'C' + camada + 'N' + posição).
 */
export const MESA_DO_TUTORIAL = {
  arquitetura: 'curta',
  camadas: [
    ['2', 'A', '9'],
    ['Q', '6', '4', '8'],
    ['9', '3', 'K', '8'],
    ['8', '7', 'J', '2'],
    ['7', '4', '6'],
  ],
  /** Mãos combinadas: a do jogador tem 8 cartas (para treinar todas as ações); a do rival, 5. */
  maos: [['K', '4', '6', '9', '7', '7', '3', '10'], ['2', '6', '5', 'J', '8']],
  /** Carta que o rival revela na escolha de quem começa. */
  inicioDoRival: '2',
};

/** Opções fixas da mesa do treino: arquitetura curta, um oponente e uma mão só (sem truco). */
export const OPCOES_DO_TUTORIAL = {
  oponente: 'guloso', baralho: 'classico', terreno: 'neutro', inicio: 'revela-descarta', alvo: 1,
  jogadores: 2, humanos: 1, arquitetura: MESA_DO_TUTORIAL.arquitetura, baralhos: 1,
};

/** Roteiro do tutorial. */
export const ROTEIRO = [
  { fala: 'Oi! Eu sou o Percy, o assistente do laboratório. Vou ensinar o jogo numa mão de treino, com as cartas combinadas de antemão. Quando eu destacar uma jogada, é ela que você faz.' },
  { fala: 'O objetivo é construir a rede neural de <b>maior valor</b>. Cada coluna é uma <b>camada</b> e cada carta virada é um <b>neurônio</b>. A sua rede (azul) liga a entrada, à esquerda, à saída, à direita. E você pode <b>sabotar</b> a rede do rival.' },
  { jogador: 0, jogada: { tipo: 'inicio', valor: 'K' },
    fala: 'Primeiro, <b>quem começa</b>. Cada um revela uma carta da mão e a mais forte começa; as duas vão para o cemitério. Revele uma carta que você não pretende usar: o <b>K</b>, que sozinho vale 0 e garante que você comece.' },
  { fala: 'Você revelou K e o rival, 2. A carta mais forte começa (Ás, K, Q, J, 10 … 2; no empate, vale o naipe). Você começa!' },
  { jogador: 0, jogada: { tipo: 'ativar', neuronio: 'C0N1' },
    fala: 'Na sua vez, o movimento normal é <b>avançar</b>: clique no neurônio destacado da camada de entrada. Ele é virado e passa a ser seu.' },
  { fala: 'Um Ás! Cada carta vale o seu número (o Ás vale 11), e J, Q e K sozinhos valem 0. A <b>soma</b> da sua rede é a sua pontuação.' },
  { jogador: 1, jogada: { tipo: 'ativar', neuronio: 'C0N0' },
    fala: 'Agora o rival avança também. Cada neurônio pertence a um jogador só, e as redes podem se cruzar.' },
  { jogador: 0, jogada: { tipo: 'ativar', neuronio: 'C1N0' },
    fala: 'Avance para a próxima camada: clique no neurônio destacado.' },
  { fala: 'Eita, uma Dama! Figura sozinha vale 0 e só atrapalha. Para isso existe o <b>dropout</b>: você paga 1 carta da mão por camada para desfazer o seu último neurônio. Ele não gasta a vez; vamos usá-lo já, na sua próxima jogada.' },
  { jogador: 1, jogada: { tipo: 'ativar', neuronio: 'C1N2' },
    fala: 'Antes, o rival avança e vira um 4. No placar, à direita, você vê a soma de cada rede, camada por camada.' },
  { jogador: 0, jogada: { tipo: 'dropout', n: 1, valor: '4' },
    fala: 'Selecione o <b>4</b> (a carta que você usaria menos) e clique em <b>Dropout</b>.' },
  { jogador: 0, jogada: { tipo: 'ativar', neuronio: 'C1N1' },
    fala: 'A Dama foi para o cemitério e você voltou à camada anterior, ainda na sua vez. Avance de novo: clique no neurônio destacado.' },
  { jogador: 1, jogada: { tipo: 'ativar', neuronio: 'C2N0' },
    fala: 'O rival avança para a camada 2 e vira um 9.' },
  { jogador: 0, jogada: { tipo: 'empilhar', acao: 'overfit', neuronio: 'C2N0', valor: '9', n: 1 },
    fala: 'O último neurônio dele é um 9 e você tem um 9! Selecione-o e use <b>Overfit</b>: a pilha chega a 2 cartas, o neurônio vai para o cemitério e a rede do rival <b>recua uma camada</b>. Ataques só valem sobre o último neurônio oculto de uma rede, com carta de mesmo valor.' },
  { jogador: 1, jogada: { tipo: 'ativar', neuronio: 'C2N1' },
    fala: 'Funcionou: a rede dele perdeu o 9 e ele voltou uma camada. Ele avança de novo, agora para um 3.' },
  { jogador: 0, jogada: { tipo: 'empilhar', acao: 'tunagem', neuronio: 'C1N1', valor: '6', n: 1 },
    fala: 'Seu último neurônio é um <b>6</b> e você tem outro 6 na mão. Isso é uma <b>tunagem</b>: selecione o 6 e clique em Tunagem. A carta é empilhada e soma ao neurônio. Usar uma ação gasta a vez.' },
  { fala: 'Seu 6 agora vale 12 (o selo ⚡ mostra a pilha). Cuidado: com 3 cartas na pilha acontece <b>early stop</b> e, com 4, <b>stack overflow</b>, e isso vale também contra você.' },
  { jogador: 1, jogada: { tipo: 'empilhar', neuronio: 'C1N1', valor: '6', n: 1 },
    fala: 'Olha só: o rival tem um 6! Seu último neurônio é um 6 com pilha de 2 cartas, e a terceira carta causa <b>early stop</b>: a sua rede termina agora, sem esse neurônio.' },
  { jogador: 0, jogada: { tipo: 'passar' },
    fala: 'Sua rede parou no Ás. Você ainda tem cartas, e até dá para atacar o 3 do rival com o seu 3, mas atacar não é obrigatório: quem teve a rede interrompida pode <b>passar</b>. Vamos guardar as cartas: clique em Passar.' },
  { jogador: 1, jogada: { tipo: 'ativar', neuronio: 'C3N1' },
    fala: 'O rival avança para a camada 3 e vira um 7.' },
  { jogador: 0, jogada: { tipo: 'empilhar', acao: 'earlystop', neuronio: 'C3N1', valor: '7', n: 2 },
    fala: 'Você tem dois 7! Duas cartas sobre o 7 dele deixam a pilha com 3: <b>early stop</b> na rede do rival. Selecione os dois 7 e clique em Early stop.' },
  { fala: 'Todas as redes terminaram, então a mão acabou. A sua vale 11 (o Ás); a do rival, 2 + 4 + 3 = 9. A <b>maior soma vence</b>: você ganhou! Em caso de empate, vence quem tem menos dropouts e, depois, as melhores cartas da mão.' },
  { fala: 'Duas ações ficaram só na conversa. <b>Transfer learning</b>: troca 4 cartas iguais da mão por 4 do limbo, uma vez por mão, sem gastar a vez. <b>Stack overflow</b>: pilha com 4 cartas finaliza a rede do alvo, e ele perde a mão inteira.' },
  { fala: 'Na partida valendo ainda existe o <b>truco</b> (aumenta o valor da mão), além dos baralhos, terrenos e oponentes do menu. Você pode refazer este treino em "Como jogar". Bom jogo!' },
];
