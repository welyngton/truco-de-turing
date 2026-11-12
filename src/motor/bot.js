// NeuroDeck - oponentes artificiais
// Guloso: escolhe a jogada de melhor ganho imediato (sem olhar adiante).
// Monte Carlo: simula partidas aleatorias para cada jogada e escolhe a de maior
// taxa de vitoria. A informacao oculta e sorteada a cada simulacao (determinizacao).
// Com mais de 2 jogadores, a margem e medida contra o melhor rival.

import { NeuroDeck, legalMoves, applyMove, endGame, score, determinize, mulberry32, cardValue, strengthOf, opponents, lastSlot } from './engine.js';

export const BOTS = {
  random: { name: 'Aleatório', desc: 'Escolhe qualquer jogada legal. Linha de base.' },
  greedy: { name: 'Guloso', desc: 'Maximiza a diferença de pontos imediata, sem olhar adiante.' },
  mc: { name: 'Monte Carlo', desc: 'Simula partidas aleatórias para cada jogada e escolhe a de maior taxa de vitória.' },
};

const ATTACKS = new Set(['overfit', 'earlystop', 'stackoverflow']);

// Os bots veem o mesmo passe que o humano: depois de sofrer early stop, guardar
// as cartas pode valer mais que atacar (elas contam nos desempates pela mao).
function botMoves(state, p) { return legalMoves(state, p, { maxDropout: 1 }); }
const optionalPass = moves => moves.some(m => m.type !== 'pass' && NeuroDeck.actions[m.type]?.consumesTurn !== false);

// fase de revelacao: o bot esperto revela a carta de menor valor e guarda as boas;
// se a carta volta para a mao ('reveal-keep'), revela a mais forte, que nao custa nada
function revealPick(state, p, moves, smart, rng) {
  if (!smart) return moves[Math.floor(rng() * moves.length)];
  if (state.firstRule === 'reveal-keep') {
    const str = id => strengthOf(state, state.hands[p].find(c => c.id === id));
    return moves.reduce((b, m) => str(m.cardId) > str(b.cardId) ? m : b);
  }
  const val = id => cardValue(state, state.hands[p].find(c => c.id === id));
  return moves.reduce((b, m) => val(m.cardId) < val(b.cardId) ? m : b);
}

// politica aleatoria com vies leve: dropout raro, ataques fortes preferidos
export function randomPolicy(state, p, rng) {
  const moves = botMoves(state, p);
  if (moves[0]?.type === 'reveal') return revealPick(state, p, moves, false, rng);
  const weighted = [];
  for (const m of moves) {
    let w = 1;
    if (m.type === 'transfer') w = 2;
    else if (NeuroDeck.actions[m.type].consumesTurn === false) w = 0.05;
    else if (ATTACKS.has(m.type)) w = 1 + (m.cardIds?.length || 1);
    else if (m.type === 'tune') w = m.cardIds.length === 1 ? 1.5 : 0.1;
    else if (m.type === 'pass' && optionalPass(moves)) w = 0.3; // ataque costuma valer mais que guardar a carta
    weighted.push([m, w]);
  }
  const total = weighted.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [m, w] of weighted) { r -= w; if (r <= 0) return m; }
  return weighted[weighted.length - 1][0];
}

export function playout(state, rng, maxTurns = 200) {
  let guard = 0;
  while (!state.over && guard++ < maxTurns) {
    const p = state.turn;
    applyMove(state, p, randomPolicy(state, p, rng));
  }
  if (!state.over) endGame(state);
  return state;
}

// margem de pontos contra o melhor rival
function margin(state, p) {
  const mine = score(state, p).total;
  return mine - Math.max(...opponents(state, p).map(o => score(state, o).total));
}

// avaliacao estatica: margem de pontos + potencial de cartas na mao
function evaluate(state, p) {
  const opps = opponents(state, p);
  const mean = f => opps.reduce((a, o) => a + f(o), 0) / opps.length;
  const handPot = state.hands[p].length * 0.5 - mean(o => state.hands[o].length) * 0.5;
  const bad = q => state.nets[q].finished && state.nets[q].reason !== 'output';
  const finishedPenalty = (bad(p) ? -5 : 0) + mean(o => bad(o) ? 5 : 0);
  return margin(state, p) + handPot + finishedPenalty;
}

export function greedyMove(state, p, rng) {
  const moves = botMoves(state, p);
  if (moves[0]?.type === 'reveal') return revealPick(state, p, moves, true, rng);
  let best = null, bestV = -Infinity;
  for (const m of moves) {
    let v;
    if (m.type === 'pass') {
      v = evaluate(state, p); // nada muda; a mao cheia ja conta em evaluate
    } else if (m.type === 'advance') {
      v = evaluate(state, p) + 6.5; // valor esperado de uma carta de mesa (sem conhecer)
    } else if (m.type === 'dropout') {
      // so vale a pena se o ultimo neuronio proprio vale zero e nao foi tunado
      const s = lastSlot(state, p);
      v = s && cardValue(state, s.card) === 0 && s.stack.length === 0 ? evaluate(state, p) + 1 : -Infinity;
    } else {
      const d = determinize(state, p, rng);
      applyMove(d, p, m);
      v = evaluate(d, p);
      if (m.type === 'tune' && m.cardIds.length > 1) v -= 50; // auto early stop/stack overflow raramente bom
    }
    v += rng() * 0.01;
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}

export function monteCarloMove(state, p, rng, rollouts = 40) {
  const moves = botMoves(state, p);
  if (moves[0]?.type === 'reveal') return revealPick(state, p, moves, true, rng);
  if (moves.length === 1) return moves[0];
  return monteCarloResults(state, p, rng, rollouts, moves)[0].move;
}

// Resultado das simulacoes de cada jogada, da melhor para a pior:
// [{ move, mean (margem media de pontos), winRate }]. A interface usa para mostrar
// quantas partidas o bot simulou e a taxa de vitoria da jogada escolhida.
export function monteCarloResults(state, p, rng, rollouts = 40, moves = botMoves(state, p)) {
  const results = [];
  for (const m of moves) {
    let sum = 0, wins = 0;
    for (let i = 0; i < rollouts; i++) {
      const d = determinize(state, p, mulberry32(Math.floor(rng() * 2 ** 31)));
      applyMove(d, p, m);
      playout(d, d.rng);
      sum += margin(d, p);
      if (d.winner === p) wins++;
    }
    results.push({ move: m, mean: sum / rollouts, winRate: wins / rollouts });
  }
  results.sort((a, b) => (b.winRate - a.winRate) || (b.mean - a.mean));
  return results;
}

// Rollouts por padrao: 40 com 2 jogadores; com mais gente cada simulacao custa mais.
export function defaultRollouts(state) { return Math.max(12, Math.round(80 / (state.players || 2))); }

export function chooseMove(kind, state, p, rng, opts = {}) {
  if (kind === 'greedy') return greedyMove(state, p, rng);
  if (kind === 'mc') return monteCarloMove(state, p, rng, opts.rollouts ?? defaultRollouts(state));
  return randomPolicy(state, p, rng);
}

export function describeMove(move, names) {
  const tgt = names && move.target !== undefined ? ` de ${names[move.target]}` : '';
  switch (move.type) {
    case 'reveal': return 'revela uma carta da mão';
    case 'advance': return 'avança para a próxima camada';
    case 'tune': return move.cardIds.length === 1 ? 'faz tunagem' : `empilha ${move.cardIds.length} cartas no próprio neurônio`;
    case 'overfit': return `aplica overfit no neurônio${tgt || ' do rival'}`;
    case 'earlystop': return `aplica early stop na rede${tgt || ' do rival'}`;
    case 'stackoverflow': return `aplica stack overflow na rede${tgt || ' do rival'}`;
    case 'dropout': return `faz dropout de ${move.layers} camada(s)`;
    case 'transfer': return 'usa transfer learning';
    case 'pass': return 'passa a vez';
    default: return `usa ${move.type}`;
  }
}
