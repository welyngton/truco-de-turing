/**
 * @file Baralhos do jogo e valor em pontos das cartas.
 *
 * As regras de cada baralho (cartas, valores e pontuação) são as do motor do NeuroDeck, em
 * `src/motor/engine/decks.js`. Aqui ficam o nome, o resumo do menu e o que a arte precisa.
 */
import * as ND from '../motor/engine.js';
import { NOME_VALOR, NAIPE } from './cartas.js';
import { BARALHO_ND, cartaParaND, cartaParaTT } from './traducao.js';

/** Cartas de um baralho do motor, no formato da interface. */
function montarBaralho(chave) {
  const baralho = ND.NeuroDeck.deck(BARALHO_ND[chave]);
  const cartas = baralho.build ? baralho.build(null, baralho.minCopies || 1) : ND.standardDeck(1);
  const vezes = {};
  for (const c of cartas) vezes[c.rank + c.suit] = (vezes[c.rank + c.suit] || 0) + 1;
  return cartas.map((c) => cartaParaTT(c, vezes[c.rank + c.suit] > 1));
}

/**
 * Cada baralho tem: `nome`, `resumo` (texto do menu) e `montar()`, que gera as cartas. Opcionais:
 *  - `manilhas`: nome especial de cartas (truco), usado na arte;
 *  - `figurasValem`: as figuras valem pontos próprios e não formam par nem trio (truco, nobreza);
 *  - `forward`: a rede vale a ativação da saída, calculada camada a camada (backprop).
 */
export const BARALHOS = {
  classico: {
    nome: 'Clássico',
    resumo: 'Baralho padrão de 52 cartas, sem coringas. Figuras iguais vizinhas valem 10 cada: par 20, trio 30; quadra zera a rede.',
  },
  truco: {
    nome: 'Truco',
    resumo: 'Só as cartas do truco, em 2 baralhos (mão de 10 cartas). Manilhas: Zap (4♣) 12, Copas (7♥) 11, Espadilha (A♠) 10 e Pica-fumo (7♦) 9. Depois 3 vale 8, 2 vale 7, Ás 6, K 5, J 4 e Q 3.',
    manilhas: { '4P': 'Zap', '7C': 'Copas', AE: 'Espadilha', '7O': 'Pica-fumo' },
    figurasValem: true,
  },
  nobreza: {
    nome: 'Nobreza',
    resumo: 'Figuras valem mais: J 11, Q 12, K 13 (Ás 11). Figuras iguais vizinhas valem o dobro; quadra ainda zera a rede.',
    figurasValem: true,
  },
  backprop: {
    nome: 'Backprop',
    resumo: 'O naipe é o peso (♠ 1,2 · ♥ 1,0 · ♣ 0,8 · ♦ 0,6), o valor é o viés e as figuras são ativações (J ReLU, Q sigmoide, K tanh). A rede vale a ativação da saída, calculada camada a camada (só o forward pass).',
    figurasValem: true,
    forward: true,
  },
  fraternidade: {
    nome: 'Fraternidade',
    resumo: 'Neurônios vizinhos do mesmo naipe valem o dobro.',
  },
  yinyang: {
    nome: 'Yin-yang',
    resumo: 'Só existem 2 e Ás. Tunagens, overfits e stack overflows a todo momento.',
  },
  powerbi: {
    nome: 'Power BI',
    resumo: 'Depois de cada ação com cartas, a sua mão é embaralhada com o limbo: as cartas que sobraram mudam.',
  },
};
for (const chave of Object.keys(BARALHOS)) BARALHOS[chave].montar = () => montarBaralho(chave);

/**
 * Pontos de uma carta isolada no baralho escolhido: no clássico, 2 a 10 pelo número, Ás 11 e
 * figuras 0; no truco, o valor da carta na ordem do truco.
 * @param {{valor: string, naipe: string}} carta
 * @param {string} baralho Chave de BARALHOS.
 */
export function pontosDaCarta(carta, baralho) {
  const dados = ND.NeuroDeck.decks[BARALHO_ND[baralho]];
  const c = cartaParaND(carta);
  return dados && dados.cardValue ? dados.cardValue(c) : ND.nominalValue(c);
}

/** Nome por extenso da carta, ou o nome da manilha ("Zap"). */
export function nomeDaCarta(carta, baralho) {
  const manilha = BARALHOS[baralho]?.manilhas?.[carta.valor + carta.naipe];
  if (manilha) return manilha;
  return NOME_VALOR[carta.valor] + ' de ' + NAIPE[carta.naipe].nome;
}

/** Nome da manilha, se a carta for uma no baralho escolhido. */
export function manilhaDaCarta(carta, baralho) {
  return BARALHOS[baralho]?.manilhas?.[carta.valor + carta.naipe] || null;
}
