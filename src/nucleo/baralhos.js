/**
 * @file Baralhos do jogo e valor em pontos das cartas.
 *
 * As regras de cada baralho (cartas, valores e pontuação) são as do motor, em
 * `src/motor/engine/decks.js`. Aqui ficam o nome, o resumo do menu e o que a arte precisa.
 */
import * as motor from '../motor/engine.js';
import { NOME_VALOR, NAIPE, VALORES, ORDEM_NAIPE } from './cartas.js';
import { BARALHO_MOTOR, cartaParaMotor, cartaParaTT } from './traducao.js';

/** Cartas de um baralho do motor, no formato da interface. */
function montarBaralho(chave) {
  const baralho = motor.Motor.deck(BARALHO_MOTOR[chave]);
  const cartas = baralho.build ? baralho.build(null, baralho.minCopies || 1) : motor.standardDeck(1);
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
    nome: 'Power Bee-Ai',
    resumo: 'Depois de cada ação com cartas, a sua mão é embaralhada com o limbo: as cartas que sobraram mudam.',
  },
};
/**
 * Restrições de mesa de alguns baralhos. O Yin-yang só tem 2 e Ás, então mais de um baralho ou uma
 * rede grande deixam as mãos repetitivas e fáceis de somar: fica em 1 baralho e na arquitetura
 * curta, pelo menos até haver coringas para equilibrar (prof. Peng Yaohao, #90).
 * A regra vale em `novaMao` e em `normalizarOpcoes`, então vale também online e nas opções salvas.
 */
export const RESTRICOES_DO_BARALHO = {
  yinyang: { baralhos: 1, arquitetura: 'curta', motivo: 'O Yin-yang só tem 2 e Ás: fica em 1 baralho e na arquitetura curta, até haver coringas para equilibrar.' },
};

/**
 * Devolve uma cópia das opções com as restrições do baralho aplicadas (`baralhos` e `arquitetura`).
 * @param {{baralho?: string, baralhos?: number, arquitetura?: string}} opcoes
 */
export function aplicarRestricoesDoBaralho(opcoes) {
  const r = RESTRICOES_DO_BARALHO[opcoes && opcoes.baralho];
  return r ? { ...opcoes, baralhos: r.baralhos, arquitetura: r.arquitetura } : { ...opcoes };
}

for (const chave of Object.keys(BARALHOS)) BARALHOS[chave].montar = () => montarBaralho(chave);

/**
 * Pontos de uma carta isolada no baralho escolhido: no clássico, 2 a 10 pelo número, Ás 11 e
 * figuras 0; no truco, o valor da carta na ordem do truco.
 * @param {{valor: string, naipe: string}} carta
 * @param {string} baralho Chave de BARALHOS.
 */
export function pontosDaCarta(carta, baralho) {
  const dados = motor.Motor.decks[BARALHO_MOTOR[baralho]];
  const c = cartaParaMotor(carta);
  return dados && dados.cardValue ? dados.cardValue(c) : motor.nominalValue(c);
}

/**
 * Cópia das cartas ordenada para mostrar a mão (não mexe na mão do jogo).
 * `tamanho` segue o valor da carta no baralho escolhido (no Clássico, 2 a 10, figuras 0 e Ás 11; no
 * Truco, a ordem do truco; os empates ficam na ordem A, 2 … K e depois nos naipes). `naipe` agrupa por
 * naipe (Ouros, Paus, Copas, Espadas, a ordem de desempate do jogo), do menor ao maior dentro de cada um.
 * @param {{valor: string, naipe: string}[]} cartas
 * @param {string} baralho Chave de BARALHOS.
 * @param {'tamanho'|'naipe'|null} criterio `null` mantém a ordem recebida.
 * @param {1|-1} [sentido=1] 1 crescente, -1 decrescente.
 */
export function ordenarCartas(cartas, baralho, criterio, sentido = 1) {
  const copia = cartas.slice();
  if (criterio !== 'tamanho' && criterio !== 'naipe') return copia;
  const tamanho = (c) => [pontosDaCarta(c, baralho), VALORES.indexOf(c.valor), ORDEM_NAIPE[c.naipe]];
  const chave = (c) => (criterio === 'naipe' ? [ORDEM_NAIPE[c.naipe], ...tamanho(c)] : tamanho(c));
  const comparar = (a, b) => {
    const x = chave(a), y = chave(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return (x[i] - y[i]) * sentido;
    return 0;
  };
  return copia.sort(comparar);
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
