// NeuroDeck - laboratorio: simulacao de Monte Carlo de partidas bot x bot
import { newGame, applyMove, endGame, mulberry32 } from './engine.js';
import { chooseMove } from './bot.js';

// bots: um tipo por assento; o numero de jogadores e o tamanho da lista
export function runGame({ bots, deck, terrain, mode, seed, firstRule, rollouts, copies, layers, rules }) {
  const state = newGame({ deck: deck || mode, terrain, seed, firstRule, copies, layers, rules, players: bots.length });
  const rng = mulberry32(seed ^ 0x9E3779B9);
  let guard = 0;
  while (!state.over && guard++ < 300) {
    const p = state.turn;
    applyMove(state, p, chooseMove(bots[p], state, p, rng, { rollouts }));
  }
  if (!state.over) endGame(state); // limite de jogadas: sempre ha vencedor
  return state;
}

export function emptyStats(players = 2) {
  const zeros = () => new Array(players).fill(0);
  return {
    players, games: 0, wins: zeros(), firstPlayerWins: 0, ties: 0, tiebreaks: {},
    scoreSum: zeros(), scoreSq: zeros(), vanishing: zeros(), turnsSum: 0,
    actions: {}, reasons: {}, scoreHist: {}, achievements: {},
  };
}

export function accumulate(stats, state) {
  const n = state.players || 2;
  for (const k of ['wins', 'scoreSum', 'scoreSq', 'vanishing']) while (stats[k].length < n) stats[k].push(0);
  stats.players = Math.max(stats.players || 2, n);
  stats.games++;
  stats.wins[state.winner]++;
  if (state.winner === state.firstPlayer) stats.firstPlayerWins++;
  if (state.tiebreak) { stats.ties++; stats.tiebreaks[state.tiebreak] = (stats.tiebreaks[state.tiebreak] || 0) + 1; }
  for (let p = 0; p < n; p++) {
    stats.scoreSum[p] += state.scores[p];
    stats.scoreSq[p] += state.scores[p] * state.scores[p];
    if (state.stats.vanishing[p]) stats.vanishing[p]++;
    const r = state.nets[p].reason || 'none';
    stats.reasons[r] = (stats.reasons[r] || 0) + 1;
    const bucket = Math.min(100, Math.floor(state.scores[p] / 10) * 10);
    stats.scoreHist[bucket] = (stats.scoreHist[bucket] || 0) + 1;
    for (const a of state.achievements[p]) stats.achievements[a] = (stats.achievements[a] || 0) + 1;
  }
  stats.turnsSum += state.stats.turns;
  for (const k in state.stats.actions) stats.actions[k] = (stats.actions[k] || 0) + state.stats.actions[k];
  return stats;
}

export function summarize(stats) {
  const n = stats.games || 1;
  const mean = stats.scoreSum.map(s => s / n);
  const sd = stats.scoreSum.map((s, i) => Math.sqrt(Math.max(0, stats.scoreSq[i] / n - mean[i] * mean[i])));
  // intervalo de confianca 95% para a taxa de vitoria do jogador 1 (aproximacao normal)
  const p1 = stats.wins[0] / n;
  const ci = 1.96 * Math.sqrt(p1 * (1 - p1) / n);
  return { n, winRate: stats.wins.map(w => w / n), ci, firstPlayerRate: stats.firstPlayerWins / n, tieRate: stats.ties / n, mean, sd, vanishingRate: stats.vanishing.map(v => v / n), avgTurns: stats.turnsSum / n, actionsPerGame: Object.fromEntries(Object.entries(stats.actions).map(([k, v]) => [k, v / n])), reasons: stats.reasons, scoreHist: stats.scoreHist, tiebreaks: stats.tiebreaks, achievements: stats.achievements };
}

// Analise combinatoria (slide "o poder da analise combinatoria")
export function choose(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); }
export const COMBINATORICS = (() => {
  const c525 = choose(52, 5);
  return {
    hands: c525,
    quadra: 13 * 48 / c525,                                   // 4 iguais + 1 qualquer
    trinca: 13 * choose(4, 3) * choose(12, 2) * 16 / c525,   // exatamente 3 iguais (sem par)
    par: 13 * choose(4, 2) * choose(12, 3) * 64 / c525,      // exatamente 1 par
    tableFace: 12 / 52,
  };
})();
