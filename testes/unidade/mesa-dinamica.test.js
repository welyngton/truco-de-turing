/**
 * @file Mesa dinâmica (issue #5): arquiteturas do NeuroDeck, 2 a 5 jogadores e vários baralhos.
 *
 * Cada teste diz o cenário e o resultado esperado. A geometria do tabuleiro é testada no Node
 * (layout.js não depende do Phaser); a partida, pela camada de tradução; a revisão da mão, no
 * navegador falso dos testes de interface.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { instalarNavegadorFalso } from '../apoio/ambiente.js';

instalarNavegadorFalso();
const { novaMao, aplicarJogada, jogadasLegais, alvosDeEmpilhamento, fronteira, podeEmpilhar } = await import('../../src/nucleo/partida.js');
const { pontuarRede } = await import('../../src/nucleo/pontuacao.js');
const { tamanhosDaMesa } = await import('../../src/nucleo/rede.js');
const { novaPartida, podeTrucar, pedirTruco, marcarTentos, ehMaoDeOnze, temTruco } = await import('../../src/nucleo/truco.js');
const { escolherJogada } = await import('../../src/nucleo/oponentes/index.js');
const { escolherDicaDeJogo } = await import('../../src/conteudo/dicasDeJogo.js');
const { abrirRevisao } = await import('../../src/interface/telas/revisao.js');
const L = await import('../../src/cenas/mesa/layout.js');
const { normalizarOpcoes, OPCOES_PADRAO } = await import('../../src/aplicacao.js');
const M = await import('../apoio/montagem.js');

/** Jogadores genéricos: o primeiro humano, os outros oponentes do perfil dado. */
const mesaCom = (n, perfil = 'aleatorio') => Array.from({ length: n }, (_, j) => (j === 0 ? { nome: 'Você', tipo: 'humano' } : { nome: 'Bot ' + j, tipo: 'oponente', oponente: perfil }));

/** Joga a mão até o fim com os bots do motor (o humano também joga pelo bot aleatório). */
function jogarAteOFim(mao) {
  for (let passo = 0; passo < 600 && mao.fase !== 'fim'; passo++) {
    if (mao.fase === 'inicio') {
      const j = mao.jogadores.findIndex((x) => !x.cartaInicial);
      aplicarJogada(mao, jogadasLegais(mao, j)[0]);
      continue;
    }
    aplicarJogada(mao, escolherJogada(mao, mao.vez, 4));
  }
  return mao;
}

/** Todas as cartas da mão, onde quer que estejam (mesa, mãos, limbo, cemitério e fora da partida). */
function contarCartas(mao) {
  const cartas = [...mao.camadas.flat().flatMap((n) => n.cartas), ...mao.jogadores.flatMap((j) => j.mao), ...mao.limbo, ...mao.cemiterio];
  return { total: cartas.length + (mao.nd.unused || []).length, ids: new Set(cartas.map((c) => c.id)).size, soltas: cartas.length };
}

describe('Mesa: arquiteturas, jogadores e baralhos', () => {
  it('a mesa tem os tamanhos da arquitetura, com um neurônio a mais por camada para cada jogador além de 2', () => {
    // Cenário: as quatro arquiteturas do NeuroDeck, com 2 e com 4 jogadores.
    for (const arquitetura of ['padrao', 'curta', 'larga', 'profunda']) {
      for (const n of [2, 4]) {
        const mao = novaMao({ arquitetura, jogadores: mesaCom(n), semente: 3, inicio: 'sorteio' });
        assert.deepEqual(mao.camadas.map((c) => c.length), tamanhosDaMesa(arquitetura, n), arquitetura + ' com ' + n);
      }
    }
  });

  it('com 2 baralhos a mão tem 10 cartas e o limbo 20; com 3 baralhos, 15 e 30', () => {
    // Regra do NeuroDeck: mão e limbo multiplicam pelo número de baralhos.
    const dois = novaMao({ baralhos: 2, jogadores: mesaCom(2), semente: 1, inicio: 'sorteio' });
    assert.deepEqual(dois.jogadores.map((j) => j.mao.length), [10, 10]);
    assert.equal(dois.limbo.length, 20);
    const tres = novaMao({ baralhos: 3, jogadores: mesaCom(3), semente: 1, inicio: 'sorteio' });
    assert.deepEqual(tres.jogadores.map((j) => j.mao.length), [15, 15, 15]);
    assert.equal(tres.limbo.length, 30);
  });

  it('cartas repetidas (vários baralhos) têm ids diferentes na interface', () => {
    const mao = novaMao({ baralhos: 2, jogadores: mesaCom(2), semente: 4, inicio: 'sorteio' });
    const { soltas, ids } = contarCartas(mao);
    assert.equal(soltas, ids);
  });

  it('recusa arquitetura desconhecida e mesas com menos de 2 ou mais de 5 jogadores', () => {
    assert.throws(() => novaMao({ arquitetura: 'torre', jogadores: mesaCom(2) }), /Arquitetura desconhecida/);
    assert.throws(() => novaMao({ jogadores: mesaCom(1) }), /2 a 5/);
    assert.throws(() => novaMao({ jogadores: mesaCom(6) }), /2 a 5/);
  });

  it('mãos completas com 3, 4 e 5 jogadores, em todas as arquiteturas: nenhuma carta some e toda mão termina', () => {
    // Cenário: 24 mãos jogadas até o fim pelos bots, alternando arquitetura, baralhos, terreno e início.
    const arquiteturas = ['padrao', 'curta', 'larga', 'profunda'], terrenos = ['neutro', 'montanha', 'pantano', 'oceano'];
    let k = 0;
    for (const n of [3, 4, 5]) {
      for (let i = 0; i < 8; i++, k++) {
        const mao = novaMao({
          arquitetura: arquiteturas[k % 4], baralhos: 1 + (k % 2), terreno: terrenos[k % 4], baralho: k % 3 ? 'classico' : 'fraternidade',
          inicio: ['revela-descarta', 'revela-volta', 'sorteio'][k % 3], jogadores: mesaCom(n, k % 2 ? 'guloso' : 'aleatorio'), semente: 100 + k,
        });
        const inicio = contarCartas(mao).total;
        jogarAteOFim(mao);
        assert.equal(mao.fase, 'fim', 'mão ' + k + ' terminou');
        assert.equal(contarCartas(mao).total, inicio, 'mão ' + k + ': cartas conservadas');
        assert.equal(mao.resultado.somas.length, n);
        assert.ok(mao.resultado.vencedor >= 0 && mao.resultado.vencedor < n);
        mao.jogadores.forEach((j) => { for (const id of j.caminho) assert.equal(mao.neuronios[id].dono, j.indice); });
      }
    }
  });

  it('com 3 jogadores, as fronteiras de todos os rivais aceitam ataque e o alvo é o dono do neurônio clicado', () => {
    // Cenário: as três redes com um neurônio oculto na ponta; o jogador da vez tem uma carta igual à de cada rival.
    const mao = novaMao({ jogadores: mesaCom(3), semente: 9, inicio: 'sorteio' });
    M.montarRede(mao, 0, [['2E'], ['7E']]);
    M.montarRede(mao, 1, [['3C'], ['9C']]);
    M.montarRede(mao, 2, [['4P'], ['5P']]);
    M.ajustar(mao, { vez: 0 });
    const [nove, cinco] = M.darMao(mao, 0, ['9O', '5O']);
    assert.equal(alvosDeEmpilhamento(mao).length, 3);
    assert.ok(podeEmpilhar(mao, 0, fronteira(mao, 1).id, [nove.id]));
    assert.ok(!podeEmpilhar(mao, 0, fronteira(mao, 2).id, [nove.id]));
    const alvo = fronteira(mao, 2);
    aplicarJogada(mao, { tipo: 'empilhar', jogador: 0, neuronio: alvo.id, cartas: [cinco.id] });
    assert.equal(alvo.removido, true); // overfit no jogador 2, não no 1
    assert.equal(mao.jogadores[2].caminho.length, 1);
    assert.equal(mao.jogadores[1].caminho.length, 2);
  });
});

describe('Truco com mais de 2 jogadores', () => {
  it('a partida vale tentos para cada jogador, mas ninguém pode trucar', () => {
    const partida = novaPartida(12, 4);
    assert.deepEqual(partida.tentos, [0, 0, 0, 0]);
    assert.equal(temTruco(partida), false);
    assert.equal(podeTrucar(partida, 0), false);
    assert.equal(pedirTruco(partida, 2), false);
    marcarTentos(partida, 3, 11);
    assert.equal(ehMaoDeOnze(partida), true);
    marcarTentos(partida, 3, 1);
    assert.equal(partida.encerrada, true);
    assert.equal(partida.vencedor, 3);
  });

  it('com 2 jogadores tudo continua como antes', () => {
    const partida = novaPartida(12);
    assert.deepEqual(partida.tentos, [0, 0]);
    assert.equal(temTruco(partida), true);
    assert.equal(podeTrucar(partida, 0), true);
    assert.equal(temTruco(novaPartida(1)), false);
  });
});

describe('Dicas e revisão com mais de 2 jogadores', () => {
  it('a dica de ataque aponta para o rival que dá para atacar, mesmo que não seja o próximo', () => {
    const mao = novaMao({ jogadores: mesaCom(3), semente: 5, inicio: 'sorteio' });
    M.montarRede(mao, 0, [['2E'], ['3E']]);
    M.montarRede(mao, 1, [['4C'], ['6C']]);
    M.montarRede(mao, 2, [['5P'], ['8P']]);
    M.darMao(mao, 0, ['8O', '8C', '8E']);
    const dica = escolherDicaDeJogo(mao, 0, novaPartida(1, 3));
    assert.equal(dica.id, 'ataque-overflow'); // 1 carta no 8 do jogador 2 + três 8 na mão = pilha de 4
  });

  it('a revisão mostra uma curva, um resumo e um placar para cada jogador', async () => {
    const mao = jogarAteOFim(novaMao({ jogadores: mesaCom(4), semente: 21, inicio: 'sorteio' }));
    const somas = mao.jogadores.map((_, j) => pontuarRede(mao, j).total);
    const linhaDoTempo = [
      { numero: 1, jogador: 1, tipo: 'ativar', eventos: ['ativacao'], texto: 'Bot 1 ativou.', somas: [0, 5, 0, 0] },
      { numero: 2, jogador: 3, tipo: 'empilhar', eventos: ['overfit'], texto: 'Bot 3 aplicou overfit.', somas: [0, 0, 0, 0] },
      { numero: 3, jogador: 2, tipo: 'ativar', eventos: ['ativacao'], texto: 'Bot 2 ativou.', somas },
    ];
    let fechou = false;
    abrirRevisao({
      mao, linhaDoTempo, partida: novaPartida(12, 4), numeroDaMao: 1, aoFechar: () => { fechou = true; },
      historicoDaPartida: [{ numero: 1, vencedor: 2, ganho: 1, completa: true, somas, tentos: [0, 0, 1, 0] }],
    });
    const folha = document.querySelector('.revisao');
    assert.equal(folha.querySelectorAll('.curva-svg polyline').length, 4);
    assert.equal(folha.querySelectorAll('.resumo li b').length >= 4, true);
    assert.match(folha.textContent, /0 × 0 × 1 × 0/);
    folha.querySelector('[data-fechar]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(fechou, true);
  });
});

describe('Geometria do tabuleiro (layout.js)', () => {
  it('a mesa padrão fica exatamente onde ficava: colunas de 318 a 900, linhas a 95, cartas 62x87', () => {
    L.definirMesa(tamanhosDaMesa('padrao', 2));
    assert.equal(L.colunaX(0), 318);
    assert.equal(L.colunaX(6), 900);
    assert.equal(Math.round(L.linhaY(1, 0)), 144);
    assert.deepEqual([L.cartaDaMesa().l, L.cartaDaMesa().a], [62, 87]);
  });

  it('em todas as mesas possíveis as cartas cabem no tabuleiro e não se sobrepõem', () => {
    for (const arquitetura of ['padrao', 'curta', 'larga', 'profunda']) {
      for (let n = 2; n <= 5; n++) {
        const tamanhos = tamanhosDaMesa(arquitetura, n);
        const g = L.definirMesa(tamanhos), { l, a, ml, ma } = L.cartaDaMesa();
        const nome = arquitetura + ' com ' + n;
        assert.ok(L.colunaX(0) - ml >= L.TABULEIRO.x0 && L.colunaX(tamanhos.length - 1) + ml <= L.TABULEIRO.x1, nome + ': largura');
        tamanhos.forEach((t, c) => {
          assert.ok(L.linhaY(c, 0) - ma >= L.TABULEIRO.y0 - 0.5 && L.linhaY(c, t - 1) + ma <= L.TABULEIRO.y1 + 0.5, nome + ': altura');
        });
        assert.ok(g.coluna >= l + 30, nome + ': espaço entre colunas para as ligações');
        assert.ok(g.linha >= a, nome + ': linhas sem sobreposição');
        assert.ok(l >= 30, nome + ': carta legível (' + Math.round(l) + ' de largura)');
      }
    }
    L.definirMesa(tamanhosDaMesa());
  });

  it('placar: 2 blocos grandes com 2 jogadores; blocos compactos que cabem acima da curva com 3 a 5', () => {
    assert.deepEqual(L.blocosDoPlacar(2), { compacto: false, altura: L.DIR.alturaBloco, posicoes: [L.DIR.blocos, L.DIR.blocos + L.DIR.passoBloco] });
    for (let n = 3; n <= 5; n++) {
      const forma = L.blocosDoPlacar(n);
      assert.equal(forma.compacto, true);
      assert.equal(forma.posicoes.length, n);
      assert.ok(forma.posicoes[n - 1] + forma.altura <= L.DIR.rotuloCurva - 8);
      assert.ok(forma.altura >= 36, n + ' jogadores: bloco com pelo menos 36 de altura');
    }
  });

  it('cores diferentes para as 5 redes', () => {
    assert.equal(new Set(L.COR_JOGADOR).size, 5);
    assert.equal(new Set(L.COR_JOGADOR_CSS).size, 5);
  });
});

describe('Opções da mesa (aplicacao.js)', () => {
  it('opções padrão: 2 jogadores, 1 humano, arquitetura padrão e 1 baralho', () => {
    assert.deepEqual({ jogadores: OPCOES_PADRAO.jogadores, humanos: OPCOES_PADRAO.humanos, arquitetura: OPCOES_PADRAO.arquitetura, baralhos: OPCOES_PADRAO.baralhos },
      { jogadores: 2, humanos: 1, arquitetura: 'padrao', baralhos: 1 });
  });

  it('o antigo "2 humanos no mesmo aparelho" vira 2 humanos; valores fora da faixa são corrigidos', () => {
    const antigas = normalizarOpcoes({ oponente: 'doisHumanos', baralho: 'truco' });
    assert.equal(antigas.humanos, 2);
    assert.equal(antigas.oponente, OPCOES_PADRAO.oponente);
    assert.equal(antigas.baralho, 'truco');
    assert.deepEqual(normalizarOpcoes({ jogadores: 9, humanos: 7, baralhos: 0 }), { ...OPCOES_PADRAO, jogadores: 5, humanos: 5, baralhos: 1 });
    assert.equal(normalizarOpcoes({ jogadores: 3, humanos: 0 }).humanos, 1);
  });
});
