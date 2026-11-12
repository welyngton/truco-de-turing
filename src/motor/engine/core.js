// NeuroDeck - nucleo do motor
//
// O nucleo cuida do que nao muda: mesa em camadas, maos, limbo, caminho de
// cada jogador, turnos, fim de partida e desempates. Pontuacao vem do baralho
// escolhido, modificadores vem do terreno, e as jogadas vem das acoes
// registradas. Nada aqui acessa o DOM.
//
// Opcoes de newGame:
//   deck, terrain          ids registrados
//   players                numero de jogadores (2 a 5)
//   copies                 numero de baralhos: mao e limbo multiplicam junto
//   layers                 tamanhos das camadas, padrao [3,5,5,5,5,5,4] ampliado por jogador extra
//   firstRule              'reveal' (cada um revela uma carta da mao, que vai para o cemiterio)
//                          | 'reveal-keep' (opcao (b) do slide: a carta revelada volta para a mao)
//                          | 'random' (sorteio)
//   rules                  conjunto de regras: 'fusao' (padrao) | 'nd-2.0.0' (motor original)
//   seed
//
// O estado e um objeto simples (JSON). O gerador aleatorio fica em
// state.rngState e avanca com rand(state). Toda jogada aceita entra em
// state.moves; com as opcoes e a semente, replay() reproduz a partida.

import { NeuroDeck } from './registry.js';
import { LAYER_SIZES, HAND_SIZE, MAX_PILE, rand, shuffle, nominalValue, cardStrength, standardDeck, otherPlayer, nextPlayer, opponents, playerCount, round2, SUIT_RANK } from './util.js';

export { otherPlayer, nextPlayer, opponents, playerCount };

export const ENGINE_VERSION = '2.0.0';
// Acoes que nao gastam turno: limite por turno, para um mod nao prender a partida.
export const MAX_FREE_STREAK = 20;
export const LIMBO_SIZE = 10;
export const MAX_PLAYERS = 5;
const MAX_COPIES = 8;

// Conjuntos de regras. 'fusao' e o padrao do jogo unificado (NeuroDeck + Truco de
// Turing), com as decisoes do professor e do grupo de 10/11/2026. 'nd-2.0.0'
// reproduz o motor original publicado e serve para conferir a equivalencia.
//   trio                pontos de um trio de figuras iguais em camadas adjacentes
//   stackInRun          carta empilhada conta na sequencia de figuras (par, trio, quadra)
//   highCardByStrength  desempate "carta mais alta" compara a forca da carta (A > K > Q > J > 10...),
//                       nao os pontos (em que K e J valem 0 e caem no naipe)
//   passReasons         motivos de fim de rede que liberam o passar com cartas na mao
export const RULESETS = {
  fusao: { trio: 30, stackInRun: true, highCardByStrength: true, passReasons: ['earlystop', 'auto-earlystop'] },
  'nd-2.0.0': { trio: 20, stackInRun: false, highCardByStrength: false, passReasons: ['earlystop'] },
};
export const DEFAULT_RULES = 'fusao';
export function rulesOf(state) { return RULESETS[state.rules] || RULESETS[DEFAULT_RULES]; }

export const ARCHITECTURES = {
  padrao: { name: 'Padrão 3-5-5-5-5-5-4', layers: [3, 5, 5, 5, 5, 5, 4] },
  curta: { name: 'Curta 3-4-4-4-3', layers: [3, 4, 4, 4, 3] },
  larga: { name: 'Larga 4-6-6-6-6-6-5', layers: [4, 6, 6, 6, 6, 6, 5] },
  profunda: { name: 'Profunda 3-4-4-4-4-4-4-4-3', layers: [3, 4, 4, 4, 4, 4, 4, 4, 3] },
};

// Cada jogador ocupa um neuronio por camada. Com mais de 2 jogadores a mesa
// cresce um neuronio por camada por jogador extra, para sobrar escolha.
export function scaleLayers(layers, players) {
  const extra = Math.max(0, (players || 2) - 2);
  return layers.map(n => Number(n) + extra);
}

// ---------- estado ----------

export function newGame(opts = {}) {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const players = Math.max(2, Math.min(MAX_PLAYERS, Number(opts.players) || 2));
  const gen = { rngState: seed >>> 0 };
  const rng = () => rand(gen);
  const deckId = opts.deck || opts.mode || 'classic';
  const terrainId = opts.terrain || 'none';
  const deck = NeuroDeck.deck(deckId);
  const terrain = NeuroDeck.terrain(terrainId);
  const rules = opts.rules || DEFAULT_RULES;
  if (!RULESETS[rules]) throw new Error('conjunto de regras desconhecido: ' + rules);
  let copies = Math.max(1, Number(opts.copies) || 1, deck.minCopies || 1);
  const layerSizes = (opts.layers ? opts.layers.map(Number) : scaleLayers(LAYER_SIZES, players));
  if (layerSizes.length < 3 || layerSizes.some(n => !(n >= 1))) throw new Error('arquitetura invalida: precisa de entrada, ao menos uma camada oculta e saida');
  if (layerSizes.some(n => n < players)) throw new Error(`arquitetura invalida: cada camada precisa de ao menos ${players} neuronios para ${players} jogadores`);

  // Mao e limbo multiplicam pelos baralhos escolhidos. Baralho curto ou mesa
  // grande: acrescenta baralhos ate caber mesa e maos (o limbo fica com o que
  // sobrar); esses extras so abastecem a mesa, nao aumentam a mao.
  const handCopies = copies;
  const handSize = HAND_SIZE * handCopies, limboSize = LIMBO_SIZE * handCopies;
  const mesa = layerSizes.reduce((a, b) => a + b, 0);
  let cards = deck.build ? deck.build(rng, copies) : standardDeck(copies);
  while (cards.length < mesa + players * handSize) {
    if (++copies > MAX_COPIES) throw new Error(`baralho "${deckId}" nao tem cartas suficientes para esta mesa`);
    cards = deck.build ? deck.build(rng, copies) : standardDeck(copies);
  }
  shuffle(cards, rng);

  let idx = 0;
  const outputLayer = layerSizes.length - 1;
  const layers = layerSizes.map((size, layer) =>
    Array.from({ length: size }, (_, slotIndex) => ({
      layer, slotIndex, kind: layer === 0 ? 'input' : layer === outputLayer ? 'output' : 'hidden',
      card: cards[idx++], owner: null, stack: [], removed: false, revealed: false,
    }))
  );
  const each = f => Array.from({ length: players }, (_, p) => f(p));
  const hands = each(() => []);
  for (let p = 0; p < players; p++) for (let i = 0; i < handSize; i++) hands[p].push(cards[idx++]);
  const limbo = cards.slice(idx, idx + limboSize);
  const unused = cards.slice(idx + limboSize); // com mais de um baralho, sobra fora da partida

  const state = {
    version: ENGINE_VERSION,
    seed, deck: deckId, terrain: terrainId, players, copies, handCopies, layerSizes, firstRule: opts.firstRule || 'reveal', rules,
    rngState: gen.rngState,
    totalCards: cards.length,
    layers, hands, limbo, unused, graveyard: [], log: [], moves: [],
    nets: each(mkNet),
    transferUsed: each(() => false),
    skip: each(() => 0), direction: 1,
    phase: 'play', reveal: each(() => null),
    turn: 0, firstPlayer: 0, turnCount: 0, round: 0, freeStreak: 0,
    over: false, winner: null, ranking: null, tiebreak: null, scores: each(() => 0),
    stats: { actions: {}, playerActions: each(() => 0), vanishing: each(() => false), turns: 0 },
    achievements: each(() => []),
    terrainData: {},
  };
  for (const a of NeuroDeck.actionList()) state.stats.actions[a.id] = 0;
  terrain.onGameStart?.(state);

  if (REVEAL_RULES.includes(opts.firstRule || 'reveal')) {
    // fase de revelacao: cada jogador escolhe a carta da mao a revelar; a maior comeca
    state.phase = 'reveal';
    state.turn = 0;
  } else {
    startPlay(state, Math.floor(rand(state) * players), null);
  }
  return state;
}

// Regras de inicio que passam pela fase de revelacao.
export const REVEAL_RULES = ['reveal', 'reveal-keep'];

function mkNet() { return { path: [], finished: false, reason: null, dropouts: 0 }; }

function startPlay(state, firstPlayer, revealed, tie = false) {
  state.phase = 'play';
  state.firstPlayer = firstPlayer;
  state.turn = firstPlayer;
  state.log.push({ type: 'first', cards: revealed, first: firstPlayer, tie });
  terrainOf(state).onTurnStart?.(state, state.turn);
  checkStuck(state);
}

// Escolha da carta inicial. A escolha e simultanea: qualquer jogador que ainda
// nao escolheu pode jogar, em qualquer ordem. state.turn aponta o primeiro que
// falta, para quem conduz a partida (bots, hot-seat). Quando todos escolheram,
// a mais forte define quem comeca; as cartas vao para o cemiterio ('reveal') ou
// voltam para a mao ('reveal-keep').
export function revealMoves(state, p) {
  if (state.phase !== 'reveal' || state.reveal[p] !== null) return [];
  return state.hands[p].map(c => ({ type: 'reveal', cardId: c.id }));
}
function applyReveal(state, p, move) {
  const cards = peekCards(state, p, [move.cardId]);
  if (typeof cards === 'string') throw new Error(cards);
  state.reveal[p] = move.cardId;
  const missing = state.reveal.findIndex(r => r === null);
  if (missing >= 0) { state.turn = missing; return state; }
  const n = playerCount(state);
  const keep = state.firstRule === 'reveal-keep';
  const chosen = state.reveal.map((id, q) => keep ? state.hands[q].find(c => c.id === id) : takeCards(state, q, [id])[0]);
  if (!keep) state.graveyard.push(...chosen);
  const str = chosen.map(c => strengthOf(state, c));
  const best = Math.max(...str);
  const tied = [];
  for (let q = 0; q < n; q++) if (str[q] === best) tied.push(q);
  // cartas iguais (comum com 2 baralhos ou no Yin-yang): sorteio, para nao favorecer ninguem
  const first = tied.length === 1 ? tied[0] : tied[Math.floor(rand(state) * tied.length)];
  startPlay(state, first, chosen, tied.length > 1);
  return state;
}

// ---------- consultas ----------

export function deckOf(state) { return NeuroDeck.deck(state.deck); }
export function terrainOf(state) { return NeuroDeck.terrain(state.terrain); }
export function outputLayer(state) { return state.layers.length - 1; }
export function layerName(state, L) {
  if (L === 0) return 'Entrada';
  if (L === outputLayer(state)) return 'Saída';
  return 'Oculta ' + L;
}

export function lastSlot(state, p) {
  const net = state.nets[p];
  if (!net.path.length) return null;
  const ref = net.path[net.path.length - 1];
  return state.layers[ref.layer][ref.slotIndex];
}
export function nextLayer(state, p) { return state.nets[p].path.length; }
export function isHidden(slot) { return !!slot && slot.kind === 'hidden'; }
export function pileSize(slot) { return 1 + slot.stack.length; }
export function pileRoom(slot) { return MAX_PILE - pileSize(slot); }
export function handCardsByRank(hand, rank) { return hand.filter(c => c.rank === rank); }
export function hiddenInPath(state, p) { return state.nets[p].path.filter(r => state.layers[r.layer][r.slotIndex].kind === 'hidden').length; }

// Alvo de um ataque: move.target, ou o unico oponente numa partida de 2.
// Devolve o indice do jogador ou null quando o movimento nao diz e ha mais de um oponente.
export function attackTarget(state, p, move) {
  const t = move?.target;
  if (t === undefined || t === null) return playerCount(state) === 2 ? otherPlayer(p) : null;
  const o = Number(t);
  if (!Number.isInteger(o) || o < 0 || o >= playerCount(state) || o === p) return null;
  return o;
}

// valor de uma carta segundo o baralho da partida
export function cardValue(state, card) {
  const d = deckOf(state);
  return d.cardValue ? d.cardValue(card) : nominalValue(card);
}
// forca da carta para quem comeca e para desempates, segundo o baralho
export function strengthOf(state, card) {
  const d = deckOf(state);
  return d.strength ? d.strength(card) : cardStrength(card);
}
export function stackValue(state, card) {
  const d = deckOf(state);
  if (d.stackValue) return d.stackValue(card);
  return card.rank >= 11 ? 10 : cardValue(state, card);
}

// ---------- helpers para acoes (mutam o estado) ----------

// Confere sem retirar da mao: um movimento invalido nunca deixa o estado pela metade.
export function peekCards(state, p, ids) {
  if (!Array.isArray(ids) || !ids.length) return 'nenhuma carta informada';
  if (new Set(ids).size !== ids.length) return 'carta repetida no movimento';
  const hand = state.hands[p];
  const cards = [];
  for (const id of ids) {
    const c = hand.find(h => h && h.id === id);
    if (!c) return 'carta nao esta na mao: ' + id;
    cards.push(c);
  }
  return cards;
}
export function takeCards(state, p, ids) {
  const hand = state.hands[p];
  return ids.map(id => hand.splice(hand.findIndex(c => c.id === id), 1)[0]);
}
// pilha valida: neuronio em camada oculta, 1 a 3 cartas do mesmo rank, total ate 4
export function pileCheck(slot, cards) {
  if (!isHidden(slot)) return 'o neuronio precisa estar em camada oculta';
  if (cards.length < 1 || cards.length > 3) return 'empilhe de 1 a 3 cartas';
  if (cards.some(c => c.rank !== slot.card.rank)) return 'as cartas precisam ter o mesmo valor do neuronio';
  if (pileSize(slot) + cards.length > MAX_PILE) return 'a pilha nao pode passar de 4 cartas';
  return true;
}
export function removeSlot(state, slot) {
  state.graveyard.push(slot.card, ...slot.stack);
  slot.removed = true; slot.owner = null; slot.stack = []; slot.revealed = true;
}
export function finishNet(state, p, reason) {
  const net = state.nets[p];
  if (net.finished) return;
  net.finished = true; net.reason = reason;
  state.log.push({ type: 'finish', p, reason });
}
export function discardHand(state, p) {
  state.graveyard.push(...state.hands[p].splice(0));
}
export function addAchievement(state, p, key) {
  if (!state.achievements[p].includes(key)) state.achievements[p].push(key);
}
export function logEvent(state, entry) { state.log.push(entry); }

// ---------- movimentos ----------

export function legalMoves(state, p, opts = {}) {
  const moves = [];
  if (state.over) return moves;
  if (state.phase === 'reveal') return revealMoves(state, p);
  const noFree = opts.noFree || state.freeStreak >= MAX_FREE_STREAK;
  for (const action of NeuroDeck.actionList()) {
    if (noFree && action.consumesTurn === false) continue;
    for (const m of action.generate(state, p, opts)) moves.push({ ...m, type: action.id });
  }
  if (canPass(state, p, moves)) moves.push({ type: 'pass' });
  return moves;
}

// Passar (regra do professor): "so existe se ele sofre um early-stop e tiver
// carta na mao": atacar nao e obrigatorio para quem teve a rede interrompida.
// Na fusao vale para qualquer early stop, do rival ou aplicado na propria rede
// (o professor deixou a escolha pela regra mais intuitiva); no motor original,
// so para o early stop do rival. Fora isso, so quando nao ha nenhuma jogada que
// gaste o turno. Fonte unica: legalMoves e a acao 'pass' (validate) usam esta funcao.
export const PASS_REASONS = RULESETS[DEFAULT_RULES].passReasons;
export function canPass(state, p, moves) {
  const net = state.nets[p];
  if (net.finished && rulesOf(state).passReasons.includes(net.reason) && state.hands[p].length) return true;
  const turnMoves = moves || NeuroDeck.actionList().filter(a => a.id !== 'pass' && a.consumesTurn !== false).flatMap(a => a.generate(state, p, {}).map(m => ({ ...m, type: a.id })));
  return !turnMoves.some(m => m.type !== 'pass' && NeuroDeck.actions[m.type].consumesTurn !== false);
}

export function validate(state, p, move) {
  if (state.over) return 'jogo encerrado';
  if (!Number.isInteger(p) || p < 0 || p >= playerCount(state)) return 'jogador invalido';
  if (state.phase === 'reveal') {
    if (move?.type !== 'reveal') return 'escolha a carta a revelar';
    if (state.reveal[p] !== null) return 'o jogador ' + p + ' ja escolheu a carta';
    const c = peekCards(state, p, [move.cardId]);
    return typeof c === 'string' ? c : true;
  }
  if (p !== state.turn) return 'nao e o turno do jogador ' + p;
  const action = NeuroDeck.actions[move?.type];
  if (!action) return 'movimento desconhecido: ' + move?.type;
  if (action.consumesTurn === false && state.freeStreak >= MAX_FREE_STREAK) return 'limite de acoes livres neste turno';
  return action.isValid(state, p, move);
}

export function applyMove(state, p, move) {
  const v = validate(state, p, move);
  if (v !== true) throw new Error(v || 'movimento invalido');
  state.moves.push({ seq: state.moves.length, p, move });
  if (state.phase === 'reveal') return applyReveal(state, p, move);
  const action = NeuroDeck.action(move.type);
  const deck = deckOf(state), terrain = terrainOf(state);
  const n = playerCount(state);

  action.execute(state, p, move);

  state.stats.actions[move.type] = (state.stats.actions[move.type] || 0) + (action.statWeight ? action.statWeight(move) : 1);
  state.stats.turns++;
  state.freeStreak = action.consumesTurn === false ? state.freeStreak + 1 : 0;
  if (action.isCardAction !== false) state.stats.playerActions[p]++;
  if (action.placesNeuron) terrain.onCardPlayed?.(state, p, lastSlot(state, p));
  deck.onAfterAction?.(state, p, move);
  terrain.onAfterAction?.(state, p, move);
  // acao que pula a vez: numero k (os proximos k na ordem) ou funcao que devolve os jogadores
  if (action.skipsNext) {
    const who = typeof action.skipsNext === 'function' ? action.skipsNext(state, p, move) : nextK(state, p, action.skipsNext);
    for (const q of who) if (q !== p) { state.skip[q]++; state.log.push({ type: 'skip', p, target: q, text: `${action.name}: o jogador ${q + 1} perde a próxima vez.` }); }
  }

  checkStuck(state);
  const can = Array.from({ length: n }, (_, q) => canAct(state, q));
  if (action.consumesTurn) {
    terrain.onTurnEnd?.(state, p, move);
    state.turnCount++;
    const next = pickNext(state, p, can);
    if (roundEnded(state, p, next)) { state.round++; terrain.onRoundEnd?.(state); }
    state.turn = next;
    terrain.onTurnStart?.(state, state.turn);
  }
  checkOver(state, can);
  return state;
}

// Rodada: a vez cruzou o primeiro jogador, mesmo que alguem tenha sido pulado.
// Com 2 jogadores vale a contagem original de duas jogadas, que define os jogos de referencia.
function roundEnded(state, p, next) {
  if (playerCount(state) === 2) return state.turnCount % 2 === 0;
  let q = p;
  do {
    q = nextPlayer(state, q);
    if (q === state.firstPlayer) return true;
  } while (q !== next);
  return false;
}

function nextK(state, p, k) {
  const out = [];
  let q = p;
  for (let i = 0; i < k; i++) { q = nextPlayer(state, q); out.push(q); }
  return out;
}

// Proxima vez: o primeiro, na ordem a partir de p, que pode agir; p e o ultimo
// candidato. Quem tem a vez pulada consome o contador e e ignorado uma vez.
function pickNext(state, p, can) {
  const n = playerCount(state);
  let q = p;
  for (let i = 0; i < n; i++) {
    q = nextPlayer(state, q);
    if (q !== p && state.skip[q] > 0) { state.skip[q]--; state.log.push({ type: 'skipped', p: q, text: 'perdeu a vez.' }); continue; }
    if (can[q]) return q;
  }
  return nextPlayer(state, p);
}

// Acao livre nao segura o turno, exceto as limitadas que marcam keepsActive
// (transfer learning): quem so tem ela ainda precisa receber a vez para usa-la.
export function canAct(state, p) {
  if (legalMoves(state, p, { noFree: true }).some(m => m.type !== 'pass')) return true;
  return NeuroDeck.actionList().some(a => a.keepsActive && a.generate(state, p, {}).length > 0);
}

function checkStuck(state) {
  for (let p = 0; p < playerCount(state); p++) {
    const net = state.nets[p];
    if (net.finished) continue;
    const L = nextLayer(state, p);
    if (L >= state.layers.length) continue;
    const free = state.layers[L].some(s => s.owner === null && !s.removed);
    if (!free) finishNet(state, p, 'stuck');
  }
}

function checkOver(state, can) {
  const allDone = state.nets.every(n => n.finished);
  if (!allDone && can.some(Boolean)) return;
  endGame(state);
}

// Encerra a partida e define vencedor. Tambem usado pelo limite de jogadas das simulacoes.
export function endGame(state) {
  if (state.phase === 'reveal') startPlay(state, 0, null);
  state.over = true;
  const n = playerCount(state);
  const res = resolveWinner(state);
  state.winner = res.winner; state.tiebreak = res.tiebreak; state.scores = res.scores; state.ranking = res.ranking;
  state.stats.vanishing = Array.from({ length: n }, (_, p) => !!score(state, p).vanishing);
  for (let p = 0; p < n; p++) {
    const reason = state.nets[p].reason;
    if (reason === 'stackoverflow' && state.winner === p) addAchievement(state, p, 'contra-tudo');
    if (reason === 'output' && state.stats.playerActions[p] === 0 && state.winner === p) addAchievement(state, p, 'sem-acoes');
    // slide: "perder para um jogador que nao consegue mais escolher nenhuma carta"
    if (reason === 'stuck' && state.winner === p) for (const q of opponents(state, p)) addAchievement(state, q, 'marcha-dos-patos');
  }
}

// ---------- pontuacao ----------

// Ajuste do terreno sobre um neuronio: { delta, note } ou null.
export function neuronBonus(state, p, slot) {
  return terrainOf(state).neuronBonus?.(state, p, slot) || null;
}

export function score(state, p) {
  let r = deckOf(state).score(state, p);
  const t = terrainOf(state);
  // baralho de mod que nao aplicou o ajuste por neuronio: soma no total
  if (t.neuronBonus && r.terrainDelta === undefined) {
    r.terrainDelta = 0;
    for (const ref of state.nets[p].path) r.terrainDelta += neuronBonus(state, p, state.layers[ref.layer][ref.slotIndex])?.delta || 0;
    r.total += r.terrainDelta;
  }
  if (r.terrainDelta) r.terrainNote = `${t.name}: ${r.terrainDelta > 0 ? '+' : '−'}${Math.abs(round2(r.terrainDelta))}`;
  if (t.modifyScore) r = t.modifyScore(state, p, r) || r;
  r.total = Math.max(0, round2(r.total));
  return r;
}

// Compara dois jogadores: { winner, tiebreak }. Cadeia do slide: pontos,
// menos dropouts, N melhores cartas da mao, carta mais alta, naipe, quem jogou antes.
export function compareTwo(state, a, b, scores) {
  const sa = scores ? scores[a] : score(state, a).total, sb = scores ? scores[b] : score(state, b).total;
  if (sa !== sb) return { winner: sa > sb ? a : b, tiebreak: null };
  // 1) menos dropouts
  const da = state.nets[a].dropouts, db = state.nets[b].dropouts;
  if (da !== db) return { winner: da < db ? a : b, tiebreak: 'dropouts' };
  // 2) N melhores cartas da mao, N = menor mao; mao vazia perde se a outra tiver carta
  const val = c => cardValue(state, c);
  const ha = [...state.hands[a]].sort((x, y) => val(y) - val(x)), hb = [...state.hands[b]].sort((x, y) => val(y) - val(x));
  if (ha.length === 0 && hb.length > 0) return { winner: b, tiebreak: 'mao-vazia' };
  if (hb.length === 0 && ha.length > 0) return { winner: a, tiebreak: 'mao-vazia' };
  const N = Math.min(ha.length, hb.length);
  const sum = hd => hd.slice(0, N).reduce((acc, c) => acc + val(c), 0);
  if (sum(ha) !== sum(hb)) return { winner: sum(ha) > sum(hb) ? a : b, tiebreak: 'soma-mao' };
  // 3) carta mais alta da mao; 4) naipe
  if (N > 0) {
    const best = hd => hd.reduce((bst, c) => strengthOf(state, c) > strengthOf(state, bst) ? c : bst);
    const ba = best(ha), bb = best(hb);
    // fusao: a carta mais alta e comparada pela forca, sem o naipe (K > J, embora as duas valham 0)
    const high = rulesOf(state).highCardByStrength ? c => strengthOf(state, c) - SUIT_RANK[c.suit] : val;
    if (high(ba) !== high(bb)) return { winner: high(ba) > high(bb) ? a : b, tiebreak: 'carta-alta' };
    if (SUIT_RANK[ba.suit] !== SUIT_RANK[bb.suit]) return { winner: SUIT_RANK[ba.suit] > SUIT_RANK[bb.suit] ? a : b, tiebreak: 'naipe' };
  }
  // 5) quem jogou primeiro (mais perto do primeiro jogador na ordem da mesa)
  const n = playerCount(state), fp = state.firstPlayer;
  const pos = q => (q - fp + n) % n;
  return { winner: pos(a) <= pos(b) ? a : b, tiebreak: 'primeiro-a-jogar' };
}

export function resolveWinner(state) {
  const n = playerCount(state);
  const scores = Array.from({ length: n }, (_, p) => score(state, p).total);
  const ranking = Array.from({ length: n }, (_, p) => p);
  ranking.sort((a, b) => compareTwo(state, a, b, scores).winner === a ? -1 : 1);
  const top = compareTwo(state, ranking[0], ranking[1], scores);
  return { winner: ranking[0], tiebreak: top.tiebreak, scores, ranking };
}

// ---------- clonagem, visao por jogador, reproducao ----------

// Copia de trabalho para simular jogadas: sem registro nem lista de jogadas, que so crescem.
export function cloneState(state) {
  const { rng, log, moves, ...rest } = state;
  const copy = JSON.parse(JSON.stringify(rest));
  copy.log = [];
  copy.moves = [];
  return copy;
}

export function toPlain(state) {
  const { rng, log, ...rest } = state;
  return { ...rest, log: [] };
}

// O que o jogador p pode ver: cartas viradas, maos alheias, limbo, sobra e
// semente ficam de fora (null no lugar da carta, para as contagens valerem).
// legalMoves, validate e score funcionam sobre a visao do proprio jogador.
export function viewFor(state, p) {
  const { rng, rngState, seed, unused, moves, ...rest } = state;
  const v = JSON.parse(JSON.stringify(rest));
  v.viewer = p;
  v.unusedCount = (unused || []).length;
  for (const layer of v.layers) for (const s of layer) if (!s.revealed && !s.removed) s.card = null;
  v.hands = v.hands.map((h, q) => q === p ? h : h.map(() => null));
  v.limbo = v.limbo.map(() => null);
  if (v.phase === 'reveal') v.reveal = v.reveal.map((r, q) => q === p || r === null ? r : -1);
  v.log = v.log.map(e => e.type === 'transfer' && e.p !== p ? { ...e, got: e.got.map(() => null) } : e);
  return v;
}

// Reproduz uma partida a partir das opcoes (com semente) e da lista de jogadas.
export function replay(opts, moves) {
  const st = newGame(opts);
  for (const m of moves) applyMove(st, m.p, m.move);
  return st;
}

// Troca a informacao oculta (mesa virada, maos dos adversarios, limbo, cartas
// fora da partida) por uma amostra aleatoria coerente com o que o jogador p sabe.
export function determinize(state, p, rng) {
  const s = cloneState(state);
  s.rng = rng;
  const pool = [], targets = [];
  for (const layer of s.layers) for (const slot of layer) if (!slot.revealed && !slot.removed && slot.owner === null) { pool.push(slot.card); targets.push(slot); }
  const opps = opponents(s, p);
  for (const o of opps) pool.push(...s.hands[o]);
  pool.push(...s.limbo, ...(s.unused || []));
  shuffle(pool, rng);
  let k = 0;
  for (const t of targets) t.card = pool[k++];
  for (const o of opps) s.hands[o] = s.hands[o].map(() => pool[k++]);
  s.limbo = s.limbo.map(() => pool[k++]);
  s.unused = (s.unused || []).map(() => pool[k++]);
  return s;
}

// ---------- rotulos ----------

export const TIEBREAK_LABEL = {
  dropouts: 'menos dropouts',
  'mao-vazia': 'adversário sem cartas na mão',
  'soma-mao': 'maior soma das cartas restantes na mão',
  'carta-alta': 'carta mais alta na mão',
  naipe: 'naipe mais forte (♠ > ♥ > ♣ > ♦)',
  'primeiro-a-jogar': 'jogou primeiro',
};

export const REASON_LABEL = {
  output: 'chegou à saída',
  earlystop: 'sofreu early stop',
  stackoverflow: 'sofreu stack overflow',
  'auto-earlystop': 'aplicou early stop em si',
  'auto-stackoverflow': 'aplicou stack overflow em si',
  stuck: 'ficou sem neurônio disponível',
};

export const ACHIEVEMENTS = {
  'desk-rejection': { name: 'Desk rejection', desc: 'Aplicou early stop ou stack overflow na própria rede.' },
  'marcha-dos-patos': { name: 'Marcha dos patos', desc: 'Perdeu para um adversário que ficou sem neurônio disponível em uma camada.' },
  'contra-tudo': { name: 'Contra tudo e contra todos', desc: 'Venceu com uma rede que sofreu stack overflow.' },
  'sem-acoes': { name: 'Zen', desc: 'Venceu chegando à saída sem nenhuma ação na partida.' },
};

export { LAYER_SIZES, HAND_SIZE, MAX_PILE };
