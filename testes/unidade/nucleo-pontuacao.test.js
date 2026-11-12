/**
 * @file Testes de unidade da pontuação (pontuacao.js): valores, tunagem, sequências de figuras,
 * vanishing gradient, terrenos e baralhos Fraternidade e Truco. As contas são do motor do
 * NeuroDeck; aqui se confere o que a interface recebe (total, neurônios, combos e notas).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pontuarRede, mediaDePontos } from '../../src/nucleo/pontuacao.js';
import { aplicarJogada, jogadasLegais } from '../../src/nucleo/partida.js';
import { pontosDaCarta } from '../../src/nucleo/baralhos.js';
import { ehFigura } from '../../src/nucleo/cartas.js';
import { cartaParaND, situacaoDaRede, MOTIVOS_TRADUZIDOS } from '../../src/nucleo/traducao.js';
import { redeCom, maoNova } from '../apoio/estados.js';

/** A soma dos neurônios mais a dos combos dá o total (fora quando a rede zera). */
const somaDasPartes = (p) => p.neuronios.reduce((s, n) => s + n.pontos, 0) + p.combos.reduce((s, c) => s + c.pontos, 0);

describe('pontuarRede', () => {
  it('rede vazia vale 0', () => {
    const mao = redeCom([]);
    assert.deepEqual(pontuarRede(mao, 0), { total: 0, neuronios: [], combos: [], vanishing: false });
  });
  it('exemplo do enunciado: 8-K-K-3 com tunagem num K soma 41 (trio de Reis, contando o empilhado)', () => {
    const p = pontuarRede(redeCom([['8O'], ['KE', 'KC'], ['KP'], ['3O']]), 0);
    assert.equal(p.total, 41);
    assert.equal(p.combos.length, 1);
    assert.deepEqual({ quantidade: p.combos[0].quantidade, pontos: p.combos[0].pontos, de: p.combos[0].de, ate: p.combos[0].ate }, { quantidade: 3, pontos: 30, de: 1, ate: 2 });
    assert.match(p.combos[0].rotulo, /Trio de Reis \+30/);
    assert.deepEqual(p.neuronios.map((n) => n.pontos), [8, 0, 0, 3]); /* as figuras pontuam pelo combo */
    assert.deepEqual(p.neuronios.map((n) => n.pilha), [1, 2, 1, 1]);
    assert.equal(somaDasPartes(p), p.total);
  });
  it('par de figuras vizinhas vale 20 (10 por figura)', () => {
    const p = pontuarRede(redeCom([['QO'], ['QE'], ['2C']]), 0);
    assert.equal(p.total, 22);
    assert.match(p.combos[0].rotulo, /Par de Damas \+20/);
    assert.equal(somaDasPartes(p), p.total);
  });
  it('figura isolada tunada com outra igual é um par dentro do mesmo neurônio', () => {
    const p = pontuarRede(redeCom([['2O'], ['JE', 'JC'], ['2C']]), 0);
    assert.equal(p.total, 24);
    assert.deepEqual({ de: p.combos[0].de, ate: p.combos[0].ate, quantidade: p.combos[0].quantidade }, { de: 1, ate: 1, quantidade: 2 });
  });
  it('quatro Reis vizinhos (contando os empilhados) zeram a rede: vanishing gradient', () => {
    const p = pontuarRede(redeCom([['8O'], ['KE', 'KC'], ['KP'], ['KO']]), 0);
    assert.equal(p.total, 0);
    assert.ok(p.vanishing);
    assert.match(p.combos[0].rotulo, /Quadra de Reis: vanishing gradient/);
    assert.equal(p.combos[0].pontos, 0);
  });
  it('tunagem numérica soma todas as cartas da pilha', () => {
    const p = pontuarRede(redeCom([['5O'], ['7E', '7C']]), 0);
    assert.equal(p.total, 19);
    assert.ok(p.neuronios[1].notas.some((n) => /tunado ×2/.test(n)));
  });
  it('montanha: cada neurônio vale 1 ponto a mais por camada alcançada', () => {
    const p = pontuarRede(redeCom([['5O'], ['5E'], ['5C']], { terreno: 'montanha' }), 0);
    assert.equal(p.total, 5 + 6 + 7);
    assert.ok(p.neuronios[2].notas.some((n) => /\+2 altitude/.test(n)));
    /* a figura isolada também sobe; o ponto fica no neurônio, fora do combo */
    const comFigura = pontuarRede(redeCom([['5O'], ['KE']], { terreno: 'montanha' }), 0);
    assert.equal(comFigura.total, 6);
    assert.equal(comFigura.neuronios[1].pontos, 1);
  });
  it('pântano: a cada rodada, neurônio sem tunagem afunda 1 ponto', () => {
    /* joga 3 rodadas só ativando: ao fim, a Oculta 1 afundou 2 vezes e a Oculta 2, uma */
    const mao = maoNova({ terreno: 'pantano' });
    for (let i = 0; i < 6; i++) aplicarJogada(mao, jogadasLegais(mao, mao.vez).find((x) => x.tipo === 'ativar'));
    assert.equal(mao.rodada, 4);
    for (const j of [0, 1]) {
      const p = pontuarRede(mao, j);
      assert.deepEqual(p.neuronios.map((n) => n.notas.find((x) => /afundou/.test(x)) || ''), ['', '−2 afundou', '−1 afundou']);
      const semTerreno = p.neuronios.reduce((s, n) => s + pontosDaCarta(n.carta, 'classico'), 0) + p.combos.reduce((s, c) => s + c.pontos, 0);
      assert.equal(p.total, Math.max(0, semTerreno - 3));
    }
    /* neurônio tunado fica à tona */
    const tunada = redeCom([['9O'], ['9E', '9C']], { terreno: 'pantano' });
    tunada.nd.terrainData.sunk = { '1-0': 3 };
    assert.equal(pontuarRede(tunada, 0).total, 27);
    tunada.nd.layers[1][0].stack = [];
    assert.equal(pontuarRede(tunada, 0).total, 9 + 6);
  });
  it('oceano: neurônio do naipe do vento revelado na rodada vale o dobro para sempre', () => {
    const mao = maoNova({ terreno: 'oceano' });
    assert.ok('ECPO'.includes(mao.vento));
    const p = mao.vez;
    const alvo = mao.camadas[0].find((n) => !ehFigura(n.cartas[0]));
    mao.nd.terrainData.wind = cartaParaND(alvo.cartas[0]).suit; /* o vento sopra a favor desta carta */
    aplicarJogada(mao, { tipo: 'ativar', jogador: p, neuronio: alvo.id });
    const valor = pontosDaCarta(alvo.cartas[0], 'classico');
    assert.equal(pontuarRede(mao, p).total, 2 * valor);
    assert.ok(pontuarRede(mao, p).neuronios[0].notas.some((n) => /vento/.test(n)));
    mao.nd.terrainData.wind = 'S' === mao.nd.terrainData.wind ? 'H' : 'S'; /* o vento vira: o dobro continua */
    assert.equal(pontuarRede(mao, p).total, 2 * valor);
  });
  it('fraternidade: vizinhos do mesmo naipe valem dobro', () => {
    const p = pontuarRede(redeCom([['3O'], ['4O'], ['5E']], { baralho: 'fraternidade' }), 0);
    assert.equal(p.total, 6 + 8 + 5);
    assert.ok(p.neuronios[0].notas.some((n) => /×2 naipe/.test(n)));
  });
  it('truco: as figuras valem pontos próprios e não formam par nem trio; a quadra ainda zera a rede', () => {
    const p = pontuarRede(redeCom([['4P'], ['KE'], ['KC'], ['3O']], { baralho: 'truco' }), 0);
    assert.equal(p.total, 12 + 5 + 5 + 8);
    assert.deepEqual(p.combos, []);
    const quadra = pontuarRede(redeCom([['4P'], ['KE'], ['KC'], ['KP'], ['KO']], { baralho: 'truco' }), 0);
    assert.equal(quadra.total, 0);
    assert.ok(quadra.vanishing);
  });
});

describe('mediaDePontos', () => {
  it('média dos pontos de uma lista de cartas (0 para lista vazia)', () => {
    const mao = redeCom([]);
    assert.equal(mediaDePontos(mao, [{ valor: '2', naipe: 'O' }, { valor: '4', naipe: 'E' }]), 3);
    assert.equal(mediaDePontos(mao, []), 0);
  });
});

describe('situacaoDaRede', () => {
  it('todo motivo de fim de rede que o motor usa tem tradução', () => {
    const fontes = ['core.js', 'actions.js'].map((f) => readFileSync(new URL('../../src/motor/engine/' + f, import.meta.url), 'utf8')).join('\n');
    const usados = new Set([...fontes.matchAll(/finishNet\([^,]+,\s*[^,]+,\s*([^)]+)\)/g)].flatMap((m) => [...m[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1])));
    for (const m of fontes.matchAll(/reason:\s*'([a-z-]+)'/g)) usados.add(m[1]);
    assert.ok(usados.size >= 6, [...usados].join(','));
    for (const motivo of usados) assert.ok(MOTIVOS_TRADUZIDOS.includes(motivo), motivo);
  });
  it('motivo desconhecido vira "concluida" com um aviso só no console', () => {
    const avisos = [];
    const original = console.warn;
    console.warn = (msg) => avisos.push(msg);
    try {
      assert.equal(situacaoDaRede({ finished: true, reason: 'mod-inventado' }), 'concluida');
      assert.equal(situacaoDaRede({ finished: true, reason: 'mod-inventado' }), 'concluida');
    } finally { console.warn = original; }
    assert.equal(avisos.length, 1);
    assert.match(avisos[0], /mod-inventado/);
    assert.equal(situacaoDaRede({ finished: false }), 'construindo');
    assert.equal(situacaoDaRede({ finished: true, reason: 'stuck' }), 'travada');
  });
});
