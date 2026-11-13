// NeuroDeck - baralhos: cada um define como a rede e pontuada
//
// O baralho classico soma os valores do caminho. Os demais baralhos do slide
// ("decks com efeitos distintos") reutilizam a soma com um valor de carta ou
// um ajuste proprio. O Baralho Backprop troca a soma por um forward pass.
// Um baralho pode definir build(rng, copies) com qualquer numero de cartas
// (o nucleo usa o que sobrar como "fora da partida") e minCopies.

import { isFace, nominalValue, SUITS, SUIT_RANK, round2, rand } from './util.js';
import { cardValue, stackValue, neuronBonus, rulesOf } from './core.js';

// ---------- soma classica, reutilizavel ----------
// Regras da fusao (rules 'fusao'), confirmadas pelo professor em 10/11/2026:
// figuras iguais em camadas adjacentes formam uma sequencia, e a carta empilhada
// por tunagem conta nela. Cada figura da sequencia vale 10: par 20, trio 30;
// quadra zera a rede inteira (vanishing gradient). Exemplo do slide: 8-K-K-3 com
// um K tunado tem tres Ks (trio) e vale 8 + 30 + 3 = 41. Tunar os dois Ks de um
// par forma quadra. A figura empilhada conta so na sequencia (sem stackValue).
// Regras originais (rules 'nd-2.0.0'): so as cartas do caminho formam a sequencia,
// par vale 10 por figura, trio 20 no total, e a figura empilhada soma stackValue.
// Tunagem de carta numerica soma stackValue nos dois conjuntos.
// opts.faceAsValue: figuras usam cardValue em vez da regra de par/trio (Truco, Nobreza).
export function sumScore(state, p, adjust, opts = {}) {
  const slots = state.nets[p].path.map(r => state.layers[r.layer][r.slotIndex]);
  const runBonus = new Array(slots.length).fill(null);
  const rules = rulesOf(state);
  let vanishing = false;
  let i = 0;
  while (i < slots.length) {
    const c = slots[i].card;
    if (isFace(c)) {
      let j = i;
      while (j + 1 < slots.length && slots[j + 1].card.rank === c.rank) j++;
      let len = j - i + 1;
      if (rules.stackInRun) for (let k = i; k <= j; k++) len += slots[k].stack.length;
      if (len >= 4) vanishing = true;
      else if (rules.stackInRun) {
        // cada figura da sequencia vale o mesmo, no caminho ou empilhada: 10 no par, trio / 3 no trio
        const each = len === 3 ? rules.trio / 3 : 10;
        const note = len === 3 ? `trio +${rules.trio}` : 'par +20';
        if (len >= 2) for (let k = i; k <= j; k++) runBonus[k] = { v: each, tune: each * slots[k].stack.length, note };
      }
      else if (len === 3) { runBonus[i] = { v: 20, note: 'trio +20' }; runBonus[i + 1] = { v: 0, note: 'trio' }; runBonus[i + 2] = { v: 0, note: 'trio' }; }
      else if (len === 2) { runBonus[i] = { v: 10, note: 'par +10' }; runBonus[i + 1] = { v: 10, note: 'par +10' }; }
      i = j + 1;
    } else i++;
  }
  const items = slots.map((s, idx) => {
    const notes = [];
    let base;
    if (isFace(s.card) && !opts.faceAsValue) { base = runBonus[idx]?.v || 0; if (runBonus[idx]) notes.push(runBonus[idx].note); }
    else base = cardValue(state, s.card);
    const faceRun = rules.stackInRun && isFace(s.card) && !opts.faceAsValue;
    const tune = faceRun ? (runBonus[idx]?.tune || 0) : s.stack.reduce((acc, c) => acc + stackValue(state, c), 0);
    return { layer: s.layer, card: s.card, slot: s, base, tune, stack: s.stack.length, subtotal: base + tune, notes };
  });
  if (adjust) adjust(items, slots, state);
  // ajuste do terreno entra depois dos multiplicadores do baralho
  let terrainDelta = 0;
  items.forEach((it, idx) => {
    const b = neuronBonus(state, p, slots[idx]);
    if (b) { it.subtotal += b.delta; terrainDelta += b.delta; it.notes.push(b.note); }
  });
  let total = items.reduce((acc, it) => acc + it.subtotal, 0);
  if (vanishing) total = 0;
  return { total, items, vanishing, kind: 'sum', terrainDelta };
}

export const classic = {
  id: 'classic', name: 'Clássico', emoji: '🃏', scoreLabel: 'soma',
  desc: 'Regras do slide: 2 a 10 valem o número, Ás 11, figuras 0. Figuras iguais em camadas adjacentes valem 10 cada: par 20, trio 30. Quadra zera a rede. Figura empilhada por tunagem conta na sequência.',
  score: (state, p) => sumScore(state, p),
};

// ---------- Baralho Backprop: forward pass ----------
//  a0 = valor da carta de entrada
//  a_l = f( w * a_{l-1} + b ),  w pelo naipe, b = valor da carta + tunagens
//  f: numero/As = linear; J = ReLU; Q = sigmoide escalada; K = tanh escalada
//  So forward pass: nao ha gradiente, retropropagacao nem atualizacao de pesos.
export const BACKPROP_WEIGHT = { S: 1.2, H: 1.0, C: 0.8, D: 0.6 };
export function activation(card, z) {
  if (card.rank === 11) return Math.max(0, z);
  if (card.rank === 12) return 20 / (1 + Math.exp(-z / 10));
  if (card.rank === 13) return 20 * Math.tanh(z / 20);
  return z;
}
export function activationName(card) { return { 11: 'ReLU', 12: 'Sigmoid', 13: 'Tanh' }[card.rank] || 'Linear'; }

export const backprop = {
  id: 'backprop', name: 'Backprop', emoji: '🧮', scoreLabel: 'forward pass',
  desc: 'Naipe é o peso w (♠1,2 ♥1,0 ♣0,8 ♦0,6), valor é o viés b, figuras são funções de ativação (J ReLU, Q Sigmoid, K Tanh). A pontuação é a ativação da saída. Só forward pass.',
  score(state, p) {
    const slots = state.nets[p].path.map(r => state.layers[r.layer][r.slotIndex]);
    const items = [];
    let a = 0, terrainDelta = 0;
    slots.forEach((s, idx) => {
      const w = idx === 0 ? 1 : BACKPROP_WEIGHT[s.card.suit];
      // o terreno age no vies b do neuronio, antes da ativacao
      const b = neuronBonus(state, p, s);
      const bias = nominalValue(s.card) + s.stack.reduce((acc, c) => acc + (isFace(c) ? 10 : nominalValue(c)), 0) + (b?.delta || 0);
      if (b) terrainDelta += b.delta;
      const z = idx === 0 ? bias : w * a + bias;
      const out = activation(s.card, z);
      items.push({ layer: s.layer, card: s.card, slot: s, w, bias, z, a: out, fn: activationName(s.card), stack: s.stack.length, subtotal: out, notes: b ? [b.note] : [] });
      a = out;
    });
    const total = round2(a);
    // convencao do jogo: saida baixa depois de passar por funcao nao linear.
    // O campo se chama `vanishing` desde o NeuroDeck, mas o que ele marca e saturacao da ativacao
    // no forward pass (sigmoide e tanh vao no maximo ate 20); a interface mostra "saida saturada".
    const vanishing = items.length >= 3 && items.some(it => it.fn !== 'Linear') && total < 20;
    return { total, items, vanishing, kind: 'forward', terrainDelta };
  },
};

// ---------- baralhos do slide ----------

// Truco com manilhas fixas: Q J K A 2 3 mais as manilhas 4♣ 7♥ A♠ 7♦.
// Sao 27 cartas por baralho, por isso a partida usa ao menos 2 baralhos.
// Valor segue a forca no truco. O slide cita 4♣ = 12 e 7♥ = 9; aqui 7♥ vale 11
// para a espadilha (A♠, 10) ficar abaixo dela, como no jogo.
const TRUCO_RANKS = [12, 11, 13, 1, 2, 3];
const TRUCO_EXTRAS = [[4, 'C'], [7, 'H'], [7, 'D']];
const TRUCO_MANILHA = { '4C': 12, '7H': 11, '1S': 10, '7D': 9 };
const TRUCO_VALUE = { 3: 8, 2: 7, 1: 6, 13: 5, 11: 4, 12: 3 };
const trucoValue = card => TRUCO_MANILHA[card.rank + card.suit] ?? TRUCO_VALUE[card.rank];
export const truco = {
  id: 'truco', name: 'Truco', emoji: '🂤', scoreLabel: 'soma', minCopies: 2,
  desc: 'Só as cartas do truco: Q J K A 2 3 e as manilhas fixas. Manilhas: 4♣ 12, 7♥ 11, A♠ 10, 7♦ 9. Depois 3 vale 8, 2 vale 7, A 6, K 5, J 4, Q 3. Usa ao menos 2 baralhos.',
  orderHint: '4♣ > 7♥ > A♠ > 7♦ > 3 > 2 > A > K > J > Q',
  build(rng, copies = 2) {
    const cards = [];
    let id = 0;
    for (let c = 0; c < copies; c++) {
      for (const suit of SUITS) for (const rank of TRUCO_RANKS) cards.push({ id: id++, rank, suit });
      for (const [rank, suit] of TRUCO_EXTRAS) cards.push({ id: id++, rank, suit });
    }
    return cards;
  },
  cardValue: trucoValue,
  stackValue: trucoValue,
  strength: card => trucoValue(card) * 10 + SUIT_RANK[card.suit],
  score: (state, p) => sumScore(state, p, null, { faceAsValue: true }),
};

// Nobreza: sugestao do professor, figuras valem mais. J 11, Q 12, K 13; par de figuras iguais dobra.
export const nobreza = {
  id: 'nobreza', name: 'Nobreza', emoji: '👑', scoreLabel: 'soma',
  desc: 'Figuras valem mais: J 11, Q 12, K 13, Ás 11. Figuras iguais em camadas adjacentes valem o dobro. Quadra ainda zera a rede.',
  cardValue: card => ({ 11: 11, 12: 12, 13: 13 }[card.rank] ?? nominalValue(card)),
  stackValue: card => ({ 11: 11, 12: 12, 13: 13 }[card.rank] ?? nominalValue(card)),
  orderHint: 'K > Q > J e Ás > 10 > 9…',
  strength: card => ({ 11: 11, 12: 12, 13: 13 }[card.rank] ?? nominalValue(card)) * 10 + SUIT_RANK[card.suit],
  score: (state, p) => sumScore(state, p, (items, slots) => {
    let i = 0;
    while (i < slots.length) {
      let j = i;
      while (j + 1 < slots.length && isFace(slots[i].card) && slots[j + 1].card.rank === slots[i].card.rank) j++;
      if (j > i) for (let k = i; k <= j; k++) { items[k].subtotal *= 2; items[k].notes.push('×2 figura'); }
      i = j + 1;
    }
  }, { faceAsValue: true }),
};

// Fraternidade: sequencias do mesmo naipe em camadas adjacentes dobram os valores.
export const fraternidade = {
  id: 'fraternidade', name: 'Fraternidade', emoji: '🤝', scoreLabel: 'soma',
  desc: 'Neurônios do mesmo naipe em camadas adjacentes formam uma sequência e valem o dobro.',
  score: (state, p) => sumScore(state, p, (items, slots) => {
    let i = 0;
    while (i < slots.length) {
      let j = i;
      while (j + 1 < slots.length && slots[j + 1].card.suit === slots[i].card.suit) j++;
      if (j > i) for (let k = i; k <= j; k++) { items[k].subtotal *= 2; items[k].notes.push('×2 naipe'); }
      i = j + 1;
    }
  }),
};

// Yin-yang: todas as cartas sao 2 ou As. Tudo combina com tudo: ataques e tunagens a cada turno.
export const yinyang = {
  id: 'yinyang', name: 'Yin-yang', emoji: '☯️', scoreLabel: 'soma',
  desc: 'Só Ases (11) e Dois (2). Como quase tudo tem o mesmo valor, overfit, early stop e stack overflow acontecem o tempo todo.',
  build(rng, copies = 1) {
    const cards = [];
    let id = 0;
    for (let c = 0; c < copies; c++) for (const suit of SUITS) for (let i = 0; i < 13; i++) cards.push({ id: id++, rank: i % 2 === 0 ? 1 : 2, suit });
    return cards;
  },
  score: (state, p) => sumScore(state, p),
};

// Power BI: apos executar uma acao, as cartas restantes na mao mudam aleatoriamente (troca com o limbo).
export const powerbi = {
  id: 'powerbi', name: 'Power BI', emoji: '📊', scoreLabel: 'soma',
  desc: 'Depois de cada ação com cartas, sua mão é embaralhada com o limbo: as cartas que restam mudam aleatoriamente.',
  score: (state, p) => sumScore(state, p),
  onAfterAction(state, p, move) {
    if (move.type === 'advance' || move.type === 'pass') return;
    const hand = state.hands[p];
    if (!hand.length || !state.limbo.length) return;
    const pool = [...hand, ...state.limbo];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand(state) * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const n = hand.length;
    state.hands[p] = pool.slice(0, n);
    state.limbo = pool.slice(n);
    state.log.push({ type: 'deck', p, text: 'Power BI: as cartas da mão mudaram.' });
  },
};

export const BUILTIN_DECKS = [classic, backprop, nobreza, truco, fraternidade, yinyang, powerbi];
