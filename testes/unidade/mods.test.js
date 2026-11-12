/**
 * @file O mod de exemplo da tela "Mods" funciona com o motor do NeuroDeck.
 *
 * Cenário: o código mostrado na tela é carregado como módulo, registra o terreno
 * "Regularização L1" e uma partida é jogada nele.
 * Esperado: neurônios que valem mais de 8 pontos perdem 1 ponto; a partida termina sem erro.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as ND from '../../src/motor/engine.js';
import { runGame } from '../../src/motor/sim.js';
import { CODIGO_DO_MOD_DE_EXEMPLO } from '../../src/conteudo/modExemplo.js';

describe('Mod de exemplo (terreno Regularização L1)', () => {
  it('carrega pelo mesmo caminho de um mod de verdade e registra o terreno', async () => {
    const mod = await ND.loadMod('data:text/javascript,' + encodeURIComponent(CODIGO_DO_MOD_DE_EXEMPLO));
    assert.equal(mod.apiVersion, ND.NeuroDeck.apiVersion);
    assert.equal(ND.NeuroDeck.terrain('regularizacao-l1').name, 'Regularização L1');
  });

  it('neurônios acima de 8 pontos perdem 1 ponto', () => {
    const pontuar = (terrain) => {
      const s = ND.newGame({ seed: 4, firstRule: 'random', terrain });
      s.nets[0].path = [];
      [[0, 1], [1, 9], [2, 5], [3, 13]].forEach(([camada, rank]) => {
        s.layers[camada][0].card = { id: 900 + camada, rank, suit: 'S' };
        s.nets[0].path.push({ layer: camada, slotIndex: 0 });
      });
      return ND.score(s, 0).total;
    };
    // Ás (11) e 9 perdem 1 ponto cada; 5 e K (0) não mudam: 11 + 9 + 5 + 0 = 25 → 23.
    assert.equal(pontuar('none'), 25);
    assert.equal(pontuar('regularizacao-l1'), 23);
  });

  it('partidas inteiras no terreno do mod terminam normalmente', () => {
    for (let i = 0; i < 20; i++) {
      const s = runGame({ bots: ['greedy', 'random'], deck: 'classic', terrain: 'regularizacao-l1', seed: 50 + i, firstRule: 'random' });
      assert.equal(s.over, true);
    }
  });
});
