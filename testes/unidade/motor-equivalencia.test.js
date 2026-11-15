/**
 * @file A cópia do motor em src/motor/ joga exatamente como o resumo gravado do conjunto de regras original.
 *
 * Cenário: 1.000 partidas com semente, jogadas pelos bots do motor, com o conjunto
 * de regras original (`rules: 'original'`).
 * Regra: fora as decisões de regra (B1, B2, R1 e R2, testadas em motor-regras.test.js), o motor
 * não pode se afastar do original (versão 2.0.0).
 * Esperado: o resumo das partidas é idêntico ao gravado (ver testes/apoio/equivalencia-motor.js).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { runGame } from '../../src/motor/sim.js';
import { resumir, RESUMO_GRAVADO } from '../apoio/equivalencia-motor.js';

describe('Motor: equivalência com o conjunto de regras original', () => {
  const obtido = resumir(runGame, { rules: 'original' });

  test('as 1.000 partidas têm o mesmo total de jogadas do resumo gravado', () => {
    assert.equal(obtido.total, RESUMO_GRAVADO.total);
    assert.equal(obtido.jogadas, RESUMO_GRAVADO.jogadas);
  });

  test('cada bloco de 100 partidas tem o mesmo resumo gravado', () => {
    obtido.blocos.forEach((bloco, i) => assert.equal(bloco, RESUMO_GRAVADO.blocos[i], 'bloco ' + (i + 1) + ' (partidas ' + (i * 100) + ' a ' + (i * 100 + 99) + ')'));
  });

  test('o resumo geral é idêntico ao gravado', () => {
    assert.equal(obtido.geral, RESUMO_GRAVADO.geral);
  });
});
