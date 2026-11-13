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
import { pontuarRede, ROTULO_SAIDA_SATURADA } from '../../src/nucleo/pontuacao.js';
import { VERBETES } from '../../src/conteudo/grimorio.js';
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

  it('Backprop: 8 → 8 → 9,8 com saída saturada; cada neurônio mostra a ativação depois dele', () => {
    /* a0 = 8; J♥ (w 1,0, ReLU) dá 8; 5♦ (w 0,6, b 5) dá 0,6·8 + 5 = 9,8 */
    const mao = redeCom([['8'], ['JC'], ['5O']], { baralho: 'backprop' });
    const p = pontuarRede(mao, 0);
    assert.equal(p.total, 9.8);
    assert.deepEqual(p.neuronios.map((n) => n.pontos), [8, 8, 9.8]);
    assert.match(p.neuronios[1].notas[0], /w 1 · b 0 · ReLU/);
    assert.match(p.neuronios[2].notas[0], /w 0,6 · b 5 · Linear/);
    /* saída abaixo de 20 depois de uma ativação não linear: é saturação no forward pass, não vanishing gradient */
    assert.equal(p.saturada, true);
    assert.equal(p.vanishing, false);
    assert.equal(p.combos[0].rotulo, ROTULO_SAIDA_SATURADA);
    assert.doesNotMatch(p.combos[0].rotulo, /vanishing/i);
  });

  it('Backprop: a sigmoide não passa de 20, e camadas lineares depois dela tiram a rede da saturação', () => {
    /* a0 = 10; Q♠ (sigmoide): 20·σ((1,2·10 + 0)/10) = 20·σ(1,2) ≈ 15,37, abaixo do teto de 20 */
    const saturada = pontuarRede(redeCom([['10'], ['QE'], ['2C']], { baralho: 'backprop' }), 0);
    assert.ok(saturada.neuronios[1].pontos < 20);
    assert.ok(saturada.total < 20);
    assert.equal(saturada.saturada, true);
    assert.equal(saturada.vanishing, false);
    /* 9♠ e 10♠ lineares depois dela: 1,2·a + b leva a saída acima de 20 e o aviso some */
    const livre = pontuarRede(redeCom([['10'], ['QE'], ['9E'], ['10E']], { baralho: 'backprop' }), 0);
    assert.ok(livre.total >= 20, String(livre.total));
    assert.equal(livre.saturada, false);
    assert.equal(livre.combos.length, 0);
  });

  it('Backprop: o aviso leva ao verbete de saturação, e o verbete de retropropagação explica o nome do baralho', () => {
    const v = Object.fromEntries(VERBETES.map((x) => [x.id, x]));
    assert.ok(v.saturacao, 'verbete saturacao');
    assert.match(v.saturacao.noJogo, /Saída saturada depois das ativações/);
    assert.match(v.saturacao.conceito, /forward pass/);
    assert.match(v.backprop.noJogo, /baralho Backprop leva o nome/);
    assert.match(v.backprop.noJogo, /forward pass/);
    /* nenhum texto sobre o baralho Backprop chama a saturação de vanishing gradient */
    assert.doesNotMatch(v.saturacao.noJogo, /vanishing/i);
    assert.doesNotMatch(BARALHOS.backprop.resumo, /vanishing/i);
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
