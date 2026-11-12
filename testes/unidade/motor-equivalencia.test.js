/**
 * @file A cópia do motor do NeuroDeck em src/motor/ joga exatamente como o site publicado.
 *
 * Cenário: 1.000 partidas com semente, jogadas pelos bots do próprio NeuroDeck, com o conjunto
 * de regras original (`rules: 'nd-2.0.0'`).
 * Regra: fora as mudanças da fusão (B1, B2, R1 e R2, testadas em motor-regras.test.js), o motor
 * não pode se afastar do original (versão 2.0.0).
 * Esperado: o resumo das partidas é idêntico ao gravado no site (ver testes/apoio/equivalencia-motor.js).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { runGame } from '../../src/motor/sim.js';
import { resumir, RESUMO_DO_SITE } from '../apoio/equivalencia-motor.js';

describe('Motor do NeuroDeck: equivalência com o site publicado', () => {
  const obtido = resumir(runGame, { rules: 'nd-2.0.0' });

  test('as 1.000 partidas têm o mesmo total de jogadas do site', () => {
    assert.equal(obtido.total, RESUMO_DO_SITE.total);
    assert.equal(obtido.jogadas, RESUMO_DO_SITE.jogadas);
  });

  test('cada bloco de 100 partidas tem o mesmo resumo do site', () => {
    obtido.blocos.forEach((bloco, i) => assert.equal(bloco, RESUMO_DO_SITE.blocos[i], 'bloco ' + (i + 1) + ' (partidas ' + (i * 100) + ' a ' + (i * 100 + 99) + ')'));
  });

  test('o resumo geral é idêntico ao do site', () => {
    assert.equal(obtido.geral, RESUMO_DO_SITE.geral);
  });
});
