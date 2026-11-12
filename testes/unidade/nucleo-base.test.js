/**
 * @file Testes de unidade: sorteios (aleatorio.js), cartas (cartas.js), formato da rede (rede.js),
 * baralhos (baralhos.js) e terrenos (terrenos.js).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sortear, sortearInteiro, embaralhar, sementeNova } from '../../src/nucleo/aleatorio.js';
import {
  VALORES, NAIPES, NAIPE, ORDEM_NAIPE, NOME_VALOR, PLURAL_FIGURA, FORCA_VALOR, ehFigura, rotuloCarta, baralhoPadrao,
} from '../../src/nucleo/cartas.js';
import { TAMANHOS_CAMADAS, TOTAL_CAMADAS, CAMADA_SAIDA, TAMANHO_MAO, ehOculta, nomeCamada, tamanhosDaMesa, ARQUITETURAS } from '../../src/nucleo/rede.js';
import { BARALHOS, pontosDaCarta, nomeDaCarta, manilhaDaCarta } from '../../src/nucleo/baralhos.js';
import { TERRENOS } from '../../src/nucleo/terrenos.js';

describe('aleatorio.js', () => {
  it('sortear: reprodutível pela semente e sempre em [0, 1)', () => {
    const a = { semente: 42 }, b = { semente: 42 };
    const sa = Array.from({ length: 200 }, () => sortear(a));
    const sb = Array.from({ length: 200 }, () => sortear(b));
    assert.deepEqual(sa, sb);
    assert.ok(sa.every((x) => x >= 0 && x < 1));
    assert.notEqual(new Set(sa).size, 1);
  });
  it('sortearInteiro: inteiros em [0, n) que cobrem todos os valores', () => {
    const estado = { semente: 9 }, vistos = new Set();
    for (let i = 0; i < 500; i++) { const x = sortearInteiro(estado, 4); assert.ok(Number.isInteger(x) && x >= 0 && x < 4); vistos.add(x); }
    assert.equal(vistos.size, 4);
  });
  it('embaralhar: mesma lista em outra ordem, sem perder nem repetir itens', () => {
    const lista = Array.from({ length: 52 }, (_, i) => i);
    const misturada = embaralhar(lista.slice(), { semente: 3 });
    assert.deepEqual(misturada.slice().sort((x, y) => x - y), lista);
    assert.notDeepEqual(misturada, lista);
  });
  it('sementeNova: número inteiro', () => {
    const s = sementeNova();
    assert.ok(Number.isInteger(s));
  });
});

describe('cartas.js', () => {
  it('tabelas de valores e naipes', () => {
    assert.equal(VALORES.length, 13);
    assert.deepEqual(NAIPES, ['E', 'C', 'P', 'O']);
    for (const n of NAIPES) { assert.ok(NAIPE[n].nome && NAIPE[n].simbolo); assert.ok(ORDEM_NAIPE[n] >= 1); }
    for (const v of VALORES) { assert.ok(NOME_VALOR[v]); assert.ok(FORCA_VALOR[v] >= 2); }
    assert.equal(PLURAL_FIGURA.K, 'Reis');
  });
  it('ehFigura: só J, Q e K', () => {
    assert.ok(['J', 'Q', 'K'].every((valor) => ehFigura({ valor })));
    assert.ok(!['A', '2', '10'].some((valor) => ehFigura({ valor })));
  });
  it('rotuloCarta: valor + símbolo do naipe', () => {
    assert.equal(rotuloCarta({ valor: '7', naipe: 'O' }), '7' + NAIPE.O.simbolo);
  });
  it('baralhoPadrao: 52 cartas com ids únicos', () => {
    const b = baralhoPadrao();
    assert.equal(b.length, 52);
    assert.equal(new Set(b.map((c) => c.id)).size, 52);
  });
});

describe('rede.js', () => {
  it('formato 3-5-5-5-5-5-4 e mão de 5 cartas', () => {
    assert.deepEqual(TAMANHOS_CAMADAS, [3, 5, 5, 5, 5, 5, 4]);
    assert.equal(TOTAL_CAMADAS, 7);
    assert.equal(CAMADA_SAIDA, 6);
    assert.equal(TAMANHO_MAO, 5);
  });
  it('ehOculta: só as camadas 1 a 5 na mesa padrão; numa mesa de 9 camadas, de 1 a 7', () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((c) => ehOculta(c)), [false, true, true, true, true, true, false]);
    assert.deepEqual([0, 1, 7, 8].map((c) => ehOculta(c, 9)), [false, true, true, false]);
  });
  it('tamanhosDaMesa: arquiteturas do NeuroDeck, com um neurônio a mais por camada para cada jogador além de 2', () => {
    assert.deepEqual(tamanhosDaMesa(), [3, 5, 5, 5, 5, 5, 4]);
    assert.deepEqual(tamanhosDaMesa('curta'), [3, 4, 4, 4, 3]);
    assert.deepEqual(tamanhosDaMesa('profunda', 3), [4, 5, 5, 5, 5, 5, 5, 5, 4]);
    assert.deepEqual(tamanhosDaMesa('larga', 5), [7, 9, 9, 9, 9, 9, 8]);
    assert.deepEqual(Object.keys(ARQUITETURAS), ['padrao', 'curta', 'larga', 'profunda']);
    assert.throws(() => tamanhosDaMesa('inexistente'));
  });
  it('nomeCamada: entrada, ocultas numeradas e saída', () => {
    assert.match(nomeCamada(0), /Entrada/i);
    assert.match(nomeCamada(3), /3/);
    assert.match(nomeCamada(6), /Sa[ií]da/i);
    assert.match(nomeCamada(6, 9), /Oculta 6/);
    assert.match(nomeCamada(8, 9), /Sa[ií]da/i);
  });
});

describe('baralhos.js', () => {
  it('cada baralho monta as cartas do motor (52; o truco, 2 baralhos de 27) e tem nome e resumo', () => {
    for (const [chave, b] of Object.entries(BARALHOS)) {
      const cartas = b.montar();
      assert.equal(cartas.length, chave === 'truco' ? 54 : 52, chave);
      assert.equal(new Set(cartas.map((c) => c.id)).size, cartas.length, chave + ': ids únicos');
      assert.ok(b.nome && b.resumo, chave);
    }
    assert.deepEqual([...new Set(BARALHOS.yinyang.montar().map((c) => c.valor))].sort(), ['2', 'A']);
    assert.deepEqual([...new Set(BARALHOS.truco.montar().map((c) => c.valor))].sort(), ['2', '3', '4', '7', 'A', 'J', 'K', 'Q']);
  });
  it('pontosDaCarta: Ás 11, figuras 0, números pelo valor; no truco, manilhas e a ordem do truco', () => {
    assert.equal(pontosDaCarta({ valor: 'A', naipe: 'C' }, 'classico'), 11);
    assert.equal(pontosDaCarta({ valor: 'K', naipe: 'C' }, 'classico'), 0);
    assert.equal(pontosDaCarta({ valor: '7', naipe: 'C' }, 'classico'), 7);
    /* truco do NeuroDeck: Zap 12, Copas 11, Espadilha 10, Pica-fumo 9; depois 3, 2, A, K, J, Q */
    assert.equal(pontosDaCarta({ valor: '4', naipe: 'P' }, 'truco'), 12);
    assert.equal(pontosDaCarta({ valor: '7', naipe: 'C' }, 'truco'), 11);
    assert.equal(pontosDaCarta({ valor: 'A', naipe: 'E' }, 'truco'), 10);
    assert.equal(pontosDaCarta({ valor: '7', naipe: 'O' }, 'truco'), 9);
    assert.deepEqual(['3', '2', 'A', 'K', 'J', 'Q'].map((valor) => pontosDaCarta({ valor, naipe: 'C' }, 'truco')), [8, 7, 6, 5, 4, 3]);
  });
  it('nomeDaCarta e manilhaDaCarta', () => {
    assert.match(nomeDaCarta({ valor: 'K', naipe: 'O' }, 'classico'), /Rei/);
    assert.ok(manilhaDaCarta({ valor: '4', naipe: 'P' }, 'truco'));
    assert.ok(!manilhaDaCarta({ valor: '4', naipe: 'P' }, 'classico'));
    assert.match(nomeDaCarta({ valor: '4', naipe: 'P' }, 'truco'), /Zap/i);
  });
});

describe('terrenos.js', () => {
  it('quatro terrenos com nome e resumo', () => {
    assert.deepEqual(Object.keys(TERRENOS).sort(), ['montanha', 'neutro', 'oceano', 'pantano']);
    for (const t of Object.values(TERRENOS)) assert.ok(t.nome && t.resumo);
  });
});
