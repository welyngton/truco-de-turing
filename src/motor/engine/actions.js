// NeuroDeck - acoes do jogo, cada uma com generate / isValid / execute
//
// As tres acoes de ataque (overfit, early stop, stack overflow) sao a mesma
// mecanica com totais de pilha diferentes: 2, 3 e 4 cartas no neuronio do rival.
// Tunagem e a mesma pilha no proprio neuronio: 2 cartas somam pontos, 3 e 4
// aplicam early stop e stack overflow em si mesmo.

import { NeuroDeck } from './registry.js';
import { shuffle, rand, opponents } from './util.js';
import { lastSlot, nextLayer, isHidden, pileSize, pileRoom, handCardsByRank, hiddenInPath, cardValue, peekCards, takeCards, pileCheck, removeSlot, finishNet, discardHand, addAchievement, logEvent, attackTarget, canPass } from './core.js';

// ---------- avancar ----------

export const advance = {
  id: 'advance', name: 'Avançar', emoji: '➡️', order: 10, isCardAction: false, placesNeuron: true,
  rule: 'Escolha um neurônio virado da próxima camada. Ele é revelado e passa a fazer parte da sua rede. Ao chegar à saída, sua rede está completa.',
  ml: 'Uma rede neural é uma sequência de camadas. O sinal atravessa cada uma até a saída, que produz a resposta do modelo.',
  generate(state, p) {
    const net = state.nets[p];
    const L = nextLayer(state, p);
    if (net.finished || L >= state.layers.length) return [];
    return state.layers[L].filter(s => s.owner === null && !s.removed).map(s => ({ slotIndex: s.slotIndex }));
  },
  isValid(state, p, move) {
    const net = state.nets[p];
    if (net.finished) return 'sua rede ja esta finalizada';
    const L = nextLayer(state, p);
    const slot = state.layers[L]?.[move.slotIndex];
    if (!slot) return 'neuronio inexistente';
    if (slot.owner !== null || slot.removed) return 'neuronio indisponivel';
    return true;
  },
  execute(state, p, move) {
    const L = nextLayer(state, p);
    const slot = state.layers[L][move.slotIndex];
    slot.owner = p; slot.revealed = true;
    state.nets[p].path.push({ layer: L, slotIndex: slot.slotIndex });
    logEvent(state, { type: 'advance', p, layer: L, card: slot.card });
    if (slot.kind === 'output') finishNet(state, p, 'output');
  },
};

// ---------- tunagem (pilha no proprio neuronio) ----------

export const tune = {
  id: 'tune', name: 'Tunagem', emoji: '⚡', order: 20,
  rule: 'Empilhe 1 carta do mesmo valor sobre o seu último neurônio (camada oculta). Ela soma pontos à sua rede; sobre figura, entra na sequência de figuras (forma par com ela). Com 3 cartas no total você aplica early stop em si; com 4, stack overflow em si.',
  ml: 'Ajuste fino (fine-tuning): o neurônio continua o mesmo, só ganha parâmetros extras que reforçam sua contribuição.',
  generate(state, p) {
    const net = state.nets[p], slot = lastSlot(state, p);
    if (net.finished || !isHidden(slot)) return [];
    const same = handCardsByRank(state.hands[p], slot.card.rank);
    const n = Math.min(3, same.length, pileRoom(slot));
    const moves = [];
    for (let k = 1; k <= n; k++) moves.push({ cardIds: same.slice(0, k).map(c => c.id) });
    return moves;
  },
  isValid(state, p, move) {
    if (state.nets[p].finished) return 'sua rede ja esta finalizada';
    const cards = peekCards(state, p, move.cardIds);
    if (typeof cards === 'string') return cards;
    return pileCheck(lastSlot(state, p), cards);
  },
  execute(state, p, move) {
    const slot = lastSlot(state, p);
    const cards = takeCards(state, p, move.cardIds);
    slot.stack.push(...cards);
    const size = pileSize(slot);
    logEvent(state, { type: 'tune', p, layer: slot.layer, cards, size });
    if (size >= 3) {
      removeSlot(state, slot);
      state.nets[p].path.pop();
      if (size === 4) discardHand(state, p);
      finishNet(state, p, size === 3 ? 'auto-earlystop' : 'auto-stackoverflow');
      addAchievement(state, p, 'desk-rejection');
    }
  },
};

// ---------- ataques (pilha no neuronio do rival) ----------
// Com mais de 2 jogadores o movimento leva `target` (indice do rival); com 2,
// o alvo pode ficar implicito.

function attackAction({ id, name, emoji, size, order, rule, ml, reason, statKey }) {
  return {
    id, name, emoji, order, rule, ml,
    generate(state, p) {
      const moves = [];
      for (const o of opponents(state, p)) {
        const slot = lastSlot(state, o);
        if (state.nets[o].finished || !isHidden(slot)) continue;
        const need = size - pileSize(slot);
        if (need < 1 || need > 3) continue;
        const same = handCardsByRank(state.hands[p], slot.card.rank);
        if (same.length < need) continue;
        moves.push({ cardIds: same.slice(0, need).map(c => c.id), target: o });
      }
      return moves;
    },
    isValid(state, p, move) {
      const o = attackTarget(state, p, move);
      if (o === null) return 'escolha o adversario alvo';
      const slot = lastSlot(state, o);
      if (!slot || state.nets[o].finished) return 'a rede do adversario ja esta finalizada';
      const cards = peekCards(state, p, move.cardIds);
      if (typeof cards === 'string') return cards;
      const pc = pileCheck(slot, cards);
      if (pc !== true) return pc;
      if (pileSize(slot) + cards.length !== size) return `${name} exige que o neuronio fique com ${size} cartas`;
      return true;
    },
    execute(state, p, move) {
      const o = attackTarget(state, p, move), slot = lastSlot(state, o);
      const cards = takeCards(state, p, move.cardIds);
      slot.stack.push(...cards);
      removeSlot(state, slot);
      state.nets[o].path.pop();
      logEvent(state, { type: id, p, target: o, layer: slot.layer, cards });
      if (id === 'stackoverflow') discardHand(state, o);
      if (reason) finishNet(state, o, reason);
    },
  };
}

export const overfit = attackAction({
  id: 'overfit', name: 'Overfit', emoji: '🎯', size: 2, order: 30,
  rule: 'Jogue 1 carta do mesmo valor sobre o último neurônio do rival, deixando-o com 2 cartas. O neurônio é removido e o rival recua uma camada.',
  ml: 'Overfitting: o modelo decora os dados de treino e perde a capacidade de generalizar. A saída é podar e voltar atrás.',
});

export const earlystop = attackAction({
  id: 'earlystop', name: 'Early stop', emoji: '🛑', size: 3, order: 31, reason: 'earlystop',
  rule: 'Deixe o último neurônio do rival com 3 cartas no total. A rede dele é finalizada na hora, sem esse neurônio, e ele só pode usar a mão contra você.',
  ml: 'Early stopping: interromper o treino antes do fim, quando continuar só pioraria o resultado em dados novos.',
});

export const stackoverflow = attackAction({
  id: 'stackoverflow', name: 'Stack overflow', emoji: '💥', size: 4, order: 32, reason: 'stackoverflow',
  rule: 'Deixe o último neurônio do rival com 4 cartas no total. A rede dele é finalizada e ele perde todas as cartas da mão.',
  ml: 'Estouro de pilha: recursão ou profundidade sem controle consomem toda a memória e o programa para.',
});

// ---------- dropout (acao gratuita) ----------

export const dropout = {
  id: 'dropout', name: 'Dropout', emoji: '🐱', order: 40, consumesTurn: false, statWeight: move => move.layers,
  rule: 'Descarte k cartas da mão para reverter as k últimas camadas ocultas da sua rede. Os neurônios vão para o cemitério e você continua da camada anterior. Não gasta o turno.',
  ml: 'Dropout: desligar neurônios durante o treino para o modelo não depender demais de poucos deles. Aqui serve para escapar de um neurônio ruim.',
  generate(state, p, opts = {}) {
    const net = state.nets[p], hand = state.hands[p];
    const h = hiddenInPath(state, p);
    if (net.finished || h === 0 || hand.length === 0) return [];
    const maxK = Math.min(h, hand.length, opts.maxDropout ?? 2);
    const sorted = [...hand].sort((a, b) => cardValue(state, a) - cardValue(state, b));
    const moves = [];
    for (let k = 1; k <= maxK; k++) moves.push({ layers: k, cardIds: sorted.slice(0, k).map(c => c.id) });
    return moves;
  },
  isValid(state, p, move) {
    const net = state.nets[p];
    if (net.finished) return 'sua rede ja esta finalizada';
    const k = move.layers;
    if (!(k >= 1)) return 'informe quantas camadas reverter';
    const cards = peekCards(state, p, move.cardIds);
    if (typeof cards === 'string') return cards;
    if (cards.length !== k) return 'o dropout custa uma carta por camada';
    const tail = net.path.slice(-k);
    if (tail.length !== k || tail.some(r => !isHidden(state.layers[r.layer][r.slotIndex]))) return 'so camadas ocultas podem sofrer dropout';
    return true;
  },
  execute(state, p, move) {
    const cards = takeCards(state, p, move.cardIds);
    for (let i = 0; i < move.layers; i++) { removeSlot(state, lastSlot(state, p)); state.nets[p].path.pop(); }
    state.graveyard.push(...cards);
    state.nets[p].dropouts += move.layers;
    logEvent(state, { type: 'dropout', p, layers: move.layers, cards });
  },
};

// ---------- transfer learning ----------

export const transfer = {
  id: 'transfer', name: 'Transfer learning', emoji: '🔁', order: 50, consumesTurn: false, keepsActive: true,
  rule: 'Revele 4 cartas do mesmo valor da mão e troque-as por 4 cartas aleatórias do limbo. Uma vez por partida e não gasta o turno.',
  ml: 'Transfer learning: reaproveitar o que um modelo aprendeu em outra tarefa em vez de começar do zero.',
  generate(state, p) {
    if (state.transferUsed[p]) return [];
    const counts = {};
    for (const c of state.hands[p]) counts[c.rank] = (counts[c.rank] || 0) + 1;
    return Object.keys(counts).filter(r => counts[r] >= 4).map(r => ({ rank: Number(r) }));
  },
  isValid(state, p, move) {
    if (state.transferUsed[p]) return 'transfer learning ja usado nesta partida';
    if (handCardsByRank(state.hands[p], move.rank).length < 4) return 'precisa de 4 cartas do mesmo valor';
    return true;
  },
  execute(state, p, move) {
    const same = handCardsByRank(state.hands[p], move.rank).slice(0, 4);
    const given = takeCards(state, p, same.map(c => c.id));
    state.graveyard.push(...given);
    shuffle(state.limbo, () => rand(state));
    const got = [];
    for (let i = 0; i < 4 && state.limbo.length; i++) got.push(state.limbo.pop());
    state.hands[p].push(...got);
    state.transferUsed[p] = true;
    logEvent(state, { type: 'transfer', p, rank: move.rank, got });
  },
};

// ---------- passar ----------

// Passar: quando vale e decidido por canPass (core.js); legalMoves o acrescenta.
export const pass = {
  id: 'pass', name: 'Passar', emoji: '⏭', order: 99, isCardAction: false,
  rule: 'Encerra a sua vez sem jogar. Só existe para quem teve a rede interrompida por early stop (do rival ou aplicado em si) e ainda tem cartas na mão: atacar não é obrigatório. Também aparece quando não há nenhuma outra jogada.',
  ml: 'Época sem atualização: o modelo fica como está até a próxima rodada.',
  generate() { return []; },
  isValid(state, p) { return canPass(state, p) ? true : 'so pode passar depois de um early stop, com cartas na mao'; },
  execute(state, p) { logEvent(state, { type: 'pass', p }); },
};

export const BUILTIN_ACTIONS = [advance, tune, overfit, earlystop, stackoverflow, dropout, transfer, pass];
