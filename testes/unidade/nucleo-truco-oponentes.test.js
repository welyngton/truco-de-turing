/**
 * @file Testes de unidade do truco (truco.js) e dos oponentes (oponentes/comum.js,
 * estrategias.js e index.js). Os oponentes são os bots do NeuroDeck, traduzidos para a interface.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ESCADA_TRUCO, GRITO_TRUCO, novaPartida, proximoValor, ehMaoDeOnze, podeTrucar, pedirTruco, responderTruco, marcarTentos, proximaMao,
} from '../../src/nucleo/truco.js';
import { novoGerador, determinizar, chanceDeVitoria } from '../../src/nucleo/oponentes/comum.js';
import { jogadaAleatoria, jogadaGulosa, jogadaMonteCarlo } from '../../src/nucleo/oponentes/estrategias.js';
import { OPONENTES, escolherJogada, querTrucar, responderAoTruco } from '../../src/nucleo/oponentes/index.js';
import { novaMao, jogadasLegais, copiarMao } from '../../src/nucleo/partida.js';
import { maoNova, maoJogada, maoAteOFim } from '../apoio/estados.js';
import { finalizarRede } from '../apoio/montagem.js';

/** Confere que a jogada é uma das legais (comparando os campos essenciais). */
function ehLegal(mao, j, jogada) {
  const chave = (x) => [x.tipo, x.neuronio || '', (x.cartas || []).join(), x.n || '', (x.pagamento || []).join(), x.carta || ''].join('|');
  return jogadasLegais(mao, j, { comDropout: true }).map(chave).includes(chave(jogada));
}

describe('truco.js', () => {
  it('escada 1-3-6-9-12 e gritos', () => {
    assert.deepEqual(ESCADA_TRUCO, [1, 3, 6, 9, 12]);
    assert.equal(GRITO_TRUCO[3], 'TRUCO!');
    assert.equal(proximoValor(1), 3);
    assert.equal(proximoValor(12), null);
    assert.equal(proximoValor(7), null);
  });
  it('novaPartida e proximaMao zeram o valor e o pedido', () => {
    const p = novaPartida(12);
    assert.deepEqual(p.tentos, [0, 0]);
    p.valor = 6; p.aumentadoPor = 0; p.pedido = { por: 0, para: 9 };
    proximaMao(p);
    assert.equal(p.numeroMao, 1);
    assert.equal(p.valor, 1);
    assert.equal(p.pedido, null);
  });
  it('podeTrucar: não em mão única, não com pedido aberto, não quem aumentou por último, não na mão de onze', () => {
    assert.equal(podeTrucar(novaPartida(1), 0), false);
    const p = novaPartida(12);
    assert.ok(podeTrucar(p, 0));
    assert.ok(pedirTruco(p, 0));
    assert.equal(pedirTruco(p, 1), false);
    responderTruco(p, 1, 'aceitar');
    assert.equal(podeTrucar(p, 0), false);
    assert.equal(podeTrucar(p, 1), true);
    p.valor = 12; p.aumentadoPor = -1;
    assert.equal(podeTrucar(p, 1), false);
  });
  it('responderTruco: aceitar sobe o valor; aumentar devolve o pedido; correr entrega o valor atual', () => {
    const p = novaPartida(12);
    assert.equal(responderTruco(p, 1, 'aceitar'), null); /* sem pedido */
    pedirTruco(p, 0);
    assert.deepEqual(responderTruco(p, 1, 'aumentar'), { maoEncerrada: false });
    assert.equal(p.valor, 3);
    assert.deepEqual(p.pedido, { por: 1, para: 6 });
    assert.deepEqual(responderTruco(p, 0, 'correr'), { maoEncerrada: true, vencedor: 1, pontos: 3 });
  });
  it('marcarTentos, fim da partida e mão de onze', () => {
    const p = novaPartida(12);
    assert.equal(marcarTentos(p, 1, 11), 11);
    assert.ok(ehMaoDeOnze(p));
    assert.equal(marcarTentos(p, 1, null), 1);
    assert.ok(p.encerrada);
    assert.equal(p.vencedor, 1);
    assert.equal(p.tentos[1], 12);
  });
});

describe('oponentes/comum.js', () => {
  it('novoGerador: números em [0, 1), uma sequência por gerador', () => {
    const gerador = novoGerador();
    const numeros = Array.from({ length: 50 }, gerador);
    assert.ok(numeros.every((x) => x >= 0 && x < 1));
    assert.ok(new Set(numeros).size > 40);
  });
  it('determinizar: mantém o que j vê e redistribui o resto', () => {
    const mao = maoJogada(5), j = mao.vez, copia = determinizar(mao, j);
    assert.deepEqual(copia.jogadores[j].mao, mao.jogadores[j].mao);
    for (const jogador of mao.jogadores) for (const id of jogador.caminho) assert.deepEqual(copia.neuronios[id].cartas, mao.neuronios[id].cartas);
    assert.equal(copia.simulacao, true);
    /* as cartas escondidas são as mesmas, em outros lugares */
    const escondidas = (m) => [...m.camadas.flat().filter((n) => !n.revelado && !n.removido).map((n) => n.cartas[0].id), ...m.jogadores[1 - j].mao.map((c) => c.id), ...m.limbo.map((c) => c.id)].sort();
    assert.deepEqual(escondidas(copia), escondidas(mao));
    assert.notDeepEqual(determinizar(mao, j).limbo.map((c) => c.id).concat(determinizar(mao, j).limbo.map((c) => c.id)), mao.limbo.map((c) => c.id).concat(mao.limbo.map((c) => c.id)));
  });
  it('chanceDeVitoria: entre 0 e 1 durante a mão; 0,5 antes de começar; 0 ou 1 no fim', () => {
    const c = chanceDeVitoria(maoJogada(6), 0, 10);
    assert.ok(c >= 0 && c <= 1);
    assert.equal(chanceDeVitoria(novaMao({ semente: 1, jogadores: [{ nome: 'a' }, { nome: 'b' }] }), 0, 5), 0.5);
    const fim = maoAteOFim();
    assert.equal(chanceDeVitoria(fim, fim.resultado.vencedor, 5), 1);
    assert.equal(chanceDeVitoria(fim, 1 - fim.resultado.vencedor, 5), 0);
  });
  it('chanceDeVitoria não altera a mão', () => {
    const mao = maoJogada(6), foto = JSON.stringify(mao.nd);
    chanceDeVitoria(mao, 1, 8);
    assert.equal(JSON.stringify(mao.nd), foto);
  });
});

describe('oponentes/estrategias.js', () => {
  it('jogadaAleatoria, jogadaGulosa e jogadaMonteCarlo devolvem jogadas legais', () => {
    for (let passos = 0; passos < 12; passos += 3) {
      const mao = maoJogada(passos), j = mao.vez;
      if (mao.fase !== 'jogo') continue;
      assert.ok(ehLegal(mao, j, jogadaAleatoria(mao, j)), 'aleatória');
      assert.ok(ehLegal(mao, j, jogadaGulosa(mao, j)), 'gulosa');
      const mc = jogadaMonteCarlo(mao, j, 6);
      if (mc.simulacao) { assert.ok(mc.simulacao.partidas >= 12 && mc.simulacao.partidas % 6 === 0 && mc.simulacao.taxaDeVitoria >= 0 && mc.simulacao.taxaDeVitoria <= 1); delete mc.simulacao; }
      assert.ok(ehLegal(mao, j, mc), 'Monte Carlo');
    }
  });
  it('Monte Carlo com uma jogada só devolve direto', () => {
    const mao = maoNova(), j = mao.vez;
    finalizarRede(mao, j, 'output');
    const jogada = jogadaMonteCarlo(mao, j, 10);
    assert.equal(jogada.tipo, 'passar');
    assert.equal(jogada.simulacao, undefined);
  });
});

describe('oponentes/index.js', () => {
  it('três perfis com nome, nível, método, avatar e estilo', () => {
    assert.deepEqual(Object.keys(OPONENTES), ['aleatorio', 'guloso', 'montecarlo']);
    for (const o of Object.values(OPONENTES)) assert.ok(o.nome && o.nivel && o.metodo && o.avatar && o.estilo);
  });
  it('escolherJogada: carta de início por perfil e jogada por estratégia', () => {
    for (const inicio of ['revela-descarta', 'revela-volta']) {
      const mao = novaMao({ semente: 3, inicio, jogadores: [{ nome: 'a' }, { nome: 'b', tipo: 'oponente', oponente: 'guloso' }] });
      const x = escolherJogada(mao, 1);
      assert.equal(x.tipo, 'inicio');
      assert.ok(mao.jogadores[1].mao.some((c) => c.id === x.carta));
    }
    for (const perfil of ['aleatorio', 'guloso', 'montecarlo']) {
      const mao = maoNova({ jogadores: [{ nome: 'a', tipo: 'oponente', oponente: perfil }, { nome: 'b', tipo: 'oponente', oponente: perfil }] });
      assert.ok(ehLegal(mao, mao.vez, (({ simulacao, ...x }) => x)(escolherJogada(mao, mao.vez, 6))));
    }
  });
  it('querTrucar e responderAoTruco: respostas válidas para cada perfil', (t) => {
    const mao = maoJogada(8);
    assert.equal(querTrucar(novaMao({ semente: 1, jogadores: [{ nome: 'a' }, { nome: 'b' }] }), 0, 'guloso'), false);
    for (const aleatorio of [0.01, 0.5, 0.99]) {
      t.mock.method(Math, 'random', () => aleatorio);
      for (const perfil of ['aleatorio', 'guloso', 'montecarlo']) {
        assert.equal(typeof querTrucar(mao, 0, perfil), 'boolean');
        for (const pode of [true, false]) assert.ok(['aceitar', 'correr', 'aumentar'].includes(responderAoTruco(mao, 0, perfil, 3, pode)));
      }
      t.mock.restoreAll();
    }
  });
});
