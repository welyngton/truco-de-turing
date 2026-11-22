/**
 * @file Falas do assistente Percy no tutorial (issues #139 a #142): uma por passo de
 * `roteiroDoTutorial.js`, pelo `id`. Cada fala tem no máximo 2 frases (o balão é pequeno no
 * celular) e usa o vocabulário final do jogo: Planície, Livro de conceitos, Transfer learning e
 * Aprender mais. As regras citadas são as de `src/interface/telas/regras.js` e do professor Peng.
 *
 * Os textos podem trazer marcas que a mesa preenche na hora (ver `formatarTexto` em
 * `src/nucleo/tutorial.js`): `{soma:0}` e `{soma:1}` são a soma atual da rede de cada jogador,
 * `{antes:0}` e `{antes:1}` a soma antes da última jogada, `{rival}` o nome do adversário.
 */

/** Fala de cada passo, pelo id do passo. */
export const TEXTOS = {
  /* ---- #139 */
  'boas-vindas': 'Oi! Eu sou o Percy, o seu assistente. Em poucos minutos você aprende a jogar e disputa uma mão de verdade contra o {rival}.',
  'objetivo': 'O objetivo é montar a rede neural de maior valor, da entrada à saída. E você pode sabotar a rede do adversário pelo caminho.',
  'rede': 'Cada coluna é uma camada: a entrada tem 3 neurônios, são 5 camadas ocultas e a saída tem 4. Cada carta virada para baixo é um neurônio.',
  'rede-caminho': 'Você liga a entrada à saída com um neurônio por camada, e cada rede tem a sua cor: a sua é azul.',
  'mao': 'Estas são as suas cartas. Normalmente são 5 por baralho; no tutorial você usa 2 baralhos, com 10 cartas, para treinar todas as jogadas.',
  'limbo-e-cemiterio': 'As cartas que sobram vão para o limbo, sem ninguém ver. Carta usada ou descartada vai para o cemitério e não volta.',
  'quem-comeca': 'Quem começa? O menu oferece três formas: revelar uma carta que vai para o cemitério, revelar uma que volta para a mão, ou par ou ímpar no sorteio.',
  'revelar': 'Vamos usar a primeira forma: revele o 5♦, que não vai fazer falta. A carta mais forte começa.',
  'rival-revela': 'O {rival} revelou o 3♠. O seu 5♦ é mais forte, então você começa!',
  'pontos-valores': 'Cada carta vale o número dela: o seu 10♥ vale 10, e o Ás vale 11. Valete, dama e rei sozinhos valem 0, como a sua dama de espadas.',
  'pontos-soma': 'Figuras iguais lado a lado valem 10 cada: um par de reis soma 20. A soma da sua rede aparece aqui, no placar.',
  'primeira-jogada': 'Sua vez! O movimento normal é avançar: clique no neurônio destacado da camada de entrada. Eu espiei, e ele é um bom neurônio.',
  'primeira-jogada-depois': 'O 9♣ entrou na sua rede, e o placar já mostra {soma:0} pontos. Agora é a vez do {rival}.',
  'rival-entrada': null,
  'camada-1': 'Agora a camada 1: ative o neurônio destacado, um 10. Eu espiei, e você tem outro 10 na mão.',
  'rival-camada-1': null,

  /* ---- #140 */
  'tunagem': 'Tunagem: empilhe uma carta da mão sobre um neurônio seu de mesmo valor e some o valor dela. Selecione o 10♥ e clique em Tunagem.',
  'tunagem-depois': 'O neurônio passou a valer 20, e a sua soma foi de {antes:0} para {soma:0}. É como ajustar um neurônio que já funciona (fine-tuning).',
  'rival-camada-2': null,
  'overfit': 'Overfit: o último neurônio do rival é um 8, igual ao 8♥ da sua mão. Selecione o 8♥ e clique em Overfit para tirá-lo da rede dele.',
  'overfit-depois': 'O 8 foi para o cemitério e a rede do {rival} recuou uma camada: a soma dele caiu de {antes:1} para {soma:1}.',
  'rival-camada-2b': null,

  /* ---- #141 */
  'camada-2': 'Camada 2: ative o neurônio destacado. No jogo de verdade você escolhe às cegas e pode tirar uma figura, que sozinha vale 0.',
  'rival-camada-3': null,
  'dropout': 'Dropout: pague uma carta da mão para desfazer o último neurônio oculto da sua rede, sem gastar a vez. Selecione o J♠ e clique em Dropout.',
  'dropout-depois': 'O valete foi para o cemitério e a camada 2 ficou livre. O dropout não gasta a vez: ative agora o neurônio destacado, um 5.',
  'rival-earlystop': 'Opa! O {rival} tinha dois 5 e usou Early stop: a sua rede foi interrompida e o neurônio atingido saiu dela.',
  'passar': 'Com a rede interrompida você não avança mais, mas ainda pode atacar. Sem ataque possível agora, clique em Passar e espere o rival.',
  'rival-camada-4': null,
  'earlystop': 'Sua vez de atacar: o último neurônio do rival é um 4, e você tem dois 4. Selecione o 4♦ e o 4♣ e clique em Early stop.',

  /* ---- #142 */
  'fim-da-mao': 'Fim da mão! As duas redes foram interrompidas e vence a maior soma: a sua tem {soma:0} pontos e a do {rival}, {soma:1}.',
  'transfer': 'Duas jogadas ficaram de fora do treino. Transfer learning troca 4 cartas iguais da sua mão por cartas do limbo, uma vez por partida e sem gastar a vez.',
  'stackoverflow': 'Stack overflow: com 3 cartas iguais sobre o neurônio de um rival, ele perde a rede e toda a mão. Na sua própria rede, é um desastre.',
  'truco': 'E o TRUCO? É o botão que aumenta o valor da mão: o outro jogador aceita, corre ou aumenta. Fica desligado no tutorial.',
  'despedida': 'Pronto, você já sabe jogar! Quando quiser rever um conceito, abra o Livro de conceitos e toque em Aprender mais.',
};
