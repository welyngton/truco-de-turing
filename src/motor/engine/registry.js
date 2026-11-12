// NeuroDeck - registro de modulos (API de mods)
//
// Tudo o que varia no jogo entra por aqui: baralhos (como pontuar), terrenos
// (ganchos no ciclo do turno) e acoes (o que se pode fazer com as cartas).
// Um mod e um modulo JS que importa este arquivo e chama register*().
//
// Formatos:
//
// Deck {
//   id, name, desc, emoji?, scoreLabel?,
//   build?(rng)            -> cartas [{id, rank, suit}]  (padrao: baralho de 52)
//   cardValue?(card)       -> valor numerico da carta na mesa (padrao: 2-10, A=11, figura=0)
//   stackValue?(card)      -> valor de uma carta empilhada por tunagem (padrao: figura=10, senao cardValue)
//   score(state, p)        -> { total, items:[{layer, card, subtotal, ...}], vanishing }
//   onAfterAction?(state, p, move)
// }
//
// Terrain {
//   id, name, desc, emoji?,
//   onGameStart?(state), onTurnStart?(state, p), onTurnEnd?(state, p, move),
//   neuronBonus?(state, p, slot) -> { delta, note } | null   ajuste sobre um neuronio
//   onRoundEnd?(state), onCardPlayed?(state, p, slot),
//   modifyScore?(state, p, result) -> result                 ajuste sobre a rede inteira
//   status?(state) -> texto curto para a interface
// }
//
// Action {
//   id, name, emoji?, consumesTurn (padrao true), order?, statWeight?(move),
//   isCardAction? (padrao true: conta como acao do jogador), placesNeuron?,
//   keepsActive? (acao livre e limitada que da direito a receber a vez),
//   skipsNext? (k: os proximos k jogadores perdem a vez; ou funcao (state, p, move) -> [jogadores]),
//   rule, ml                       -> textos curtos: regra do jogo e conceito de ML
//   generate(state, p, opts)       -> lista de movimentos { type: id, ... }
//   isValid(state, p, move)        -> true, ou string com o motivo
//   execute(state, p, move)        -> aplica no estado (pode registrar em state.log)
// }
//
// Partidas com mais de 2 jogadores (apiVersion 2):
//   state.players                  numero de jogadores; vetores por jogador tem esse tamanho
//   NeuroDeck.opponents(state, p)  rivais de p na ordem da mesa
//   NeuroDeck.nextPlayer(state, p) quem joga depois de p
//   NeuroDeck.attackTarget(state, p, move)  alvo de um ataque (move.target, ou o unico rival)
//   NeuroDeck.rand(state)          numero aleatorio da partida (state.rng nao existe mais)
// Um mod pode exportar apiVersion; o carregador avisa quando difere.

function need(obj, fields, kind) {
  for (const f of fields) if (obj[f] === undefined) throw new Error(`${kind} "${obj.id || '?'}" sem campo obrigatorio: ${f}`);
}

export const NeuroDeck = {
  apiVersion: 2,
  decks: {},
  terrains: {},
  actions: {},

  registerDeck(config) {
    need(config, ['id', 'name', 'score'], 'deck');
    this.decks[config.id] = config;
    return config;
  },
  registerTerrain(config) {
    need(config, ['id', 'name'], 'terrain');
    this.terrains[config.id] = config;
    return config;
  },
  registerAction(config) {
    need(config, ['id', 'name', 'generate', 'isValid', 'execute'], 'action');
    this.actions[config.id] = { consumesTurn: true, order: 50, ...config };
    return config;
  },

  deck(id) { const d = this.decks[id]; if (!d) throw new Error('baralho desconhecido: ' + id); return d; },
  terrain(id) { const t = this.terrains[id]; if (!t) throw new Error('terreno desconhecido: ' + id); return t; },
  action(id) { const a = this.actions[id]; if (!a) throw new Error('acao desconhecida: ' + id); return a; },

  deckList() { return Object.values(this.decks); },
  terrainList() { return Object.values(this.terrains); },
  actionList() { return Object.values(this.actions).sort((a, b) => a.order - b.order); },
};

// Mods externos: window.NeuroDeck (para scripts classicos) e import() de modulos.
if (typeof globalThis !== 'undefined') globalThis.NeuroDeck = NeuroDeck;
