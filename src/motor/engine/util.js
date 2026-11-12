// NeuroDeck - constantes e utilidades puras

export const SUITS = ['S', 'H', 'C', 'D']; // espadas > copas > paus > ouros
export const SUIT_RANK = { S: 4, H: 3, C: 2, D: 1 };
export const SUIT_SYMBOL = { S: '♠', H: '♥', C: '♣', D: '♦' };
export const RANK_LABEL = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
export const LAYER_SIZES = [3, 5, 5, 5, 5, 5, 4];
export const HIDDEN_LAYERS = [1, 2, 3, 4, 5];
export const OUTPUT_LAYER = 6;
export const HAND_SIZE = 5;
export const MAX_PILE = 4;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mesmo gerador, com o estado guardado em obj.rngState (inteiro sem sinal).
// Assim o estado da partida pode ser copiado, salvo e enviado pela rede.
// obj.rng, quando existe, e um gerador externo (usado pelo bot nas simulacoes).
export function rand(obj) {
  if (typeof obj.rng === 'function') return obj.rng();
  const a = (obj.rngState + 0x6D2B79F5) | 0;
  obj.rngState = a >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function rankLabel(rank) { return RANK_LABEL[rank] || String(rank); }
export function cardLabel(card) { return rankLabel(card.rank) + SUIT_SYMBOL[card.suit]; }
export function isFace(card) { return card.rank >= 11; }

// Valor nominal do baralho classico: 2-10, As 11, figuras 0.
export function nominalValue(card) {
  if (card.rank === 1) return 11;
  if (card.rank >= 11) return 0;
  return card.rank;
}

// Ordem para desempates: As mais forte, depois K, Q, J, 10..2; naipe desempata.
export function cardStrength(card) {
  const v = card.rank === 1 ? 14 : card.rank;
  return v * 10 + SUIT_RANK[card.suit];
}

export function standardDeck(copies = 1) {
  const deck = [];
  let id = 0;
  for (let c = 0; c < copies; c++) for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ id: id++, rank, suit });
  return deck;
}

// ---------- jogadores ----------
// otherPlayer so vale para 2 jogadores (mantido por compatibilidade com mods antigos).
export function otherPlayer(p) { return 1 - p; }
export function playerCount(state) { return state.players || 2; }
export function nextPlayer(state, p) {
  const n = playerCount(state), d = state.direction || 1;
  return (p + d + n) % n;
}
// Oponentes de p na ordem em que recebem a vez depois dele.
export function opponents(state, p) {
  const n = playerCount(state), out = [];
  let q = p;
  for (let i = 1; i < n; i++) { q = nextPlayer(state, q); out.push(q); }
  return out;
}
export function round2(x) { return Math.round(x * 100) / 100; }
