/**
 * @file Motor do NeuroDeck: quem começa a partida e o resultado das simulações do Monte Carlo
 * (acréscimos da fusão, issue #2).
 *
 * O slide dá duas formas de revelar a carta que decide quem começa: (a) a carta revelada vai
 * para o cemitério; (b) a carta volta para a mão. O motor original só tinha a (a), que continua
 * sendo o padrão (`firstRule: 'reveal'`); a (b) entrou como `firstRule: 'reveal-keep'`.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../src/motor/engine.js';
import { greedyMove, monteCarloMove, monteCarloResults } from '../../src/motor/bot.js';

const revelarTodos = (s, escolha = (mao) => mao[0]) => { for (const p of [0, 1]) E.applyMove(s, p, { type: 'reveal', cardId: escolha(s.hands[p]).id }); };
const maisForte = (s) => (mao) => mao.reduce((a, c) => (E.strengthOf(s, c) > E.strengthOf(s, a) ? c : a));

describe('Quem começa', () => {
  test("opção (a), 'reveal': as cartas reveladas vão para o cemitério", () => {
    // Cenário: cada jogador revela uma carta. Esperado: a partida começa com 4 cartas na mão de
    // cada um e as 2 reveladas no cemitério.
    const s = E.newGame({ seed: 7, firstRule: 'reveal' });
    revelarTodos(s);
    assert.equal(s.phase, 'play');
    assert.deepEqual(s.hands.map((h) => h.length), [4, 4]);
    assert.equal(s.graveyard.length, 2);
  });

  test("opção (b), 'reveal-keep': as cartas reveladas voltam para a mão", () => {
    // Esperado: ninguém perde carta e nada vai para o cemitério.
    const s = E.newGame({ seed: 7, firstRule: 'reveal-keep' });
    assert.equal(s.phase, 'reveal');
    revelarTodos(s);
    assert.equal(s.phase, 'play');
    assert.deepEqual(s.hands.map((h) => h.length), [5, 5]);
    assert.equal(s.graveyard.length, 0);
  });

  test('nas duas opções começa quem revelou a carta mais forte (Ás > K > … > 2; naipe desempata)', () => {
    for (const firstRule of ['reveal', 'reveal-keep']) {
      for (let seed = 1; seed <= 30; seed++) {
        const s = E.newGame({ seed, firstRule });
        const forca = [0, 1].map((p) => E.strengthOf(s, maisForte(s)(s.hands[p])));
        revelarTodos(s, maisForte(s));
        if (forca[0] !== forca[1]) assert.equal(s.firstPlayer, forca[0] > forca[1] ? 0 : 1, firstRule + ' semente ' + seed);
        assert.equal(s.turn, s.firstPlayer);
      }
    }
  });

  test("sorteio ('random'): não há fase de revelação", () => {
    const s = E.newGame({ seed: 7, firstRule: 'random' });
    assert.equal(s.phase, 'play');
    assert.deepEqual(s.hands.map((h) => h.length), [5, 5]);
  });

  test("os bots espertos revelam a carta mais forte quando ela volta para a mão, e a de menor valor quando é descartada", () => {
    const gerador = () => 0.5;
    const guarda = E.newGame({ seed: 3, firstRule: 'reveal-keep' });
    const escolhida = guarda.hands[0].find((c) => c.id === greedyMove(guarda, 0, gerador).cardId);
    assert.equal(E.strengthOf(guarda, escolhida), Math.max(...guarda.hands[0].map((c) => E.strengthOf(guarda, c))));
    const descarta = E.newGame({ seed: 3, firstRule: 'reveal' });
    const entregue = descarta.hands[0].find((c) => c.id === monteCarloMove(descarta, 0, gerador).cardId);
    assert.equal(E.cardValue(descarta, entregue), Math.min(...descarta.hands[0].map((c) => E.cardValue(descarta, c))));
  });
});

describe('Monte Carlo: resultado das simulações', () => {
  test('monteCarloResults devolve cada jogada com taxa de vitória e margem, da melhor para a pior', () => {
    const s = E.newGame({ seed: 12, firstRule: 'random' });
    const resultados = monteCarloResults(s, s.turn, E.mulberry32(5), 6);
    assert.equal(resultados.length, E.legalMoves(s, s.turn, { maxDropout: 1 }).length);
    for (const r of resultados) {
      assert.ok(r.move && typeof r.move.type === 'string');
      assert.ok(r.winRate >= 0 && r.winRate <= 1);
      assert.equal(typeof r.mean, 'number');
    }
    for (let i = 1; i < resultados.length; i++) assert.ok(resultados[i - 1].winRate >= resultados[i].winRate);
  });

  test('monteCarloMove escolhe a primeira jogada de monteCarloResults', () => {
    const s = E.newGame({ seed: 12, firstRule: 'random' });
    assert.deepEqual(monteCarloMove(s, s.turn, E.mulberry32(5), 6), monteCarloResults(s, s.turn, E.mulberry32(5), 6)[0].move);
  });
});
