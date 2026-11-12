/**
 * @file Baralhos do NeuroDeck que entraram na fusão (Nobreza e Backprop), a arte deles e os ícones
 * das ações.
 *
 * Rodar: node --test testes/unidade/baralhos-novos.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { instalarNavegadorFalso, pixelsPintados } from '../apoio/ambiente.js';
import { redeCom, maoAteOFim } from '../apoio/estados.js';
import { BARALHOS } from '../../src/nucleo/baralhos.js';
import { BARALHO_ND } from '../../src/nucleo/traducao.js';
import { pontuarRede } from '../../src/nucleo/pontuacao.js';
import { ICONES_DAS_ACOES } from '../../src/arte/icones.js';

let arte;
before(async () => {
  instalarNavegadorFalso();
  arte = { ...(await import('../../src/arte/cartas.js')), ...(await import('../../src/arte/versos.js')) };
});

describe('Nobreza e Backprop', () => {
  it('estão no menu, no motor e geram 52 cartas', () => {
    for (const chave of ['nobreza', 'backprop']) {
      assert.ok(BARALHOS[chave].nome && BARALHOS[chave].resumo, chave);
      assert.equal(BARALHO_ND[chave], chave);
      assert.equal(BARALHOS[chave].montar().length, 52, chave);
    }
  });

  it('Nobreza: figuras valem 11 a 13 e figuras iguais vizinhas valem o dobro (8 + K + K = 60)', () => {
    const mao = redeCom([['8'], ['KC'], ['KP']], { baralho: 'nobreza' });
    const p = pontuarRede(mao, 0);
    assert.equal(p.total, 8 + 26 + 26);
    assert.deepEqual(p.neuronios.map((n) => n.pontos), [8, 26, 26]);
    assert.equal(p.combos.length, 0);
  });

  it('Backprop: a rede vale a ativação da saída; cada neurônio mostra a ativação depois dele', () => {
    /* a0 = 8; J♥ (w 1,0, ReLU) dá 8; 5♦ (w 0,6, b 5) dá 0,6·8 + 5 = 9,8 */
    const mao = redeCom([['8'], ['JC'], ['5O']], { baralho: 'backprop' });
    const p = pontuarRede(mao, 0);
    assert.equal(p.total, 9.8);
    assert.deepEqual(p.neuronios.map((n) => n.pontos), [8, 8, 9.8]);
    assert.match(p.neuronios[1].notas[0], /w 1 · b 0 · ReLU/);
    assert.match(p.neuronios[2].notas[0], /w 0,6 · b 5 · Linear/);
    /* saída baixa depois de uma ativação não linear: o motor marca vanishing gradient */
    assert.equal(p.vanishing, true);
    assert.match(p.combos[0].rotulo, /vanishing gradient/);
  });

  it('mãos inteiras com os dois baralhos terminam e pontuam todas as redes', () => {
    for (const baralho of ['nobreza', 'backprop']) {
      for (let s = 1; s <= 10; s++) {
        const mao = maoAteOFim({ baralho, semente: s });
        assert.notEqual(mao.fase, 'jogo', baralho + ' ' + s);
        for (const j of [0, 1]) assert.ok(Number.isFinite(pontuarRede(mao, j).total), baralho + ' ' + s);
      }
    }
  });

  it('arte: versos próprios, legenda de ativação e peso no Backprop e texto das regras', () => {
    for (const chave of ['nobreza', 'backprop']) assert.ok(pixelsPintados(arte.desenharVerso('completa', 0.5, chave)) > 0.5, chave);
    const dama = arte.dadosDaCarta({ valor: 'Q', naipe: 'E' }, 'backprop');
    assert.equal(dama.tipo, 'Neurônio — Ativação');
    assert.match(dama.regras, /sigmoide/);
    assert.match(dama.regras, /w = 1,2/);
    assert.match(arte.dadosDaCarta({ valor: 'K', naipe: 'C' }, 'nobreza').regras, /13 pontos/);
    assert.ok(pixelsPintados(arte.desenharCartaDaMesa({ valor: '9', naipe: 'O' }, 'backprop', 1)) > 0.8);
  });
});

describe('avatares extras', () => {
  it('cada avatar do jogador tem retrato desenhado', async () => {
    const { desenharAvatar } = await import('../../src/arte/avatares.js');
    const { AVATARES_DO_JOGADOR } = await import('../../src/conteudo/avatares.js');
    for (const a of AVATARES_DO_JOGADOR) assert.ok(pixelsPintados(desenharAvatar(a.id, '#4aa3df', 0.5)) > 0.7, a.id);
  });
});

describe('ícones das ações', () => {
  it('um SVG acessível para cada ação da barra, para Avançar e para o vanishing gradient', () => {
    for (const id of ['avancar', 'tunagem', 'overfit', 'earlystop', 'stackoverflow', 'dropout', 'transfer', 'passar', 'vanishing']) {
      assert.match(ICONES_DAS_ACOES[id], /^<svg viewBox="0 0 48 48"[^>]*>.*<\/svg>$/s, id);
    }
  });
  it('toda jogada da ajuda das ações tem ícone (#42)', async () => {
    const { ACOES_DA_AJUDA } = await import('../../src/interface/telas/ajudaDasAcoes.js');
    for (const a of ACOES_DA_AJUDA) assert.ok(ICONES_DAS_ACOES[a.id], a.id + ' sem ícone');
  });
});
