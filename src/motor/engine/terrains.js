// NeuroDeck - terrenos: ganchos no ciclo do turno que mudam o jogo inteiro
//
// Slide: "terrenos com efeitos distintos". Efeitos sobre um neuronio usam
// neuronBonus: o baralho aplica o ajuste no lugar certo (na soma, no clássico;
// no viés b, antes da ativação, no Backprop). Assim o terreno nao conhece o baralho.

import { SUITS, SUIT_SYMBOL, rand } from './util.js';
import { cardValue } from './core.js';

const key = slot => `${slot.layer}-${slot.slotIndex}`;

export const none = {
  id: 'none', name: 'Planície', emoji: '🟩',
  desc: 'Sem modificadores. Regras puras do baralho escolhido.',
};

// Montanha: a trilha sobe; cada neuronio vale 1 ponto a mais por camada alcancada.
export const montanha = {
  id: 'montanha', name: 'Montanha', emoji: '⛰️',
  desc: 'A trilha sobe. Cada neurônio vale 1 ponto a mais por camada alcançada: a oculta 1 ganha 1, a oculta 2 ganha 2, e assim por diante.',
  neuronBonus(state, p, slot) {
    return slot.layer > 0 ? { delta: slot.layer, note: `+${slot.layer} altitude` } : null;
  },
};

// Pantano: neuronios sem acoes (sem cartas empilhadas) afundam 1 ponto por rodada.
export const pantano = {
  id: 'pantano', name: 'Pântano', emoji: '🌿',
  desc: 'A cada rodada, neurônios sem cartas empilhadas afundam e perdem 1 ponto. Tunagem mantém o neurônio à tona.',
  onGameStart(state) { state.terrainData.sunk = {}; },
  onRoundEnd(state) {
    const sunk = state.terrainData.sunk;
    for (const layer of state.layers) for (const s of layer) {
      if (s.owner !== null && !s.removed && s.stack.length === 0 && s.layer > 0) sunk[key(s)] = (sunk[key(s)] || 0) + 1;
    }
    state.log.push({ type: 'terrain', text: `Pântano: rodada ${state.round}, neurônios sem tunagem afundaram 1 ponto.` });
  },
  neuronBonus(state, p, slot) {
    const k = state.terrainData.sunk?.[key(slot)] || 0;
    return k && slot.stack.length === 0 ? { delta: -k, note: `−${k} afundou` } : null;
  },
  status(state) { return `rodada ${state.round}`; },
};

// Oceano: a cada rodada o vento escolhe um naipe; neuronios desse naipe revelados na rodada valem o dobro.
export const oceano = {
  id: 'oceano', name: 'Oceano', emoji: '🌊',
  desc: 'A cada rodada o vento define um naipe. Neurônios desse naipe revelados durante a rodada valem o dobro para sempre.',
  onGameStart(state) { state.terrainData.wind = SUITS[Math.floor(rand(state) * 4)]; state.terrainData.windy = {}; },
  onRoundEnd(state) {
    state.terrainData.wind = SUITS[Math.floor(rand(state) * 4)];
    state.log.push({ type: 'terrain', text: `Oceano: o vento virou para ${SUIT_SYMBOL[state.terrainData.wind]}.` });
  },
  onCardPlayed(state, p, slot) {
    if (slot.card.suit === state.terrainData.wind) {
      state.terrainData.windy[key(slot)] = true;
      state.log.push({ type: 'terrain', p, text: `Oceano: ${SUIT_SYMBOL[slot.card.suit]} a favor do vento, vale o dobro.` });
    }
  },
  neuronBonus(state, p, slot) {
    if (!state.terrainData.windy?.[key(slot)]) return null;
    const v = cardValue(state, slot.card);
    return v > 0 ? { delta: v, note: `+${v} vento` } : null;
  },
  status(state) { return `vento ${SUIT_SYMBOL[state.terrainData.wind]} · rodada ${state.round}`; },
};

export const BUILTIN_TERRAINS = [none, montanha, pantano, oceano];
