/**
 * @file Roteiro do tutorial (issues #137 a #142): a partida de treino com semente, cartas e jogadas
 * fixas, e a lista de passos que o assistente Percy conduz.
 *
 * ## Partida
 * `SEMENTE_DO_TUTORIAL` e `CONFIG_DO_TUTORIAL` valem para todo mundo: a mesa, as mãos e a ordem do
 * baralho são sempre as mesmas (Planície, baralho clássico, mesa padrão). O tutorial usa **dois
 * baralhos** (10 cartas na mão) para sobrar carta para treinar todas as jogadas guiadas: tunagem,
 * overfit, dropout, early stop e passar a vez. Os 4 neurônios e as cartas citados abaixo foram
 * achados por busca de semente e conferidos pelo teste `testes/unidade/tutorial.test.js`, que
 * roda o roteiro inteiro por código: se o motor mudar e uma jogada deixar de valer, o teste acusa.
 *
 * ## Passos
 * Cada passo é `{ id, jogador?, jogadaEsperada?, destaque?, bloqueios?, verbete?, botao? }`:
 *  - sem `jogadaEsperada`, é um **diálogo**: o assistente fala (texto em `textosDoTutorial.js`, pelo
 *    `id`) e o jogador toca em Próximo. `destaque` diz o que o balão aponta;
 *  - com `jogador: 0`, é uma **jogada guiada**: a mesa só aceita essa jogada (e as cartas e botões
 *    que levam a ela); o balão destaca o que clicar;
 *  - com `jogador: 1`, é a **jogada do rival**, executada pelo roteiro (sem passar pelo bot). Se o
 *    texto do passo existir, o assistente comenta depois da jogada.
 *
 * `jogadaEsperada` usa o mesmo formato das jogadas da partida (ver `src/nucleo/partida.js`), com
 * as cartas pelo rótulo `valor + naipe` ('10C' é o dez de copas; o naipe vale na tela, o id interno
 * da carta não importa) e os neurônios pelo id 'C<camada>N<posição>':
 * `{ tipo: 'inicio', carta }`, `{ tipo: 'ativar', neuronio }`, `{ tipo: 'empilhar', neuronio, cartas }`,
 * `{ tipo: 'dropout', n, pagamento }` e `{ tipo: 'passar' }`.
 *
 * `destaque` (só nos diálogos) lista o que o balão aponta e deixa claro: 'tabuleiro', 'mao', 'limbo',
 * 'cemiterio', 'placar', 'placar-voce', 'placar-rival', 'truco', 'acoes', ou um objeto
 * `{ neuronio }`, `{ carta }`, `{ acao }`. Nas jogadas guiadas o destaque sai da própria jogada.
 *
 * `bloqueios` lista o que fica desabilitado no passo, entre 'cartas', 'neuronios', 'acoes',
 * 'truco' e 'regras'. Sem o campo, tudo fica bloqueado, menos o que a jogada esperada pede.
 *
 * `verbete` liga o passo a um verbete do Livro de conceitos (botão "Aprender mais" do balão); `livro: true`
 * liga ao Livro inteiro.
 */

/** Semente fixa da partida do tutorial: define a mesa, as mãos e o baralho. */
export const SEMENTE_DO_TUTORIAL = 4703;

/** Configuração da mão do tutorial (2 baralhos, para as mãos terem 10 cartas). */
export const CONFIG_DO_TUTORIAL = {
  baralho: 'classico', terreno: 'neutro', inicio: 'revela-descarta', arquitetura: 'padrao', baralhos: 2,
};

/** Nome do assistente (decisão do grupo, proposta da issue #138). */
export const NOME_DO_ASSISTENTE = 'Percy';

/** Perfil do computador que joga contra o jogador no tutorial: o mais simples. */
export const OPONENTE_DO_TUTORIAL = 'aleatorio';

/** O que todo passo bloqueia quando o campo `bloqueios` não existe. */
export const TODOS_OS_BLOQUEIOS = ['cartas', 'neuronios', 'acoes', 'truco', 'regras'];

/** Passos do tutorial, na ordem. */
export const PASSOS = [
  /* ---- #139: objetivo, a rede, quem começa, pontuação e a primeira jogada */
  { id: 'boas-vindas' },
  { id: 'objetivo', destaque: ['tabuleiro'] },
  { id: 'rede', destaque: ['tabuleiro'] },
  { id: 'rede-caminho', destaque: ['tabuleiro'] },
  { id: 'mao', destaque: ['mao'] },
  { id: 'limbo-e-cemiterio', destaque: ['limbo', 'cemiterio'] },
  { id: 'quem-comeca', destaque: ['mao'] },
  { id: 'revelar', jogador: 0, jogadaEsperada: { tipo: 'inicio', carta: '5O' } },
  { id: 'rival-revela', jogador: 1, jogadaEsperada: { tipo: 'inicio', carta: '3E' } },
  { id: 'pontos-valores', destaque: [{ carta: '10C' }, { carta: 'QE' }] },
  { id: 'pontos-soma', destaque: ['placar-voce'] },
  { id: 'primeira-jogada', jogador: 0, jogadaEsperada: { tipo: 'ativar', neuronio: 'C0N1' } },
  { id: 'primeira-jogada-depois', destaque: ['placar-voce'] },
  { id: 'rival-entrada', jogador: 1, jogadaEsperada: { tipo: 'ativar', neuronio: 'C0N0' } },
  { id: 'camada-1', jogador: 0, jogadaEsperada: { tipo: 'ativar', neuronio: 'C1N0' } },
  { id: 'rival-camada-1', jogador: 1, jogadaEsperada: { tipo: 'ativar', neuronio: 'C1N2' } },

  /* ---- #140: tunagem e overfit */
  { id: 'tunagem', jogador: 0, jogadaEsperada: { tipo: 'empilhar', neuronio: 'C1N0', cartas: ['10C'] }, verbete: 'tunagem' },
  { id: 'tunagem-depois', destaque: ['placar-voce'] },
  { id: 'rival-camada-2', jogador: 1, jogadaEsperada: { tipo: 'ativar', neuronio: 'C2N1' } },
  { id: 'overfit', jogador: 0, jogadaEsperada: { tipo: 'empilhar', neuronio: 'C2N1', cartas: ['8C'] }, verbete: 'overfit' },
  { id: 'overfit-depois', destaque: ['placar-rival'] },
  { id: 'rival-camada-2b', jogador: 1, jogadaEsperada: { tipo: 'ativar', neuronio: 'C2N3' } },

  /* ---- #141: dropout, early stop (sofrido e aplicado) e passar a vez */
  { id: 'camada-2', jogador: 0, jogadaEsperada: { tipo: 'ativar', neuronio: 'C2N0' } },
  { id: 'rival-camada-3', jogador: 1, jogadaEsperada: { tipo: 'ativar', neuronio: 'C3N0' } },
  { id: 'dropout', jogador: 0, jogadaEsperada: { tipo: 'dropout', n: 1, pagamento: ['JE'] }, verbete: 'dropout' },
  { id: 'dropout-depois', jogador: 0, jogadaEsperada: { tipo: 'ativar', neuronio: 'C2N2' } },
  { id: 'rival-earlystop', jogador: 1, jogadaEsperada: { tipo: 'empilhar', neuronio: 'C2N2', cartas: ['5C', '5E'] }, verbete: 'earlystop' },
  { id: 'passar', jogador: 0, jogadaEsperada: { tipo: 'passar' } },
  { id: 'rival-camada-4', jogador: 1, jogadaEsperada: { tipo: 'ativar', neuronio: 'C4N2' } },
  { id: 'earlystop', jogador: 0, jogadaEsperada: { tipo: 'empilhar', neuronio: 'C4N2', cartas: ['4O', '4P'] }, verbete: 'earlystop' },

  /* ---- #142: fim da mão, transfer learning e stack overflow (só diálogo) e despedida */
  { id: 'fim-da-mao', destaque: ['placar'] },
  { id: 'transfer', destaque: ['limbo'], verbete: 'transfer' },
  { id: 'stackoverflow', destaque: ['acoes'], verbete: 'stackoverflow' },
  { id: 'truco', destaque: ['truco'], verbete: 'truco' },
  { id: 'despedida', livro: true },
];

/** O roteiro completo, no formato que `criarTutorial` (src/nucleo/tutorial.js) recebe. */
export const ROTEIRO = { semente: SEMENTE_DO_TUTORIAL, config: CONFIG_DO_TUTORIAL, passos: PASSOS };
