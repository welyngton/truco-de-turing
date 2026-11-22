/**
 * @file Testes de `ordenarMao` (issue #126): ordenação da mão só para exibição, por tamanho ou por
 * naipe, crescente ou decrescente, estável e sem alterar a mão original.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ordenarMao } from '../../src/nucleo/cartas.js';

const c = (valor, naipe, id) => ({ id: id || valor + naipe, valor, naipe });
const ids = (cartas) => cartas.map((x) => x.id);
const MAO = [c('K', 'O'), c('A', 'E'), c('7', 'C'), c('10', 'P'), c('J', 'E'), c('7', 'E'), c('2', 'O')];

describe('ordenarMao', () => {
  it('tamanho crescente: Ás, 2 a 10, Valete, Dama, Rei, com desempate por naipe (espadas, copas, paus, ouros)', () => {
    assert.deepEqual(ids(ordenarMao(MAO, 'tamanho', 'asc')), ['AE', '2O', '7E', '7C', '10P', 'JE', 'KO']);
  });

  it('tamanho decrescente inverte a ordem inteira', () => {
    assert.deepEqual(ids(ordenarMao(MAO, 'tamanho', 'desc')), ['KO', 'JE', '10P', '7C', '7E', '2O', 'AE']);
  });

  it('naipe crescente: espadas, copas, paus, ouros, com desempate pelo tamanho', () => {
    assert.deepEqual(ids(ordenarMao(MAO, 'naipe', 'asc')), ['AE', '7E', 'JE', '7C', '10P', '2O', 'KO']);
  });

  it('naipe decrescente inverte a ordem inteira', () => {
    assert.deepEqual(ids(ordenarMao(MAO, 'naipe', 'desc')), ['KO', '2O', '10P', '7C', 'JE', '7E', 'AE']);
  });

  it('a direção padrão é crescente', () => {
    assert.deepEqual(ids(ordenarMao(MAO, 'tamanho')), ids(ordenarMao(MAO, 'tamanho', 'asc')));
  });

  it('não altera a mão original nem devolve o mesmo array', () => {
    const antes = ids(MAO);
    const ordenada = ordenarMao(MAO, 'naipe', 'desc');
    assert.deepEqual(ids(MAO), antes);
    assert.notEqual(ordenada, MAO);
    assert.equal(ordenada.length, MAO.length);
  });

  it('cartas repetidas (vários baralhos) mantêm a ordem de entrada, nas duas direções', () => {
    const mao = [c('5', 'C', '5C#2'), c('5', 'C', '5C#1'), c('3', 'E'), c('5', 'C', '5C#3')];
    for (const criterio of ['tamanho', 'naipe']) for (const direcao of ['asc', 'desc']) {
      const so5 = ids(ordenarMao(mao, criterio, direcao)).filter((i) => i.startsWith('5C'));
      assert.deepEqual(so5, ['5C#2', '5C#1', '5C#3'], criterio + ' ' + direcao);
    }
  });

  it('quatro cartas do mesmo valor ficam juntas por tamanho e em ordem de naipe', () => {
    const mao = [c('9', 'O'), c('9', 'E'), c('4', 'C'), c('9', 'P'), c('9', 'C')];
    assert.deepEqual(ids(ordenarMao(mao, 'tamanho', 'asc')), ['4C', '9E', '9C', '9P', '9O']);
  });

  it('mão vazia e de uma carta funcionam; critério ou direção inválidos lançam erro', () => {
    assert.deepEqual(ordenarMao([], 'tamanho'), []);
    assert.deepEqual(ids(ordenarMao([c('Q', 'P')], 'naipe', 'desc')), ['QP']);
    assert.throws(() => ordenarMao(MAO, 'cor'), RangeError);
    assert.throws(() => ordenarMao(MAO, 'tamanho', 'lado'), RangeError);
  });
});
