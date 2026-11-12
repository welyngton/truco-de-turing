/**
 * @file As três estratégias de jogo, uma por nível de dificuldade. São os bots do NeuroDeck
 * (`src/motor/bot.js`); aqui a jogada escolhida é só traduzida para o formato da interface.
 *
 *  - aleatória (Zé do Ruído): sorteia uma jogada válida, com leve preferência por ataques;
 *  - gulosa (Gradiente Guloso): escolhe a jogada de melhor ganho imediato, sem olhar adiante;
 *  - Monte Carlo (Mestre Monte Carlo): simula partidas inteiras para cada jogada e escolhe a que mais venceu.
 */
import * as ND from '../../motor/engine.js';
import { randomPolicy, greedyMove, monteCarloMove, monteCarloResults, defaultRollouts } from '../../motor/bot.js';
import { jogadaParaTT } from '../partida.js';
import { novoGerador } from './comum.js';

/** Estratégia aleatória. */
export function jogadaAleatoria(mao, j) {
  return jogadaParaTT(mao, j, randomPolicy(mao.nd, j, novoGerador()));
}

/** Estratégia gulosa: avalia cada jogada um passo à frente (ativações pelo valor esperado). */
export function jogadaGulosa(mao, j) {
  return jogadaParaTT(mao, j, greedyMove(mao.nd, j, novoGerador()));
}

/**
 * Estratégia de Monte Carlo: para cada jogada, sorteia o que está escondido, joga até o fim e conta
 * vitórias. A jogada escolhida leva `simulacao` com a taxa de vitória e o total de partidas
 * simuladas, que a interface mostra.
 * @param {number} [simulacoesPorJogada] Por padrão, o número do motor (40 com 2 jogadores).
 */
export function jogadaMonteCarlo(mao, j, simulacoesPorJogada) {
  const nd = mao.nd, gerador = novoGerador();
  const movimentos = ND.legalMoves(nd, j, { maxDropout: 1 });
  if (movimentos.length <= 1 || movimentos[0].type === 'reveal') return jogadaParaTT(mao, j, monteCarloMove(nd, j, gerador));
  const simulacoes = simulacoesPorJogada || defaultRollouts(nd);
  const melhor = monteCarloResults(nd, j, gerador, simulacoes, movimentos)[0];
  const jogada = jogadaParaTT(mao, j, melhor.move);
  jogada.simulacao = { taxaDeVitoria: melhor.winRate, partidas: simulacoes * movimentos.length };
  return jogada;
}
