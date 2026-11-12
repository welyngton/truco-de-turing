/**
 * @file Tradução entre o vocabulário do Truco de Turing (interface) e o do motor do NeuroDeck
 * (regras, em `src/motor/`).
 *
 * As telas continuam falando de `mao`, `jogadores`, `neuronios`, cartas `{ valor: 'K', naipe: 'E' }`
 * e jogadas `{ tipo: 'empilhar', ... }`. O motor fala de `state`, `nets`, `slots`, cartas
 * `{ rank: 13, suit: 'S' }` e movimentos `{ type: 'tune', ... }`. Este arquivo tem só as
 * conversões, sem estado: quem guarda a partida é `partida.js`.
 *
 * | Truco de Turing              | Motor do NeuroDeck                                   |
 * |------------------------------|------------------------------------------------------|
 * | `inicio` (carta)             | `reveal` (cardId)                                    |
 * | `ativar` (neuronio)          | `advance` (slotIndex na próxima camada)              |
 * | `empilhar` no próprio        | `tune` (cardIds)                                     |
 * | `empilhar` no adversário     | `overfit`, `earlystop` ou `stackoverflow`, pelo tamanho final da pilha (2, 3 ou 4) |
 * | `dropout` (n, pagamento)     | `dropout` (layers, cardIds)                          |
 * | `transfer` (cartas)          | `transfer` (rank)                                    |
 * | `passar`                     | `pass`                                               |
 */

/** Baralhos: chave do Truco de Turing → id no motor. */
export const BARALHO_ND = { classico: 'classic', truco: 'truco', nobreza: 'nobreza', backprop: 'backprop', fraternidade: 'fraternidade', yinyang: 'yinyang', powerbi: 'powerbi' };

/** Terrenos: chave do Truco de Turing → id no motor. */
export const TERRENO_ND = { neutro: 'none', montanha: 'montanha', pantano: 'pantano', oceano: 'oceano' };

/** Formas de decidir quem começa: chave do Truco de Turing → `firstRule` do motor. */
export const INICIO_ND = { 'revela-descarta': 'reveal', 'revela-volta': 'reveal-keep', sorteio: 'random' };

/** Oponentes: perfil do Truco de Turing → bot do motor. */
export const OPONENTE_ND = { aleatorio: 'random', guloso: 'greedy', montecarlo: 'mc' };

const NAIPE_TT = { S: 'E', H: 'C', C: 'P', D: 'O' };
const NAIPE_ND = { E: 'S', C: 'H', P: 'C', O: 'D' };
const VALOR_TT = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const RANK_ND = { A: 1, J: 11, Q: 12, K: 13 };

/** Naipe do motor ('S', 'H', 'C', 'D') → naipe da interface ('E', 'C', 'P', 'O'). */
export function naipeParaTT(suit) { return NAIPE_TT[suit]; }

/** Valor da interface ('A', '2'…'10', 'J', 'Q', 'K') → rank do motor (1 a 13). */
export function rankDoValor(valor) { return RANK_ND[valor] || parseInt(valor, 10); }

/** Rank do motor (1 a 13) → valor da interface. */
export function valorDoRank(rank) { return VALOR_TT[rank] || String(rank); }

/** Carta da interface → carta do motor, sem id (serve para consultar valor e força no baralho). */
export function cartaParaND(carta) {
  return { rank: rankDoValor(carta.valor), suit: NAIPE_ND[carta.naipe] };
}

/**
 * Carta do motor → carta da interface. O id é `valor + naipe` ('KC') quando a carta é única na
 * partida, e ganha o sufixo `#id` do motor quando há cartas repetidas (2 baralhos, Yin-yang).
 */
export function cartaParaTT(card, repetida) {
  const valor = valorDoRank(card.rank), naipe = NAIPE_TT[card.suit];
  return { id: valor + naipe + (repetida ? '#' + card.id : ''), valor, naipe };
}

/** Id do neurônio na interface: camada e posição ('C2N3'). */
export function idDoNeuronio(camada, posicao) { return 'C' + camada + 'N' + posicao; }

/** Camada e posição a partir do id do neurônio, ou null se o id não for válido. */
export function lugarDoNeuronio(id) {
  const m = /^C(\d+)N(\d+)$/.exec(id || '');
  return m ? { camada: Number(m[1]), posicao: Number(m[2]) } : null;
}

/** Motivo de fim de rede no motor → situação da rede na interface. */
const SITUACAO = {
  output: 'concluida', earlystop: 'earlystop', 'auto-earlystop': 'earlystop',
  stackoverflow: 'overflow', 'auto-stackoverflow': 'overflow', stuck: 'travada',
};

/** Motivos sem tradução já avisados (um aviso por motivo, para não poluir o console). */
const MOTIVOS_AVISADOS = new Set();

/**
 * Situação da rede de um jogador: 'construindo', 'concluida', 'earlystop', 'overflow' ou 'travada'.
 * Um motivo de fim que o motor não conhecia (de um mod, por exemplo) aparece como 'concluida', mas
 * avisa no console, para a falta de tradução não passar em silêncio.
 */
export function situacaoDaRede(net) {
  if (!net.finished) return 'construindo';
  const situacao = SITUACAO[net.reason];
  if (situacao) return situacao;
  if (!MOTIVOS_AVISADOS.has(net.reason)) {
    MOTIVOS_AVISADOS.add(net.reason);
    console.warn('[traducao] motivo de fim de rede sem tradução: ' + net.reason + '; mostrado como "concluida"');
  }
  return 'concluida';
}

/** Motivos de fim de rede que a interface sabe mostrar (para os testes). */
export const MOTIVOS_TRADUZIDOS = Object.freeze(Object.keys(SITUACAO));

/** Critério de desempate do motor → texto do resultado. `n` é o tamanho da menor mão. */
export function motivoDaVitoria(tiebreak, n) {
  return {
    dropouts: 'empate na soma; menos dropouts',
    'mao-vazia': 'empate; quem ficou sem cartas na mão perde',
    'soma-mao': 'empate; maior soma das ' + n + ' melhores cartas da mão',
    'carta-alta': 'empate; carta mais alta na mão',
    naipe: 'empate; mesma carta mais alta, vence o naipe mais forte',
    'primeiro-a-jogar': 'empate total; vence quem jogou primeiro',
  }[tiebreak] || 'maior soma da rede';
}

/** Efeito de uma pilha pelo tamanho final: o tipo de ataque no motor. */
export const ATAQUE_PELO_TAMANHO = { 2: 'overfit', 3: 'earlystop', 4: 'stackoverflow' };
