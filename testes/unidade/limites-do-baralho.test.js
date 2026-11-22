/**
 * @file Testes dos limites de baralho no núcleo (issue #130): o Yin-yang só joga com 1 baralho e
 * a arquitetura curta, em qualquer caminho que cria a partida.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { novaMao, normalizarConfiguracao, LIMITES_DO_BARALHO } from '../../src/nucleo/partida.js';
import { BARALHOS } from '../../src/nucleo/baralhos.js';

const jogadores = (n) => Array.from({ length: n }, (_, i) => ({ nome: 'J' + i }));

describe('normalizarConfiguracao', () => {
  it('yinyang com 2 ou 3 baralhos e arquitetura longa vai para 1 baralho e arquitetura curta', () => {
    for (const baralhos of [2, 3, 4]) for (const arquitetura of ['padrao', 'larga', 'profunda', 'curta']) {
      const c = normalizarConfiguracao({ baralho: 'yinyang', baralhos, arquitetura, terreno: 'neutro' });
      assert.equal(c.baralhos, 1);
      assert.equal(c.arquitetura, 'curta');
      assert.equal(c.terreno, 'neutro', 'o resto da configuração passa sem mudança');
    }
  });

  it('os outros baralhos não mudam', () => {
    for (const baralho of Object.keys(BARALHOS).filter((b) => b !== 'yinyang')) {
      const entrada = { baralho, baralhos: 3, arquitetura: 'profunda' };
      assert.deepEqual(normalizarConfiguracao(entrada), entrada, baralho);
    }
  });

  it('devolve uma cópia: a entrada não é alterada', () => {
    const entrada = { baralho: 'yinyang', baralhos: 4, arquitetura: 'larga' };
    const saida = normalizarConfiguracao(entrada);
    assert.notEqual(saida, entrada);
    assert.deepEqual(entrada, { baralho: 'yinyang', baralhos: 4, arquitetura: 'larga' });
  });

  it('os limites estão numa constante documentada, só para o yinyang', () => {
    assert.deepEqual(LIMITES_DO_BARALHO, { yinyang: { baralhos: 1, arquitetura: 'curta' } });
  });
});

describe('novaMao com yinyang', () => {
  it('força 1 baralho e arquitetura curta no estado da mão e no motor, com 2 a 5 jogadores', () => {
    for (const n of [2, 3, 5]) {
      const mao = novaMao({ baralho: 'yinyang', baralhos: 3, arquitetura: 'profunda', semente: 7, jogadores: jogadores(n) });
      assert.equal(mao.config.baralhos, 1, n + ' jogadores');
      assert.equal(mao.config.arquitetura, 'curta');
      assert.equal(mao.camadas.length, 5, 'a arquitetura curta tem 5 camadas');
    }
  });

  it('os outros baralhos continuam com as escolhas do jogador', () => {
    const mao = novaMao({ baralho: 'classico', baralhos: 2, arquitetura: 'profunda', semente: 7, jogadores: jogadores(2) });
    assert.equal(mao.config.baralhos, 2);
    assert.equal(mao.config.arquitetura, 'profunda');
  });
});
