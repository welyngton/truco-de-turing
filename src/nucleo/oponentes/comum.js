/**
 * @file Ferramentas compartilhadas pelos oponentes, sobre o motor do NeuroDeck: gerador
 * aleatório, determinização (sortear o que o jogador não vê) e estimativa da chance de vitória.
 */
import * as ND from '../../motor/engine.js';
import { playout } from '../../motor/bot.js';
import { copiarMao } from '../partida.js';

/** Gerador aleatório novo para uma decisão de oponente (função que devolve números em [0, 1)). */
export function novoGerador() {
  return ND.mulberry32(Math.floor(Math.random() * 2 ** 31));
}

/**
 * Determinização: copia a mão e sorteia uma distribuição plausível para tudo o que `j` não vê
 * (neurônios virados, mão do adversário e limbo). É assim que os oponentes "imaginam" as cartas
 * escondidas antes de simular.
 */
export function determinizar(mao, j) {
  return copiarMao(mao, ND.determinize(mao.nd, j, novoGerador()));
}

/**
 * Estima a chance de `j` vencer a mão: sorteia `n` vezes o que ele não vê e joga cada mão até o
 * fim com a política aleatória do motor.
 */
export function chanceDeVitoria(mao, j, n) {
  if (mao.fase === 'fim') return mao.resultado.vencedor === j ? 1 : 0;
  if (mao.fase === 'inicio') return 0.5;
  let vitorias = 0;
  for (let i = 0; i < n; i++) {
    const estado = ND.determinize(mao.nd, j, novoGerador());
    playout(estado, estado.rng);
    if (estado.winner === j) vitorias++;
  }
  return vitorias / n;
}
