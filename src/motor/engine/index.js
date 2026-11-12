// NeuroDeck - ponto de entrada do motor
// Registra os modulos nativos e exporta a API. Mods importam './registry.js'
// (ou usam window.NeuroDeck) e registram seus proprios baralhos, terrenos e acoes.

import { NeuroDeck } from './registry.js';
import { BUILTIN_ACTIONS } from './actions.js';
import { BUILTIN_DECKS } from './decks.js';
import { BUILTIN_TERRAINS } from './terrains.js';
import { rand, opponents, nextPlayer } from './util.js';
import { attackTarget } from './core.js';

for (const a of BUILTIN_ACTIONS) if (!NeuroDeck.actions[a.id]) NeuroDeck.registerAction(a);
for (const d of BUILTIN_DECKS) if (!NeuroDeck.decks[d.id]) NeuroDeck.registerDeck(d);
for (const t of BUILTIN_TERRAINS) if (!NeuroDeck.terrains[t.id]) NeuroDeck.registerTerrain(t);
Object.assign(NeuroDeck, { rand, opponents, nextPlayer, attackTarget });

export { NeuroDeck };
export * from './util.js';
export * from './core.js';
export { sumScore, activation, activationName, BACKPROP_WEIGHT } from './decks.js';
export { ARCHITECTURES } from './core.js';

// Carrega um mod externo (modulo ES) pela URL. Usado por ?mod=<url> na pagina.
export async function loadMod(url) {
  const mod = await import(/* @vite-ignore */ url);
  if (mod.apiVersion !== undefined && mod.apiVersion !== NeuroDeck.apiVersion) console.warn(`mod ${url} usa apiVersion ${mod.apiVersion}; o jogo esta na ${NeuroDeck.apiVersion}`);
  if (typeof mod.default === 'function') await mod.default(NeuroDeck);
  return mod;
}
