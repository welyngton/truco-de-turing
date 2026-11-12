/**
 * @file Conferência de equivalência entre o motor publicado do NeuroDeck e a cópia em src/motor/.
 *
 * O mesmo roteiro foi executado no site (https://neurodeck-fpo.web.app, em 10/11/2026) e é
 * repetido aqui: 1.000 partidas com semente, cobrindo os 7 baralhos, os 4 terrenos, 2 a 4
 * jogadores, 1 e 2 baralhos, as duas regras de início e os bots aleatório, guloso e Monte Carlo.
 * De cada partida entram no resumo: vencedor, placar, desempate, ranking, todas as jogadas,
 * o motivo de fim de cada rede e o tamanho do cemitério. O resumo é um SHA-256 por bloco de 100
 * partidas e um SHA-256 geral.
 */
import { createHash } from 'node:crypto';

export const BARALHOS_ND = ['classic', 'backprop', 'nobreza', 'truco', 'fraternidade', 'yinyang', 'powerbi'];
export const TERRENOS_ND = ['none', 'montanha', 'pantano', 'oceano'];
export const MESAS = [
  ['random', 'random'], ['greedy', 'random'], ['random', 'greedy'], ['greedy', 'greedy'],
  ['random', 'random', 'random'], ['greedy', 'random', 'greedy', 'random'], ['mc', 'random'],
];

/** Resumo gravado no site do NeuroDeck (motor 2.0.0) em 10/11/2026. */
export const RESUMO_DO_SITE = {
  total: 1000,
  jogadas: 19862,
  blocos: [
    '6e6602059582501f2fce9a15fe97f3ffd95b817b348de86cb5aec42dcceff194',
    'c70758d37e34ac1cd22272d7752dfacc9115c2b80588abc2f06c5a3909cb1f19',
    'a61301785defa68be4cedece4350b9c6774a69a7c9897a66d33eb8f881e124a9',
    '456d8444e906c4670c422ef9167a4aaf067c061513d75e9e7640d4a28ef0b0cb',
    '07075075733030512c4ba73597cf93d3da412d5b3e45577a1a1bbc69a56b9ae1',
    '87e6f50b2082dc95dd7697d18d83cb4634f8445cd8ed3a6c04f2dd3c1877bc41',
    'fee5a7ff904f62f534071c940e8595266841d741deff627eb3b23cb17d4f0276',
    '5dadd09f56de8775e365d7de88b20854d25179ad8274757e6574d9d95512532d',
    '24c30317fc18f13eeaacc7dbcf4406871fe2ee633f69d20cccaa22eb66c8cdff',
    '338510cf9db85ae12fe1188219aa45e477986ea5fb21790572b1e5568c0beb05',
  ],
  geral: '6c1457286eac8ffa2c86eddbc8ca1a72bb42e7ec123c4c5374920d5aa8000c79',
};

/** Opções da partida de número `i` (as mesmas usadas no site). */
export function configuracao(i) {
  return {
    bots: MESAS[i % MESAS.length], deck: BARALHOS_ND[i % BARALHOS_ND.length], terrain: TERRENOS_ND[i % TERRENOS_ND.length],
    seed: 1000 + i * 7919, firstRule: i % 2 ? 'reveal' : 'random', copies: i % 5 === 0 ? 2 : 1, rollouts: 4,
  };
}

/** O que entra no resumo de uma partida terminada. */
export function resumoDaPartida(estado) {
  return JSON.stringify([estado.winner, estado.scores, estado.tiebreak, estado.ranking, estado.moves, estado.nets.map((n) => n.reason), estado.graveyard.length]);
}

const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');

/**
 * Joga as partidas e devolve o resumo no mesmo formato de RESUMO_DO_SITE.
 * @param {(opcoes: object) => object} jogar Função que joga uma partida até o fim (sim.js: runGame).
 * @param {object} [extras] Opções acrescentadas a todas as partidas (ex.: `{ rules: 'nd-2.0.0' }`).
 */
export function resumir(jogar, extras = {}, total = 1000) {
  const blocos = [];
  const partidas = [];
  let bloco = '', jogadas = 0;
  for (let i = 0; i < total; i++) {
    const estado = jogar({ ...configuracao(i), ...extras });
    jogadas += estado.moves.length;
    const resumo = resumoDaPartida(estado);
    partidas.push(resumo);
    bloco += resumo + '\n';
    if ((i + 1) % 100 === 0) { blocos.push(sha256(bloco)); bloco = ''; }
  }
  return { total, jogadas, blocos, geral: sha256(blocos.join('')), partidas };
}
