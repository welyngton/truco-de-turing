/**
 * @file Testes do tutorial: o roteiro (conteudo/tutorial.js) jogado de ponta a ponta no motor, sem
 * interface, para garantir que cada jogada combinada é legal, que a mão acaba como as falas dizem e
 * que a conferência das jogadas só aceita a do passo.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarJogada, jogadasLegais } from '../../src/nucleo/partida.js';
import { novaMaoDoTutorial, jogadaDoPasso, inicioDoRival, jogadaCombina } from '../../src/nucleo/tutorial.js';
import { ROTEIRO, MESA_DO_TUTORIAL, ASSISTENTE, OPCOES_DO_TUTORIAL } from '../../src/conteudo/tutorial.js';

const JOGADORES = [{ nome: 'Você' }, { nome: 'Rival', tipo: 'oponente', oponente: 'guloso' }];

describe('tutorial: mesa e mãos combinadas', () => {
  it('a mesa é a do roteiro: arquitetura curta, cartas e mãos fixas, sem sorteio', () => {
    const a = novaMaoDoTutorial(JOGADORES), b = novaMaoDoTutorial(JOGADORES);
    assert.equal(a.camadas.length, MESA_DO_TUTORIAL.camadas.length);
    MESA_DO_TUTORIAL.camadas.forEach((valores, c) => assert.deepEqual(a.estadoMotor.layers[c].map((s) => a.indiceDeCartas.tt.get(s.card.id).valor), valores));
    MESA_DO_TUTORIAL.maos.forEach((valores, j) => assert.deepEqual(a.jogadores[j].mao.map((c) => c.valor), valores));
    assert.deepEqual(a.jogadores.map((j) => j.mao.map((c) => c.id)), b.jogadores.map((j) => j.mao.map((c) => c.id)), 'sempre a mesma mão');
    assert.equal(a.fase, 'inicio');
    assert.equal(new Set(a.jogadores.flatMap((j) => j.mao.map((c) => c.id))).size, 13, 'cartas distintas');
  });

  it('as opções da mesa de treino são as da mesa do roteiro (curta, dois jogadores, mão única, sem truco)', () => {
    const o = OPCOES_DO_TUTORIAL;
    assert.equal(o.arquitetura, MESA_DO_TUTORIAL.arquitetura);
    assert.equal(o.jogadores, 2); assert.equal(o.alvo, 1); assert.equal(o.baralho, 'classico');
  });
});

describe('tutorial: roteiro', () => {
  it('cada passo tem fala e é de um dos tipos conhecidos', () => {
    assert.ok(ASSISTENTE.nome);
    const tipos = new Set(['inicio', 'ativar', 'empilhar', 'dropout', 'passar']);
    for (const passo of ROTEIRO) {
      assert.ok(typeof passo.fala === 'string' && passo.fala.length > 20);
      if (!passo.jogada) { assert.equal(passo.jogador, undefined); continue; }
      assert.ok([0, 1].includes(passo.jogador));
      assert.ok(tipos.has(passo.jogada.tipo));
    }
  });

  it('cobre o objetivo, quem começa, a pontuação e uma jogada de cada ação, e explica só falando o transfer e o stack overflow', () => {
    const feitas = new Set(ROTEIRO.filter((p) => p.jogador === 0 && p.jogada).map((p) => p.jogada.acao || p.jogada.tipo));
    for (const acao of ['inicio', 'ativar', 'tunagem', 'overfit', 'earlystop', 'dropout', 'passar']) assert.ok(feitas.has(acao), acao);
    assert.ok(!feitas.has('transfer') && !feitas.has('stackoverflow'));
    const texto = ROTEIRO.map((p) => p.fala).join(' ');
    for (const assunto of ['maior valor', 'quem começa', 'soma', 'Transfer learning', 'Stack overflow', 'sabotar']) assert.ok(texto.includes(assunto), assunto);
    /* abre com falas, termina com falas e o jogador não joga duas ações de gastar vez seguidas sem o rival */
    assert.ok(!ROTEIRO[0].jogada && !ROTEIRO[ROTEIRO.length - 1].jogada);
  });

  it('jogada por jogada: o motor aceita todas, a mão acaba no último passo de jogada e a soma é a das falas', () => {
    const mao = novaMaoDoTutorial(JOGADORES);
    let ultimo = -1;
    ROTEIRO.forEach((passo, i) => {
      if (!passo.jogada) return;
      const jogada = jogadaDoPasso(mao, passo);
      assert.ok(jogadaCombina(mao, passo, jogada), 'passo ' + i);
      assert.equal(mao.fase === 'fim', false, 'a mão não pode acabar antes do passo ' + i);
      if (passo.jogada.tipo !== 'inicio') assert.equal(mao.vez, passo.jogador, 'é a vez certa no passo ' + i);
      aplicarJogada(mao, jogada);
      if (passo.jogada.tipo === 'inicio') aplicarJogada(mao, inicioDoRival(mao));
      ultimo = i;
    });
    assert.equal(mao.fase, 'fim');
    assert.deepEqual(ROTEIRO.slice(ultimo + 1).filter((p) => p.jogada), [], 'depois do último passo de jogada só há falas');
    assert.deepEqual(mao.resultado.somas, [11, 9]);
    assert.equal(mao.resultado.vencedor, 0);
    assert.ok(ROTEIRO[ultimo + 1].fala.includes('11') && ROTEIRO[ultimo + 1].fala.includes('2 + 4 + 3 = 9'));
    assert.deepEqual(mao.jogadores.map((j) => j.situacao), ['earlystop', 'earlystop']);
  });

  it('no passo de passar o jogador tem um ataque possível (o 3 sobre o 3), senão o motor pularia a vez dele', () => {
    const mao = novaMaoDoTutorial(JOGADORES);
    for (const passo of ROTEIRO) {
      if (!passo.jogada) continue;
      if (passo.jogada.tipo === 'passar') {
        const legais = jogadasLegais(mao, 0);
        assert.ok(legais.some((j) => j.tipo === 'passar') && legais.some((j) => j.tipo === 'empilhar'));
        return;
      }
      aplicarJogada(mao, jogadaDoPasso(mao, passo));
      if (passo.jogada.tipo === 'inicio') aplicarJogada(mao, inicioDoRival(mao));
    }
    assert.fail('o roteiro não tem o passo de passar');
  });
});

describe('tutorial: conferência das jogadas', () => {
  const passoAtivar = ROTEIRO.find((p) => p.jogada && p.jogada.tipo === 'ativar');
  const passoTunagem = ROTEIRO.find((p) => p.jogada && p.jogada.acao === 'tunagem');
  const passoDropout = ROTEIRO.find((p) => p.jogada && p.jogada.tipo === 'dropout');
  const passoInicio = ROTEIRO.find((p) => p.jogada && p.jogada.tipo === 'inicio');

  it('só a jogada do passo combina: tipo, jogador, neurônio e valor das cartas', () => {
    const mao = novaMaoDoTutorial(JOGADORES);
    const cartas = (valor) => mao.jogadores[0].mao.filter((c) => c.valor === valor).map((c) => c.id);
    assert.ok(jogadaCombina(mao, passoAtivar, { tipo: 'ativar', jogador: 0, neuronio: 'C0N1' }));
    assert.ok(!jogadaCombina(mao, passoAtivar, { tipo: 'ativar', jogador: 0, neuronio: 'C0N0' }), 'neurônio errado');
    assert.ok(!jogadaCombina(mao, passoAtivar, { tipo: 'ativar', jogador: 1, neuronio: 'C0N1' }), 'jogador errado');
    assert.ok(!jogadaCombina(mao, passoAtivar, { tipo: 'passar', jogador: 0 }), 'tipo errado');
    assert.ok(!jogadaCombina(mao, null, { tipo: 'passar', jogador: 0 }) && !jogadaCombina(mao, ROTEIRO[0], { tipo: 'passar', jogador: 0 }), 'sem passo de jogada nada combina');
    assert.ok(jogadaCombina(mao, passoInicio, { tipo: 'inicio', jogador: 0, carta: cartas('K')[0] }));
    assert.ok(!jogadaCombina(mao, passoInicio, { tipo: 'inicio', jogador: 0, carta: cartas('10')[0] }), 'a carta de início é a combinada');
    assert.ok(jogadaCombina(mao, passoTunagem, { tipo: 'empilhar', jogador: 0, neuronio: 'C1N1', cartas: cartas('6') }));
    assert.ok(!jogadaCombina(mao, passoTunagem, { tipo: 'empilhar', jogador: 0, neuronio: 'C1N1', cartas: cartas('9') }), 'valor errado');
    assert.ok(!jogadaCombina(mao, passoTunagem, { tipo: 'empilhar', jogador: 0, neuronio: 'C1N1', cartas: [...cartas('6'), ...cartas('9')] }), 'cartas demais');
    assert.ok(jogadaCombina(mao, passoDropout, { tipo: 'dropout', jogador: 0, n: 1, pagamento: cartas('4') }));
    assert.ok(!jogadaCombina(mao, passoDropout, { tipo: 'dropout', jogador: 0, n: 1, pagamento: cartas('3') }), 'paga com a carta combinada');
    assert.ok(!jogadaCombina(mao, passoDropout, { tipo: 'dropout', jogador: 0, n: 2, pagamento: cartas('4') }));
  });
});
